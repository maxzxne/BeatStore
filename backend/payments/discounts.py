"""Storefront sale then personal promo. Amounts never come from the browser."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable, Optional

SALE_SCOPES = frozenset({"all", "beats", "courses", "services"})
DISCOUNT_KINDS = frozenset({"percent", "amount"})
PAY_FLOOR = 1.0


def apply_kind(amount: float, kind: str | None, value: float | None) -> float:
    price = float(amount or 0)
    off = float(value or 0)
    if price <= 0 or off <= 0:
        return round(max(0.0, price), 2)
    if kind == "percent":
        ratio = min(off, 100.0) / 100.0
        return round(max(0.0, price * (1.0 - ratio)), 2)
    if kind == "amount":
        return round(max(0.0, price - off), 2)
    return round(price, 2)


def finalize_pay(list_amount: float, after_discounts: float) -> float:
    listed = float(list_amount or 0)
    if listed <= 0:
        return 0.0
    return round(max(PAY_FLOOR, float(after_discounts or 0)), 2)


def is_sale_active(sale: Any, now: Optional[datetime] = None) -> bool:
    if not getattr(sale, "enabled", False):
        return False
    moment = now or datetime.utcnow()
    starts = getattr(sale, "starts_at", None)
    ends = getattr(sale, "ends_at", None)
    if starts is not None and starts > moment:
        return False
    if ends is not None and ends < moment:
        return False
    return True


def sale_applies(sale: Any, catalog_scope: str) -> bool:
    scope = getattr(sale, "scope", None)
    if scope == "all":
        return True
    return scope == catalog_scope


def pick_best_sale(
    amount: float,
    sales: Iterable[Any],
    catalog_scope: str,
    now: Optional[datetime] = None,
) -> tuple[Any | None, float]:
    listed = float(amount or 0)
    best_sale = None
    best_pay = listed
    for sale in sales:
        if not is_sale_active(sale, now):
            continue
        if not sale_applies(sale, catalog_scope):
            continue
        pay = apply_kind(listed, getattr(sale, "kind", None), getattr(sale, "value", None))
        if pay < best_pay:
            best_pay = pay
            best_sale = sale
    return best_sale, round(best_pay, 2)


def apply_sale_then_promo(list_amount: float, sale: Any | None, promo: Any | None) -> float:
    listed = float(list_amount or 0)
    after_sale = (
        apply_kind(listed, getattr(sale, "kind", None), getattr(sale, "value", None))
        if sale is not None
        else listed
    )
    after_promo = (
        apply_kind(after_sale, getattr(promo, "kind", None), getattr(promo, "value", None))
        if promo is not None
        else after_sale
    )
    return finalize_pay(listed, after_promo)


def sale_snapshot(sale: Any | None) -> dict | None:
    if sale is None:
        return None
    return {
        "id": getattr(sale, "id", None),
        "scope": getattr(sale, "scope", None),
        "kind": getattr(sale, "kind", None),
        "value": getattr(sale, "value", None),
    }
