from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List
from uuid import uuid4


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


PRODUCTS: Dict[str, Dict[str, Any]] = {
    "prod_toothpaste": {
        "id": "prod_toothpaste",
        "gtin": "8710000000011",
        "brand": "MintFresh",
        "name": "MintFresh Tandpasta 75ml",
        "category": "Drogisterij",
        "image_url": "https://dummyimage.com/600x400/f5f5f5/111111&text=Tandpasta",
    },
    "prod_shampoo": {
        "id": "prod_shampoo",
        "gtin": "8710000000028",
        "brand": "DailyCare",
        "name": "DailyCare Shampoo 300ml",
        "category": "Drogisterij",
        "image_url": "https://dummyimage.com/600x400/f5f5f5/111111&text=Shampoo",
    },
    "prod_detergent": {
        "id": "prod_detergent",
        "gtin": "8710000000035",
        "brand": "CleanHome",
        "name": "CleanHome Wasmiddel 1L",
        "category": "Huishouden",
        "image_url": "https://dummyimage.com/600x400/f5f5f5/111111&text=Wasmiddel",
    },
    "prod_toiletpaper": {
        "id": "prod_toiletpaper",
        "gtin": "8710000000042",
        "brand": "SoftRoll",
        "name": "SoftRoll Toiletpapier 8 rollen",
        "category": "Huishouden",
        "image_url": "https://dummyimage.com/600x400/f5f5f5/111111&text=Toiletpapier",
    },
    "prod_mouthwash": {
        "id": "prod_mouthwash",
        "gtin": "8710000000059",
        "brand": "BrightSmile",
        "name": "BrightSmile Mondwater 500ml",
        "category": "Drogisterij",
        "image_url": "https://dummyimage.com/600x400/f5f5f5/111111&text=Mondwater",
    },
}

SELLERS: Dict[str, Dict[str, Any]] = {
    "seller_a": {
        "id": "seller_a",
        "company_name": "VoordeelDrogist",
        "support_email": "support@voordeeldrogist.example",
        "commission_rate": 0.08,
        "verification_status": "verified",
    },
    "seller_b": {
        "id": "seller_b",
        "company_name": "HomeBasics",
        "support_email": "support@homebasics.example",
        "commission_rate": 0.075,
        "verification_status": "verified",
    },
    "seller_c": {
        "id": "seller_c",
        "company_name": "BudgetCare",
        "support_email": "support@budgetcare.example",
        "commission_rate": 0.09,
        "verification_status": "verified",
    },
}

SHIPPING_RULES: Dict[str, Dict[str, Any]] = {
    "seller_a": {
        "seller_id": "seller_a",
        "base_shipping_cents": 395,
        "free_shipping_threshold_cents": 2500,
        "carrier": "PostNL",
    },
    "seller_b": {
        "seller_id": "seller_b",
        "base_shipping_cents": 495,
        "free_shipping_threshold_cents": 3000,
        "carrier": "DHL",
    },
    "seller_c": {
        "seller_id": "seller_c",
        "base_shipping_cents": 295,
        "free_shipping_threshold_cents": 2000,
        "carrier": "PostNL",
    },
}

OFFERS: List[Dict[str, Any]] = [
    {"id": "offer_1", "seller_id": "seller_a", "product_id": "prod_toothpaste", "price_cents": 249, "stock_quantity": 40, "delivery_days_min": 1, "delivery_days_max": 2},
    {"id": "offer_2", "seller_id": "seller_b", "product_id": "prod_toothpaste", "price_cents": 219, "stock_quantity": 9, "delivery_days_min": 2, "delivery_days_max": 3},
    {"id": "offer_3", "seller_id": "seller_c", "product_id": "prod_toothpaste", "price_cents": 239, "stock_quantity": 18, "delivery_days_min": 1, "delivery_days_max": 4},

    {"id": "offer_4", "seller_id": "seller_a", "product_id": "prod_shampoo", "price_cents": 399, "stock_quantity": 20, "delivery_days_min": 1, "delivery_days_max": 2},
    {"id": "offer_5", "seller_id": "seller_b", "product_id": "prod_shampoo", "price_cents": 379, "stock_quantity": 14, "delivery_days_min": 2, "delivery_days_max": 3},
    {"id": "offer_6", "seller_id": "seller_c", "product_id": "prod_shampoo", "price_cents": 429, "stock_quantity": 22, "delivery_days_min": 1, "delivery_days_max": 4},

    {"id": "offer_7", "seller_id": "seller_a", "product_id": "prod_detergent", "price_cents": 649, "stock_quantity": 16, "delivery_days_min": 1, "delivery_days_max": 2},
    {"id": "offer_8", "seller_id": "seller_b", "product_id": "prod_detergent", "price_cents": 599, "stock_quantity": 8, "delivery_days_min": 2, "delivery_days_max": 3},
    {"id": "offer_9", "seller_id": "seller_c", "product_id": "prod_detergent", "price_cents": 629, "stock_quantity": 8, "delivery_days_min": 1, "delivery_days_max": 4},

    {"id": "offer_10", "seller_id": "seller_a", "product_id": "prod_toiletpaper", "price_cents": 549, "stock_quantity": 30, "delivery_days_min": 1, "delivery_days_max": 2},
    {"id": "offer_11", "seller_id": "seller_b", "product_id": "prod_toiletpaper", "price_cents": 519, "stock_quantity": 10, "delivery_days_min": 2, "delivery_days_max": 3},
    {"id": "offer_12", "seller_id": "seller_c", "product_id": "prod_toiletpaper", "price_cents": 579, "stock_quantity": 7, "delivery_days_min": 1, "delivery_days_max": 4},

    {"id": "offer_13", "seller_id": "seller_a", "product_id": "prod_mouthwash", "price_cents": 329, "stock_quantity": 10, "delivery_days_min": 1, "delivery_days_max": 2},
    {"id": "offer_14", "seller_id": "seller_b", "product_id": "prod_mouthwash", "price_cents": 299, "stock_quantity": 10, "delivery_days_min": 2, "delivery_days_max": 3},
    {"id": "offer_15", "seller_id": "seller_c", "product_id": "prod_mouthwash", "price_cents": 319, "stock_quantity": 12, "delivery_days_min": 1, "delivery_days_max": 4},
]

USERS: Dict[str, Dict[str, Any]] = {}
PASSWORDS: Dict[str, str] = {}
CARTS: Dict[str, Dict[str, int]] = {}
OPTIMIZATIONS: Dict[str, Dict[str, Any]] = {}
ORDERS: Dict[str, Dict[str, Any]] = {}
SHIPMENTS: Dict[str, Dict[str, Any]] = {}


def get_product_by_gtin(gtin: str) -> Dict[str, Any] | None:
    for product in PRODUCTS.values():
        if product["gtin"] == gtin:
            return product
    return None


def eta_from_days(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()
