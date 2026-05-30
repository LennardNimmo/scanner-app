from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from itertools import product as cartesian_product
import os
from typing import Any, Dict
from uuid import UUID, uuid4

import httpx
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .payments import authorize_mock_payment, capture_mock_payment
from .schemas import (
    CartItemUpdateRequest,
    CheckoutRequest,
    ManualShipmentRequest,
    ScanRequest,
    SellerOfferUpdateRequest,
)

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

app = FastAPI(title="Scan Marketplace API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [jsonable(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    return value


def rows_json(rows):
    return [jsonable(dict(row)) for row in rows]


def row_json(row):
    return jsonable(dict(row)) if row else None


def public_user(user: dict) -> dict:
    user = jsonable(user)
    return {"id": user["id"], "email": user.get("email"), "full_name": user.get("full_name")}


def eta_from_days(days: int | None) -> str:
    return (date.today() + timedelta(days=days or 2)).isoformat()


def calculate_platform_fee(subtotal_cents: int, commission_rate: float | Decimal | None) -> int:
    return round(subtotal_cents * float(commission_rate or 0) / 100)


def seller_response(row: dict) -> dict:
    seller = row_json(row)
    seller["company_name"] = seller.get("name")
    return seller


def offer_response(row: dict) -> dict:
    offer = row_json(row)
    offer["seller"] = {
        "id": offer["seller_id"],
        "name": offer["seller_name"],
        "company_name": offer["seller_name"],
        "commission_rate": offer.get("commission_rate"),
        "support_email": offer.get("support_email"),
    }
    return offer


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")

    access_token = authorization.split(" ", 1)[1].strip()
    try:
        response = httpx.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=401, detail="Could not verify auth token") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired auth token")

    data = response.json()
    metadata = data.get("user_metadata") or {}
    return {
        "id": data["id"],
        "email": data.get("email"),
        "full_name": metadata.get("full_name") or metadata.get("name") or data.get("email", "").split("@")[0],
    }


def assert_same_user(user_id: str, auth_user: dict):
    if str(user_id) != str(auth_user["id"]):
        raise HTTPException(status_code=403, detail="You can only access your own data")


