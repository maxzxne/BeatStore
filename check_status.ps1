# Скрипт для проверки статуса контейнеров и API

Write-Host "=== Проверка Docker контейнеров ===" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n=== Проверка логов бэкенда (последние 20 строк) ===" -ForegroundColor Cyan
docker-compose logs backend --tail 20

Write-Host "`n=== Проверка логов фронтенда (последние 20 строк) ===" -ForegroundColor Cyan
docker-compose logs frontend --tail 20

Write-Host "`n=== Проверка доступности API ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✓ API доступен: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Ответ: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ API недоступен: $_" -ForegroundColor Red
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan

