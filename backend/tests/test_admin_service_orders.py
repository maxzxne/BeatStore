"""Admin service-order inbox: queue, quote-on-invoice, notes, full payload."""
from __future__ import annotations

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import add_user, api_client, auth, reset_schema, token_for
from models import ServiceOrder


class AdminServiceOrdersTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        self.admin = add_user(self.db, "root", admin=True)
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)

    def tearDown(self):
        self.db.close()

    def _add_order(self, **kwargs) -> ServiceOrder:
        payload = {
            "user_id": self.user.id,
            "order_type": "know",
            "service_categories": json.dumps(["бит в стиле трэп"], ensure_ascii=False),
            "deadline_days": 7,
            "prepayment_percent": 50,
            "status": "pending",
            "description": "Нужен trap бит",
            "contact_info": "@buyer",
        }
        payload.update(kwargs)
        order = ServiceOrder(**payload)
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def test_buyer_cannot_list_admin_orders(self):
        response = self.client.get("/api/admin/service-orders", headers=auth(self.token))
        self.assertEqual(response.status_code, 401)

    def test_admin_list_includes_queue_quote_and_files(self):
        order = self._add_order(
            result_wav_url="/static/order_results/a.wav",
            admin_note="перезвонить",
        )
        response = self.client.get("/api/admin/service-orders", headers=auth(self.admin_token))
        self.assertEqual(response.status_code, 200, response.text)
        row = next(item for item in response.json() if item["id"] == order.id)
        self.assertEqual(row["queue"], "action")
        self.assertEqual(row["contact_info"], "@buyer")
        self.assertEqual(row["result_wav_url"], "/static/order_results/a.wav")
        self.assertEqual(row["admin_note"], "перезвонить")
        self.assertEqual(row["due_amount"], 7500.0)
        self.assertEqual(row["quoted_price"], 15000.0)
        self.assertEqual(row["user_username"], "buyer")

    def test_confirm_without_price_stores_quote_and_opens_payment(self):
        order = self._add_order(price=None, status="pending")
        response = self.client.put(
            f"/api/admin/service-orders/{order.id}",
            headers=auth(self.admin_token),
            data={"status": "confirmed"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.db.refresh(order)
        self.assertEqual(order.status, "confirmed")
        self.assertEqual(order.price, 15000.0)
        listed = self.client.get("/api/admin/service-orders", headers=auth(self.admin_token)).json()
        row = next(item for item in listed if item["id"] == order.id)
        self.assertEqual(row["queue"], "payment")
        self.assertEqual(row["due_amount"], 7500.0)

    def test_confirm_dont_know_without_price_is_rejected(self):
        order = self._add_order(
            order_type="dont_know",
            service_categories=None,
            deadline_days=None,
            prepayment_percent=None,
            price=None,
        )
        response = self.client.put(
            f"/api/admin/service-orders/{order.id}",
            headers=auth(self.admin_token),
            data={"status": "confirmed"},
        )
        self.assertEqual(response.status_code, 400)
        self.db.refresh(order)
        self.assertEqual(order.status, "pending")

    def test_admin_note_and_paid_queue(self):
        order = self._add_order(status="paid", price=15000)
        response = self.client.put(
            f"/api/admin/service-orders/{order.id}",
            headers=auth(self.admin_token),
            data={"admin_note": "отдать WAV в пятницу"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.db.refresh(order)
        self.assertEqual(order.admin_note, "отдать WAV в пятницу")
        listed = self.client.get("/api/admin/service-orders", headers=auth(self.admin_token)).json()
        row = next(item for item in listed if item["id"] == order.id)
        self.assertEqual(row["queue"], "work")
        self.assertEqual(row["admin_note"], "отдать WAV в пятницу")


if __name__ == "__main__":
    unittest.main()
