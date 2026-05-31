from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from itertools import product as cartesian_product
import os
from typing import Any, Dict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID, uuid4

import httpx
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .schemas import CartItemUpdateRequest, ManualShipmentRequest, ScanRequest

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

app = FastAPI(title="Scan Affiliate API", version="0.4.0")

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


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")

    access_token = authorization.split(" ", 1)[1].strip()
    try:
        response = httpx.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={"Authorization": f"Bearer {access_token}", "apikey": SUPABASE_ANON_KEY},
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
        on conflict (id) do update
          set email=excluded.email,
              full_name=coalesce(excluded.full_name, app_users.full_name)
        returning id, email, full_name
        """,
        (auth_user["id"], auth_user.get("email"), auth_user.get("full_name")),
    ).fetchone()
    ensure_active_cart(conn, str(user["id"]))
    return user


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "mode": "affiliate"}


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


def merchant_from_offer(offer: dict) -> dict:
    return {
        "id": offer["merchant_id"],
        "name": offer["merchant_name"],
        "company_name": offer["merchant_name"],
        "domain": offer.get("domain"),
        "affiliate_network": offer.get("affiliate_network"),
        "affiliate_program_id": offer.get("affiliate_program_id"),
        "logo_url": offer.get("logo_url"),
    }


def offer_response(row: dict) -> dict:
    offer = row_json(row)
    offer["merchant"] = merchant_from_offer(offer)
    # Backward-compatible alias for older screens/debug output.
    offer["seller"] = offer["merchant"]
    return offer


def get_offers_for_product(conn, product_id: str) -> list[dict]:
    rows = conn.execute(
        """
        select
          ao.id,
          ao.merchant_id,
          ao.product_id,
          ao.gtin,
          ao.merchant_sku,
          ao.title,
          ao.price_cents,
          ao.old_price_cents,
          ao.currency,
          ao.availability,
          ao.stock_status,
          ao.product_url,
          ao.affiliate_url,
          ao.image_url,
          ao.delivery_days_min,
          ao.delivery_days_max,
          ao.last_seen_at,
          m.name as merchant_name,
          m.domain,
          m.affiliate_network,
          m.affiliate_program_id,
          m.logo_url
        from affiliate_offers ao
        join merchants m on m.id = ao.merchant_id
        where ao.product_id = %s
          and ao.active = true
          and m.active = true
          and lower(coalesce(ao.availability, 'in_stock')) in ('in_stock', 'available', 'op voorraad')
        order by ao.price_cents asc
        """,
        (product_id,),
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


@app.get("/merchants")
def list_merchants() -> Dict[str, Any]:
    with db() as conn:
        merchants = conn.execute(
            "select id, name, domain, affiliate_network, affiliate_program_id, logo_url, active from merchants order by name"
        ).fetchall()
        shipping_rules = conn.execute(
            """
            select id, merchant_id, country, base_shipping_cents, free_shipping_threshold_cents,
                   delivery_days_min, delivery_days_max, notes, last_checked_at
            from affiliate_shipping_rules
            """
        ).fetchall()
        return {"merchants": rows_json(merchants), "shipping_rules": rows_json(shipping_rules)}


# Backward-compatible endpoint name.
@app.get("/sellers")
def list_sellers() -> Dict[str, Any]:
    data = list_merchants()
    return {"sellers": data["merchants"], "shipping_rules": data["shipping_rules"]}


def ensure_active_cart(conn, user_id: str):
    cart = conn.execute(
        """
        select id, user_id, status
        from carts
        where user_id=%s and status='active'
        order by created_at desc
        limit 1
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
            on conflict (cart_id, product_id) do update
              set quantity = cart_items.quantity + excluded.quantity
            """,
            (cart["id"], product["id"], payload.quantity),
        )
        return {"product": row_json(product), "cart": cart_response(conn, payload.user_id)}


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
        select
          ci.quantity,
          p.id as product_id,
          p.gtin,
          p.name,
          p.brand,
          p.image_url,
          p.category,
          (
            select min(ao.price_cents)
            from affiliate_offers ao
            join merchants m on m.id = ao.merchant_id
            where ao.product_id=p.id and ao.active=true and m.active=true
          ) as min_price_cents
        from cart_items ci
        join products p on p.id = ci.product_id
        where ci.cart_id=%s
        order by ci.created_at
        """,
        (cart["id"],),
    ).fetchall()
    items = []
    for row in rows_json(rows):
        items.append(
            {
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
            }
        )
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
                on conflict (cart_id, product_id) do update set quantity = excluded.quantity
                """,
                (cart["id"], payload.product_id, payload.quantity),
            )
        return cart_response(conn, payload.user_id)


def get_shipping_rule(conn, merchant_id: str) -> dict:
    rule = conn.execute(
        """
        select base_shipping_cents, free_shipping_threshold_cents, delivery_days_min, delivery_days_max
        from affiliate_shipping_rules
        where merchant_id=%s and country='NL'
        order by last_checked_at desc, created_at desc
        limit 1
        """,
        (merchant_id,),
    ).fetchone()
    return row_json(rule) if rule else {"base_shipping_cents": 495, "free_shipping_threshold_cents": None}


def active_promotions_for_line(conn, merchant_id: str, product_id: str, gtin: str) -> list[dict]:
    rows = conn.execute(
        """
        select id, promotion_type, title, conditions_json, reward_json, affiliate_url
        from affiliate_promotions
        where merchant_id=%s
          and active=true
          and (product_id=%s or gtin=%s or (product_id is null and gtin is null))
          and (starts_at is null or starts_at <= now())
          and (ends_at is null or ends_at >= now())
        order by created_at desc
        """,
        (merchant_id, product_id, gtin),
    ).fetchall()
    return rows_json(rows)


def calculate_line_with_promotions(quantity: int, unit_price_cents: int, promotions: list[dict]) -> dict:
    subtotal = quantity * unit_price_cents
    best_discount = 0
    applied: list[dict] = []

    for promo in promotions:
        conditions = promo.get("conditions_json") or {}
        reward = promo.get("reward_json") or {}
        min_quantity = int(conditions.get("min_quantity", 1) or 1)
        if quantity < min_quantity:
            continue

        discount = 0
        promo_type = promo.get("promotion_type")

        if promo_type == "percentage_off":
            percentage = float(reward.get("percentage", 0) or 0)
            discount = round(subtotal * percentage / 100)
        elif promo_type == "amount_off":
            amount = int(reward.get("amount_cents", 0) or 0)
            discount = min(subtotal, amount * quantity)
        elif promo_type == "fixed_price":
            fixed_price = int(reward.get("fixed_price_cents", unit_price_cents) or unit_price_cents)
            discount = max(0, subtotal - fixed_price * quantity)
        elif promo_type == "buy_x_get_y_free":
            buy_qty = int(conditions.get("buy_quantity", 0) or 0)
            free_qty = int(conditions.get("free_quantity", 0) or 0)
            cycle = buy_qty + free_qty
            if buy_qty > 0 and free_qty > 0 and cycle > 0:
                full_cycles = quantity // cycle
                remainder = quantity % cycle
                free_units = full_cycles * free_qty + max(0, remainder - buy_qty)
                discount = min(quantity, free_units) * unit_price_cents
        elif promo_type == "bundle_price":
            bundle_qty = int(conditions.get("bundle_quantity", 0) or 0)
            bundle_price = int(reward.get("bundle_price_cents", 0) or 0)
            if bundle_qty > 0 and bundle_price > 0:
                bundles = quantity // bundle_qty
                remainder = quantity % bundle_qty
                normal = quantity * unit_price_cents
                bundled = bundles * bundle_price + remainder * unit_price_cents
                discount = max(0, normal - bundled)

        if discount > best_discount:
            best_discount = discount
            applied = [{"id": promo.get("id"), "title": promo.get("title"), "promotion_type": promo_type}]

    return {
        "line_subtotal_cents": subtotal,
        "discount_cents": best_discount,
        "line_total_cents": max(0, subtotal - best_discount),
        "applied_promotions": applied,
    }


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
        offers = get_offers_for_product(conn, item["id"])
        if not offers:
            raise ValueError(f"No affiliate offers available for {item['name']}")
        choices.append([(item, offer) for offer in offers])

    best = None
    for combination in cartesian_product(*choices):
        merchant_groups: dict[str, dict] = {}
        products_before_discount_cents = 0
        promotion_discount_cents = 0
        products_after_discount_cents = 0

        for cart_item, offer in combination:
            merchant = offer["merchant"]
            merchant_id = merchant["id"]
            quantity = cart_item["quantity"]
            promotions = active_promotions_for_line(conn, merchant_id, cart_item["id"], cart_item["gtin"])
            price_result = calculate_line_with_promotions(quantity, offer["price_cents"], promotions)

            products_before_discount_cents += price_result["line_subtotal_cents"]
            promotion_discount_cents += price_result["discount_cents"]
            products_after_discount_cents += price_result["line_total_cents"]

            group = merchant_groups.setdefault(
                merchant_id,
                {
                    "merchant": merchant,
                    "items": [],
                    "product_subtotal_cents": 0,
                    "promotion_discount_cents": 0,
                    "subtotal_cents": 0,
                    "delivery_days_max": 0,
                },
            )
            group["items"].append(
                {
                    "product": {
                        "id": cart_item["id"],
                        "gtin": cart_item["gtin"],
                        "name": cart_item["name"],
                        "brand": cart_item.get("brand"),
                        "image_url": cart_item.get("image_url"),
                        "category": cart_item.get("category"),
                    },
                    "quantity": quantity,
                    "unit_price_cents": offer["price_cents"],
                    "line_subtotal_cents": price_result["line_subtotal_cents"],
                    "discount_cents": price_result["discount_cents"],
                    "line_total_cents": price_result["line_total_cents"],
                    "applied_promotions": price_result["applied_promotions"],
                    "product_url": offer["product_url"],
                    "affiliate_url": offer["affiliate_url"],
                }
            )
            group["product_subtotal_cents"] += price_result["line_subtotal_cents"]
            group["promotion_discount_cents"] += price_result["discount_cents"]
            group["subtotal_cents"] += price_result["line_total_cents"]
            group["delivery_days_max"] = max(group["delivery_days_max"], offer.get("delivery_days_max") or 3)

        shipping_cents = 0
        merchant_lines = []
        for merchant_id, line in merchant_groups.items():
            rule = get_shipping_rule(conn, merchant_id)
            threshold = rule.get("free_shipping_threshold_cents")
            base = rule.get("base_shipping_cents") or 0
            merchant_shipping = 0 if threshold and line["subtotal_cents"] >= threshold else base
            shipping_cents += merchant_shipping
            line_total = line["subtotal_cents"] + merchant_shipping
            merchant_lines.append(
                {
                    **line,
                    "shipping_cents": merchant_shipping,
                    "total_cents": line_total,
                    "carrier": "PostNL",
                    "redirect_path": None,  # filled after optimization id is created
                }
            )

        total_cents = products_after_discount_cents + shipping_cents
        if best is None or total_cents < best["total_cents"]:
            best = {
                "id": str(uuid4()),
                "checkout_mode": "affiliate_redirects",
                "products_cents": products_after_discount_cents,
                "products_before_discount_cents": products_before_discount_cents,
                "promotion_discount_cents": promotion_discount_cents,
                "shipping_cents": shipping_cents,
                "total_cents": total_cents,
                "selected_merchants_count": len(merchant_lines),
                "selected_sellers_count": len(merchant_lines),  # backward-compatible alias
                "merchant_lines": merchant_lines,
                "seller_lines": merchant_lines,  # backward-compatible alias
                "generated_at": datetime.utcnow().isoformat() + "Z",
            }

    for line in best["merchant_lines"]:
        line["redirect_path"] = f"/affiliate/redirect/{best['id']}/{line['merchant']['id']}"
    best["seller_lines"] = best["merchant_lines"]
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


def add_tracking_params(url: str, sub_id: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("subId", sub_id)
    query.setdefault("utm_source", "scanner_app")
    query.setdefault("utm_medium", "affiliate")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


@app.get("/affiliate/redirect/{optimization_id}/{merchant_id}")
def affiliate_redirect(optimization_id: str, merchant_id: str):
    with db() as conn:
        optimization_row = conn.execute(
            "select user_id, result_json from cart_optimizations where id=%s",
            (optimization_id,),
        ).fetchone()
        if not optimization_row:
            raise HTTPException(status_code=404, detail="Optimization not found")

        optimization = optimization_row["result_json"]
        line = next(
            (line for line in optimization.get("merchant_lines", []) if str(line["merchant"]["id"]) == str(merchant_id)),
            None,
        )
        if not line:
            raise HTTPException(status_code=404, detail="Merchant not found in optimization")

        # MVP fallback: open the first product's affiliate URL. Later, replace this with merchant-specific cart deeplinks.
        first_item = line["items"][0]
        base_url = first_item.get("affiliate_url") or first_item.get("product_url")
        if not base_url:
            raise HTTPException(status_code=404, detail="Affiliate URL missing")

        sub_id = f"opt_{optimization_id}_m_{merchant_id}_{uuid4().hex[:8]}"
        redirect_url = add_tracking_params(base_url, sub_id)
        conn.execute(
            """
            insert into affiliate_clicks (user_id, optimization_id, merchant_id, affiliate_url, sub_id)
            values (%s, %s, %s, %s, %s)
            """,
            (optimization_row["user_id"], optimization_id, merchant_id, redirect_url, sub_id),
        )
        return RedirectResponse(redirect_url, status_code=302)


@app.post("/checkout")
def checkout_deprecated() -> Dict[str, Any]:
    raise HTTPException(
        status_code=410,
        detail="Checkout is disabled in affiliate mode. Use merchant redirect links from the optimization result.",
    )


@app.get("/orders/{user_id}")
def list_orders(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    return {"orders": [], "mode": "affiliate_redirects"}


@app.get("/shipments/{user_id}")
def list_shipments(user_id: str, auth_user: dict = Depends(require_auth)) -> Dict[str, Any]:
    assert_same_user(user_id, auth_user)
    with db() as conn:
        ensure_user_profile(conn, auth_user)
        return {"shipments": shipments_for_user(conn, user_id)}


def shipments_for_user(conn, user_id: str) -> list[dict]:
    rows = conn.execute(
        """
        select id, user_id, order_id, suborder_id, carrier, tracking_code, description, status, eta, created_at,
               null as seller_id,
               null as seller_name
        from shipments
        where user_id=%s
        order by coalesce(eta, '9999-12-31') asc, created_at desc
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
        return {"shipment": row_json(shipment), "shipments": shipments_for_user(conn, payload.user_id)}
