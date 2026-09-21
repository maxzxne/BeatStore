"""Load storefront sales and personal promo codes for quoting."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
import secrets

from sqlalchemy.orm import Session

from models import PaymentIntent, PromoCode, SaleCampaign
from payments.discounts import (
    apply_sale_then_promo,
    is_sale_active,
    pick_best_sale,
    sale_snapshot,
)
from payments.quote import QuoteError


def load_active_sales(db: Session, now: Optional[datetime] = None) -> list[SaleCampaign]:
    moment = now or datetime.utcnow()
    rows = db.query(SaleCampaign).filter(SaleCampaign.enabled == True).all()  # noqa: E712
    return [row for row in rows if is_sale_active(row, moment)]


def price_after_sale(
    list_amount: float,
    catalog_scope: str,
    sales: list[SaleCampaign],
    now: Optional[datetime] = None,
) -> tuple[Any, float]:
    return pick_best_sale(list_amount, sales, catalog_scope, now)


def checkout_pay(
    list_amount: float,
    catalog_scope: str,
    sales: list[SaleCampaign],
    promo: Optional[PromoCode] = None,
    now: Optional[datetime] = None,
) -> tuple[float, Any]:
    sale, after_sale = pick_best_sale(list_amount, sales, catalog_scope, now)
    pay = apply_sale_then_promo(list_amount, sale, promo)
    return pay, sale


def mixed_cart_pay(
    beat_lines: list[float],
    course_lines: list[float],
    sales: list[SaleCampaign],
    promo: Optional[PromoCode] = None,
    now: Optional[datetime] = None,
) -> float:
    listed = 0.0
    after_sale = 0.0
    for amount in beat_lines:
        listed += float(amount or 0)
        _, pay = pick_best_sale(amount, sales, "beats", now)
        after_sale += pay
    for amount in course_lines:
        listed += float(amount or 0)
        _, pay = pick_best_sale(amount, sales, "courses", now)
        after_sale += pay
    return _promo_on_after_sale(listed, after_sale, promo)


def _promo_on_after_sale(listed: float, after_sale: float, promo: Optional[PromoCode]) -> float:
    from payments.discounts import apply_kind, finalize_pay

    reduced = apply_kind(after_sale, getattr(promo, "kind", None), getattr(promo, "value", None)) if promo else after_sale
    return finalize_pay(listed, reduced)


def generate_promo_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def normalize_promo_code(raw: Any) -> str:
    return str(raw or "").strip().upper()


def resolve_promo(db: Session, user: Any, raw_code: Any) -> Optional[PromoCode]:
    code = normalize_promo_code(raw_code)
    if not code:
        return None
    if not user:
        raise QuoteError("Войдите, чтобы применить промокод")
    promo = db.query(PromoCode).filter(PromoCode.code == code).first()
    if not promo or promo.user_id != user.id:
        raise QuoteError("Промокод недействителен")
    if promo.used_at is not None:
        raise QuoteError("Промокод уже использован")
    if promo.reserved_intent_id:
        intent = db.query(PaymentIntent).filter(PaymentIntent.id == promo.reserved_intent_id).first()
        if intent is not None and intent.status == "pending":
            raise QuoteError("Промокод уже применяется в другой оплате")
    return promo


def reserve_promo(db: Session, promo: Optional[PromoCode], intent: PaymentIntent) -> None:
    if promo is None:
        return
    promo.reserved_intent_id = intent.id
    promo.reserved_at = datetime.utcnow()
    db.commit()


def consume_promo_for_intent(db: Session, intent: PaymentIntent) -> None:
    from payments.quote import payload_dict

    payload = payload_dict(intent.payload)
    promo_id = payload.get("promo_id")
    if not promo_id:
        return
    promo = db.query(PromoCode).filter(PromoCode.id == int(promo_id)).first()
    if not promo or promo.used_at is not None:
        return
    promo.used_at = datetime.utcnow()
    promo.used_intent_id = intent.id
    promo.reserved_intent_id = None
    promo.reserved_at = None


def release_promo_for_intent(db: Session, intent: PaymentIntent) -> None:
    rows = db.query(PromoCode).filter(PromoCode.reserved_intent_id == intent.id).all()
    for promo in rows:
        if promo.used_at is None:
            promo.reserved_intent_id = None
            promo.reserved_at = None


def decorate_price(list_amount: float, catalog_scope: str, sales: list[SaleCampaign]) -> dict:
    sale, pay = pick_best_sale(list_amount, sales, catalog_scope)
    listed = float(list_amount or 0)
    if sale is None or pay >= listed:
        return {"price": listed, "price_was": None, "sale": None}
    return {"price": pay, "price_was": listed, "sale": sale_snapshot(sale)}


def overlay_sale_on_mapping(data: dict, keys: list[str], catalog_scope: str, sales: list[SaleCampaign]) -> dict:
    for key in keys:
        if data.get(key) is None:
            continue
        listed = float(data[key] or 0)
        sale, pay = pick_best_sale(listed, sales, catalog_scope)
        if sale is not None and pay < listed:
            data[f"{key}_was"] = listed
            data[key] = pay
    return data
