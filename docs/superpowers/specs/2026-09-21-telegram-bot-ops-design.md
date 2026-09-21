# Telegram Bot Ops Console — Design

**Date:** 2026-09-21  
**Status:** approved for implementation  
**UI surface:** Telegram (один бот), deep links → V2 web

## Goal

Догнать Telegram-бот до текущего продукта: пользовательский хаб в Mini App + админский ops-контур (actionable пуши, сводка, смена статуса, reply в support).

## Architecture

- Один `TELEGRAM_BOT_TOKEN`. Роль по `ADMIN_TELEGRAM_CHAT_ID`.
- Polling: `message` + `callback_query`.
- Pure UX builders в `backend/telegram_ux.py` (unit-тесты без сети).
- I/O и handlers в `backend/telegram_bot.py`.
- Deep links на V2: `/`, `/order`, `/support`, `/purchases`, `/admin/orders?id=`, `/admin/support?threadId=`.

## Phases

### P0 — Hub + actionable notifies
- User `/start` `/help`: бренд + кнопки Магазин / Заказать / Поддержка / Покупки.
- Admin `/admin`: счётчики pending orders + unread support + ссылки.
- Пуш новой заявки: текст + Открыть + (кнопки статуса зарезервированы под P1).
- Пуш support: текст с маркером `тред #N` + Открыть тред.

### P1 — Order status callbacks
- Inline: `В работу` → `in_progress`, `Готово` → `completed` (только admin chat).
- Feedback через `answerCallbackQuery` + правка сообщения.
- `confirmed` из бота не делаем (нужна цена).

### P2 — Support reply + user pushes
- Reply админа на support-пуш → сообщение в тред (author = первый admin user).
- Юзеру с `oauth_provider=telegram` (`oauth_provider_id` = chat_id): ответ support, смена статуса заявки, успешная покупка (если хук есть).

## Out of scope

Каталог/корзина/оплата в чате, отдельный admin-bot, webhook, AI.

## Copy / UX

Короткие сообщения, одна primary CTA, меньше emoji-стены. Progressive disclosure через меню-кнопки.

## Admin guide

Новый раздел в `adminGuideContent.js` про Telegram-бот + обновить support/orders.
