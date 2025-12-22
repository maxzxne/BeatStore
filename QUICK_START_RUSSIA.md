# 🚀 Быстрый старт для России

## Самый простой способ развернуть BeatStore

### Шаг 1: Выберите хостинг

**Рекомендация для новичков:** [Timeweb Cloud](https://timeweb.cloud)
- 🇷🇺 Российская платформа
- 💰 От 290₽/месяц (есть тестовый период)
- 🎨 Простой интерфейс
- 📞 Техподдержка на русском

### Шаг 2: Создайте сервер

1. Зарегистрируйтесь на Timeweb Cloud
2. Создайте облачный сервер:
   - ОС: Ubuntu 22.04
   - Минимум: 1GB RAM, 1 CPU
   - Выберите тариф

### Шаг 3: Подключитесь к серверу

```bash
# В PowerShell или терминале
ssh root@ваш_ip_адрес
```

### Шаг 4: Автоматическая настройка

```bash
# Скачайте и запустите скрипт настройки
curl -fsSL https://raw.githubusercontent.com/ваш_username/BeatStore/main/setup_server.sh | bash

# Или вручную:
apt update && apt upgrade -y
apt install -y curl git docker.io docker-compose
```

### Шаг 5: Установите приложение

```bash
# Клонируйте проект
git clone https://github.com/ваш_username/BeatStore.git
cd BeatStore

# Создайте файл .env
cp env.example .env
nano .env
```

**Важно:** Замените в `.env`:
- `JWT_SECRET_KEY` - сгенерируйте случайную строку (минимум 32 символа)
- `VITE_API_URL` - укажите ваш IP или домен
- `TELEGRAM_BOT_TOKEN` - токен от BotFather (если используете бота)

### Шаг 6: Запустите

```bash
# Запустите деплой
./deploy.sh

# Или вручную:
docker-compose -f docker-compose.prod.yml up -d
```

### Шаг 7: Проверьте

Откройте в браузере:
- Frontend: `http://ваш_ip:3000`
- Backend: `http://ваш_ip:8000`

---

## 📝 Полезные команды

```bash
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Остановка
docker-compose -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Обновление после изменений
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔧 Настройка Telegram бота

1. Откройте Telegram → найдите @BotFather
2. Отправьте `/newbot` и следуйте инструкциям
3. Сохраните токен
4. Добавьте токен в файл `.env`:
   ```
   TELEGRAM_BOT_TOKEN=ваш_токен
   TELEGRAM_BOT_USERNAME=ваш_username
   ```

---

## 🌐 Настройка домена (опционально)

1. Купите домен (например, на REG.RU)
2. Настройте DNS записи:
   - A запись: ваш_ip
3. Обновите `.env` с новым доменом
4. Перезапустите: `docker-compose -f docker-compose.prod.yml restart`

---

## ❓ Проблемы?

**Приложение не запускается:**
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs

# Проверьте статус
docker-compose -f docker-compose.prod.yml ps
```

**Фронтенд не подключается к бэкенду:**
- Проверьте `VITE_API_URL` в `.env`
- Убедитесь, что бэкенд запущен: `curl http://localhost:8000/health`

**Нужна помощь?**
- Читайте полную инструкцию: [DEPLOY_RUSSIA.md](DEPLOY_RUSSIA.md)
- Проверьте логи приложения
- Обратитесь в техподдержку хостинга

---

**Готово! 🎉 Ваш магазин работает!**

