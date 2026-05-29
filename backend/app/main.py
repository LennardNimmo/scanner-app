from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .mock_data import (
    CARTS,
    OFFERS,
    OPTIMIZATIONS,
    ORDERS,
    PASSWORDS,
    PRODUCTS,
    SELLERS,
    SHIPMENTS,
    SHIPPING_RULES,
    USERS,
    eta_from_days,
    get_product_by_gtin,
    uid,
)
from .optimizer import optimize_cart
from .payments import authorize_mock_payment, calculate_platform_fee, capture_mock_payment
from .schemas import (
    CartItemUpdateRequest,
    CheckoutRequest,
    LoginRequest,
    ManualShipmentRequest,
    RegisterRequest,
    ScanRequest,
    SellerOfferUpdateRequest,
)

app = FastAPI(title="Scan Marketplace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": user["id"], "email": user["email"], "full_name": user.get("full_name")}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    existing = next((u for u in USERS.values() if u["email"].lower() == payload.email.lower()), None)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = uid("usr")
    user = {
        "id": user_id,
        "email": payload.email.lower(),
        "full_name": payload.full_name or payload.email.split("@")[0],
    }
    USERS[user_id] = user
    PASSWORDS[user_id] = payload.password
    CARTS[user_id] = {}
    return {"token": f"mock-token-{user_id}", "user": _public_user(user)}


