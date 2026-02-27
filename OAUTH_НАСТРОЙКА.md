# Настройка OAuth авторизации

## Текущая реализация

В проекте уже реализована базовая структура для OAuth авторизации через:
- Google
- VK
- Yandex
- Telegram (добавлено)

## Как подключить OAuth провайдеры

### 1. Google OAuth

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Перейдите в "Credentials" → "Create Credentials" → "OAuth client ID"
5. Выберите "Web application"
6. Добавьте авторизованные URI перенаправления:
   - `http://localhost:3000/oauth/google/callback` (для разработки)
   - `https://yourdomain.com/oauth/google/callback` (для продакшена)
7. Скопируйте **Client ID** и **Client Secret**
8. Добавьте в `.env` файл:
   ```
   GOOGLE_CLIENT_ID=ваш_client_id
   GOOGLE_CLIENT_SECRET=ваш_client_secret
   ```

### 2. VK OAuth

1. Перейдите на [VK Developers](https://dev.vk.com/)
2. Создайте новое приложение
3. В настройках приложения укажите:
   - **Redirect URI**: `http://localhost:3000/oauth/vk/callback`
   - **Allowed domains**: `localhost:3000` (для разработки)
4. Скопируйте **Application ID** и **Secure key**
5. Добавьте в `.env` файл:
   ```
   VK_CLIENT_ID=ваш_application_id
   VK_CLIENT_SECRET=ваш_secure_key
   ```

### 3. Yandex OAuth

1. Перейдите на [Yandex OAuth](https://oauth.yandex.ru/)
2. Создайте новое приложение
3. Укажите:
   - **Callback URI**: `http://localhost:3000/oauth/yandex/callback`
   - **Platform**: Web service
4. Скопируйте **Client ID** и **Client Secret**
5. Добавьте в `.env` файл:
   ```
   YANDEX_CLIENT_ID=ваш_client_id
   YANDEX_CLIENT_SECRET=ваш_client_secret
   ```

### 4. Telegram OAuth

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Отправьте команду `/newbot` и следуйте инструкциям
3. Получите **Bot Token**
4. Настройте домен для виджета:
   - Отправьте `/setdomain` боту
   - Укажите ваш домен (например, `yourdomain.com`)
5. Добавьте в `.env` файл:
   ```
   TELEGRAM_BOT_TOKEN=ваш_bot_token
   TELEGRAM_BOT_USERNAME=имя_вашего_бота
   ```

## Переменные окружения

### Backend (`.env` в папке `backend/`)

Создайте файл `.env` в корне проекта `backend/`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_client_secret

# VK OAuth
VK_CLIENT_ID=ваш_vk_client_id
VK_CLIENT_SECRET=ваш_vk_client_secret

# Yandex OAuth
YANDEX_CLIENT_ID=ваш_yandex_client_id
YANDEX_CLIENT_SECRET=ваш_yandex_client_secret

# Telegram OAuth
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token
TELEGRAM_BOT_USERNAME=ваш_telegram_bot_username
```

### Frontend (`.env` в корне проекта)

Создайте файл `.env` в корне проекта (рядом с `package.json`):

```env
# OAuth Client IDs (только для фронтенда, секреты не нужны)
VITE_GOOGLE_CLIENT_ID=ваш_google_client_id
VITE_VK_CLIENT_ID=ваш_vk_client_id
VITE_YANDEX_CLIENT_ID=ваш_yandex_client_id
VITE_TELEGRAM_BOT_USERNAME=ваш_telegram_bot_username
```

## Как это работает

1. Пользователь нажимает кнопку "Войти через [Провайдер]"
2. Открывается окно авторизации провайдера
3. Пользователь авторизуется и разрешает доступ
4. Провайдер перенаправляет на `/oauth/{provider}/callback` с кодом
5. Бэкенд обменивает код на access_token
6. Бэкенд получает данные пользователя (email, имя, ID)
7. Создается или находится пользователь в базе данных
8. Возвращается JWT токен для авторизации

## Примечания

- Для локальной разработки используйте `http://localhost:3000`
- Для продакшена обязательно используйте HTTPS
- Telegram OAuth работает через виджет, который встраивается на страницу
- Все OAuth провайдеры требуют настройки callback URL в их консоли


