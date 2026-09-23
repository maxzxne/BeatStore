"""Handler-level tests for telegram bot (mocked Telegram HTTP)."""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import add_user, reset_schema  # noqa: E402
from models import ServiceOrder, SupportMessage, SupportThread  # noqa: E402
import telegram_bot as bot  # noqa: E402


class TelegramBotHandlersTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.admin = add_user(self.db, "root", admin=True)
        self.buyer = add_user(self.db, "buyer")
        self.buyer.oauth_provider = "telegram"
        self.buyer.oauth_provider_id = "777001"
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_start_sends_menu(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "https://store.example", "MINI_APP_URL": ""}):
            with patch.object(bot, "send_message") as send:
                bot.handle_start_command(10, "max")
        send.assert_called_once()
        text, markup = send.call_args[0][1], send.call_args[0][2]
        self.assertIn("XWinner", text)
        labels = [b["text"] for row in markup["inline_keyboard"] for b in row]
        self.assertIn("Магазин", labels)

    def test_admin_command_denied_for_stranger(self):
        with patch.dict(os.environ, {"ADMIN_TELEGRAM_CHAT_ID": "999"}):
            with patch.object(bot, "send_message") as send:
                bot.handle_admin_command(1)
        self.assertIn("оператора", send.call_args[0][1])

    def test_admin_command_summary(self):
        self.db.add(
            ServiceOrder(
                user_id=self.buyer.id,
                order_type="know",
                status="pending",
                description="x",
            )
        )
        thread = SupportThread(user_id=self.buyer.id, unread_for_admin=2)
        self.db.add(thread)
        self.db.commit()

        with patch.dict(
            os.environ,
            {
                "ADMIN_TELEGRAM_CHAT_ID": "42",
                "FRONTEND_URL": "https://store.example",
            },
        ):
            with patch.object(bot, "send_message") as send:
                bot.handle_admin_command(42)
        text = send.call_args[0][1]
        self.assertIn("1", text)
        self.assertIn("2", text)

    def test_order_status_callback_updates_db(self):
        order = ServiceOrder(
            user_id=self.buyer.id,
            order_type="know",
            status="paid",
            description="x",
            price=1000,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        cq = {
            "id": "cq1",
            "data": f"o:{order.id}:in_progress",
            "from": {"id": 42},
            "message": {
                "message_id": 5,
                "chat": {"id": 42},
                "text": f"Заявка #{order.id}",
            },
        }
        with patch.dict(os.environ, {"ADMIN_TELEGRAM_CHAT_ID": "42", "FRONTEND_URL": "https://s.example"}):
            with patch.object(bot, "answer_callback_query"):
                with patch.object(bot, "edit_message_text"):
                    with patch.object(bot, "send_message") as send:
                        bot.handle_callback_query(cq)

        self.db.refresh(order)
        self.assertEqual(order.status, "in_progress")
        # Telegram user notified
        notify_texts = [c[0][1] for c in send.call_args_list]
        self.assertTrue(any("в работе" in t for t in notify_texts))

    def test_support_reply_posts_to_thread(self):
        thread = SupportThread(user_id=self.buyer.id, unread_for_admin=1)
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)

        message = {
            "chat": {"id": 42},
            "text": "Скоро ответим",
            "from": {"username": "ops"},
            "reply_to_message": {
                "text": f"Поддержка · тред #{thread.id}\n👤 buyer\nHi",
            },
        }
        with patch.dict(os.environ, {"ADMIN_TELEGRAM_CHAT_ID": "42", "FRONTEND_URL": "https://s.example"}):
            with patch.object(bot, "send_message") as send:
                bot.handle_message(message)

        msgs = self.db.query(SupportMessage).filter(SupportMessage.thread_id == thread.id).all()
        self.assertEqual(len(msgs), 1)
        self.assertEqual(msgs[0].body, "Скоро ответим")
        self.assertEqual(msgs[0].author_role, "admin")
        # Confirmation to admin + push to telegram user
        self.assertGreaterEqual(send.call_count, 1)

    def test_support_reply_author_matches_telegram_admin(self):
        other = add_user(self.db, "other_admin", admin=True)
        self.admin.oauth_provider = "telegram"
        self.admin.oauth_provider_id = "55001"
        other.oauth_provider = "telegram"
        other.oauth_provider_id = "55002"
        thread = SupportThread(user_id=self.buyer.id, unread_for_admin=1)
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)

        message = {
            "chat": {"id": 42},
            "text": "Отвечаю я",
            "from": {"id": 55002, "username": "other_admin"},
            "reply_to_message": {
                "text": f"Поддержка · тред #{thread.id}\n👤 buyer\nHi",
            },
        }
        with patch.dict(
            os.environ,
            {
                "ADMIN_TELEGRAM_CHAT_ID": "",
                "ADMIN_TELEGRAM_CHAT_IDS": "42,99",
                "FRONTEND_URL": "https://s.example",
            },
        ):
            with patch.object(bot, "send_message"):
                bot.handle_message(message)

        msgs = self.db.query(SupportMessage).filter(SupportMessage.thread_id == thread.id).all()
        self.assertEqual(len(msgs), 1)
        self.assertEqual(msgs[0].author_id, other.id)

    def test_admin_allowlist_accepts_second_chat(self):
        with patch.dict(
            os.environ,
            {
                "ADMIN_TELEGRAM_CHAT_ID": "",
                "ADMIN_TELEGRAM_CHAT_IDS": "10,20",
                "FRONTEND_URL": "https://s.example",
            },
        ):
            with patch.object(bot, "send_message") as send:
                bot.handle_admin_command(20)
        self.assertIn("сводка", send.call_args[0][1].lower())


if __name__ == "__main__":
    unittest.main()
