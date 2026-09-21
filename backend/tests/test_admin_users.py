"""Admin users CRM: list, detail, support-thread get-or-create."""
from __future__ import annotations

import json
import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (  # noqa: E402
    add_beat,
    add_course,
    add_user,
    api_client,
    auth,
    reset_schema,
    token_for,
)
from models import CoursePurchase, Purchase, ServiceOrder, SupportThread  # noqa: E402


class AdminUsersApiTestCase(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.buyer = add_user(self.db, "buyer")
        self.other = add_user(self.db, "other")
        add_user(self.db, "root", admin=True)
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)

        self.buyer.additional_contact = json.dumps(
            [{"type": "telegram", "value": "@buyer_tg"}], ensure_ascii=False
        )
        self.db.commit()

        beat = add_beat(self.db, title="Night")
        course = add_course(self.db, title="Mix", price=5000)
        older = datetime.utcnow() - timedelta(days=2)
        newer = datetime.utcnow() - timedelta(hours=1)

        self.db.add(
            Purchase(
                user_id=self.buyer.id,
                beat_id=beat.id,
                price_paid=1500,
                purchase_type="mp3",
                purchase_date=older,
            )
        )
        self.db.add(
            CoursePurchase(
                user_id=self.buyer.id,
                course_id=course.id,
                price_paid=5000,
                purchase_date=newer,
            )
        )
        self.db.add(
            ServiceOrder(
                user_id=self.buyer.id,
                customer_email="buyer@example.com",
                description="Mix track",
                status="paid",
                price=3000,
                created_at=newer,
            )
        )
        self.db.add(
            ServiceOrder(
                user_id=self.buyer.id,
                description="Draft",
                status="pending",
                price=999,
            )
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_non_admin_cannot_list_users(self):
        response = self.client.get("/api/admin/users", headers=auth(self.token))
        self.assertIn(response.status_code, (401, 403))

    def test_list_sorted_by_ltv_includes_buyer(self):
        response = self.client.get("/api/admin/users", headers=auth(self.admin_token))
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertGreaterEqual(body["total"], 2)
        items = body["items"]
        by_name = {row["username"]: row for row in items}
        self.assertIn("buyer", by_name)
        buyer = by_name["buyer"]
        self.assertEqual(buyer["ltv"], 9500.0)
        self.assertEqual(buyer["purchase_count"], 3)
        self.assertIsNotNone(buyer["last_purchase_at"])

    def test_search_by_telegram_contact(self):
        response = self.client.get(
            "/api/admin/users",
            headers=auth(self.admin_token),
            params={"q": "buyer_tg"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        names = [row["username"] for row in response.json()["items"]]
        self.assertEqual(names, ["buyer"])

    def test_detail_history_and_contacts(self):
        response = self.client.get(
            f"/api/admin/users/{self.buyer.id}",
            headers=auth(self.admin_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["username"], "buyer")
        self.assertEqual(body["contacts"], [{"type": "telegram", "value": "@buyer_tg"}])
        self.assertEqual(body["totals"]["ltv"], 9500.0)
        self.assertEqual(body["totals"]["beats"], 1)
        self.assertEqual(body["totals"]["courses"], 1)
        self.assertEqual(body["totals"]["services"], 1)
        types = [row["type"] for row in body["history"]]
        self.assertIn("beat", types)
        self.assertIn("course", types)
        self.assertIn("service", types)
        self.assertEqual(len(body["history"]), 4)
        self.assertIsNone(body["support_thread_id"])

    def test_detail_404(self):
        response = self.client.get(
            "/api/admin/users/99999",
            headers=auth(self.admin_token),
        )
        self.assertEqual(response.status_code, 404)

    def test_support_thread_get_or_create(self):
        first = self.client.post(
            f"/api/admin/users/{self.buyer.id}/support-thread",
            headers=auth(self.admin_token),
        )
        self.assertEqual(first.status_code, 200, first.text)
        thread_id = first.json()["thread_id"]
        self.assertIsInstance(thread_id, int)
        self.assertEqual(self.db.query(SupportThread).count(), 1)

        second = self.client.post(
            f"/api/admin/users/{self.buyer.id}/support-thread",
            headers=auth(self.admin_token),
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(second.json()["thread_id"], thread_id)
        self.assertEqual(self.db.query(SupportThread).count(), 1)

        detail = self.client.get(
            f"/api/admin/users/{self.buyer.id}",
            headers=auth(self.admin_token),
        ).json()
        self.assertEqual(detail["support_thread_id"], thread_id)


if __name__ == "__main__":
    unittest.main()
