"""Grant catalog access after a verified payment. Idempotent."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from models import (
    AdOrder,
    Beat,
    Course,
    CoursePurchase,
    PaymentIntent,
    PromoBanner,
    Purchase,
    ServiceOrder,
    User,
    cart_table,
    course_cart_table,
)
from cart_rules import drop_owned_cart_items
from payments.pricing import consume_promo_for_intent, release_promo_for_intent
from payments.quote import beat_unit_price, payload_dict


def fulfill_intent(db: Session, intent: PaymentIntent) -> PaymentIntent:
    if intent.status == "paid":
        return intent
    if intent.status != "pending":
        return intent

    payload = payload_dict(intent.payload)
    if intent.kind == "beat":
        _fulfill_beat(db, intent, payload)
    elif intent.kind == "course":
        _fulfill_course(db, intent, payload)
    elif intent.kind == "cart":
        _fulfill_cart(db, intent, payload)
    elif intent.kind == "order":
        _fulfill_order(db, intent, payload)
    elif intent.kind == "ads":
        _fulfill_ads(db, intent, payload)

    intent.status = "paid"
    intent.paid_at = datetime.utcnow()
    consume_promo_for_intent(db, intent)
    db.commit()
    db.refresh(intent)
    _notify_telegram_purchase(db, intent, payload)
    return intent


def _notify_telegram_purchase(db: Session, intent: PaymentIntent, payload: dict) -> None:
    if not intent.user_id:
        return
    user = db.query(User).filter(User.id == intent.user_id).first()
    if not user or user.oauth_provider != "telegram" or not user.oauth_provider_id:
        return
    try:
        chat_id = int(user.oauth_provider_id)
    except (TypeError, ValueError):
        return

    title = "покупка"
    kind = intent.kind or "item"
    if intent.kind == "beat":
        beat = db.query(Beat).filter(Beat.id == int(payload.get("item_id") or 0)).first()
        title = beat.title if beat else "бит"
        kind = payload.get("purchase_type") or "mp3"
    elif intent.kind == "course":
        course = db.query(Course).filter(Course.id == int(payload.get("item_id") or 0)).first()
        title = course.title if course else "курс"
        kind = "курс"
    elif intent.kind == "cart":
        title = "корзина"
        kind = "cart"
    elif intent.kind == "order":
        title = f"заявка #{payload.get('order_id')}"
        kind = "услуга"
    elif intent.kind == "ads":
        title = f"реклама #{payload.get('ad_order_id')}"
        kind = "реклама"

    try:
        from telegram_bot import send_message
        from telegram_ux import build_user_purchase_text

        send_message(chat_id, build_user_purchase_text(title, kind))
    except Exception:
        pass


def mark_failed(db: Session, intent: PaymentIntent, message: str) -> PaymentIntent:
    if intent.status == "paid":
        return intent
    intent.status = "failed"
    intent.error_message = message[:1000]
    release_promo_for_intent(db, intent)
    db.commit()
    db.refresh(intent)
    return intent


def _fulfill_beat(db: Session, intent: PaymentIntent, payload: dict) -> None:
    beat_id = int(payload.get("item_id") or 0)
    purchase_type = payload.get("purchase_type") or "mp3"
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise ValueError("Бит не найден")
    _add_beat_purchase(db, intent.user_id, beat, purchase_type)
    if intent.user_id:
        db.query(cart_table).filter(
            cart_table.c.user_id == intent.user_id,
            cart_table.c.beat_id == beat_id,
        ).delete()


def _fulfill_course(db: Session, intent: PaymentIntent, payload: dict) -> None:
    course_id = int(payload.get("item_id") or 0)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise ValueError("Курс не найден")
    _add_course_purchase(db, intent.user_id, course)
    if intent.user_id:
        db.query(course_cart_table).filter(
            course_cart_table.c.user_id == intent.user_id,
            course_cart_table.c.course_id == course_id,
        ).delete()


def _fulfill_cart(db: Session, intent: PaymentIntent, payload: dict) -> None:
    user = db.query(User).filter(User.id == intent.user_id).first()
    if not user:
        raise ValueError("Пользователь не найден")
    drop_owned_cart_items(db, user)
    formats = payload.get("beats_formats") or {}
    if isinstance(formats, list):
        formats = {str(item.get("id")): item.get("format") or "mp3" for item in formats}
    beats = list(user.cart_items)
    courses = list(user.course_cart_items)
    for beat in beats:
        purchase_type = str(formats.get(str(beat.id)) or formats.get(beat.id) or "mp3")
        _add_beat_purchase(db, user.id, beat, purchase_type)
    for course in courses:
        _add_course_purchase(db, user.id, course)
    db.query(cart_table).filter(cart_table.c.user_id == user.id).delete()
    db.query(course_cart_table).filter(course_cart_table.c.user_id == user.id).delete()


def _fulfill_order(db: Session, intent: PaymentIntent, payload: dict) -> None:
    order_id = int(payload.get("order_id") or 0)
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise ValueError("Заказ не найден")
    order.status = "paid"
    if not order.price:
        percent = int(order.prepayment_percent or 50) or 50
        order.price = round(float(intent.amount) * 100 / percent, 2)


def _fulfill_ads(db: Session, intent: PaymentIntent, payload: dict) -> None:
    from ad_orders import publish_ad_order_banner

    ad_order_id = int(payload.get("ad_order_id") or 0)
    order = db.query(AdOrder).filter(AdOrder.id == ad_order_id).first()
    if not order:
        raise ValueError("Заявка на рекламу не найдена")
    if order.status == "опубликована" and order.promo_banner_id:
        return
    if order.status not in {"одобрена", "опубликована"}:
        raise ValueError("Заявка ещё не одобрена")
    publish_ad_order_banner(db, order)


def _add_beat_purchase(db: Session, user_id: int | None, beat: Beat, purchase_type: str) -> None:
    if not user_id:
        raise ValueError("Нужна авторизация")
    if purchase_type not in {"mp3", "wav", "exclusive"}:
        purchase_type = "mp3"
    existing = (
        db.query(Purchase)
        .filter(
            Purchase.user_id == user_id,
            Purchase.beat_id == beat.id,
            Purchase.purchase_type == purchase_type,
        )
        .first()
    )
    if existing:
        return
    allow_multiple = getattr(beat, "allow_multiple_purchases", False)
    if not allow_multiple:
        any_purchase = db.query(Purchase).filter(Purchase.beat_id == beat.id).first()
        if any_purchase:
            beat.is_available = False
            raise ValueError("Бит уже куплен")
    price = beat_unit_price(beat, purchase_type)
    db.add(
        Purchase(
            user_id=user_id,
            beat_id=beat.id,
            price_paid=price,
            purchase_type=purchase_type,
        )
    )
    if not allow_multiple:
        beat.is_available = False


def _add_course_purchase(db: Session, user_id: int | None, course: Course) -> None:
    if not user_id:
        raise ValueError("Нужна авторизация")
    existing = (
        db.query(CoursePurchase)
        .filter(
            CoursePurchase.user_id == user_id,
            CoursePurchase.course_id == course.id,
        )
        .first()
    )
    if existing:
        return
    db.add(
        CoursePurchase(
            user_id=user_id,
            course_id=course.id,
            price_paid=course.price,
        )
    )
