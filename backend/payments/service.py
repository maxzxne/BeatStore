"""Create PaymentIntent and return a Robokassa hosted checkout URL."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from models import Beat, Course, PaymentIntent, ServiceOrder, User
from cart_rules import drop_owned_cart_items, user_owns_beat, user_owns_course
from payments import config
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

    payload, amount, description = _quote(db, user, kind, body)
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


def _quote(db: Session, user: User | None, kind: str, body: dict) -> tuple[dict, float, str]:
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
        amount = beat_unit_price(beat, purchase_type)
        payload = {"item_id": beat_id, "purchase_type": purchase_type}
        return payload, amount, description_for("beat", beat.title)

    if kind == "course":
        if not user:
            raise PaymentError("Войдите, чтобы купить курс")
        course_id = int(body.get("item_id") or 0)
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course or not course.is_available:
            raise PaymentError("Курс недоступен")
        if user_owns_course(db, user.id, course_id):
            raise PaymentError("Курс уже куплен")
        payload = {"item_id": course_id}
        return payload, float(course.price or 0), description_for("course", course.title)

    if kind == "cart":
        if not user:
            raise PaymentError("Войдите, чтобы оплатить корзину")
        formats = body.get("beats_formats") or {}
        if isinstance(formats, list):
            formats = {str(item.get("id")): item.get("format") or "mp3" for item in formats}
        drop_owned_cart_items(db, user)
        amount = 0.0
        for beat in user.cart_items:
            purchase_type = str(formats.get(str(beat.id)) or formats.get(beat.id) or "mp3")
            amount += beat_unit_price(beat, purchase_type)
        for course in user.course_cart_items:
            amount += float(course.price or 0)
        payload = {"beats_formats": {str(k): v for k, v in formats.items()}}
        return payload, amount, description_for("cart")

    if kind == "order":
        order_id = int(body.get("order_id") or 0)
        order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
        if not order:
            raise PaymentError("Заказ не найден")
        if user and order.user_id and order.user_id != user.id and not user.is_admin:
            raise PaymentError("Это не ваш заказ")
        amount = service_order_amount(order)
        payload = {"order_id": order_id}
        return payload, amount, description_for("order", f"#{order_id}")

    raise PaymentError("Неизвестный тип оплаты")
