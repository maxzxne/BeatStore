#!/bin/bash

# Скрипт первоначальной настройки сервера Ubuntu для XWinner.beats.please
# Запускать с правами root или через sudo
# Использование: sudo ./setup_server.sh

set -e

echo "🔧 Настройка сервера для XWinner.beats.please..."

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка необходимых пакетов..."
apt install -y \
    curl \
    git \
    wget \
    nano \
    ufw \
    fail2ban \
    htop

# Установка Docker
echo "🐳 Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Установка Docker Compose
echo "🐳 Установка Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose
fi

# Добавление текущего пользователя в группу docker
echo "👤 Настройка прав доступа..."
if [ "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
else
    usermod -aG docker $USER
fi

# Настройка файрвола
echo "🔥 Настройка файрвола..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Frontend
ufw allow 8000/tcp  # Backend API
ufw reload

# Настройка fail2ban для защиты от брутфорса
echo "🛡️  Настройка fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Оптимизация для Docker
echo "⚙️  Оптимизация системы для Docker..."
cat >> /etc/sysctl.conf << EOF

# Оптимизация для Docker
vm.max_map_count=262144
fs.file-max=2097152
EOF

sysctl -p

# Создание директории для проектов
echo "📁 Создание директории для проектов..."
mkdir -p /opt/XWinner.beats.please
chmod 755 /opt/XWinner.beats.please

echo ""
echo "✅ Настройка сервера завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Перезайдите в систему (чтобы применились права docker)"
echo "   2. Перейдите в директорию проекта: cd /opt/XWinner.beats.please"
echo "   3. Загрузите проект (git clone или через SFTP)"
echo "   4. Запустите: ./deploy.sh"
echo ""
echo "⚠️  ВАЖНО: Настройте SSH ключи для безопасного доступа!"
echo "   ssh-keygen -t rsa -b 4096"


