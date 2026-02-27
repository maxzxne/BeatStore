#!/bin/bash

# Скрипт для автоматического развертывания XWinner.beats.please на сервере
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начало развертывания XWinner.beats.please..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаю Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен. Перезайдите в систему и запустите скрипт снова."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаю..."
    sudo apt update
    sudo apt install docker-compose -y
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создаю шаблон..."
    cat > .env << EOF
# Database
DATABASE_URL=sqlite:///./data/XWinner.beats.please.db

# JWT Secret (ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ!)
JWT_SECRET_KEY=$(openssl rand -hex 32)

# Environment
ENVIRONMENT=production

# Frontend URL (замените на ваш домен)
FRONTEND_URL=http://localhost:3000

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
MINI_APP_URL=
EOF
    echo "✅ Файл .env создан. ОБЯЗАТЕЛЬНО отредактируйте его перед запуском!"
    echo "   nano .env"
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Создание необходимых директорий
echo "📁 Создание необходимых директорий..."
mkdir -p backend/data
mkdir -p backend/static/{audio,demos,covers,materials,references,course_previews,course_videos}

# Остановка старых контейнеров (если есть)
echo "🛑 Остановка старых контейнеров..."
docker-compose down 2>/dev/null || true

# Сборка и запуск контейнеров
echo "🔨 Сборка Docker образов..."
docker-compose build

echo "🚀 Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Проверка статуса контейнеров..."
docker-compose ps

# Показ логов
echo ""
echo "📋 Последние логи (Ctrl+C для выхода):"
echo ""
docker-compose logs --tail=50

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Остановка: docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo "   Статус: docker-compose ps"
echo ""
echo "🌐 Ваше приложение должно быть доступно:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "   Backend API: http://$(hostname -I | awk '{print $1}'):8000"
echo "   API Docs: http://$(hostname -I | awk '{print $1}'):8000/docs"
echo ""
echo "🤖 Telegram бот:"
echo "   Бот запускается автоматически вместе с backend"
echo "   Для настройки добавьте TELEGRAM_BOT_TOKEN в .env файл"
echo "   Подробнее: см. TELEGRAM_BOT_SETUP.md"


