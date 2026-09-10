"""Fulfillment grants purchases only from a paid intent; second call is a no-op."""
import os
import sys
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base, Beat, Course, PaymentIntent, Purchase, CoursePurchase, ServiceOrder, User, cart_table
from payments.fulfill import fulfill_intent


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


class FulfillIntentTests(unittest.TestCase):
    def setUp(self):
        self.db = _session()
        self.user = User(username="buyer", email="b@x.test", password_hash="x")
        self.beat = Beat(
            title="Night",
            genre="trap",
            bpm=140,
            price=1000,
            price_mp3=1000,
            price_wav=2000,
            mp3_url="/m.mp3",
            wav_url="/w.wav",
            is_available=True,
            allow_multiple_purchases=True,
        )
        self.course = Course(title="Mix", price=5000, is_available=True)
        self.db.add_all([self.user, self.beat, self.course])
        self.db.commit()

    def test_beat_intent_creates_purchase_with_quoted_type(self):
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="beat",
            amount=2000,
            payload='{"item_id": %d, "purchase_type": "wav"}' % self.beat.id,
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()

        fulfill_intent(self.db, intent)

        purchase = self.db.query(Purchase).one()
        self.assertEqual(purchase.purchase_type, "wav")
        self.assertEqual(purchase.price_paid, 2000)
        self.assertEqual(intent.status, "paid")

    def test_second_fulfill_is_idempotent(self):
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="beat",
            amount=1000,
            payload='{"item_id": %d, "purchase_type": "mp3"}' % self.beat.id,
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()
        fulfill_intent(self.db, intent)
        fulfill_intent(self.db, intent)
        self.assertEqual(self.db.query(Purchase).count(), 1)

    def test_cart_uses_per_beat_formats_and_clears_cart(self):
        self.user.cart_items.append(self.beat)
        self.user.course_cart_items.append(self.course)
        self.db.commit()
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="cart",
            amount=7000,
            payload='{"beats_formats": {"%d": "wav"}}' % self.beat.id,
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()

        fulfill_intent(self.db, intent)

        self.assertEqual(self.db.query(Purchase).one().purchase_type, "wav")
        self.assertEqual(self.db.query(CoursePurchase).count(), 1)
        self.assertEqual(self.user.cart_items, [])
        self.assertEqual(self.user.course_cart_items, [])

    def test_pending_only_does_not_grant_when_status_failed(self):
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="beat",
            amount=1000,
            payload='{"item_id": %d, "purchase_type": "mp3"}' % self.beat.id,
            status="failed",
        )
        self.db.add(intent)
        self.db.commit()
        fulfill_intent(self.db, intent)
        self.assertEqual(self.db.query(Purchase).count(), 0)

    def test_exclusive_second_buyer_does_not_get_paid_without_file(self):
        self.beat.allow_multiple_purchases = False
        self.db.commit()
        first = PaymentIntent(
            user_id=self.user.id,
            kind="beat",
            amount=1000,
            payload='{"item_id": %d, "purchase_type": "mp3"}' % self.beat.id,
            status="pending",
        )
        other = User(username="other", email="o@x.test", password_hash="x")
        self.db.add_all([first, other])
        self.db.commit()
        fulfill_intent(self.db, first)

        second = PaymentIntent(
            user_id=other.id,
            kind="beat",
            amount=1000,
            payload='{"item_id": %d, "purchase_type": "mp3"}' % self.beat.id,
            status="pending",
        )
        self.db.add(second)
        self.db.commit()
        with self.assertRaises(ValueError):
            fulfill_intent(self.db, second)
        self.db.refresh(second)
        self.assertEqual(self.db.query(Purchase).count(), 1)
        self.assertEqual(second.status, "pending")
        self.assertFalse(self.db.get(Beat, self.beat.id).is_available)

    def test_course_intent_creates_course_purchase(self):
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="course",
            amount=5000,
            payload='{"item_id": %d}' % self.course.id,
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()
        fulfill_intent(self.db, intent)
        self.assertEqual(self.db.query(CoursePurchase).count(), 1)
        self.assertEqual(intent.status, "paid")

    def test_order_intent_marks_service_order_paid(self):
        order = ServiceOrder(
            user_id=self.user.id,
            status="pending",
            price=40000,
            prepayment_percent=50,
        )
        self.db.add(order)
        self.db.commit()
        intent = PaymentIntent(
            user_id=self.user.id,
            kind="order",
            amount=20000,
            payload='{"order_id": %d}' % order.id,
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()
        fulfill_intent(self.db, intent)
        self.db.refresh(order)
        self.assertEqual(order.status, "paid")
        self.assertEqual(intent.status, "paid")


if __name__ == "__main__":
    unittest.main()
