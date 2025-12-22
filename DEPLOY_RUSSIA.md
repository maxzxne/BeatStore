# 🇷🇺 Инструкция по деплою BeatStore на российские платформы

## 🎯 Рекомендуемые платформы для России

### 1. **Timeweb Cloud** ⭐ (Лучший выбор для новичков)

**Плюсы:**
- 🇷🇺 Российская платформа
- 💰 От 290₽/месяц (есть бесплатный тестовый период)
- 🐳 Поддержка Docker и Docker Compose
- 📚 Отличная документация на русском языке
- 🎨 Простой веб-интерфейс
- 🔒 Автоматический SSL сертификат
- 📞 Техподдержка на русском языке

**Шаги деплоя:**

1. **Регистрация:**
   - Зайдите на [timeweb.cloud](https://timeweb.cloud)
   - Зарегистрируйтесь (можно через соцсети)

2. **Создание проекта:**
   - Войдите в панель управления
   - Выберите "Облачные серверы" → "Создать сервер"
   - Выберите тариф (минимум 1GB RAM, 1 CPU)
   - Выберите ОС: Ubuntu 22.04 LTS
   - Создайте сервер

3. **Подключение к серверу:**
   ```bash
   # В PowerShell используйте SSH клиент
   ssh root@ваш_ip_адрес
   ```

4. **Установка Docker и Docker Compose:**
   ```bash
   # Обновляем систему
   apt update && apt upgrade -y
   
   # Устанавливаем Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Устанавливаем Docker Compose
   apt install docker-compose -y
   
   # Проверяем установку
   docker --version
   docker-compose --version
   ```

5. **Клонирование проекта:**
   ```bash
   # Устанавливаем Git
   apt install git -y
   
   # Клонируем репозиторий
   git clone https://github.com/ваш_username/BeatStore.git
   cd BeatStore
   ```

6. **Настройка переменных окружения:**
   ```bash
   # Создаем файл .env
   nano .env
   ```
   
   Вставьте следующее содержимое (замените значения на свои):
   ```env
   # Database
   DATABASE_URL=sqlite:///./data/beatstore.db
   
   # API Configuration
   VITE_API_URL=http://ваш_ip:8000
   
   # JWT Secret (сгенерируйте случайную строку)
   JWT_SECRET_KEY=ваш_случайный_секретный_ключ_минимум_32_символа
   
   # Environment
   ENVIRONMENT=production
   
   # Telegram Bot
   TELEGRAM_BOT_TOKEN=ваш_bot_token_от_BotFather
   TELEGRAM_BOT_USERNAME=ваш_bot_username
   VITE_TELEGRAM_BOT_USERNAME=ваш_bot_username
   MINI_APP_URL=http://ваш_ip:3000
   FRONTEND_URL=http://ваш_ip:3000
   ```

7. **Запуск приложения:**
   ```bash
   # Запускаем через Docker Compose
   docker-compose up -d
   
   # Проверяем статус
   docker-compose ps
   
   # Смотрим логи
   docker-compose logs -f
   ```

8. **Настройка домена (опционально):**
   - В панели Timeweb добавьте домен
   - Настройте DNS записи
   - Обновите переменные окружения с новым доменом

---

### 2. **Yandex Cloud** ⭐⭐ (Профессиональный вариант)

**Плюсы:**
- 🇷🇺 Российская платформа
- 💰 3000₽ бонусов при регистрации
- 🐳 Отличная поддержка Docker
- 📚 Подробная документация
- 🔧 Много инструментов для управления

**Шаги деплоя:**

1. **Регистрация:**
   - Зайдите на [cloud.yandex.ru](https://cloud.yandex.ru)
   - Зарегистрируйтесь (получите 3000₽ бонусов)

2. **Создание виртуальной машины:**
   - Создайте каталог → Создайте виртуальную машину
   - Выберите Ubuntu 22.04
   - Минимум: 2 vCPU, 2GB RAM, 20GB диск
   - Настройте сеть (откройте порты 3000, 8000)

3. **Подключение и установка:**
   ```bash
   # Подключитесь через SSH
   ssh ubuntu@ваш_ip
   
   # Установите Docker (как в инструкции Timeweb выше)
   ```

4. **Деплой:**
   - Следуйте шагам 4-7 из инструкции Timeweb

---

### 3. **Selectel** (Бюджетный вариант)

**Плюсы:**
- 🇷🇺 Российская платформа
- 💰 От 200₽/месяц
- 🐳 Поддержка Docker
- 📞 Хорошая техподдержка

**Шаги:** Аналогичны Timeweb Cloud

---

### 4. **REG.RU Cloud** (Популярный вариант)

**Плюсы:**
- 🇷🇺 Российская платформа
- 💰 От 199₽/месяц
- 🎨 Простой интерфейс
- 📞 Отличная техподдержка

**Шаги:** Аналогичны Timeweb Cloud

---

## 🔧 Универсальная инструкция для всех платформ

### Подготовка проекта

1. **Создайте файл `.env`** в корне проекта:
   ```env
   DATABASE_URL=sqlite:///./data/beatstore.db
   VITE_API_URL=http://ваш_домен:8000
   JWT_SECRET_KEY=сгенерируйте_случайную_строку_32_символа
   ENVIRONMENT=production
   TELEGRAM_BOT_TOKEN=ваш_токен
   TELEGRAM_BOT_USERNAME=ваш_username
   VITE_TELEGRAM_BOT_USERNAME=ваш_username
   MINI_APP_URL=http://ваш_домен:3000
   FRONTEND_URL=http://ваш_домен:3000
   ```

2. **Генерация JWT Secret:**
   ```bash
   # В PowerShell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   
   # Или используйте онлайн генератор
   ```

### Обновление docker-compose.yml для продакшена

Создайте файл `docker-compose.prod.yml`:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
      - ./backend/static:/app/static
    environment:
      - PYTHONPATH=/app
      - DATABASE_URL=sqlite:///./data/beatstore.db
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - ENVIRONMENT=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
      - MINI_APP_URL=${MINI_APP_URL}
      - FRONTEND_URL=${FRONTEND_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=${VITE_API_URL}
      - VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME}
    restart: unless-stopped
```

### Команды для управления

```bash
# Запуск
docker-compose -f docker-compose.prod.yml up -d

# Остановка
docker-compose -f docker-compose.prod.yml down

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Обновление после изменений в коде
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Настройка безопасности

### 1. Настройка файрвола

```bash
# Установите UFW
apt install ufw -y

# Разрешите SSH
ufw allow 22/tcp

# Разрешите порты приложения
ufw allow 3000/tcp
ufw allow 8000/tcp

# Включите файрвол
ufw enable
```

### 2. Настройка Nginx (для домена)

```bash
# Установите Nginx
apt install nginx -y

# Создайте конфигурацию
nano /etc/nginx/sites-available/beatstore
```

Вставьте:
```nginx
server {
    listen 80;
    server_name ваш_домен.ru;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Активируйте конфигурацию
ln -s /etc/nginx/sites-available/beatstore /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. Установка SSL (Let's Encrypt)

```bash
# Установите Certbot
apt install certbot python3-certbot-nginx -y

# Получите сертификат
certbot --nginx -d ваш_домен.ru

# Автоматическое обновление
certbot renew --dry-run
```

---

## 📱 Настройка Telegram бота

1. **Создайте бота через BotFather:**
   - Откройте Telegram → найдите @BotFather
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Сохраните токен

2. **Настройте Mini App:**
   - Отправьте BotFather: `/newapp`
   - Выберите вашего бота
   - Укажите URL вашего фронтенда (например: `https://ваш_домен.ru`)

3. **Добавьте токен в .env:**
   ```env
   TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
   TELEGRAM_BOT_USERNAME=ваш_username_бота
   ```

---

## 🐛 Решение проблем

### Проблема: Приложение не запускается

```bash
# Проверьте логи
docker-compose logs backend
docker-compose logs frontend

# Проверьте статус контейнеров
docker-compose ps

# Перезапустите
docker-compose restart
```

### Проблема: Фронтенд не подключается к бэкенду

1. Проверьте переменную `VITE_API_URL` в `.env`
2. Убедитесь, что бэкенд запущен: `curl http://localhost:8000/api/health`
3. Проверьте CORS настройки в `backend/main.py`

### Проблема: База данных не создается

```bash
# Проверьте права доступа
chmod -R 777 backend/data

# Пересоздайте контейнер
docker-compose down
docker-compose up -d --force-recreate
```

---

## 💡 Советы для новичков

1. **Начните с Timeweb Cloud** - самый простой вариант
2. **Используйте тестовый период** перед покупкой
3. **Сохраняйте резервные копии** базы данных регулярно
4. **Читайте логи** при возникновении проблем
5. **Используйте домен** вместо IP для удобства

---

## 📞 Полезные ссылки

- [Timeweb Cloud Документация](https://timeweb.cloud/docs/)
- [Yandex Cloud Документация](https://cloud.yandex.ru/docs/)
- [Docker Документация](https://docs.docker.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

## ✅ Чеклист перед запуском

- [ ] Сервер создан и настроен
- [ ] Docker и Docker Compose установлены
- [ ] Проект склонирован на сервер
- [ ] Файл `.env` создан и заполнен
- [ ] JWT_SECRET_KEY сгенерирован и установлен
- [ ] Telegram бот создан и токен добавлен
- [ ] Порты открыты в файрволе
- [ ] Приложение запущено через `docker-compose up -d`
- [ ] Логи проверены, ошибок нет
- [ ] Домен настроен (если используется)
- [ ] SSL сертификат установлен (если используется домен)

---

**Удачи с деплоем! 🚀**

