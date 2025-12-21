# Скрипт для запуска ngrok
# Убедитесь, что frontend запущен на порту 3000

Write-Host "Запуск ngrok для порта 3000..." -ForegroundColor Green
Write-Host "После запуска скопируйте HTTPS URL (например: https://abc123.ngrok-free.app)" -ForegroundColor Yellow
Write-Host "Используйте этот URL в BotFather при настройке Mini App" -ForegroundColor Yellow
Write-Host ""
Write-Host "Нажмите Ctrl+C чтобы остановить ngrok" -ForegroundColor Cyan
Write-Host ""

ngrok http 3000

