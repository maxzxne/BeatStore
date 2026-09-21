"""API tests for 2FA login gate and captcha site settings."""
from __future__ import annotations

import os
import sys
import unittest

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_TESTS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND)
sys.path.insert(0, _TESTS)

import pyotp

from helpers import PASSWORD, add_user, api_client, login, reset_schema
from models import SiteSetting, User
from totp_auth import generate_backup_codes, generate_totp_secret, serialize_backup_hashes
import main as main_module


class TwoFactorApiTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        self.admin = add_user(self.db, "boss", admin=True)

    def tearDown(self):
        self.db.close()

    def _set_site(self, key: str, value: str):
        row = self.db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if row:
            row.value = value
        else:
            self.db.add(SiteSetting(key=key, value=value))
        self.db.commit()

    def _enable_user_totp(self, user: User) -> str:
        secret = generate_totp_secret()
        plain, hashed = generate_backup_codes(1)
        user.totp_secret = secret
        user.totp_enabled = True
        user.totp_backup_codes = serialize_backup_hashes(hashed)
        self.db.commit()
        self._backup = plain[0]
        return secret

    def test_login_without_site_flag_skips_2fa(self):
        self._enable_user_totp(self.user)
        self._set_site("totp_enabled", "false")
        response = self.client.post(
            "/login", json={"username": "buyer", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body.get("access_token"))
        self.assertFalse(body.get("requires_2fa"))

    def test_login_requires_2fa_when_site_and_user_enabled(self):
        secret = self._enable_user_totp(self.user)
        self._set_site("totp_enabled", "true")
        response = self.client.post(
            "/login", json={"username": "buyer", "password": PASSWORD}
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body.get("requires_2fa"))
        self.assertIn("temp_token", body)
        self.assertFalse(body.get("access_token"))

        bad = self.client.post(
            "/login/2fa",
            json={"temp_token": body["temp_token"], "code": "000000"},
        )
        self.assertEqual(bad.status_code, 401)

        good = self.client.post(
            "/login/2fa",
            json={
                "temp_token": body["temp_token"],
                "code": pyotp.TOTP(secret).now(),
            },
        )
        self.assertEqual(good.status_code, 200)
        self.assertIn("access_token", good.json())

    def test_admin_login_requires_2fa(self):
        secret = self._enable_user_totp(self.admin)
        self._set_site("totp_enabled", "true")
        response = self.client.post(
            "/api/admin/login",
            json={"username": "boss", "password": PASSWORD},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body.get("requires_2fa"))
        done = self.client.post(
            "/login/2fa",
            json={
                "temp_token": body["temp_token"],
                "code": pyotp.TOTP(secret).now(),
                "as_admin": True,
            },
        )
        self.assertEqual(done.status_code, 200)
        self.assertIn("access_token", done.json())

    def test_setup_enable_disable_2fa(self):
        self._set_site("totp_enabled", "true")
        token = login(self.client, "buyer")
        headers = {"Authorization": f"Bearer {token}"}

        setup = self.client.post("/me/2fa/setup", headers=headers)
        self.assertEqual(setup.status_code, 200)
        secret = setup.json()["secret"]
        self.assertTrue(setup.json().get("qr_data_url", "").startswith("data:image/svg+xml"))
        code = pyotp.TOTP(secret).now()

        confirm = self.client.post(
            "/me/2fa/confirm",
            headers=headers,
            json={"code": code},
        )
        self.assertEqual(confirm.status_code, 200)
        self.assertTrue(confirm.json()["totp_enabled"])
        self.assertTrue(len(confirm.json().get("backup_codes") or []) >= 1)

        me = self.client.get("/me", headers=headers)
        self.assertTrue(me.json().get("totp_enabled"))

        disable = self.client.post(
            "/me/2fa/disable",
            headers=headers,
            json={"password": PASSWORD, "code": pyotp.TOTP(secret).now()},
        )
        self.assertEqual(disable.status_code, 200)
        me2 = self.client.get("/me", headers=headers)
        self.assertFalse(me2.json().get("totp_enabled"))

    def test_admin_can_toggle_totp_and_captcha_settings(self):
        token = login(self.client, "boss", admin=True)
        headers = {"Authorization": f"Bearer {token}"}
        response = self.client.put(
            "/api/admin/site-settings",
            headers=headers,
            json={"totp_enabled": True, "captcha_enabled": True},
        )
        self.assertEqual(response.status_code, 200)
        settings = response.json()["settings"]
        self.assertTrue(settings["totp_enabled"])
        self.assertTrue(settings["captcha_enabled"])

        public = self.client.get("/auth-settings")
        self.assertEqual(public.status_code, 200)
        body = public.json()
        self.assertTrue(body["totp_enabled"])
        self.assertIn("captcha_enabled", body)
        self.assertEqual(body.get("captcha_provider"), "yandex")


class CaptchaGateApiTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self._prev_server = os.environ.get("SMARTCAPTCHA_SERVER_KEY")
        self._prev_client = os.environ.get("SMARTCAPTCHA_CLIENT_KEY")
        self._prev_testing = os.environ.get("BEATSTORE_TESTING")
        os.environ["SMARTCAPTCHA_SERVER_KEY"] = "srv"
        os.environ["SMARTCAPTCHA_CLIENT_KEY"] = "cli"
        # Force captcha path even under test harness
        os.environ["BEATSTORE_TESTING"] = "0"
        os.environ["BEATSTORE_CAPTCHA_FORCE"] = "1"

    def tearDown(self):
        for key, prev in (
            ("SMARTCAPTCHA_SERVER_KEY", self._prev_server),
            ("SMARTCAPTCHA_CLIENT_KEY", self._prev_client),
            ("BEATSTORE_TESTING", self._prev_testing),
        ):
            if prev is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = prev
        os.environ.pop("BEATSTORE_CAPTCHA_FORCE", None)
        self.db.close()

    def test_register_rejects_without_captcha_when_enabled(self):
        self.db.add(SiteSetting(key="captcha_enabled", value="true"))
        self.db.commit()

        original = main_module.verify_smartcaptcha_token
        main_module.verify_smartcaptcha_token = lambda *a, **k: False
        try:
            response = self.client.post(
                "/register",
                json={
                    "email": "capuser@example.com",
                    "username": "capuser",
                    "password": "secret12",
                    "captcha_token": "bad",
                },
            )
            self.assertEqual(response.status_code, 400, response.text)
            self.assertIn("капч", (response.json().get("detail") or "").lower())
        finally:
            main_module.verify_smartcaptcha_token = original


if __name__ == "__main__":
    unittest.main()
