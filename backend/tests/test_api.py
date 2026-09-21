"""HTTP contracts without Robokassa, OAuth, or the developer SQLite file."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (  # noqa: E402
    PASSWORD,
    add_beat,
    add_course,
    add_user,
    api_client,
    auth,
    login,
    reset_schema,
    token_for,
)
from models import CoursePurchase, FooterPage, PaymentIntent, PromoBanner, PromoCode, Purchase, SaleCampaign, SiteSetting  # noqa: E402
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

    def test_cannot_add_purchased_beat_to_cart(self):
        beat = add_beat(self.db)
        self.db.add(
            Purchase(
                user_id=self.user.id,
                beat_id=beat.id,
                price_paid=1000,
                purchase_type="mp3",
            )
        )
        self.db.commit()
        response = self.client.post(
            f"/beats/{beat.id}/cart", headers=auth(self.token)
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(
            self.client.get("/cart", headers=auth(self.token)).json(), []
        )

    def test_cannot_add_purchased_course_to_cart(self):
        course = add_course(self.db)
        self.db.add(
            CoursePurchase(
                user_id=self.user.id, course_id=course.id, price_paid=5000
            )
        )
        self.db.commit()
        response = self.client.post(
            f"/courses/{course.id}/cart", headers=auth(self.token)
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(
            self.client.get("/course-cart", headers=auth(self.token)).json(), []
        )

    def test_cart_omits_and_does_not_charge_already_purchased(self):
        owned_beat = add_beat(self.db, title="OwnedBeat")
        fresh_beat = add_beat(self.db, title="FreshBeat")
        owned_course = add_course(self.db, title="OwnedCourse", price=5000)
        fresh_course = add_course(self.db, title="FreshCourse", price=3000)
        self.db.add(
            Purchase(
                user_id=self.user.id,
                beat_id=owned_beat.id,
                price_paid=1000,
                purchase_type="mp3",
            )
        )
        self.db.add(
            CoursePurchase(
                user_id=self.user.id,
                course_id=owned_course.id,
                price_paid=5000,
            )
        )
        self.db.commit()
        self.db.refresh(self.user)
        self.user.cart_items.extend([owned_beat, fresh_beat])
        self.user.course_cart_items.extend([owned_course, fresh_course])
        self.db.commit()

        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={
                "kind": "cart",
                "beats_formats": {str(fresh_beat.id): "mp3"},
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["amount"], 4000)

        beats = self.client.get("/cart", headers=auth(self.token)).json()
        self.assertEqual([row["title"] for row in beats], ["FreshBeat"])
        courses = self.client.get(
            "/course-cart", headers=auth(self.token)
        ).json()
        self.assertEqual([row["title"] for row in courses], ["FreshCourse"])

    def test_create_rejects_already_purchased_beat_and_course(self):
        beat = add_beat(self.db)
        course = add_course(self.db, price=5000)
        self.db.add(
            Purchase(
                user_id=self.user.id,
                beat_id=beat.id,
                price_paid=1000,
                purchase_type="mp3",
            )
        )
        self.db.add(
            CoursePurchase(
                user_id=self.user.id, course_id=course.id, price_paid=5000
            )
        )
        self.db.commit()
        beat_pay = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "wav"},
        )
        self.assertEqual(beat_pay.status_code, 400, beat_pay.text)
        course_pay = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "course", "item_id": course.id},
        )
        self.assertEqual(course_pay.status_code, 400, course_pay.text)

    def test_courses_list_marks_purchased(self):
        owned = add_course(self.db, title="Owned")
        other = add_course(self.db, title="Other")
        self.db.add(
            CoursePurchase(
                user_id=self.user.id, course_id=owned.id, price_paid=5000
            )
        )
        self.db.commit()
        rows = {
            row["id"]: row
            for row in self.client.get(
                "/courses", headers=auth(self.token)
            ).json()
        }
        self.assertTrue(rows[owned.id]["is_purchased"])
        self.assertFalse(rows[other.id]["is_purchased"])
        detail = self.client.get(
            f"/courses/{owned.id}", headers=auth(self.token)
        ).json()
        self.assertTrue(detail["is_purchased"])

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
        course = add_course(self.db)
        self.db.add(SiteSetting(key="courses_visibility", value="hidden"))
        self.db.commit()
        public = self.client.get("/courses")
        self.assertEqual(public.status_code, 403)
        as_user = self.client.get("/courses", headers=auth(self.token))
        self.assertEqual(as_user.status_code, 403)
        as_admin = self.client.get("/courses", headers=auth(self.admin_token))
        self.assertEqual(as_admin.status_code, 200)
        self.assertEqual(len(as_admin.json()), 1)
        detail = self.client.get(f"/courses/{course.id}")
        self.assertEqual(detail.status_code, 403)

    def test_ads_orders_disabled_rejects_create_and_is_in_site_settings(self):
        public = self.client.get("/site-settings")
        self.assertEqual(public.status_code, 200)
        self.assertTrue(public.json().get("ads_orders_enabled"))

        off = self.client.put(
            "/api/admin/site-settings",
            headers=auth(self.admin_token),
            json={"ads_orders_enabled": False},
        )
        self.assertEqual(off.status_code, 200, off.text)
        self.assertFalse(off.json()["settings"]["ads_orders_enabled"])
        public_off = self.client.get("/site-settings")
        self.assertFalse(public_off.json()["ads_orders_enabled"])

        blocked = self.client.post(
            "/service-orders",
            json={
                "order_type": "ads",
                "customer_name": "Ann",
                "customer_email": "ann@example.com",
                "description": "баннер",
                "reference_links": "https://example.com",
                "deadline_days": 7,
            },
        )
        self.assertEqual(blocked.status_code, 403, blocked.text)

        on = self.client.put(
            "/api/admin/site-settings",
            headers=auth(self.admin_token),
            json={"ads_orders_enabled": True},
        )
        self.assertEqual(on.status_code, 200, on.text)
        created = self.client.post(
            "/service-orders",
            json={
                "order_type": "ads",
                "customer_name": "Ann",
                "customer_email": "ann@example.com",
                "description": "баннер",
                "reference_links": "https://example.com",
                "deadline_days": 7,
                "service_categories": ["реклама на витрине"],
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["order_type"], "ads")

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

    def test_admin_hero_catalog_toggles_default_on_and_can_hide(self):
        public = self.client.get("/site-settings")
        self.assertEqual(public.status_code, 200)
        hero = public.json()["home_hero"]
        self.assertTrue(hero["show_search"])
        self.assertTrue(hero["show_filters"])

        response = self.client.put(
            "/api/admin/site-settings/hero",
            headers=auth(self.admin_token),
            json={"show_search": False, "show_filters": False},
        )
        self.assertEqual(response.status_code, 200, response.text)
        saved = response.json()["home_hero"]
        self.assertFalse(saved["show_search"])
        self.assertFalse(saved["show_filters"])

        public_again = self.client.get("/site-settings")
        self.assertEqual(public_again.status_code, 200)
        hero_again = public_again.json()["home_hero"]
        self.assertFalse(hero_again["show_search"])
        self.assertFalse(hero_again["show_filters"])

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

    def test_admin_replace_beat_files_updates_urls(self):
        beat = add_beat(self.db)
        beat.cover_url = "/static/covers/old-cover.jpg"
        beat.demo_url = "/static/demos/old-demo.mp3"
        self.db.commit()
        old_mp3 = beat.mp3_url

        denied = self.client.put(
            f"/api/admin/beats/{beat.id}/files",
            headers=auth(self.token),
            files={"mp3_file": ("n.mp3", b"ID3xxxx", "audio/mpeg")},
        )
        self.assertIn(denied.status_code, (401, 403))

        response = self.client.put(
            f"/api/admin/beats/{beat.id}/files",
            headers=auth(self.admin_token),
            files={
                "mp3_file": ("fresh.mp3", b"ID3xxxx", "audio/mpeg"),
                "cover_file": ("fresh.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 32, "image/jpeg"),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertNotEqual(body["mp3_url"], old_mp3)
        self.assertTrue(body["mp3_url"].startswith("/static/audio/"))
        self.assertTrue(body["cover_url"].startswith("/static/covers/"))
        self.assertTrue(body["cover_url"].endswith("fresh.jpg") or "fresh" in body["cover_url"])
        self.assertTrue(os.path.exists(body["mp3_url"].lstrip("/")), body["mp3_url"])
        self.assertTrue(os.path.exists(body["cover_url"].lstrip("/")), body["cover_url"])
        self.db.refresh(beat)
        self.assertEqual(beat.mp3_url, body["mp3_url"])
        self.assertEqual(beat.cover_url, body["cover_url"])
        self.assertEqual(beat.demo_url, "/static/demos/old-demo.mp3")

    def test_admin_replace_course_files_updates_urls(self):
        course = add_course(self.db)
        course.preview_video_url = "/static/course_previews/old-preview.mp4"
        course.full_video_url = "/static/course_videos/old-full.mp4"
        self.db.commit()
        old_full = course.full_video_url

        denied = self.client.put(
            f"/api/admin/courses/{course.id}/files",
            headers=auth(self.token),
            files={"full_video_file": ("n.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4")},
        )
        self.assertIn(denied.status_code, (401, 403))

        response = self.client.put(
            f"/api/admin/courses/{course.id}/files",
            headers=auth(self.admin_token),
            files={
                "full_video_file": ("fresh.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4"),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertNotEqual(body["full_video_url"], old_full)
        self.assertTrue(body["full_video_url"].startswith("/static/course_videos/"))
        self.assertTrue(os.path.exists(body["full_video_url"].lstrip("/")), body["full_video_url"])
        self.db.refresh(course)
        self.assertEqual(course.full_video_url, body["full_video_url"])
        self.assertEqual(course.preview_video_url, "/static/course_previews/old-preview.mp4")

    def test_me_returns_parsed_contacts_and_put_saves_json(self):
        self.user.additional_contact = "@legacy_nick"
        self.db.commit()

        me = self.client.get("/me", headers=auth(self.token))
        self.assertEqual(me.status_code, 200, me.text)
        body = me.json()
        self.assertEqual(
            body["contacts"],
            [{"type": "other", "value": "@legacy_nick"}],
        )
        self.assertEqual(body["additional_contact"], "@legacy_nick")

        updated = self.client.put(
            "/me",
            headers=auth(self.token),
            json={
                "contacts": [
                    {"type": "telegram", "value": " @nick "},
                    {"type": "whatsapp", "value": ""},
                    {"type": "phone", "value": "+79991234567"},
                ]
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        payload = updated.json()
        self.assertEqual(
            payload["contacts"],
            [
                {"type": "telegram", "value": "@nick"},
                {"type": "phone", "value": "+79991234567"},
            ],
        )
        self.db.refresh(self.user)
        self.assertIn('"type": "telegram"', self.user.additional_contact)
        self.assertIn("@nick", self.user.additional_contact)

    def test_delete_account_anonymizes_and_blocks_login(self):
        beat = add_beat(self.db)
        self.db.add(
            Purchase(
                user_id=self.user.id,
                beat_id=beat.id,
                price_paid=1000,
                purchase_type="mp3",
            )
        )
        self.db.commit()
        user_id = self.user.id

        deleted = self.client.request(
            "DELETE",
            "/me",
            headers=auth(self.token),
            json={"password": PASSWORD},
        )
        self.assertEqual(deleted.status_code, 200, deleted.text)

        login_again = self.client.post(
            "/login", json={"username": "buyer", "password": PASSWORD}
        )
        self.assertEqual(login_again.status_code, 401)

        me = self.client.get("/me", headers=auth(self.token))
        self.assertEqual(me.status_code, 401)

        from models import User

        self.db.expire_all()
        row = self.db.query(User).filter(User.id == user_id).first()
        self.assertIsNotNone(row)
        self.assertFalse(row.is_active)
        self.assertTrue(row.username.startswith("deleted_"))
        self.assertIsNone(row.email)
        self.assertIsNone(row.additional_contact)
        self.assertEqual(self.db.query(Purchase).filter(Purchase.user_id == user_id).count(), 1)

    def test_delete_last_admin_is_forbidden(self):
        response = self.client.request(
            "DELETE",
            "/me",
            headers=auth(self.admin_token),
            json={"password": PASSWORD},
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("админ", response.json()["detail"].lower())

    def test_footer_pages_public_hides_disabled_and_respects_order(self):
        self.db.add_all(
            [
                FooterPage(
                    slug="support",
                    label="Поддержка",
                    kind="support",
                    sort_order=2,
                    enabled=True,
                    is_builtin=True,
                    show_icon=True,
                ),
                FooterPage(
                    slug="terms",
                    label="Соглашение",
                    kind="page",
                    title="Оферта",
                    body="<p>terms body</p>",
                    sort_order=1,
                    enabled=True,
                    is_builtin=True,
                ),
                FooterPage(
                    slug="privacy",
                    label="Приватность",
                    kind="page",
                    title="Privacy",
                    body="<p>hidden</p>",
                    sort_order=0,
                    enabled=False,
                    is_builtin=True,
                ),
            ]
        )
        self.db.commit()

        public = self.client.get("/footer-pages")
        self.assertEqual(public.status_code, 200, public.text)
        items = public.json()
        labels = [item["label"] for item in items]
        self.assertIn("Соглашение", labels)
        self.assertIn("Поддержка", labels)
        self.assertNotIn("Приватность", labels)
        self.assertLess(labels.index("Соглашение"), labels.index("Поддержка"))
        terms = next(item for item in items if item["slug"] == "terms")
        support = next(item for item in items if item["slug"] == "support")
        self.assertEqual(terms["path"], "/terms")
        self.assertEqual(support["path"], "/support")
        self.assertTrue(support["show_icon"])

        page = self.client.get("/footer-pages/terms")
        self.assertEqual(page.status_code, 200, page.text)
        self.assertEqual(page.json()["body"], "<p>terms body</p>")
        self.assertEqual(page.json()["title"], "Оферта")

        support_page = self.client.get("/footer-pages/support")
        self.assertEqual(support_page.status_code, 404)

        hidden = self.client.get("/footer-pages/privacy")
        self.assertEqual(hidden.status_code, 404)

    def test_admin_footer_pages_crud_reorder_and_builtin_guards(self):
        seed = self.client.get("/api/admin/footer-pages", headers=auth(self.admin_token))
        self.assertEqual(seed.status_code, 200, seed.text)
        rows = seed.json()
        self.assertGreaterEqual(len(rows), 5)
        by_slug = {row["slug"]: row for row in rows}
        self.assertIn("support", by_slug)
        self.assertEqual(by_slug["support"]["kind"], "support")
        self.assertTrue(by_slug["support"]["is_builtin"])
        self.assertTrue((by_slug["privacy"].get("body") or "").strip())
        self.assertTrue((by_slug["terms"].get("body") or "").strip())
        self.assertIn("152", by_slug["privacy"]["body"])

        template = self.client.get(
            f"/api/admin/footer-pages/{by_slug['privacy']['id']}/default-body",
            headers=auth(self.admin_token),
        )
        self.assertEqual(template.status_code, 200, template.text)
        self.assertTrue(template.json()["body"].strip())

        public_privacy = self.client.get("/footer-pages/privacy")
        self.assertEqual(public_privacy.status_code, 200, public_privacy.text)
        self.assertFalse(public_privacy.json()["use_legacy"])
        self.assertTrue(public_privacy.json()["body"].strip())

        created = self.client.post(
            "/api/admin/footer-pages",
            headers=auth(self.admin_token),
            json={
                "slug": "refund",
                "label": "Возврат",
                "title": "Возврат средств",
                "body": "<p>refund rules</p>",
                "enabled": True,
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        new_id = created.json()["id"]
        self.assertEqual(created.json()["path"], "/pages/refund")
        self.assertFalse(created.json()["is_builtin"])

        updated = self.client.put(
            f"/api/admin/footer-pages/{new_id}",
            headers=auth(self.admin_token),
            json={"label": "Возвраты", "body": "<p>v2</p>", "enabled": False},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["label"], "Возвраты")
        self.assertFalse(updated.json()["enabled"])

        public_after_hide = self.client.get("/footer-pages")
        public_slugs = [item["slug"] for item in public_after_hide.json()]
        self.assertNotIn("refund", public_slugs)

        support_id = by_slug["support"]["id"]
        support_body = self.client.put(
            f"/api/admin/footer-pages/{support_id}",
            headers=auth(self.admin_token),
            json={"body": "<p>nope</p>", "label": "Чат"},
        )
        self.assertEqual(support_body.status_code, 200, support_body.text)
        self.assertEqual(support_body.json()["label"], "Чат")
        self.assertIsNone(support_body.json().get("body"))

        deny_delete = self.client.delete(
            f"/api/admin/footer-pages/{support_id}",
            headers=auth(self.admin_token),
        )
        self.assertEqual(deny_delete.status_code, 400, deny_delete.text)

        ids = [row["id"] for row in self.client.get(
            "/api/admin/footer-pages", headers=auth(self.admin_token)
        ).json()]
        reordered = list(reversed(ids))
        reorder = self.client.put(
            "/api/admin/footer-pages/reorder",
            headers=auth(self.admin_token),
            json={"ids": reordered},
        )
        self.assertEqual(reorder.status_code, 200, reorder.text)
        after = self.client.get("/api/admin/footer-pages", headers=auth(self.admin_token))
        self.assertEqual([row["id"] for row in after.json()], reordered)

        deleted = self.client.delete(
            f"/api/admin/footer-pages/{new_id}",
            headers=auth(self.admin_token),
        )
        self.assertEqual(deleted.status_code, 200, deleted.text)

        reserved = self.client.post(
            "/api/admin/footer-pages",
            headers=auth(self.admin_token),
            json={"slug": "admin", "label": "Hack", "body": "x"},
        )
        self.assertEqual(reserved.status_code, 400, reserved.text)

    def test_checkout_applies_storefront_beat_sale(self):
        beat = add_beat(self.db, price_mp3=1000)
        self.db.add(
            SaleCampaign(title="beats 20", scope="beats", kind="percent", value=20, enabled=True)
        )
        self.db.commit()
        response = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={"kind": "beat", "item_id": beat.id, "purchase_type": "mp3"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["amount"], 800)

    def test_promo_wrong_user_does_not_change_amount(self):
        beat = add_beat(self.db, price_mp3=1000)
        self.db.add(
            PromoCode(code="ONLYME", user_id=self.admin.id, kind="percent", value=50)
        )
        self.db.commit()
        response = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={
                "kind": "beat",
                "item_id": beat.id,
                "purchase_type": "mp3",
                "promo_code": "ONLYME",
            },
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(self.db.query(PaymentIntent).count(), 0)

    def test_promo_fulfill_consumes_code_once(self):
        beat = add_beat(self.db, price_mp3=1000, allow_multiple=True)
        self.db.add(
            PromoCode(code="ONCE10", user_id=self.user.id, kind="amount", value=100)
        )
        self.db.commit()
        created = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={
                "kind": "beat",
                "item_id": beat.id,
                "purchase_type": "mp3",
                "promo_code": "once10",
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["amount"], 900)
        inv_id = created.json()["inv_id"]
        paid = self.client.post(
            "/payments/simulate",
            headers=auth(self.token),
            json={"inv_id": inv_id, "success": True},
        )
        self.assertEqual(paid.status_code, 200, paid.text)
        code = self.db.query(PromoCode).filter(PromoCode.code == "ONCE10").one()
        self.db.refresh(code)
        self.assertIsNotNone(code.used_at)
        again = self.client.post(
            "/payments/create",
            headers=auth(self.token),
            json={
                "kind": "beat",
                "item_id": beat.id,
                "purchase_type": "wav",
                "promo_code": "ONCE10",
            },
        )
        self.assertEqual(again.status_code, 400, again.text)

    def test_quote_preview_applies_promo_without_intent(self):
        beat = add_beat(self.db, price_mp3=1000)
        self.db.add(PromoCode(code="PREVIEW", user_id=self.user.id, kind="amount", value=100))
        self.db.commit()
        quoted = self.client.post(
            "/payments/quote",
            headers=auth(self.token),
            json={
                "kind": "beat",
                "item_id": beat.id,
                "purchase_type": "mp3",
                "promo_code": "preview",
            },
        )
        self.assertEqual(quoted.status_code, 200, quoted.text)
        self.assertEqual(quoted.json()["amount"], 900)
        self.assertEqual(quoted.json()["list_amount"], 1000)
        self.assertEqual(self.db.query(PaymentIntent).count(), 0)

    def test_public_beats_show_sale_price(self):
        add_beat(self.db, price_mp3=1000)
        self.db.add(SaleCampaign(scope="beats", kind="percent", value=20, enabled=True))
        self.db.commit()
        public = self.client.get("/beats")
        self.assertEqual(public.status_code, 200)
        beat = public.json()[0]
        self.assertEqual(beat["price"], 800)
        self.assertEqual(beat["price_was"], 1000)

    def test_admin_creates_sale_and_promo_code(self):
        sale = self.client.post(
            "/api/admin/sales",
            headers=auth(self.admin_token),
            json={"scope": "courses", "kind": "amount", "value": 500, "enabled": True},
        )
        self.assertEqual(sale.status_code, 200, sale.text)
        self.assertEqual(sale.json()["scope"], "courses")
        promo = self.client.post(
            "/api/admin/promo-codes",
            headers=auth(self.admin_token),
            json={"username": "buyer", "kind": "percent", "value": 10},
        )
        self.assertEqual(promo.status_code, 200, promo.text)
        self.assertEqual(promo.json()["username"], "buyer")
        self.assertTrue(promo.json()["code"])


if __name__ == "__main__":
    unittest.main()
