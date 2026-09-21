"""AdOrder: day-rate quote → approve → pay → publish PromoBanner."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from helpers import (  # noqa: E402
    add_user,
    api_client,
    auth,
    reset_schema,
    token_for,
)
from models import AdOrder, PaymentIntent, PromoBanner, SaleCampaign  # noqa: E402
from payments.fulfill import fulfill_intent  # noqa: E402


class AdOrderFlowTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        self.admin = add_user(self.db, "root", admin=True)
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)

    def tearDown(self):
        self.db.close()

    def _set_day_rate(self, rate: float):
        r = self.client.put(
            "/api/admin/site-settings",
            headers=auth(self.admin_token),
            json={"ads_price_per_day": rate},
        )
        self.assertEqual(r.status_code, 200, r.text)

    def test_public_site_settings_exposes_day_rate(self):
        public = self.client.get("/site-settings")
        self.assertEqual(public.status_code, 200)
        self.assertIn("ads_price_per_day", public.json())
        self.assertGreater(public.json()["ads_price_per_day"], 0)

    def test_guest_cannot_create_ad_order(self):
        r = self.client.post(
            "/ad-orders",
            json={
                "image_url": "/static/materials/x.png",
                "link_url": "https://example.com",
                "days": 7,
            },
        )
        self.assertIn(r.status_code, (401, 403))

    def test_create_quotes_days_times_rate_with_sale(self):
        self._set_day_rate(1000)
        self.db.add(
            SaleCampaign(title="Ads −10%", scope="ads", kind="percent", value=10, enabled=True)
        )
        self.db.commit()

        r = self.client.post(
            "/ad-orders",
            headers=auth(self.token),
            json={
                "image_url": "/static/materials/x.png",
                "link_url": "https://example.com",
                "caption": "Хит",
                "days": 7,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["status"], "новая")
        self.assertEqual(body["days"], 7)
        self.assertEqual(body["list_amount"], 7000)
        self.assertEqual(body["price"], 6300)

    def test_approve_locks_fields_and_allows_price_override(self):
        self._set_day_rate(1000)
        created = self.client.post(
            "/ad-orders",
            headers=auth(self.token),
            json={
                "image_url": "/static/materials/x.png",
                "link_url": "https://example.com",
                "days": 3,
            },
        ).json()

        approved = self.client.post(
            f"/api/admin/ad-orders/{created['id']}/approve",
            headers=auth(self.admin_token),
            json={"price": 2500},
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "одобрена")
        self.assertEqual(approved.json()["price"], 2500)

        locked = self.client.put(
            f"/api/admin/ad-orders/{created['id']}",
            headers=auth(self.admin_token),
            json={"link_url": "https://nope.test", "days": 99},
        )
        self.assertEqual(locked.status_code, 400, locked.text)

        pay = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "ads", "ad_order_id": created["id"]},
        )
        self.assertEqual(pay.status_code, 200, pay.text)
        self.assertEqual(pay.json()["amount"], 2500)

    def test_fulfill_publishes_banner_from_payment_moment(self):
        self._set_day_rate(500)
        created = self.client.post(
            "/ad-orders",
            headers=auth(self.token),
            json={
                "image_url": "/static/materials/banner.png",
                "link_url": "https://promo.example",
                "caption": "Sale",
                "days": 14,
            },
        ).json()
        self.client.post(
            f"/api/admin/ad-orders/{created['id']}/approve",
            headers=auth(self.admin_token),
            json={},
        )

        intent = PaymentIntent(
            user_id=self.user.id,
            kind="ads",
            amount=float(created["price"]),
            payload='{"ad_order_id": %d}' % created["id"],
            status="pending",
        )
        self.db.add(intent)
        self.db.commit()

        before = datetime.utcnow()
        fulfill_intent(self.db, intent)
        order = self.db.query(AdOrder).filter(AdOrder.id == created["id"]).one()
        self.assertEqual(order.status, "опубликована")
        self.assertIsNotNone(order.promo_banner_id)
        banner = self.db.query(PromoBanner).filter(PromoBanner.id == order.promo_banner_id).one()
        self.assertTrue(banner.enabled)
        self.assertEqual(banner.link_url, "https://promo.example")
        self.assertIsNotNone(banner.starts_at)
        self.assertIsNotNone(banner.ends_at)
        self.assertGreaterEqual(banner.starts_at, before - timedelta(seconds=2))
        delta = banner.ends_at - banner.starts_at
        self.assertAlmostEqual(delta.total_seconds(), 14 * 86400, delta=2)

    def test_checkout_rejects_until_approved(self):
        self._set_day_rate(1000)
        created = self.client.post(
            "/ad-orders",
            headers=auth(self.token),
            json={
                "image_url": "/static/materials/x.png",
                "link_url": "https://example.com",
                "days": 7,
            },
        ).json()
        r = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "ads", "ad_order_id": created["id"]},
        )
        self.assertEqual(r.status_code, 400, r.text)


if __name__ == "__main__":
    unittest.main()
