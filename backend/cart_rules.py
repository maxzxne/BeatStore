"""Owned catalog items must not sit in cart or be quoted again."""
from __future__ import annotations

from sqlalchemy.orm import Session

from models import CoursePurchase, Purchase, User


def user_owns_beat(db: Session, user_id: int | None, beat_id: int) -> bool:
    if not user_id:
        return False
    return (
        db.query(Purchase)
        .filter(Purchase.user_id == user_id, Purchase.beat_id == beat_id)
        .first()
        is not None
    )


def user_owns_course(db: Session, user_id: int | None, course_id: int) -> bool:
    if not user_id:
        return False
    return (
        db.query(CoursePurchase)
        .filter(
            CoursePurchase.user_id == user_id,
            CoursePurchase.course_id == course_id,
        )
        .first()
        is not None
    )


def drop_owned_cart_items(db: Session, user: User | None) -> None:
    if not user:
        return
    dirty = False
    for beat in list(user.cart_items):
        if user_owns_beat(db, user.id, beat.id):
            user.cart_items.remove(beat)
            dirty = True
    for course in list(user.course_cart_items):
        if user_owns_course(db, user.id, course.id):
            user.course_cart_items.remove(course)
            dirty = True
    if dirty:
        db.commit()