def ensure_user_profile(conn, auth_user: dict):
    user = conn.execute(
        """
        insert into app_users (id, email, full_name, password_hash)
        values (%s, %s, %s, null)
        on conflict (id)
        do update set email=excluded.email,
                      full_name=coalesce(excluded.full_name, app_users.full_name)
        returning id, email, full_name
        """,
        (auth_user["id"], auth_user.get("email"), auth_user.get("full_name")),
    ).fetchone()
    ensure_active_cart(conn, str(user["id"]))
    return user


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/auth/me")
def me(auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    with db() as conn:
        user = ensure_user_profile(conn, auth_user)
    return {"user": public_user(user)}


@app.get("/products")
def list_products() -> Dict[str, Any]:
    with db() as conn:
        products = conn.execute(
            "select id, gtin, name, brand, image_url, category, created_at from products order by name"
        ).fetchall()
    return {"products": rows_json(products)}


def get_product_by_gtin(conn, gtin: str):
    return conn.execute(
        "select id, gtin, name, brand, image_url, category from products where gtin=%s",
        (gtin,),
    ).fetchone()


def get_product_by_id(conn, product_id: str):
    return conn.execute(
        "select id, gtin, name, brand, image_url, category from products where id=%s",
        (product_id,),
    ).fetchone()


def get_offers_for_product(conn, product_id: str, quantity: int = 1) -> list[dict]:
    rows = conn.execute(
        """
        select sp.id, sp.seller_id, sp.product_id, sp.price_cents, sp.stock_quantity,
               sp.delivery_days_min, sp.delivery_days_max,
               s.name as seller_name, s.support_email, s.commission_rate
        from seller_products sp
        join sellers s on s.id = sp.seller_id
        where sp.product_id = %s and sp.stock_quantity >= %s
        order by sp.price_cents asc
        """,
        (product_id, quantity),
    ).fetchall()
    return [offer_response(row) for row in rows]


@app.get("/products/by-gtin/{gtin}")
def product_by_gtin(gtin: str) -> Dict[str, Any]:
    with db() as conn:
        product = get_product_by_gtin(conn, gtin)
        if not product:
            raise HTTPException(status_code=404, detail="Unknown barcode")
        offers = get_offers_for_product(conn, str(product["id"]))
    return {"product": row_json(product), "offers": offers}


@app.get("/sellers")
def list_sellers() -> Dict[str, Any]:
    with db() as conn:
        sellers = conn.execute(
            "select id, name, support_email, commission_rate, created_at from sellers order by name"
        ).fetchall()
        shipping_rules = conn.execute(
            "select id, seller_id, base_shipping_cents, free_shipping_threshold_cents, created_at from shipping_rules"
        ).fetchall()
    return {"sellers": [seller_response(row) for row in sellers], "shipping_rules": rows_json(shipping_rules)}


@app.post("/seller/offers")
def update_seller_offer(payload: SellerOfferUpdateRequest) -> Dict[str, Any]:
    # MVP: still unauthenticated. Later, restrict this to seller/admin accounts.
    with db() as conn:
        if not conn.execute("select id from sellers where id=%s", (payload.seller_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Seller not found")
        if not conn.execute("select id from products where id=%s", (payload.product_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Product not found")
        data = payload.model_dump()
        row = conn.execute(
            """
            insert into seller_products (seller_id, product_id, price_cents, stock_quantity, delivery_days_min, delivery_days_max)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (seller_id, product_id)
            do update set price_cents=excluded.price_cents,
                          stock_quantity=excluded.stock_quantity,
                          delivery_days_min=excluded.delivery_days_min,
                          delivery_days_max=excluded.delivery_days_max
            returning id, seller_id, product_id, price_cents, stock_quantity, delivery_days_min, delivery_days_max
            """,
            (
                data["seller_id"],
                data["product_id"],
                data["price_cents"],
                data.get("stock_quantity", 0),
                data.get("delivery_days_min", 1),
                data.get("delivery_days_max", 3),
            ),
        ).fetchone()
    return {"offer": row_json(row)}


def ensure_active_cart(conn, user_id: str):
    cart = conn.execute(
        """
        select id, user_id, status from carts
        where user_id=%s and status='active'
        order by created_at desc limit 1
        """,
        (user_id,),
    ).fetchone()
    if cart:
        return cart
    return conn.execute(
        "insert into carts (user_id, status) values (%s, 'active') returning id, user_id, status",
        (user_id,),
    ).fetchone()


@app.post("/scan")
def scan(payload: ScanRequest, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(payload.user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        product = get_product_by_gtin(conn, payload.gtin)
        if not product:
            raise HTTPException(status_code=404, detail="Barcode not found in catalog")
        cart = ensure_active_cart(conn, payload.user_id)
        conn.execute(
            """
            insert into cart_items (cart_id, product_id, quantity)
            values (%s, %s, %s)
            on conflict (cart_id, product_id)
            do update set quantity = cart_items.quantity + excluded.quantity
            """,
            (cart["id"], product["id"], payload.quantity),
        )
        cart_data = cart_response(conn, payload.user_id)
    return {"product": row_json(product), "cart": cart_data}


@app.get("/cart/{user_id}")
def get_cart(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        return cart_response(conn, user_id)


def cart_response(conn, user_id: str) -> Dict[str, Any]:
    cart = ensure_active_cart(conn, user_id)
    rows = conn.execute(
        """
        select ci.quantity, p.id as product_id, p.gtin, p.name, p.brand, p.image_url, p.category,
               (select min(sp.price_cents) from seller_products sp where sp.product_id=p.id and sp.stock_quantity >= ci.quantity) as min_price_cents
        from cart_items ci
        join products p on p.id = ci.product_id
        where ci.cart_id=%s
        order by ci.created_at
        """,
        (cart["id"],),
    ).fetchall()
    items = []
    for row in rows_json(rows):
        items.append({
            "product": {
                "id": row["product_id"],
                "gtin": row["gtin"],
                "name": row["name"],
                "brand": row["brand"],
                "image_url": row["image_url"],
                "category": row["category"],
            },
            "quantity": row["quantity"],
            "min_price_cents": row["min_price_cents"],
        })
    return {"user_id": str(user_id), "items": items}


@app.post("/cart/items")
def update_cart_item(payload: CartItemUpdateRequest, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(payload.user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        if not get_product_by_id(conn, payload.product_id):
            raise HTTPException(status_code=404, detail="Product not found")
        cart = ensure_active_cart(conn, payload.user_id)
        if payload.quantity <= 0:
            conn.execute("delete from cart_items where cart_id=%s and product_id=%s", (cart["id"], payload.product_id))
        else:
            conn.execute(
                """
                insert into cart_items (cart_id, product_id, quantity)
                values (%s, %s, %s)
                on conflict (cart_id, product_id)
                do update set quantity = excluded.quantity
                """,
                (cart["id"], payload.product_id, payload.quantity),
            )
        return cart_response(conn, payload.user_id)


def get_shipping_rule(conn, seller_id: str) -> dict:
    rule = conn.execute(
        """
        select base_shipping_cents, free_shipping_threshold_cents
        from shipping_rules where seller_id=%s
        order by created_at desc limit 1
        """,
        (seller_id,),
    ).fetchone()
    return row_json(rule) if rule else {"base_shipping_cents": 495, "free_shipping_threshold_cents": None}


def cart_rows_for_optimization(conn, user_id: str) -> list[dict]:
    cart = ensure_active_cart(conn, user_id)
    rows = conn.execute(
        """
        select ci.quantity, p.id, p.gtin, p.name, p.brand, p.image_url, p.category
        from cart_items ci
        join products p on p.id = ci.product_id
        where ci.cart_id=%s
        order by ci.created_at
        """,
        (cart["id"],),
    ).fetchall()
    return rows_json(rows)


def calculate_optimization(conn, user_id: str) -> dict:
    cart_items = cart_rows_for_optimization(conn, user_id)
    if not cart_items:
        raise ValueError("Cart is empty")
    choices = []
    for item in cart_items:
        offers = get_offers_for_product(conn, item["id"], item["quantity"])
        if not offers:
            raise ValueError(f"No available offers for {item['name']}")
        choices.append([(item, offer) for offer in offers])

    best = None
    for combination in cartesian_product(*choices):
        seller_groups = {}
        products_cents = 0
        for cart_item, offer in combination:
            seller = offer["seller"]
            seller_id = seller["id"]
            qty = cart_item["quantity"]
            line_total = offer["price_cents"] * qty
            products_cents += line_total
            seller_groups.setdefault(seller_id, {
                "seller": seller,
                "items": [],
                "subtotal_cents": 0,
                "delivery_days_max": 0,
                "carrier": "PostNL",
            })
            group = seller_groups[seller_id]
            group["items"].append({
                "product": {
                    "id": cart_item["id"],
                    "gtin": cart_item["gtin"],
                    "name": cart_item["name"],
                    "brand": cart_item.get("brand"),
                    "image_url": cart_item.get("image_url"),
                    "category": cart_item.get("category"),
                },
                "quantity": qty,
                "unit_price_cents": offer["price_cents"],
                "line_total_cents": line_total,
            })
            group["subtotal_cents"] += line_total
            group["delivery_days_max"] = max(group["delivery_days_max"], offer.get("delivery_days_max") or 3)

        shipping_cents = 0
        seller_lines = []
        for seller_id, line in seller_groups.items():
            rule = get_shipping_rule(conn, seller_id)
            threshold = rule.get("free_shipping_threshold_cents")
            base = rule.get("base_shipping_cents") or 0
            seller_shipping = 0 if threshold and line["subtotal_cents"] >= threshold else base
            shipping_cents += seller_shipping
            seller_lines.append({**line, "shipping_cents": seller_shipping})
        total_cents = products_cents + shipping_cents
        if best is None or total_cents < best["total_cents"]:
            best = {
                "id": str(uuid4()),
                "products_cents": products_cents,
                "shipping_cents": shipping_cents,
                "total_cents": total_cents,
                "seller_lines": seller_lines,
            }
    return best


@app.post("/cart/{user_id}/optimize")
def optimize(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        try:
            result = calculate_optimization(conn, user_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        conn.execute(
            "insert into cart_optimizations (id, user_id, result_json) values (%s, %s, %s)",
            (result["id"], user_id, Jsonb(jsonable(result))),
        )
    return {"optimization": result}


@app.post("/checkout")
def checkout(payload: CheckoutRequest, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(payload.user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        optimization_row = conn.execute(
            "select id, result_json from cart_optimizations where id=%s and user_id=%s",
            (payload.optimization_id, payload.user_id),
        ).fetchone()
        if not optimization_row:
            raise HTTPException(status_code=404, detail="Optimization not found")
        optimization = optimization_row["result_json"]
        payment = authorize_mock_payment(optimization["total_cents"], payload.user_id)
        capture = capture_mock_payment(payment["payment_intent_id"])
        order = conn.execute(
            """
            insert into orders (user_id, total_cents, payment_status, order_status)
            values (%s, %s, %s, 'accepted')
            returning id, user_id, total_cents, payment_status, order_status, created_at
            """,
            (payload.user_id, optimization["total_cents"], capture["status"]),
        ).fetchone()
        order_response = row_json(order)
        order_response["payment_provider"] = payment["provider"]
        order_response["payment_intent_id"] = payment["payment_intent_id"]
        order_response["products_cents"] = optimization["products_cents"]
        order_response["shipping_cents"] = optimization["shipping_cents"]
        order_response["suborders"] = []

        for line in optimization["seller_lines"]:
            seller = line["seller"]
            platform_fee_cents = calculate_platform_fee(line["subtotal_cents"], seller.get("commission_rate"))
            seller_payout_cents = line["subtotal_cents"] + line["shipping_cents"] - platform_fee_cents
            suborder = conn.execute(
                """
                insert into suborders (order_id, seller_id, subtotal_cents, shipping_cents, platform_fee_cents, seller_payout_cents, status)
                values (%s, %s, %s, %s, %s, %s, 'accepted')
                returning id, order_id, seller_id, subtotal_cents, shipping_cents, platform_fee_cents, seller_payout_cents, status, created_at
                """,
                (order["id"], seller["id"], line["subtotal_cents"], line["shipping_cents"], platform_fee_cents, seller_payout_cents),
            ).fetchone()
            suborder_response = row_json(suborder)
            suborder_response["seller"] = seller
            suborder_response["items"] = line["items"]
            suborder_response["carrier"] = line.get("carrier", "PostNL")
            suborder_response["delivery_days_max"] = line.get("delivery_days_max", 2)
            order_response["suborders"].append(suborder_response)
            for item in line["items"]:
                conn.execute(
                    "insert into suborder_items (suborder_id, product_id, quantity, unit_price_cents) values (%s, %s, %s, %s)",
                    (suborder["id"], item["product"]["id"], item["quantity"], item["unit_price_cents"]),
                )
            conn.execute(
                """
                insert into shipments (user_id, order_id, suborder_id, carrier, tracking_code, description, status, eta)
                values (%s, %s, %s, %s, %s, %s, 'preparing', %s)
                """,
                (
                    payload.user_id,
                    order["id"],
                    suborder["id"],
                    line.get("carrier", "PostNL"),
                    f"MOCK{uuid4().hex[:10].upper()}",
                    ", ".join(item["product"]["name"] for item in line["items"]),
                    eta_from_days(line.get("delivery_days_max", 2)),
                ),
            )
        cart = ensure_active_cart(conn, payload.user_id)
        conn.execute("delete from cart_items where cart_id=%s", (cart["id"],))
        shipments = shipments_for_user(conn, payload.user_id)
    return {"order": order_response, "shipments": shipments}


@app.get("/orders/{user_id}")
def list_orders(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        rows = conn.execute(
            "select id, user_id, total_cents, payment_status, order_status, created_at from orders where user_id=%s order by created_at desc",
            (user_id,),
        ).fetchall()
    return {"orders": rows_json(rows)}


@app.get("/shipments/{user_id}")
def list_shipments(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        shipments = shipments_for_user(conn, user_id)
    return {"shipments": shipments}


def shipments_for_user(conn, user_id: str) -> list[dict]:
    rows = conn.execute(
        """
        select sh.id, sh.user_id, sh.order_id, sh.suborder_id, sh.carrier, sh.tracking_code,
               sh.description, sh.status, sh.eta, sh.created_at,
               so.seller_id, s.name as seller_name
        from shipments sh
        left join suborders so on so.id = sh.suborder_id
        left join sellers s on s.id = so.seller_id
        where sh.user_id=%s
        order by coalesce(sh.eta, '9999-12-31') asc, sh.created_at desc
        """,
        (user_id,),
    ).fetchall()
    return rows_json(rows)


@app.post("/shipments/manual")
def add_manual_shipment(payload: ManualShipmentRequest, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(payload.user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        shipment = conn.execute(
            """
            insert into shipments (user_id, carrier, tracking_code, description, status, eta)
            values (%s, %s, %s, %s, 'tracking_added', %s)
            returning id, user_id, order_id, suborder_id, carrier, tracking_code, description, status, eta, created_at
            """,
            (payload.user_id, payload.carrier, payload.tracking_code, payload.description, payload.eta or eta_from_days(2)),
        ).fetchone()
        shipments = shipments_for_user(conn, payload.user_id)
    return {"shipment": row_json(shipment), "shipments": shipments}
