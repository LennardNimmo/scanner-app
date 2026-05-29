from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: Dict


class ScanRequest(BaseModel):
    user_id: str
    gtin: str
    quantity: int = 1


class CartItemUpdateRequest(BaseModel):
    user_id: str
    product_id: str
    quantity: int = 1


class CheckoutRequest(BaseModel):
    user_id: str
    optimization_id: str
    payment_method: str = "mock"


class ManualShipmentRequest(BaseModel):
    user_id: str
    carrier: str
    tracking_code: str
    description: str
    eta: Optional[str] = None


class SellerOfferUpdateRequest(BaseModel):
    seller_id: str
    product_id: str
    price_cents: int
    stock_quantity: int
    delivery_days_min: int = 1
    delivery_days_max: int = 3
