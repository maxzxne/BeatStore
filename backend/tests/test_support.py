"""Support chat HTTP contract: auth, isolation, history, admin inbox."""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (  # noqa: E402
    add_user,
    api_client,
    auth,
    reset_schema,
    token_for,
)
from models import SupportMessage, SupportThread  # noqa: E402


class SupportApiTestCase(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        self.user = add_user(self.db, "buyer")
        add_user(self.db, "root", admin=True)
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)

    def tearDown(self):
        self.db.close()

    def test_guest_cannot_open_support_thread(self):
        response = self.client.get("/api/support/thread")
        self.assertIn(response.status_code, (401, 403))

    def test_user_empty_thread_before_first_message(self):
        response = self.client.get("/api/support/thread", headers=auth(self.token))
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertIsNone(body["id"])
        self.assertEqual(body["messages"], [])
        self.assertEqual(body["unread_for_user"], 0)

    def test_user_message_persists_in_own_history(self):
        posted = self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Не пришёл бит после оплаты"},
        )
        self.assertEqual(posted.status_code, 200, posted.text)
        message = posted.json()
        self.assertEqual(message["author_role"], "user")
        self.assertEqual(message["body"], "Не пришёл бит после оплаты")

        thread = self.client.get("/api/support/thread", headers=auth(self.token)).json()
        self.assertIsNotNone(thread["id"])
        self.assertEqual(len(thread["messages"]), 1)
        self.assertEqual(thread["messages"][0]["body"], "Не пришёл бит после оплаты")
        self.assertEqual(self.db.query(SupportThread).count(), 1)
        self.assertEqual(self.db.query(SupportMessage).count(), 1)

    def test_stranger_does_not_see_another_user_thread(self):
        self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Секрет"},
        )
        add_user(self.db, "other")
        other = token_for("other")
        other_thread = self.client.get("/api/support/thread", headers=auth(other)).json()
        self.assertEqual(other_thread["messages"], [])
        self.assertIsNone(other_thread["id"])

    def test_user_token_cannot_list_admin_inbox(self):
        response = self.client.get("/api/admin/support/threads", headers=auth(self.token))
        self.assertIn(response.status_code, (401, 403))

    def test_admin_sees_user_thread_after_message(self):
        self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Вопрос по лицензии"},
        )
        inbox = self.client.get(
            "/api/admin/support/threads", headers=auth(self.admin_token)
        )
        self.assertEqual(inbox.status_code, 200, inbox.text)
        rows = inbox.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["username"], "buyer")
        self.assertEqual(rows[0]["last_message_preview"], "Вопрос по лицензии")
        self.assertEqual(rows[0]["unread_for_admin"], 1)

    def test_admin_reply_lands_in_user_history(self):
        self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Где файл?"},
        )
        thread_id = self.client.get(
            "/api/admin/support/threads", headers=auth(self.admin_token)
        ).json()[0]["id"]
        reply = self.client.post(
            f"/api/admin/support/threads/{thread_id}/messages",
            headers=auth(self.admin_token),
            json={"body": "Проверь раздел Покупки"},
        )
        self.assertEqual(reply.status_code, 200, reply.text)
        self.assertEqual(reply.json()["author_role"], "admin")

        user_thread = self.client.get("/api/support/thread", headers=auth(self.token)).json()
        bodies = [item["body"] for item in user_thread["messages"]]
        self.assertEqual(bodies, ["Где файл?", "Проверь раздел Покупки"])
        self.assertEqual(user_thread["unread_for_user"], 0)

        inbox = self.client.get(
            "/api/admin/support/threads", headers=auth(self.admin_token)
        ).json()
        self.assertEqual(inbox[0]["unread_for_admin"], 0)

    def test_empty_message_rejected(self):
        response = self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "   "},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.db.query(SupportMessage).count(), 0)

    def test_message_over_limit_rejected(self):
        response = self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "x" * 2001},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.db.query(SupportMessage).count(), 0)

    def test_poll_after_id_returns_only_newer_messages(self):
        first = self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Первое"},
        ).json()
        self.client.post(
            "/api/support/thread/messages",
            headers=auth(self.token),
            json={"body": "Второе"},
        )
        polled = self.client.get(
            f"/api/support/thread?after_id={first['id']}",
            headers=auth(self.token),
        )
        self.assertEqual(polled.status_code, 200, polled.text)
        bodies = [item["body"] for item in polled.json()["messages"]]
        self.assertEqual(bodies, ["Второе"])

    def test_user_message_notifies_admin_telegram(self):
        with patch.dict(os.environ, {"ADMIN_TELEGRAM_CHAT_ID": "12345"}):
            with patch("main.send_message") as notify:
                posted = self.client.post(
                    "/api/support/thread/messages",
                    headers=auth(self.token),
                    json={"body": "Помогите"},
                )
        self.assertEqual(posted.status_code, 200, posted.text)
        notify.assert_called_once()
        args, kwargs = notify.call_args
        self.assertEqual(args[0], 12345)
        self.assertIn("buyer", args[1])
        self.assertIn("Помогите", args[1])


if __name__ == "__main__":
    unittest.main()
