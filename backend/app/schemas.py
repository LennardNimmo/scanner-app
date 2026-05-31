from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    user_id: str
    gtin: str
    quantity: int = Field(default=1, ge=1)


class CartItemUpdateRequest(BaseModel):
    user_id: str
    product_id: str
    quantity: int = Field(default=1, ge=0)


class ManualShipmentRequest(BaseModel):
    user_id: str
    carrier: str
    tracking_code: str
    description: str
    eta: Optional[str] = None


# Kept for backward compatibility with older admin/debug tooling.
# The affiliate model no longer uses marketplace checkout or seller payouts.
class CheckoutRequest(BaseModel):
    user_id: str
    optimization_id: str
    payment_method: str = "affiliate_redirect"


class SellerOfferUpdateRequest(BaseModel):
    seller_id: str
    product_id: str
    price_cents: int
    stock_quantity: int
    delivery_days_min: int = 1
    delivery_days_max: int = 3


class AffiliateOfferUpsertRequest(BaseModel):
    merchant_id: str
    product_id: str
    gtin: str
    title: str
    price_cents: int
    old_price_cents: Optional[int] = None
    currency: str = "EUR"
    availability: str = "in_stock"
    stock_status: str = "in_stock"
    product_url: str
    affiliate_url: str
    merchant_sku: Optional[str] = None
    image_url: Optional[str] = None
    delivery_days_min: int = 1
    delivery_days_max: int = 3
