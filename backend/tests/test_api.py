"""HTTP contracts without Robokassa, OAuth, or the developer SQLite file."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (  # noqa: E402
    add_beat,
    add_course,
    add_user,
    api_client,
    auth,
    login,
    reset_schema,
    token_for,
)
from models import CoursePurchase, PaymentIntent, PromoBanner, Purchase, SiteSetting  # noqa: E402
from payments.robokassa import format_out_sum, sign_result  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        self.admin = add_user(self.db, "root", admin=True)
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)

    def tearDown(self):
        self.db.close()

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_register_login_me(self):
        response = self.client.post(
            "/register",
            json={"email": "new@example.com", "username": "newbie", "password": "secret12"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        token = self.client.post(
            "/login", json={"username": "newbie", "password": "secret12"}
        ).json()["access_token"]
        me = self.client.get("/me", headers=auth(token))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["username"], "newbie")
        self.assertFalse(me.json()["is_admin"])

    def test_create_quotes_server_price_not_client_wish(self):
        beat = add_beat(self.db, price_mp3=1000, price_wav=2500)
        response = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "wav", "amount": 1},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["amount"], 2500)
        self.assertTrue(body["checkout_url"].startswith("https://auth.robokassa.ru/Merchant/Index.aspx?"))
        self.assertFalse(body["local_terminal"])

    def test_simulate_grants_purchase_and_legacy_purchase_endpoint_rejects(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        paid = self.client.post(
            "/payments/simulate",
            headers=auth(self.token),
            json={"inv_id": created["inv_id"], "success": True},
        )
        self.assertEqual(paid.status_code, 200, paid.text)
        self.assertTrue(paid.json()["paid"])
        self.assertEqual(self.db.query(Purchase).count(), 1)

        blocked = self.client.post(
            f"/beats/{beat.id}/purchase",
            headers=auth(self.token),
            data={"purchase_type": "wav", "payment_success": "true"},
        )
        self.assertEqual(blocked.status_code, 400)
        cart = self.client.post(
            "/payment/process-cart",
            headers=auth(self.token),
            json={"success": True},
        )
        self.assertEqual(cart.status_code, 400)

    def test_simulate_disabled_when_not_test_mode(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        with patch("main.payment_config.is_test", return_value=False):
            response = self.client.post(
                "/payments/simulate",
                headers=auth(self.token),
                json={"inv_id": created["inv_id"], "success": True},
            )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.db.query(Purchase).count(), 0)

    def test_robokassa_result_valid_signature_fulfills(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        inv_id = created["inv_id"]
        out_sum = format_out_sum(created["amount"])
        signature = sign_result(out_sum, inv_id, "test_password_2")
        response = self.client.post(
            "/payments/robokassa/result",
            data={"OutSum": out_sum, "InvId": str(inv_id), "SignatureValue": signature},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.text, f"OK{inv_id}")
        self.assertEqual(self.db.query(Purchase).count(), 1)

    def test_robokassa_result_bad_signature_does_not_fulfill(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        response = self.client.post(
            "/payments/robokassa/result",
            data={
                "OutSum": format_out_sum(created["amount"]),
                "InvId": str(created["inv_id"]),
                "SignatureValue": "deadbeef",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.db.query(Purchase).count(), 0)

    def test_robokassa_result_wrong_sum_marks_failed(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        inv_id = created["inv_id"]
        signature = sign_result("1.00", inv_id, "test_password_2")
        response = self.client.post(
            "/payments/robokassa/result",
            data={"OutSum": "1.00", "InvId": str(inv_id), "SignatureValue": signature},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.db.query(Purchase).count(), 0)
        intent = self.db.get(PaymentIntent, inv_id)
        self.assertEqual(intent.status, "failed")

    def test_stranger_cannot_see_or_simulate_intent(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        add_user(self.db, "other")
        other_token = token_for("other")
        seen = self.client.get(
            f"/payments/intents/{created['inv_id']}",
            headers=auth(other_token),
        )
        self.assertEqual(seen.status_code, 403)
        simulated = self.client.post(
            "/payments/simulate",
            headers=auth(other_token),
            json={"inv_id": created["inv_id"], "success": True},
        )
        self.assertEqual(simulated.status_code, 403)
        guest = self.client.post(
            "/payments/simulate",
            json={"inv_id": created["inv_id"], "success": True},
        )
        self.assertIn(guest.status_code, (401, 403))
        self.db.expire_all()
        self.assertEqual(self.db.query(Purchase).count(), 0)

    def test_download_requires_purchase(self):
        beat = add_beat(self.db)
        anonymous = self.client.get(f"/beats/{beat.id}/download")
        self.assertEqual(anonymous.status_code, 403)
        forbidden = self.client.get(
            f"/beats/{beat.id}/download", headers=auth(self.token)
        )
        self.assertEqual(forbidden.status_code, 403)

    def test_exclusive_disappears_from_catalog_after_pay(self):
        beat = add_beat(self.db, allow_multiple=False)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "exclusive"},
        ).json()
        self.client.post(
            "/payments/simulate",
            headers=auth(self.token),
            json={"inv_id": created["inv_id"], "success": True},
        )
        catalog = self.client.get("/beats")
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.json(), [])
        add_user(self.db, "late")
        late = token_for("late")
        again = self.client.post(
            "/payments/create",
            headers=auth(late),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        )
        self.assertEqual(again.status_code, 400)

    def test_cart_checkout_uses_per_beat_format(self):
        beat = add_beat(self.db)
        course = add_course(self.db, price=5000)
        self.assertEqual(
            self.client.post(f"/beats/{beat.id}/cart", headers=auth(self.token)).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(f"/courses/{course.id}/cart", headers=auth(self.token)).status_code,
            200,
        )
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "cart", "beats_formats": {str(beat.id): "wav"}},
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["amount"], 7000)
        self.client.post(
            "/payments/simulate",
            headers=auth(self.token),
            json={"inv_id": created.json()["inv_id"], "success": True},
        )
        purchase = self.db.query(Purchase).one()
        self.assertEqual(purchase.purchase_type, "wav")
        self.assertEqual(self.db.query(CoursePurchase).count(), 1)
        self.assertEqual(self.client.get("/cart", headers=auth(self.token)).json(), [])

    def test_guest_cannot_create_beat_checkout(self):
        beat = add_beat(self.db)
        response = self.client.post(
            "/payments/create",
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_routes_reject_user_token(self):
        user_hit = self.client.get("/api/admin/beats", headers=auth(self.token))
        self.assertIn(user_hit.status_code, (401, 403))
        admin_hit = self.client.get("/api/admin/beats", headers=auth(self.admin_token))
        self.assertEqual(admin_hit.status_code, 200)

    def test_courses_hidden_from_public(self):
        add_course(self.db)
        self.db.add(SiteSetting(key="courses_visibility", value="hidden"))
        self.db.commit()
        public = self.client.get("/courses")
        self.assertEqual(public.status_code, 403)
        as_user = self.client.get("/courses", headers=auth(self.token))
        self.assertEqual(as_user.status_code, 403)
        as_admin = self.client.get("/courses", headers=auth(self.admin_token))
        self.assertEqual(as_admin.status_code, 200)
        self.assertEqual(len(as_admin.json()), 1)

    def test_public_promo_banners_filter_window(self):
        now = datetime.utcnow()
        self.db.add_all(
            [
                PromoBanner(title="live", enabled=True, sort_order=1),
                PromoBanner(title="off", enabled=False, sort_order=2),
                PromoBanner(
                    title="future",
                    enabled=True,
                    sort_order=3,
                    starts_at=now + timedelta(days=2),
                    ends_at=now + timedelta(days=5),
                ),
            ]
        )
        self.db.commit()
        public = self.client.get("/promo-banners")
        self.assertEqual(public.status_code, 200)
        titles = [item["title"] for item in public.json()]
        self.assertEqual(titles, ["live"])
        admin = self.client.get("/api/admin/promo-banners", headers=auth(self.admin_token))
        self.assertEqual(admin.status_code, 200)
        self.assertEqual(len(admin.json()), 3)

    def test_admin_hero_saves_image_position(self):
        response = self.client.put(
            "/api/admin/site-settings/hero",
            headers=auth(self.admin_token),
            json={"image_position": "right"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["home_hero"]["image_position"], "right")
        public = self.client.get("/site-settings")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()["home_hero"]["image_position"], "right")

    def test_admin_hero_unknown_image_position_becomes_left(self):
        response = self.client.put(
            "/api/admin/site-settings/hero",
            headers=auth(self.admin_token),
            json={"image_position": "diagonal"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["home_hero"]["image_position"], "left")

    def test_download_after_pay_without_file_is_not_granted_to_stranger(self):
        beat = add_beat(self.db)
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        ).json()
        self.client.post(
            "/payments/simulate",
            headers=auth(self.token),
            json={"inv_id": created["inv_id"], "success": True},
        )
        add_user(self.db, "thief")
        thief = token_for("thief")
        stolen = self.client.get(
            f"/beats/{beat.id}/download", headers=auth(thief)
        )
        self.assertEqual(stolen.status_code, 403)


if __name__ == "__main__":
    unittest.main()
