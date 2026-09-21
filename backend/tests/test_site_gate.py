"""Tests for site_gate helpers and middleware."""
from __future__ import annotations

import base64
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import PASSWORD, add_user, api_client, auth, reset_schema, token_for  # noqa: E402
from site_gate import (  # noqa: E402
    hash_basic_password,
    parse_basic_auth_header,
    path_allowed,
    status_page_html,
    verify_basic_password,
)
from models import SiteSetting  # noqa: E402


class SiteGateHelpersTest(unittest.TestCase):
    def test_path_allowed(self):
        self.assertTrue(path_allowed("/health", ("/health",)))
        self.assertTrue(path_allowed("/api/admin/site-settings", ("/api/admin/",)))
        self.assertFalse(path_allowed("/", ("/admin",)))

    def test_password_hash_roundtrip(self):
        h = hash_basic_password("secret-gate")
        self.assertTrue(verify_basic_password("secret-gate", h))
        self.assertFalse(verify_basic_password("wrong", h))

    def test_parse_basic(self):
        token = base64.b64encode(b"studio:hello").decode()
        u, p = parse_basic_auth_header(f"Basic {token}")
        self.assertEqual(u, "studio")
        self.assertEqual(p, "hello")

    def test_status_html(self):
        html = status_page_html(kind="maintenance", title="Закрыто", message="Позже")
        self.assertIn("Закрыто", html)
        self.assertIn("Позже", html)
        self.assertIn("XWinner", html)


class SiteGateMiddlewareTest(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.admin = add_user(self.db, "root", admin=True)
        self.admin_token = token_for("root", admin=True)

    def tearDown(self):
        self.db.close()

    def test_maintenance_returns_503_html(self):
        self.db.add(SiteSetting(key="maintenance_mode", value="true"))
        self.db.commit()
        res = self.client.get("/", headers={"Accept": "text/html"})
        self.assertEqual(res.status_code, 503)
        self.assertIn("временно", res.text.lower())

    def test_maintenance_allows_admin(self):
        self.db.add(SiteSetting(key="maintenance_mode", value="true"))
        self.db.commit()
        res = self.client.get("/api/admin/site-settings", headers=auth(self.admin_token))
        self.assertEqual(res.status_code, 200)

    def test_basic_auth_challenge(self):
        h = hash_basic_password("gatepass")
        self.db.add(SiteSetting(key="http_basic_enabled", value="true"))
        self.db.add(SiteSetting(key="http_basic_user", value="studio"))
        self.db.add(SiteSetting(key="http_basic_password_hash", value=h))
        self.db.commit()
        denied = self.client.get("/health")
        # health is allowlisted
        self.assertEqual(denied.status_code, 200)

        denied2 = self.client.get("/beats", headers={"Accept": "application/json"})
        self.assertEqual(denied2.status_code, 401)
        self.assertIn("WWW-Authenticate", denied2.headers)

        token = base64.b64encode(b"studio:gatepass").decode()
        ok = self.client.get(
            "/beats",
            headers={"Accept": "application/json", "Authorization": f"Basic {token}"},
        )
        self.assertEqual(ok.status_code, 200)

    def test_admin_can_enable_maintenance(self):
        res = self.client.put(
            "/api/admin/site-settings",
            headers=auth(self.admin_token),
            json={"maintenance_mode": True, "maintenance_title": "Пауза"},
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json()["settings"]["maintenance_mode"])

    def test_cannot_enable_basic_without_password(self):
        res = self.client.put(
            "/api/admin/site-settings",
            headers=auth(self.admin_token),
            json={"http_basic_enabled": True},
        )
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
