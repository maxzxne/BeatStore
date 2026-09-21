"""Create PaymentIntent and return a Robokassa hosted checkout URL."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from models import Beat, Course, PaymentIntent, ServiceOrder, User
from cart_rules import drop_owned_cart_items, user_owns_beat, user_owns_course
from payments import config
from payments.pricing import (
    checkout_pay,
    load_active_sales,
    mixed_cart_pay,
    reserve_promo,
    resolve_promo,
    sale_snapshot,
)
from payments.quote import (
    QuoteError,
    beat_unit_price,
    description_for,
    service_order_amount,
)
from payments.robokassa import hosted_checkout_url


class PaymentError(ValueError):
    pass


def public_config() -> dict:
    return {
        "provider": config.provider_name(),
        "test": config.is_test(),
        "robokassa": config.use_hosted_robokassa(),
        "local_terminal": False,
    }


def create_checkout(db: Session, user: User | None, body: dict) -> dict:
    kind = (body.get("kind") or body.get("type") or "").strip()
    if kind not in {"beat", "cart", "course", "order"}:
        raise PaymentError("Неизвестный тип оплаты")

    try:
        payload, amount, description, promo = _quote(db, user, kind, body)
    except QuoteError as exc:
        raise PaymentError(str(exc)) from exc
    if amount <= 0:
        raise PaymentError("Нечего оплачивать")

    intent = PaymentIntent(
        user_id=user.id if user else None,
        kind=kind,
        payload=json.dumps(payload, ensure_ascii=False),
        amount=amount,
        status="pending",
        provider=config.provider_name(),
        description=description,
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)
    reserve_promo(db, promo, intent)

    if not config.use_hosted_robokassa():
        raise PaymentError("Эквайринг не настроен")

    url = hosted_checkout_url(
        inv_id=intent.id,
        amount=amount,
        description=description,
    )

    return {
        "inv_id": intent.id,
        "amount": amount,
        "checkout_url": url,
        "test": config.is_test(),
        "local_terminal": False,
        "status": intent.status,
    }


def preview_checkout(db: Session, user: User | None, body: dict) -> dict:
    kind = (body.get("kind") or body.get("type") or "").strip()
    if kind not in {"beat", "cart", "course", "order"}:
        raise PaymentError("Неизвестный тип оплаты")
    try:
        payload, amount, description, promo = _quote(db, user, kind, body)
    except QuoteError as exc:
        raise PaymentError(str(exc)) from exc
    return {
        "amount": amount,
        "list_amount": payload.get("list_amount"),
        "promo_code": None if promo is None else promo.code,
        "description": description,
    }


def intent_view(intent: PaymentIntent) -> dict:
    return {
        "inv_id": intent.id,
        "kind": intent.kind,
        "amount": intent.amount,
        "status": intent.status,
        "description": intent.description,
        "error": intent.error_message,
        "test": config.is_test(),
        "paid": intent.status == "paid",
    }


def _quote(db: Session, user: User | None, kind: str, body: dict) -> tuple[dict, float, str, object]:
    sales = load_active_sales(db)
    promo = resolve_promo(db, user, body.get("promo_code"))
    promo_fields = (
        {"promo_id": promo.id, "promo_code": promo.code}
        if promo is not None
        else {}
    )

    if kind == "beat":
        if not user:
            raise PaymentError("Войдите, чтобы купить бит")
        beat_id = int(body.get("item_id") or 0)
        purchase_type = body.get("purchase_type") or "mp3"
        beat = db.query(Beat).filter(Beat.id == beat_id).first()
        if not beat or not beat.is_available:
            raise PaymentError("Бит недоступен")
        if user_owns_beat(db, user.id, beat_id):
            raise PaymentError("Бит уже куплен")
        listed = beat_unit_price(beat, purchase_type)
        amount, sale = checkout_pay(listed, "beats", sales, promo)
        payload = {
            "item_id": beat_id,
            "purchase_type": purchase_type,
            "list_amount": listed,
            "sale": sale_snapshot(sale),
            **promo_fields,
        }
        return payload, amount, description_for("beat", beat.title), promo

    if kind == "course":
        if not user:
            raise PaymentError("Войдите, чтобы купить курс")
        course_id = int(body.get("item_id") or 0)
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course or not course.is_available:
            raise PaymentError("Курс недоступен")
        if user_owns_course(db, user.id, course_id):
            raise PaymentError("Курс уже куплен")
        listed = float(course.price or 0)
        amount, sale = checkout_pay(listed, "courses", sales, promo)
        payload = {
            "item_id": course_id,
            "list_amount": listed,
            "sale": sale_snapshot(sale),
            **promo_fields,
        }
        return payload, amount, description_for("course", course.title), promo

    if kind == "cart":
        if not user:
            raise PaymentError("Войдите, чтобы оплатить корзину")
        formats = body.get("beats_formats") or {}
        if isinstance(formats, list):
            formats = {str(item.get("id")): item.get("format") or "mp3" for item in formats}
        drop_owned_cart_items(db, user)
        beat_lines = []
        for beat in user.cart_items:
            purchase_type = str(formats.get(str(beat.id)) or formats.get(beat.id) or "mp3")
            beat_lines.append(beat_unit_price(beat, purchase_type))
        course_lines = [float(course.price or 0) for course in user.course_cart_items]
        amount = mixed_cart_pay(beat_lines, course_lines, sales, promo)
        payload = {
            "beats_formats": {str(k): v for k, v in formats.items()},
            "list_amount": round(sum(beat_lines) + sum(course_lines), 2),
            **promo_fields,
        }
        return payload, amount, description_for("cart"), promo

    if kind == "order":
        order_id = int(body.get("order_id") or 0)
        order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
        if not order:
            raise PaymentError("Заказ не найден")
        if user and order.user_id and order.user_id != user.id and not user.is_admin:
            raise PaymentError("Это не ваш заказ")
        listed = service_order_amount(order)
        amount, sale = checkout_pay(listed, "services", sales, promo)
        payload = {
            "order_id": order_id,
            "list_amount": listed,
            "sale": sale_snapshot(sale),
            **promo_fields,
        }
        return payload, amount, description_for("order", f"#{order_id}"), promo

    raise PaymentError("Неизвестный тип оплаты")
