"""Promo window and courses_visibility — no HTTP, no providers."""
import os
import sys
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bootstrap  # noqa: F401, E402
from main import is_promo_banner_active, user_can_access_courses_catalog  # noqa: E402


class PromoBannerWindowTests(unittest.TestCase):
    def test_disabled_is_inactive(self):
        banner = SimpleNamespace(enabled=False, starts_at=None, ends_at=None)
        self.assertFalse(is_promo_banner_active(banner, datetime(2026, 1, 1)))

    def test_enabled_without_dates_is_active(self):
        banner = SimpleNamespace(enabled=True, starts_at=None, ends_at=None)
        self.assertTrue(is_promo_banner_active(banner, datetime(2026, 1, 1)))

    def test_outside_window_is_inactive(self):
        now = datetime(2026, 6, 1)
        banner = SimpleNamespace(
            enabled=True,
            starts_at=now + timedelta(days=1),
            ends_at=now + timedelta(days=10),
        )
        self.assertFalse(is_promo_banner_active(banner, now))
        banner.starts_at = now - timedelta(days=10)
        banner.ends_at = now - timedelta(days=1)
        self.assertFalse(is_promo_banner_active(banner, now))

    def test_inside_window_is_active(self):
        now = datetime(2026, 6, 1)
        banner = SimpleNamespace(
            enabled=True,
            starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=1),
        )
        self.assertTrue(is_promo_banner_active(banner, now))


class CoursesVisibilityTests(unittest.TestCase):
    def test_all_allows_anonymous(self):
        self.assertTrue(user_can_access_courses_catalog("all", None))

    def test_hidden_and_admins_only_require_admin(self):
        user = SimpleNamespace(is_admin=False)
        admin = SimpleNamespace(is_admin=True)
        self.assertFalse(user_can_access_courses_catalog("hidden", None))
        self.assertFalse(user_can_access_courses_catalog("hidden", user))
        self.assertTrue(user_can_access_courses_catalog("hidden", admin))
        self.assertFalse(user_can_access_courses_catalog("admins_only", user))
        self.assertTrue(user_can_access_courses_catalog("admins_only", admin))


if __name__ == "__main__":
    unittest.main()
