"""Платные заявки на баннер: прайс за день, статусы на русском, публикация PromoBanner."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import AD_ORDER_LOCKED_STATUSES, AdOrder, PromoBanner, User
from payments.pricing import load_active_sales
from payments.discounts import pick_best_sale

AD_ORDER_MIN_DAYS = 1
AD_ORDER_MAX_DAYS = 90
DEFAULT_ADS_PRICE_PER_DAY = 1000.0


def normalize_ads_price_per_day(raw) -> float:
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return DEFAULT_ADS_PRICE_PER_DAY
    if n < 0:
        return DEFAULT_ADS_PRICE_PER_DAY
    return round(n, 2)


def normalize_link(url: str) -> str:
    text = (url or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Укажите ссылку по клику")
    if not text.lower().startswith(("http://", "https://")):
        text = f"https://{text}"
    return text


def validate_days(days: Any) -> int:
    try:
        n = int(days)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Укажите срок в днях") from None
    if n < AD_ORDER_MIN_DAYS or n > AD_ORDER_MAX_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Срок от {AD_ORDER_MIN_DAYS} до {AD_ORDER_MAX_DAYS} дней",
        )
    return n


def quote_ad_amount(days: int, price_per_day: float, db: Session) -> tuple[float, float]:
    listed = round(float(days) * float(price_per_day), 2)
    sales = load_active_sales(db)
    _sale, pay = pick_best_sale(listed, sales, "ads")
    return listed, round(float(pay), 2)


def ad_order_to_dict(order: AdOrder) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "contact_info": order.contact_info,
        "image_url": order.image_url,
        "link_url": order.link_url,
        "caption": order.caption,
        "days": order.days,
        "price_per_day": order.price_per_day,
        "list_amount": order.list_amount,
        "price": order.price,
        "status": order.status,
        "admin_note": order.admin_note,
        "reject_reason": order.reject_reason,
        "promo_banner_id": order.promo_banner_id,
        "approved_at": order.approved_at.isoformat() if order.approved_at else None,
        "published_at": order.published_at.isoformat() if order.published_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "can_pay": order.status == "одобрена",
        "locked": order.status in AD_ORDER_LOCKED_STATUSES,
    }


def create_ad_order(
    db: Session,
    user: User,
    *,
    image_url: str,
    link_url: str,
    days: int,
    price_per_day: float,
    caption: Optional[str] = None,
    contact_info: Optional[str] = None,
) -> AdOrder:
    if not (image_url or "").strip():
        raise HTTPException(status_code=400, detail="Загрузите картинку баннера")
    days_n = validate_days(days)
    link = normalize_link(link_url)
    rate = normalize_ads_price_per_day(price_per_day)
    listed, pay = quote_ad_amount(days_n, rate, db)
    order = AdOrder(
        user_id=user.id,
        customer_name=user.username,
        customer_email=user.email,
        contact_info=(contact_info or "").strip() or None,
        image_url=image_url.strip(),
        link_url=link,
        caption=(caption or "").strip()[:80] or None,
        days=days_n,
        price_per_day=rate,
        list_amount=listed,
        price=pay,
        status="новая",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def ensure_editable(order: AdOrder) -> None:
    if order.status in AD_ORDER_LOCKED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="После одобрения заявку нельзя менять — только оплата или отмена",
        )
    if order.status in {"отклонена", "отменена", "опубликована"}:
        raise HTTPException(status_code=400, detail="Заявка уже закрыта")


def approve_ad_order(db: Session, order: AdOrder, price: Optional[float] = None) -> AdOrder:
    if order.status not in {"новая"}:
        raise HTTPException(status_code=400, detail="Одобрить можно только новую заявку")
    if price is not None:
        try:
            p = float(price)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Некорректная цена") from exc
        if p <= 0:
            raise HTTPException(status_code=400, detail="Цена должна быть больше 0")
        order.price = round(p, 2)
    order.status = "одобрена"
    order.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def reject_ad_order(db: Session, order: AdOrder, reason: Optional[str] = None) -> AdOrder:
    if order.status in {"опубликована"}:
        raise HTTPException(status_code=400, detail="Опубликованную заявку нельзя отклонить")
    if order.status in AD_ORDER_LOCKED_STATUSES and order.status == "одобрена":
        # allow reject before payment
        pass
    if order.status == "отклонена":
        return order
    order.status = "отклонена"
    order.reject_reason = (reason or "").strip() or None
    db.commit()
    db.refresh(order)
    return order


def publish_ad_order_banner(db: Session, order: AdOrder) -> PromoBanner:
    """Idempotent: create PromoBanner spanning days from now."""
    if order.status == "опубликована" and order.promo_banner_id:
        banner = db.query(PromoBanner).filter(PromoBanner.id == order.promo_banner_id).first()
        if banner:
            return banner

    now = datetime.utcnow()
    ends = now + timedelta(days=int(order.days))
    max_sort = db.query(PromoBanner).count()
    banner = PromoBanner(
        title=order.caption or f"Реклама #{order.id}",
        body=None,
        image_url=order.image_url,
        link_url=order.link_url,
        sort_order=max_sort,
        enabled=True,
        starts_at=now,
        ends_at=ends,
    )
    db.add(banner)
    db.flush()
    order.promo_banner_id = banner.id
    order.status = "опубликована"
    order.published_at = now
    return banner
