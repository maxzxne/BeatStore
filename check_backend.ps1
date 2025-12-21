# Скрипт для проверки статуса бэкенда

Write-Host "=== Проверка контейнеров ===" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== Логи бэкенда (последние 30 строк) ===" -ForegroundColor Cyan
docker-compose logs backend --tail 30

Write-Host "`n=== Проверка доступности API ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 3
    Write-Host "✓ API доступен: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Ответ: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ API недоступен: $_" -ForegroundColor Red
    Write-Host "Проверьте, что бэкенд запущен и нет ошибок в логах" -ForegroundColor Yellow
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan

