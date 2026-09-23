# Telegram-бот — XWinner.beats.please

Один бот на витрину и операторов. Запускается вместе с backend (polling в фоне).

## Что умеет

**Клиент**

- `/start`, `/help` — меню: Магазин (Mini App), Заказать услугу, Поддержка, Мои покупки
- Вход через Mini App / Login Widget (HMAC)
- Пуши (если вход через Telegram): ответ поддержки, статус заявки, успешная покупка

**Оператор** (`ADMIN_TELEGRAM_CHAT_ID` / `ADMIN_TELEGRAM_CHAT_IDS`)

- `/admin` — сводка pending + непрочитанная поддержка
- Пуш новой заявки: Открыть / В работу / Готово
- Пуш поддержки: reply в Telegram → сообщение в тред (автор = админ с тем же Telegram id)

Каталог, корзина и оплата — только на сайте, не в чате.

## Env

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=XWinnerbeatpleasebot
FRONTEND_URL=https://ваш-домен.ru
MINI_APP_URL=https://ваш-домен.ru

# один чат или несколько через запятую
ADMIN_TELEGRAM_CHAT_ID=123456789
# или:
ADMIN_TELEGRAM_CHAT_IDS=123456789,987654321

# локально, если Render уже polling — иначе 409 Conflict
TELEGRAM_BOT_ENABLED=true
```

Без `FRONTEND_URL` / `MINI_APP_URL` кнопки-ссылки и файлы заявок не уйдут (fallback на ngrok/Render убран).

## Быстрый старт

1. [@BotFather](https://t.me/BotFather) → `/newbot` → токен
2. Пропиши env на сервере
3. Узнай свой chat_id (напиши боту `/start`, посмотри логи или @userinfobot) → `ADMIN_TELEGRAM_CHAT_ID`
4. Перезапуск backend (`docker-compose restart backend` или redeploy Render)
5. `/start` у бота → меню; с admin-чата → `/admin`

## 409 Conflict

Telegram пускает **один** getUpdates на токен. Если локально и на Render одновременно — Conflict.

- На проде оставь бота включённым
- Локально: `TELEGRAM_BOT_ENABLED=false`

## Как узнать chat_id

Напиши боту любое сообщение и посмотри `chat.id` в логах backend, либо используй @userinfobot.

## FAQ

**Нужен ли второй бот?** Нет. Один бот, роли по chat_id.

**Confirmed / цена из бота?** Нет — только админка.

**Пуш клиенту без Telegram-входа?** Нет — нужен `oauth_provider=telegram`.

Подробности для оператора — в админке `/admin/guide` → «Telegram-бот».
