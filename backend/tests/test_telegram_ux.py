"""Unit tests for Telegram UX builders (no network)."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from telegram_ux import (
    build_admin_order_notify,
    build_admin_summary,
    build_admin_support_notify,
    build_user_help_text,
    build_user_menu_markup,
    build_user_start_text,
    is_admin_chat,
    parse_callback_data,
    parse_support_thread_id,
    site_url,
)


class TelegramUxTests(unittest.TestCase):
    def test_user_start_mentions_brand_without_emoji_wall(self):
        text = build_user_start_text("max")
        self.assertIn("XWinner", text)
        self.assertIn("@max", text)
        self.assertLess(text.count("🎵"), 2)
        self.assertLess(text.count("👋"), 2)

    def test_user_menu_has_four_actions(self):
        markup = build_user_menu_markup(
            mini_app_url="https://store.example",
            frontend_url="https://store.example",
        )
        rows = markup["inline_keyboard"]
        labels = [btn["text"] for row in rows for btn in row]
        self.assertEqual(labels, ["Магазин", "Заказать услугу", "Поддержка", "Мои покупки"])
        self.assertEqual(rows[0][0]["web_app"]["url"], "https://store.example")
        self.assertTrue(rows[1][0]["url"].endswith("/order"))
        self.assertTrue(rows[2][0]["url"].endswith("/support"))
        self.assertTrue(rows[3][0]["url"].endswith("/purchases"))

    def test_user_menu_falls_back_to_url_when_no_mini_app(self):
        markup = build_user_menu_markup(mini_app_url="", frontend_url="https://store.example")
        store_btn = markup["inline_keyboard"][0][0]
        self.assertNotIn("web_app", store_btn)
        self.assertEqual(store_btn["url"], "https://store.example/")

    def test_admin_order_notify_has_open_and_status_callbacks(self):
        text, markup = build_admin_order_notify(
            order_id=7,
            customer_line="buyer",
            categories="trap",
            deadline="7",
            prepayment="50",
            description="need beat",
            materials_info="1 file",
            reference_links_text="none",
            ref_files_info="0",
            contact_info="@x",
            frontend_url="https://store.example",
        )
        self.assertIn("заявка #7", text.lower())
        self.assertIn("buyer", text)
        buttons = [btn for row in markup["inline_keyboard"] for btn in row]
        self.assertEqual(buttons[0]["url"], "https://store.example/admin/orders?id=7")
        self.assertEqual(buttons[1]["callback_data"], "o:7:in_progress")
        self.assertEqual(buttons[2]["callback_data"], "o:7:completed")

    def test_admin_support_notify_embeds_thread_marker(self):
        text, markup = build_admin_support_notify(
            username="buyer",
            body="Помогите",
            thread_id=42,
            frontend_url="https://store.example",
        )
        self.assertIn("тред #42", text)
        self.assertIn("Помогите", text)
        self.assertEqual(
            markup["inline_keyboard"][0][0]["url"],
            "https://store.example/admin/support?threadId=42",
        )
        self.assertEqual(parse_support_thread_id(text), 42)

    def test_parse_callback_order_status(self):
        self.assertEqual(
            parse_callback_data("o:12:in_progress"),
            {"kind": "order_status", "order_id": 12, "status": "in_progress"},
        )
        self.assertEqual(
            parse_callback_data("o:3:completed"),
            {"kind": "order_status", "order_id": 3, "status": "completed"},
        )
        self.assertIsNone(parse_callback_data("junk"))

    def test_admin_summary_counts(self):
        text, markup = build_admin_summary(
            pending_orders=3,
            unread_support=5,
            frontend_url="https://store.example",
        )
        self.assertIn("3", text)
        self.assertIn("5", text)
        urls = [btn["url"] for row in markup["inline_keyboard"] for btn in row]
        self.assertIn("https://store.example/admin/orders", urls)
        self.assertIn("https://store.example/admin/support", urls)

    def test_is_admin_chat(self):
        self.assertTrue(is_admin_chat(99, "99"))
        self.assertFalse(is_admin_chat(1, "99"))
        self.assertFalse(is_admin_chat(1, ""))
        self.assertFalse(is_admin_chat(1, None))

    def test_site_url_strips_slash(self):
        self.assertEqual(site_url("https://a.com/"), "https://a.com")
        self.assertEqual(site_url(""), "")

    def test_help_text_points_to_start(self):
        text = build_user_help_text()
        self.assertIn("/start", text)


if __name__ == "__main__":
    unittest.main()
