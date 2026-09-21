"""Unit tests for TOTP helpers and SmartCaptcha validation."""
from __future__ import annotations

import os
import sys
import unittest

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_TESTS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND)
sys.path.insert(0, _TESTS)

import bootstrap  # noqa: F401, E402
import pyotp  # noqa: E402

from smartcaptcha import verify_smartcaptcha_token  # noqa: E402
from totp_auth import (  # noqa: E402
    consume_backup_code,
    generate_backup_codes,
    generate_totp_secret,
    provisioning_uri,
    verify_totp,
    verify_user_second_factor,
)


class TotpAuthTests(unittest.TestCase):
    def test_verify_current_code(self):
        secret = generate_totp_secret()
        code = pyotp.TOTP(secret).now()
        self.assertTrue(verify_totp(secret, code))

    def test_reject_wrong_code(self):
        secret = generate_totp_secret()
        self.assertFalse(verify_totp(secret, "000000"))

    def test_provisioning_uri_contains_issuer(self):
        secret = generate_totp_secret()
        uri = provisioning_uri(secret, "alice")
        self.assertIn("XWinner", uri)
        self.assertIn("alice", uri)

    def test_qr_data_url_is_svg(self):
        from totp_auth import qr_svg_data_url

        uri = provisioning_uri(generate_totp_secret(), "bob")
        data = qr_svg_data_url(uri)
        self.assertTrue(data.startswith("data:image/svg+xml;base64,"))
        self.assertGreater(len(data), 80)

    def test_backup_code_consumed_once(self):
        plain, hashed = generate_backup_codes(2)
        store = __import__("json").dumps(hashed)
        updated = consume_backup_code(store, plain[0])
        self.assertIsNotNone(updated)
        self.assertIsNone(consume_backup_code(updated, plain[0]))
        self.assertIsNotNone(consume_backup_code(updated, plain[1]))

    def test_verify_user_accepts_backup_when_totp_wrong(self):
        secret = generate_totp_secret()
        plain, hashed = generate_backup_codes(1)
        store = __import__("json").dumps(hashed)
        ok, new_store = verify_user_second_factor(
            secret=secret, backup_store=store, code=plain[0]
        )
        self.assertTrue(ok)
        self.assertIsNotNone(new_store)


class SmartCaptchaTests(unittest.TestCase):
    def setUp(self):
        self._prev = os.environ.get("SMARTCAPTCHA_SERVER_KEY")
        os.environ["SMARTCAPTCHA_SERVER_KEY"] = "test-server-key"

    def tearDown(self):
        if self._prev is None:
            os.environ.pop("SMARTCAPTCHA_SERVER_KEY", None)
        else:
            os.environ["SMARTCAPTCHA_SERVER_KEY"] = self._prev

    def test_ok_status(self):
        def fake_post(url, data):
            self.assertIn("validate", url)
            self.assertEqual(data["secret"], "test-server-key")
            self.assertEqual(data["token"], "tok")
            return {"status": "ok", "message": ""}

        self.assertTrue(verify_smartcaptcha_token("tok", http_post=fake_post))

    def test_failed_status(self):
        def fake_post(url, data):
            return {"status": "failed", "message": "Invalid"}

        self.assertFalse(verify_smartcaptcha_token("tok", http_post=fake_post))

    def test_empty_token(self):
        self.assertFalse(verify_smartcaptcha_token("", http_post=lambda *a, **k: {"status": "ok"}))


if __name__ == "__main__":
    unittest.main()
