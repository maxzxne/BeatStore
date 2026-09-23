"""
Telegram bot: user hub + admin ops console.
Handles /start, /help, /admin, callbacks, support reply.
"""
from __future__ import annotations

import os
import time
from typing import Any, Optional

import requests

from telegram_ux import (
    build_admin_summary,
    build_auth_return_markup,
    build_user_help_text,
    build_user_menu_markup,
    build_user_order_status_text,
    build_user_start_text,
    build_user_support_reply_text,
    is_admin_chat,
    parse_admin_chat_ids,
    parse_callback_data,
    parse_support_thread_id,
    public_base_url,
    site_url,
)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "XWinnerbeatpleasebot")
MINI_APP_URL = os.getenv("MINI_APP_URL", "")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else ""


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "") or MINI_APP_URL or ""


def _admin_chat_ids_raw() -> Optional[str]:
    parts = []
    for key in ("ADMIN_TELEGRAM_CHAT_ID", "ADMIN_TELEGRAM_CHAT_IDS"):
        value = os.getenv(key)
        if value and value.strip():
            parts.append(value.strip())
    return ",".join(parts) if parts else None


def _admin_chat_ids() -> set[int]:
    return parse_admin_chat_ids(_admin_chat_ids_raw())


def get_updates(offset: Optional[int] = None):
    url = f"{TELEGRAM_API_URL}/getUpdates"
    params = {"timeout": 10, "allowed_updates": ["message", "callback_query"]}
    if offset:
        params["offset"] = offset
    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 409:
            return {"ok": False, "conflict": True, "result": []}
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 409:
            return {"ok": False, "conflict": True, "result": []}
        print(f"HTTP ошибка при получении обновлений: {e}")
        return None
    except Exception as e:
        print(f"Ошибка при получении обновлений: {e}")
        return None


def send_message(chat_id: int, text: str, reply_markup: Optional[dict] = None):
    url = f"{TELEGRAM_API_URL}/sendMessage"
    data: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        data["reply_markup"] = reply_markup
    try:
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Ошибка при отправке сообщения: {e}")
        return None


def edit_message_text(
    chat_id: int,
    message_id: int,
    text: str,
    reply_markup: Optional[dict] = None,
):
    url = f"{TELEGRAM_API_URL}/editMessageText"
    data: dict[str, Any] = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup is not None:
        data["reply_markup"] = reply_markup
    try:
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Ошибка editMessageText: {e}")
        return None


def answer_callback_query(callback_query_id: str, text: Optional[str] = None):
    payload: dict[str, Any] = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        requests.post(f"{TELEGRAM_API_URL}/answerCallbackQuery", json=payload, timeout=10)
    except Exception as e:
        print(f"Ошибка answerCallbackQuery: {e}")


def _absolute_media_url(file_url: str) -> Optional[str]:
    if not file_url:
        return None
    if file_url.startswith("http://") or file_url.startswith("https://"):
        return file_url
    if file_url.startswith("/"):
        base = public_base_url(_frontend_url(), MINI_APP_URL)
        if not base:
            print("Пропуск файла: FRONTEND_URL / MINI_APP_URL не заданы")
            return None
        return f"{base}{file_url}"
    return file_url


