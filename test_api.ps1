# Тест доступности API

Write-Host "=== Тест API ===" -ForegroundColor Cyan

# Тест 1: Health check
Write-Host "`n1. Проверка /health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✓ API работает!" -ForegroundColor Green
    Write-Host "Ответ: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ API не отвечает: $_" -ForegroundColor Red
}

# Тест 2: Попытка логина
Write-Host "`n2. Тест логина (admin/admin123)..." -ForegroundColor Yellow
try {
    $body = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:8000/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
    Write-Host "✓ Логин работает!" -ForegroundColor Green
    Write-Host "Токен получен: $($response.access_token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "✗ Логин не работает: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Ответ сервера: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan


