from __future__ import annotations

from itertools import product as cartesian_product
from typing import Any, Dict, List, Tuple

from .mock_data import OFFERS, PRODUCTS, SELLERS, SHIPPING_RULES, uid


def _offers_for_product(product_id: str, quantity: int) -> List[Dict[str, Any]]:
    return [
        offer
        for offer in OFFERS
        if offer["product_id"] == product_id and offer["stock_quantity"] >= quantity
    ]


def _shipping_for_seller(seller_id: str, seller_subtotal_cents: int) -> int:
    rule = SHIPPING_RULES[seller_id]
    threshold = rule.get("free_shipping_threshold_cents")
    if threshold is not None and seller_subtotal_cents >= threshold:
        return 0
    return rule["base_shipping_cents"]


def optimize_cart(cart_items: Dict[str, int]) -> Dict[str, Any]:
    """Find the cheapest combination of offers for cart_items.

    cart_items maps product_id -> quantity.
    This brute-force optimizer is intentionally simple and reliable for MVP carts.
    Replace with integer linear programming when carts or seller counts grow.
    """
    if not cart_items:
        raise ValueError("Cart is empty")

    offer_groups: List[List[Dict[str, Any]]] = []
    for product_id, quantity in cart_items.items():
        offers = _offers_for_product(product_id, quantity)
        if not offers:
            product_name = PRODUCTS.get(product_id, {}).get("name", product_id)
            raise ValueError(f"No in-stock offers for {product_name}")
        offer_groups.append(offers)

    best: Dict[str, Any] | None = None

    for combination in cartesian_product(*offer_groups):
        seller_lines: Dict[str, Dict[str, Any]] = {}
        products_cents = 0

        for offer in combination:
            product_id = offer["product_id"]
            quantity = cart_items[product_id]
            line_total = offer["price_cents"] * quantity
            products_cents += line_total

            seller_id = offer["seller_id"]
            seller_lines.setdefault(
                seller_id,
                {
                    "seller": SELLERS[seller_id],
                    "items": [],
                    "subtotal_cents": 0,
                    "shipping_cents": 0,
                    "carrier": SHIPPING_RULES[seller_id]["carrier"],
                    "delivery_days_max": 0,
                },
            )
            seller_lines[seller_id]["items"].append(
                {
                    "product": PRODUCTS[product_id],
                    "quantity": quantity,
                    "unit_price_cents": offer["price_cents"],
                    "line_total_cents": line_total,
                    "offer_id": offer["id"],
                }
            )
            seller_lines[seller_id]["subtotal_cents"] += line_total
            seller_lines[seller_id]["delivery_days_max"] = max(
                seller_lines[seller_id]["delivery_days_max"],
                offer["delivery_days_max"],
            )

        shipping_cents = 0
        for seller_id, seller_line in seller_lines.items():
            seller_shipping = _shipping_for_seller(seller_id, seller_line["subtotal_cents"])
            seller_line["shipping_cents"] = seller_shipping
            shipping_cents += seller_shipping

        total_cents = products_cents + shipping_cents
        candidate = {
            "id": uid("opt"),
            "products_cents": products_cents,
            "shipping_cents": shipping_cents,
            "total_cents": total_cents,
            "selected_sellers_count": len(seller_lines),
            "seller_lines": list(seller_lines.values()),
        }

        if best is None:
            best = candidate
            continue

        # Tie breaker: prefer fewer sellers/packages, then faster max delivery.
        best_max_delivery = max(line["delivery_days_max"] for line in best["seller_lines"])
        cand_max_delivery = max(line["delivery_days_max"] for line in candidate["seller_lines"])
        if (
            candidate["total_cents"],
            candidate["selected_sellers_count"],
            cand_max_delivery,
        ) < (
            best["total_cents"],
            best["selected_sellers_count"],
            best_max_delivery,
        ):
            best = candidate

    assert best is not None
    return best
