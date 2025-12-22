#!/bin/bash

# Скрипт для автоматического деплоя BeatStore
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начало деплоя BeatStore..."
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📝 Создайте файл .env на основе env.example"
    exit 1
fi

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "📦 Установите Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    echo "📦 Установите Docker Compose: apt install docker-compose -y"
    exit 1
fi

echo "✅ Проверки пройдены"
echo ""

# Остановка старых контейнеров
echo "🛑 Остановка старых контейнеров..."
docker-compose -f docker-compose.prod.yml down || true

# Сборка и запуск
echo "🔨 Сборка и запуск контейнеров..."
docker-compose -f docker-compose.prod.yml up -d --build

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Проверка статуса контейнеров..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "📝 Полезные команды:"
echo "  - Просмотр логов: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Остановка: docker-compose -f docker-compose.prod.yml down"
echo "  - Перезапуск: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "🌐 Приложение должно быть доступно по адресу:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:8000"