def send_document(chat_id: int, file_url: str, caption: Optional[str] = None):
    resolved = _absolute_media_url(file_url)
    if not resolved:
        return None
    data: dict[str, Any] = {"chat_id": chat_id, "document": resolved}
    if caption:
        data["caption"] = caption
    try:
        response = requests.post(f"{TELEGRAM_API_URL}/sendDocument", json=data, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Ошибка при отправке файла: {e}")
        return None


def send_audio(chat_id: int, audio_url: str, caption: Optional[str] = None):
    resolved = _absolute_media_url(audio_url)
    if not resolved:
        return None
    data: dict[str, Any] = {"chat_id": chat_id, "audio": resolved}
    if caption:
        data["caption"] = caption
    try:
        response = requests.post(f"{TELEGRAM_API_URL}/sendAudio", json=data, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Ошибка при отправке аудио: {e}")
        return None


def create_menu_button():
    """Backward-compatible Mini App button (single store CTA)."""
    return build_user_menu_markup(
        mini_app_url=MINI_APP_URL,
        frontend_url=_frontend_url(),
    )


def handle_start_command(
    chat_id: int,
    username: Optional[str] = None,
    start_param: Optional[str] = None,
    from_user: Optional[dict] = None,
):
    if start_param and start_param.startswith("auth"):
        first_name = from_user.get("first_name", "") if from_user else ""
        last_name = from_user.get("last_name", "") if from_user else ""
        text, markup = build_auth_return_markup(
            frontend_url=_frontend_url(),
            chat_id=chat_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            mini_app_url=MINI_APP_URL,
        )
        send_message(chat_id, text, markup or None)
        return

    text = build_user_start_text(username)
    markup = build_user_menu_markup(
        mini_app_url=MINI_APP_URL,
        frontend_url=_frontend_url(),
    )
    send_message(chat_id, text, markup)


def _admin_summary_payload() -> tuple[str, dict]:
    pending = 0
    unread = 0
    try:
        from database import SessionLocal
        from models import ServiceOrder, SupportThread
        from sqlalchemy import func

        db = SessionLocal()
        try:
            pending = (
                db.query(func.count(ServiceOrder.id))
                .filter(ServiceOrder.status == "pending")
                .scalar()
                or 0
            )
            unread = (
                db.query(func.coalesce(func.sum(SupportThread.unread_for_admin), 0)).scalar()
                or 0
            )
        finally:
            db.close()
    except Exception as e:
        print(f"admin summary query failed: {e}")
    return build_admin_summary(
        pending_orders=int(pending),
        unread_support=int(unread),
        frontend_url=_frontend_url(),
    )


def handle_admin_command(chat_id: int):
    if not is_admin_chat(chat_id, _admin_chat_ids_raw()):
        send_message(chat_id, "Команда только для оператора.")
        return
    text, markup = _admin_summary_payload()
    send_message(chat_id, text, markup)


def apply_order_status(order_id: int, status: str) -> tuple[bool, str]:
    """Set service order status from bot. Returns (ok, message)."""
    try:
        from database import SessionLocal
        from models import ServiceOrder
        from datetime import datetime

        db = SessionLocal()
        try:
            order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
            if not order:
                return False, "Заявка не найдена"
            if status not in ("in_progress", "completed"):
                return False, "Статус недоступен из бота"
            order.status = status
            order.updated_at = datetime.utcnow()
            db.commit()
            _notify_order_user(db, order, status)
            return True, f"Заявка #{order_id} → {status}"
        finally:
            db.close()
    except Exception as e:
        print(f"apply_order_status error: {e}")
        return False, "Ошибка обновления"


def _notify_order_user(db, order, status: str) -> None:
    if not order.user_id:
        return
    from models import User

    user = db.query(User).filter(User.id == order.user_id).first()
    if not user or user.oauth_provider != "telegram" or not user.oauth_provider_id:
        return
    try:
        chat_id = int(user.oauth_provider_id)
    except (TypeError, ValueError):
        return
    send_message(chat_id, build_user_order_status_text(order.id, status))


def handle_callback_query(callback_query: dict) -> None:
    cq_id = callback_query.get("id")
    data = callback_query.get("data")
    message = callback_query.get("message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    message_id = message.get("message_id")
    from_user = callback_query.get("from") or {}

    if chat_id is None:
        if cq_id:
            answer_callback_query(cq_id, "Нет chat_id")
        return

    if not is_admin_chat(chat_id, _admin_chat_ids_raw()):
        answer_callback_query(cq_id, "Только для админа")
        return

    parsed = parse_callback_data(data)
    if not parsed or parsed["kind"] != "order_status":
        answer_callback_query(cq_id, "Неизвестная кнопка")
        return

    ok, note = apply_order_status(parsed["order_id"], parsed["status"])
    answer_callback_query(cq_id, note[:180])
    if ok and message_id:
        old = message.get("text") or message.get("caption") or ""
        updated = f"{old}\n\n✅ {note}" if old else f"✅ {note}"
        base = site_url(_frontend_url())
        markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "Открыть",
                        "url": f"{base}/admin/orders?id={parsed['order_id']}",
                    }
                ]
            ]
        }
        result = edit_message_text(chat_id, message_id, updated[:4000], markup)
        if not result:
            send_message(chat_id, f"✅ {note}", markup)
    _ = from_user  # reserved


def _resolve_admin_author(db, telegram_user_id: Optional[int]):
    """Prefer admin whose Telegram oauth id matches the operator who replied."""
    from models import User

    if telegram_user_id is not None:
        match = (
            db.query(User)
            .filter(
                User.is_admin == True,  # noqa: E712
                User.oauth_provider == "telegram",
                User.oauth_provider_id == str(telegram_user_id),
            )
            .first()
        )
        if match:
            return match
    return (
        db.query(User)
        .filter(User.is_admin == True)  # noqa: E712
        .order_by(User.id.asc())
        .first()
    )


