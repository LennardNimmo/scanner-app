from __future__ import annotations

from typing import Any, Dict
from .mock_data import uid


def authorize_mock_payment(total_cents: int, user_id: str) -> Dict[str, Any]:
    return {
        "provider": "mock",
        "payment_intent_id": uid("pay"),
        "status": "authorized",
        "amount_cents": total_cents,
        "user_id": user_id,
    }


def capture_mock_payment(payment_intent_id: str) -> Dict[str, Any]:
    return {
        "provider": "mock",
        "payment_intent_id": payment_intent_id,
        "status": "captured",
    }


def calculate_platform_fee(subtotal_cents: int, commission_rate: float) -> int:
    return round(subtotal_cents * commission_rate)
