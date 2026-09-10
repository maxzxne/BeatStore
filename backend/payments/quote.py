"""Server-side price quote. Never take OutSum from the browser as truth."""
from __future__ import annotations

import json
from typing import Any

from models import Beat, Course, ServiceOrder


class QuoteError(ValueError):
    pass


def beat_unit_price(beat: Beat, purchase_type: str) -> float:
    if purchase_type == "mp3":
        value = getattr(beat, "price_mp3", None)
    elif purchase_type == "wav":
        value = getattr(beat, "price_wav", None)
    elif purchase_type == "exclusive":
        value = getattr(beat, "price_exclusive", None)
    else:
        raise QuoteError("Неизвестный тип лицензии")
    if value is None:
        value = beat.price
    return float(value or 0)


def _deadline_price(deadline_days: int | None, prepayment_percent: int) -> float:
    if not deadline_days:
        return 0
    days = int(deadline_days)
    prices = {
        50: {14: 25000, 7: 35000, 2: 40000, 1: 50000, "7-14": 30000},
        100: {14: 20000, 7: 30000, 2: 35000, 1: 45000, "7-14": 25000},
    }
    table = prices.get(int(prepayment_percent) or 50) or prices[50]
    if 14 <= days <= 21:
        return float(table[14])
    if 7 < days < 14:
        return float(table["7-14"])
    if days == 7:
        return float(table[7])
    if 2 <= days <= 3:
        return float(table[2])
    if days == 1:
        return float(table[1])
    return float(table[14])


def service_order_amount(order: ServiceOrder) -> float:
    percent = int(order.prepayment_percent or 50)
    if order.price:
        return round(float(order.price) * percent / 100, 2)
    categories = []
    if order.service_categories:
        try:
            categories = json.loads(order.service_categories)
        except json.JSONDecodeError:
            categories = []
    if not categories and order.service_category:
        categories = [order.service_category]
    total = 0.0
    for category in categories:
        if category == "бит в стиле трэп":
            total += 15000
        else:
            total += _deadline_price(order.deadline_days, percent)
    return round(total * percent / 100, 2)


def description_for(kind: str, extra: str = "") -> str:
    labels = {
        "beat": "Бит XWinner",
        "cart": "Корзина XWinner",
        "course": "Курс XWinner",
        "order": "Заказ услуги XWinner",
    }
    base = labels.get(kind, "Оплата XWinner")
    return f"{base} {extra}".strip()[:100]


def payload_dict(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}
