# PickleFund - Khởi động toàn bộ hệ thống
$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PICKLFUND - Khoi dong he thong" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Khởi động PostgreSQL
Write-Host "`n[1/3] Kiem tra PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service | Where-Object { $_.DisplayName -like '*PostgreSQL*' } | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne 'Running') {
        Write-Host "  -> Dang khoi dong $($pgService.Name)..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Start-Sleep -Seconds 3
    }
    Write-Host "  -> PostgreSQL: DANG CHAY ($($pgService.Name))" -ForegroundColor Green
} else {
    Write-Host "  -> Khong tim thay PostgreSQL service!" -ForegroundColor Red
    Write-Host "  -> Vui long cai PostgreSQL truoc: winget install PostgreSQL.PostgreSQL.17" -ForegroundColor Red
}

# 2. Khởi động Backend
Write-Host "`n[2/3] Khoi dong Backend (NestJS)..." -ForegroundColor Yellow
$backendDir = "$PSScriptRoot\backend"
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "  -> Backend da chay tai http://localhost:3000" -ForegroundColor Green
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; Write-Host 'BACKEND - NestJS' -ForegroundColor Cyan; npm run start:dev" -WindowStyle Normal
    Write-Host "  -> Backend dang khoi dong... http://localhost:3000" -ForegroundColor Yellow
}

# 3. Khởi động Frontend
Write-Host "`n[3/3] Khoi dong Frontend (React + Vite)..." -ForegroundColor Yellow
$frontendDir = "$PSScriptRoot\frontend"
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendRunning) {
    Write-Host "  -> Frontend da chay tai http://localhost:5173" -ForegroundColor Green
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; Write-Host 'FRONTEND - React+Vite' -ForegroundColor Magenta; npm run dev" -WindowStyle Normal
    Write-Host "  -> Frontend dang khoi dong... http://localhost:5173" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Cho 5 giay roi mo trinh duyet..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Start-Sleep -Seconds 6

# Mở trình duyệt
Start-Process "http://localhost:5173"

Write-Host "`nDone! Nhan phim bat ky de dong..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