@app.post("/auth/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    user = next((u for u in USERS.values() if u["email"].lower() == payload.email.lower()), None)
    if not user or PASSWORDS.get(user["id"]) != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": f"mock-token-{user['id']}", "user": _public_user(user)}


@app.get("/products")
def list_products() -> Dict[str, Any]:
    return {"products": list(PRODUCTS.values())}


@app.get("/products/by-gtin/{gtin}")
def product_by_gtin(gtin: str) -> Dict[str, Any]:
    product = get_product_by_gtin(gtin)
    if not product:
        raise HTTPException(status_code=404, detail="Unknown barcode")
    offers = [o for o in OFFERS if o["product_id"] == product["id"] and o["stock_quantity"] > 0]
    return {"product": product, "offers": offers}


@app.get("/sellers")
def list_sellers() -> Dict[str, Any]:
    return {"sellers": list(SELLERS.values()), "shipping_rules": list(SHIPPING_RULES.values())}


@app.post("/seller/offers")
def update_seller_offer(payload: SellerOfferUpdateRequest) -> Dict[str, Any]:
    if payload.seller_id not in SELLERS:
        raise HTTPException(status_code=404, detail="Seller not found")
    if payload.product_id not in PRODUCTS:
        raise HTTPException(status_code=404, detail="Product not found")

    for offer in OFFERS:
        if offer["seller_id"] == payload.seller_id and offer["product_id"] == payload.product_id:
            offer.update(payload.model_dump())
            return {"offer": offer}

    offer = {
        "id": uid("offer"),
        **payload.model_dump(),
    }
    OFFERS.append(offer)
    return {"offer": offer}


@app.post("/scan")
def scan(payload: ScanRequest) -> Dict[str, Any]:
    if payload.user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    product = get_product_by_gtin(payload.gtin)
    if not product:
        raise HTTPException(status_code=404, detail="Barcode not found in catalog")

    cart = CARTS.setdefault(payload.user_id, {})
    cart[product["id"]] = cart.get(product["id"], 0) + payload.quantity
    return {"product": product, "cart": _cart_response(payload.user_id)}


@app.get("/cart/{user_id}")
def get_cart(user_id: str) -> Dict[str, Any]:
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    return _cart_response(user_id)


def _cart_response(user_id: str) -> Dict[str, Any]:
    cart = CARTS.setdefault(user_id, {})
    items = []
    for product_id, quantity in cart.items():
        product = PRODUCTS[product_id]
        min_price = min((o["price_cents"] for o in OFFERS if o["product_id"] == product_id and o["stock_quantity"] >= quantity), default=None)
        items.append({"product": product, "quantity": quantity, "min_price_cents": min_price})
    return {"user_id": user_id, "items": items}


@app.post("/cart/items")
def update_cart_item(payload: CartItemUpdateRequest) -> Dict[str, Any]:
    if payload.user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.product_id not in PRODUCTS:
        raise HTTPException(status_code=404, detail="Product not found")
    cart = CARTS.setdefault(payload.user_id, {})
    if payload.quantity <= 0:
        cart.pop(payload.product_id, None)
    else:
        cart[payload.product_id] = payload.quantity
    return _cart_response(payload.user_id)


@app.post("/cart/{user_id}/optimize")
def optimize(user_id: str) -> Dict[str, Any]:
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        result = optimize_cart(CARTS.setdefault(user_id, {}))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    OPTIMIZATIONS[result["id"]] = {**result, "user_id": user_id}
    return {"optimization": result}


@app.post("/checkout")
def checkout(payload: CheckoutRequest) -> Dict[str, Any]:
    if payload.user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    optimization = OPTIMIZATIONS.get(payload.optimization_id)
    if not optimization or optimization["user_id"] != payload.user_id:
        raise HTTPException(status_code=404, detail="Optimization not found")

    payment = authorize_mock_payment(optimization["total_cents"], payload.user_id)
    capture = capture_mock_payment(payment["payment_intent_id"])

    order_id = uid("ord")
    order = {
        "id": order_id,
        "user_id": payload.user_id,
        "payment_provider": payment["provider"],
        "payment_intent_id": payment["payment_intent_id"],
        "payment_status": capture["status"],
        "order_status": "accepted",
        "total_cents": optimization["total_cents"],
        "products_cents": optimization["products_cents"],
        "shipping_cents": optimization["shipping_cents"],
        "suborders": [],
    }

    for line in optimization["seller_lines"]:
        seller = line["seller"]
        platform_fee_cents = calculate_platform_fee(line["subtotal_cents"], seller["commission_rate"])
        seller_payout_cents = line["subtotal_cents"] + line["shipping_cents"] - platform_fee_cents
        suborder_id = uid("sub")
        suborder = {
            "id": suborder_id,
            "order_id": order_id,
            "seller": seller,
            "items": line["items"],
            "subtotal_cents": line["subtotal_cents"],
            "shipping_cents": line["shipping_cents"],
            "platform_fee_cents": platform_fee_cents,
            "seller_payout_cents": seller_payout_cents,
            "status": "accepted",
            "carrier": line["carrier"],
            "delivery_days_max": line["delivery_days_max"],
        }
        order["suborders"].append(suborder)

        shipment_id = uid("shp")
        SHIPMENTS[shipment_id] = {
            "id": shipment_id,
            "user_id": payload.user_id,
            "order_id": order_id,
            "suborder_id": suborder_id,
            "seller_id": seller["id"],
            "seller_name": seller["company_name"],
            "carrier": line["carrier"],
            "tracking_code": f"MOCK{uuid4().hex[:10].upper()}",
            "description": ", ".join(item["product"]["name"] for item in line["items"]),
            "status": "preparing",
            "eta": eta_from_days(line["delivery_days_max"]),
        }

    ORDERS[order_id] = order
    CARTS[payload.user_id] = {}
    return {"order": order, "shipments": _shipments_for_user(payload.user_id)}


@app.get("/orders/{user_id}")
def list_orders(user_id: str) -> Dict[str, Any]:
    orders = [order for order in ORDERS.values() if order["user_id"] == user_id]
    return {"orders": orders}


@app.get("/shipments/{user_id}")
def list_shipments(user_id: str) -> Dict[str, Any]:
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    return {"shipments": _shipments_for_user(user_id)}


def _shipments_for_user(user_id: str):
    return sorted(
        [shipment for shipment in SHIPMENTS.values() if shipment["user_id"] == user_id],
        key=lambda shipment: shipment["eta"] or "9999-12-31",
    )


@app.post("/shipments/manual")
def add_manual_shipment(payload: ManualShipmentRequest) -> Dict[str, Any]:
    if payload.user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    shipment_id = uid("shp")
    SHIPMENTS[shipment_id] = {
        "id": shipment_id,
        "user_id": payload.user_id,
        "order_id": None,
        "suborder_id": None,
        "seller_id": None,
        "seller_name": None,
        "carrier": payload.carrier,
        "tracking_code": payload.tracking_code,
        "description": payload.description,
        "status": "tracking_added",
        "eta": payload.eta or (date.today() + timedelta(days=2)).isoformat(),
    }
    return {"shipment": SHIPMENTS[shipment_id], "shipments": _shipments_for_user(payload.user_id)}
