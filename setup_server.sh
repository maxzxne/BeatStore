#!/bin/bash

# Скрипт для первоначальной настройки сервера
# Использование: ./setup_server.sh

set -e

echo "🔧 Настройка сервера для BeatStore..."
echo ""

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка необходимых пакетов..."
apt install -y curl git nano ufw

# Установка Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker установлен"
else
    echo "✅ Docker уже установлен"
fi

# Установка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Установка Docker Compose..."
    apt install docker-compose -y
    echo "✅ Docker Compose установлен"
else
    echo "✅ Docker Compose уже установлен"
fi

# Настройка файрвола
echo "🔥 Настройка файрвола..."
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 3000/tcp # Frontend
ufw allow 8000/tcp # Backend
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
echo "✅ Файрвол настроен"

# Создание директории для проекта
echo "📁 Создание директории проекта..."
mkdir -p /opt/beatstore
cd /opt/beatstore

echo ""
echo "✅ Сервер настроен!"
echo ""
echo "📝 Следующие шаги:"
echo "  1. Склонируйте репозиторий: git clone https://github.com/ваш_username/BeatStore.git"
echo "  2. Перейдите в директорию: cd BeatStore"
echo "  3. Создайте файл .env на основе env.example"
echo "  4. Запустите деплой: ./deploy.sh"
echo ""

