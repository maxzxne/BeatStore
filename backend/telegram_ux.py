"""Pure Telegram UX builders — no network, easy to unit-test."""
from __future__ import annotations

import re
from typing import Any, Optional

THREAD_MARKER_RE = re.compile(r"тред\s*#(\d+)", re.IGNORECASE)


def site_url(frontend_url: str) -> str:
    return (frontend_url or "").rstrip("/")


def is_admin_chat(chat_id: int, admin_chat_id: Optional[str]) -> bool:
    if not admin_chat_id:
        return False
    try:
        return int(chat_id) == int(str(admin_chat_id).strip())
    except (TypeError, ValueError):
        return False


def build_user_start_text(username: Optional[str] = None) -> str:
    name = f"@{username}" if username else "друг"
    return (
        f"Привет, {name}.\n\n"
        f"<b>XWinner.beats.please</b> — официальный beat store.\n"
        f"Биты, услуги, обучение — в магазине ниже."
    )


def build_user_help_text() -> str:
    return (
        "Команды:\n"
        "/start — меню магазина\n"
        "/help — эта справка\n\n"
        "Покупки и заказы открываются в приложении."
    )


def build_user_menu_markup(
    *,
    mini_app_url: str,
    frontend_url: str,
) -> dict[str, Any]:
    base = site_url(frontend_url) or site_url(mini_app_url)
    store_url = site_url(mini_app_url) or base
    if mini_app_url:
        store_btn: dict[str, Any] = {
            "text": "Магазин",
            "web_app": {"url": store_url},
        }
    else:
        store_btn = {"text": "Магазин", "url": f"{base}/" if base else "https://t.me"}

    return {
        "inline_keyboard": [
            [store_btn],
            [{"text": "Заказать услугу", "url": f"{base}/order"}],
            [{"text": "Поддержка", "url": f"{base}/support"}],
            [{"text": "Мои покупки", "url": f"{base}/purchases"}],
        ]
    }


def build_auth_return_markup(
    *,
    frontend_url: str,
    chat_id: int,
    username: Optional[str],
    first_name: str,
    last_name: str,
    mini_app_url: str = "",
) -> tuple[str, dict[str, Any]]:
    """Secure auth: open Mini App (initData HMAC), never spoofable chat_id query."""
    _ = (chat_id, first_name, last_name)  # kept for call-site compat
    base = site_url(frontend_url) or site_url(mini_app_url) or "https://XWinner.beats.please"
    store = site_url(mini_app_url) or base
    name = f"@{username}" if username else "друг"
    text = (
        f"Авторизация через Telegram\n\n"
        f"Привет, {name}.\n"
        f"Открой магазин в Telegram — вход подтвердится подписью Mini App."
    )
    if mini_app_url:
        btn: dict[str, Any] = {"text": "Открыть магазин", "web_app": {"url": store}}
    else:
        btn = {"text": "Открыть магазин", "url": f"{base}/"}
    markup = {"inline_keyboard": [[btn]]}
    return text, markup


def build_admin_order_notify(
    *,
    order_id: int,
    customer_line: str,
    categories: str,
    deadline: str,
    prepayment: str,
    description: str,
    materials_info: str,
    reference_links_text: str,
    ref_files_info: str,
    contact_info: str,
    frontend_url: str,
) -> tuple[str, dict[str, Any]]:
    base = site_url(frontend_url)
    text = (
        f"<b>Новая заявка #{order_id}</b>\n\n"
        f"{customer_line}\n"
        f"<b>Категории:</b> {categories}\n"
        f"<b>Дедлайн:</b> {deadline} дней\n"
        f"<b>Предоплата:</b> {prepayment}%\n\n"
        f"<b>Описание:</b>\n{description}\n\n"
        f"<b>Материалы:</b> {materials_info}\n"
        f"<b>Референсы (ссылки):</b>\n{reference_links_text}\n"
        f"<b>Референсы (файлы):</b> {ref_files_info}\n"
        f"<b>Контакты:</b> {contact_info}"
    )
    markup = {
        "inline_keyboard": [
            [{"text": "Открыть", "url": f"{base}/admin/orders?id={order_id}"}],
            [
                {"text": "В работу", "callback_data": f"o:{order_id}:in_progress"},
                {"text": "Готово", "callback_data": f"o:{order_id}:completed"},
            ],
        ]
    }
    return text, markup


def build_admin_support_notify(
    *,
    username: str,
    body: str,
    thread_id: int,
    frontend_url: str,
) -> tuple[str, dict[str, Any]]:
    base = site_url(frontend_url)
    text = (
        f"<b>Поддержка</b> · тред #{thread_id}\n\n"
        f"👤 {username}\n"
        f"{body}\n\n"
        f"Ответь reply на это сообщение или открой тред."
    )
    markup = {
        "inline_keyboard": [
            [{"text": "Открыть тред", "url": f"{base}/admin/support?threadId={thread_id}"}]
        ]
    }
    return text, markup


def build_admin_summary(
    *,
    pending_orders: int,
    unread_support: int,
    frontend_url: str,
) -> tuple[str, dict[str, Any]]:
    base = site_url(frontend_url)
    text = (
        f"<b>Админ · сводка</b>\n\n"
        f"Заявки в ожидании: <b>{pending_orders}</b>\n"
        f"Непрочитанная поддержка: <b>{unread_support}</b>"
    )
    markup = {
        "inline_keyboard": [
            [{"text": "Заявки", "url": f"{base}/admin/orders"}],
            [{"text": "Поддержка", "url": f"{base}/admin/support"}],
            [{"text": "Пользователи", "url": f"{base}/admin/users"}],
        ]
    }
    return text, markup


def parse_callback_data(data: Optional[str]) -> Optional[dict[str, Any]]:
    if not data:
        return None
    parts = data.split(":")
    if len(parts) == 3 and parts[0] == "o":
        try:
            order_id = int(parts[1])
        except ValueError:
            return None
        status = parts[2]
        if status not in ("in_progress", "completed"):
            return None
        return {"kind": "order_status", "order_id": order_id, "status": status}
    return None


def parse_support_thread_id(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    match = THREAD_MARKER_RE.search(text)
    if not match:
        return None
    return int(match.group(1))


def build_user_support_reply_text(preview: str) -> str:
    return (
        f"<b>Ответ поддержки</b>\n\n"
        f"{preview}\n\n"
        f"Открыть чат в магазине → Поддержка."
    )


def build_user_order_status_text(order_id: int, status: str) -> str:
    labels = {
        "in_progress": "в работе",
        "completed": "готово",
        "confirmed": "подтверждена",
        "paid": "оплачена",
        "cancelled": "отменена",
    }
    label = labels.get(status, status)
    return f"Заявка #{order_id}: статус <b>{label}</b>."


def build_user_purchase_text(title: str, kind: str) -> str:
    return f"Покупка оформлена: <b>{title}</b> ({kind}). Файлы — в разделе «Мои покупки»."