def post_admin_support_reply(
    thread_id: int,
    body: str,
    telegram_user_id: Optional[int] = None,
) -> tuple[bool, str]:
    try:
        from database import SessionLocal
        from models import SupportThread, SupportMessage
        from datetime import datetime

        db = SessionLocal()
        try:
            thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()
            if not thread:
                return False, "Тред не найден"
            admin = _resolve_admin_author(db, telegram_user_id)
            if not admin:
                return False, "Нет admin-пользователя в БД"

            text = (body or "").strip()
            if not text:
                return False, "Пустой ответ"
            if len(text) > 4000:
                text = text[:4000]

            now = datetime.utcnow()
            msg = SupportMessage(
                thread_id=thread.id,
                author_id=admin.id,
                author_role="admin",
                body=text,
                created_at=now,
            )
            db.add(msg)
            preview = text if len(text) <= 140 else text[:137] + "..."
            thread.last_message_at = now
            thread.last_message_preview = preview
            thread.unread_for_user = (thread.unread_for_user or 0) + 1
            thread.unread_for_admin = 0
            thread.updated_at = now
            db.commit()

            user = thread.user
            if user and user.oauth_provider == "telegram" and user.oauth_provider_id:
                try:
                    send_message(
                        int(user.oauth_provider_id),
                        build_user_support_reply_text(preview),
                        build_user_menu_markup(
                            mini_app_url=MINI_APP_URL,
                            frontend_url=_frontend_url(),
                        ),
                    )
                except Exception:
                    pass
            return True, "Ответ отправлен"
        finally:
            db.close()
    except Exception as e:
        print(f"post_admin_support_reply error: {e}")
        return False, "Ошибка"


def handle_message(message: dict):
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    username = (message.get("from") or {}).get("username")
    from_id = (message.get("from") or {}).get("id")
    if not chat_id:
        return

    reply = message.get("reply_to_message")
    if reply and is_admin_chat(chat_id, _admin_chat_ids_raw()) and text and not text.startswith("/"):
        reply_text = reply.get("text") or reply.get("caption") or ""
        thread_id = parse_support_thread_id(reply_text)
        if thread_id:
            ok, note = post_admin_support_reply(thread_id, text, telegram_user_id=from_id)
            send_message(chat_id, ("✅ " if ok else "❌ ") + note)
            return

    if text.startswith("/start"):
        start_param = None
        if " " in text:
            start_param = text.split(" ", 1)[1]
        handle_start_command(chat_id, username, start_param, message.get("from"))
        return

    if text.startswith("/help"):
        send_message(
            chat_id,
            build_user_help_text(),
            build_user_menu_markup(
                mini_app_url=MINI_APP_URL,
                frontend_url=_frontend_url(),
            ),
        )
        return

    if text.startswith("/admin"):
        handle_admin_command(chat_id)
        return

    if is_admin_chat(chat_id, _admin_chat_ids_raw()):
        send_message(
            chat_id,
            "Команды: /admin · /start\n"
            "Reply на пуш поддержки — ответ в тред.",
        )
    else:
        send_message(
            chat_id,
            build_user_help_text(),
            build_user_menu_markup(
                mini_app_url=MINI_APP_URL,
                frontend_url=_frontend_url(),
            ),
        )


def main():
    global TELEGRAM_BOT_TOKEN, TELEGRAM_API_URL, MINI_APP_URL
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    MINI_APP_URL = os.getenv("MINI_APP_URL", "")
    TELEGRAM_API_URL = (
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else ""
    )
    if not TELEGRAM_BOT_TOKEN:
        print("❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен!")
        return

    enabled = (os.getenv("TELEGRAM_BOT_ENABLED") or "true").strip().lower()
    if enabled in ("0", "false", "no", "off"):
        print("Telegram бот отключён (TELEGRAM_BOT_ENABLED=false)")
        return

    print("=" * 50)
    print("Telegram бот запущен (user hub + admin ops)")
    print(f"Username: @{TELEGRAM_BOT_USERNAME}")
    admin_ids = _admin_chat_ids()
    if admin_ids:
        print(f"Admin chat ids: {sorted(admin_ids)}")
    else:
        print("Admin chat ids: не заданы (ADMIN_TELEGRAM_CHAT_ID)")
    if MINI_APP_URL or _frontend_url():
        print(f"Public URL: {public_base_url(_frontend_url(), MINI_APP_URL)}")
    else:
        print("WARNING: FRONTEND_URL / MINI_APP_URL не заданы — ссылки и файлы не уйдут")
    print("=" * 50)

    last_update_id = None
    conflict_backoff = 5
    while True:
        try:
            updates = get_updates(last_update_id)
            if updates and updates.get("conflict"):
                print(
                    "Telegram 409 Conflict: другой процесс уже polling на этом токене. "
                    "Останови локальный бот или поставь TELEGRAM_BOT_ENABLED=false. "
                    f"Повтор через {conflict_backoff}s."
                )
                time.sleep(conflict_backoff)
                conflict_backoff = min(conflict_backoff * 2, 120)
                continue
            conflict_backoff = 5
            if not updates or not updates.get("ok"):
                time.sleep(2)
                continue

            for update in updates.get("result", []):
                update_id = update.get("update_id")
                if update_id is not None:
                    last_update_id = update_id + 1

                if "message" in update:
                    handle_message(update["message"])
                elif "callback_query" in update:
                    handle_callback_query(update["callback_query"])

            time.sleep(1)
        except KeyboardInterrupt:
            print("Остановка бота...")
            break
        except Exception as e:
            print(f"Ошибка в основном цикле: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
