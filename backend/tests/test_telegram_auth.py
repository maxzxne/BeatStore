"""Telegram Login Widget / WebApp initData HMAC + insecure chat_id auth gate."""
from __future__ import annotations

import os
import sys
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bootstrap  # noqa: F401, E402

from telegram_auth import (  # noqa: E402
    build_login_widget_hash,
    build_webapp_init_data,
    verify_login_widget,
    verify_webapp_init_data,
)
from helpers import add_beat, add_user, api_client, auth, reset_schema, token_for  # noqa: E402


BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"


class TelegramHashUnitTests(unittest.TestCase):
    def setUp(self):
        os.environ["TELEGRAM_BOT_TOKEN"] = BOT_TOKEN

    def test_login_widget_valid_hash_passes(self):
        auth_date = str(int(time.time()))
        payload = {
            "id": "42",
            "first_name": "Max",
            "username": "maxzxne",
            "auth_date": auth_date,
        }
        payload["hash"] = build_login_widget_hash(payload, BOT_TOKEN)
        ok, user = verify_login_widget(payload, BOT_TOKEN)
        self.assertTrue(ok)
        self.assertEqual(user["id"], "42")
        self.assertEqual(user["username"], "maxzxne")

    def test_login_widget_tampered_id_fails(self):
        auth_date = str(int(time.time()))
        payload = {
            "id": "42",
            "first_name": "Max",
            "auth_date": auth_date,
        }
        payload["hash"] = build_login_widget_hash(payload, BOT_TOKEN)
        payload["id"] = "999"
        ok, _ = verify_login_widget(payload, BOT_TOKEN)
        self.assertFalse(ok)

    def test_webapp_init_data_valid_passes(self):
        auth_date = int(time.time())
        user = {"id": 77, "first_name": "Ann", "username": "ann"}
        init_data = build_webapp_init_data(user, auth_date, BOT_TOKEN)
        ok, parsed = verify_webapp_init_data(init_data, BOT_TOKEN)
        self.assertTrue(ok)
        self.assertEqual(str(parsed["id"]), "77")
        self.assertEqual(parsed["username"], "ann")

    def test_webapp_init_data_bad_hash_fails(self):
        auth_date = int(time.time())
        user = {"id": 77, "first_name": "Ann"}
        init_data = build_webapp_init_data(user, auth_date, BOT_TOKEN)
        bad = init_data.replace("hash=", "hash=deadbeef")
        # ensure we actually broke hash field
        if bad == init_data:
            bad = init_data + "x"
        ok, _ = verify_webapp_init_data(bad, BOT_TOKEN)
        self.assertFalse(ok)


class TelegramAuthApiTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        os.environ["TELEGRAM_BOT_TOKEN"] = BOT_TOKEN

    def tearDown(self):
        self.db.close()

    def test_chat_id_telegram_auth_rejected(self):
        res = self.client.post(
            "/oauth/telegram-auth",
            data={
                "chat_id": "424242",
                "username": "spoof",
                "first_name": "Nope",
            },
        )
        self.assertEqual(res.status_code, 403)

    def test_oauth_login_telegram_without_hash_rejected(self):
        res = self.client.post(
            "/oauth/login",
            json={
                "provider": "telegram",
                "provider_user_id": "42",
                "access_token": "not-a-real-hash",
                "username": "spoof",
                "first_name": "Nope",
            },
        )
        self.assertEqual(res.status_code, 401)

    def test_oauth_login_telegram_with_valid_widget_hash(self):
        auth_date = str(int(time.time()))
        payload = {
            "id": "42",
            "first_name": "Max",
            "username": "maxzxne",
            "auth_date": auth_date,
        }
        tg_hash = build_login_widget_hash(payload, BOT_TOKEN)
        res = self.client.post(
            "/oauth/login",
            json={
                "provider": "telegram",
                "provider_user_id": "42",
                "access_token": tg_hash,
                "username": "maxzxne",
                "first_name": "Max",
                "auth_date": auth_date,
            },
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("access_token", res.json())

    def test_oauth_login_telegram_with_init_data(self):
        auth_date = int(time.time())
        user = {"id": 88, "first_name": "Bot", "username": "botuser"}
        init_data = build_webapp_init_data(user, auth_date, BOT_TOKEN)
        res = self.client.post(
            "/oauth/login",
            json={
                "provider": "telegram",
                "provider_user_id": "88",
                "access_token": "ignored",
                "init_data": init_data,
            },
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("access_token", res.json())


class BeatsBatchFlagsTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        self.token = token_for("buyer")
        self.beat = add_beat(self.db, "Track")

    def tearDown(self):
        self.db.close()

    def test_beats_list_includes_favorite_and_cart_flags(self):
        self.client.post(f"/beats/{self.beat.id}/favorite", headers=auth(self.token))
        self.client.post(f"/beats/{self.beat.id}/cart", headers=auth(self.token))
        res = self.client.get("/beats", headers=auth(self.token))
        self.assertEqual(res.status_code, 200)
        row = next(b for b in res.json() if b["id"] == self.beat.id)
        self.assertTrue(row.get("is_favorite"))
        self.assertTrue(row.get("is_in_cart"))

    def test_beats_list_anonymous_flags_false(self):
        res = self.client.get("/beats")
        self.assertEqual(res.status_code, 200)
        row = res.json()[0]
        self.assertFalse(row.get("is_favorite"))
        self.assertFalse(row.get("is_in_cart"))


if __name__ == "__main__":
    unittest.main()
