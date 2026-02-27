# Скрипт для запуска XWinner.beats.please на Docker

Write-Host "Остановка существующих контейнеров..." -ForegroundColor Yellow
docker-compose down

Write-Host "Сборка образов..." -ForegroundColor Yellow
docker-compose build

Write-Host "Запуск контейнеров..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Ожидание запуска сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nПроверка статуса контейнеров:" -ForegroundColor Green
docker-compose ps

Write-Host "`nЛоги бэкенда (последние 20 строк):" -ForegroundColor Green
docker-compose logs --tail=20 backend

Write-Host "`nЛоги фронтенда (последние 20 строк):" -ForegroundColor Green
docker-compose logs --tail=20 frontend

Write-Host "`n=== ИНФОРМАЦИЯ ДЛЯ ДОСТУПА ===" -ForegroundColor Cyan
Write-Host "Фронтенд: http://localhost:3000" -ForegroundColor White
Write-Host "Бэкенд API: http://localhost:8000" -ForegroundColor White
Write-Host "Документация API: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nАдминка:" -ForegroundColor Yellow
Write-Host "  URL: http://localhost:3000/admin/login" -ForegroundColor White
Write-Host "  Логин: admin" -ForegroundColor White
Write-Host "  Пароль: admin123" -ForegroundColor White


