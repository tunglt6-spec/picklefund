# PickleFund - Setup database lần đầu
$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PICKLFUND - Setup Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendDir = "$PSScriptRoot\backend"

# Đảm bảo PostgreSQL đang chạy
$pgService = Get-Service | Where-Object { $_.DisplayName -like '*PostgreSQL*' } | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne 'Running') {
        Write-Host "Khoi dong PostgreSQL..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Start-Sleep -Seconds 5
    }
    Write-Host "PostgreSQL: OK" -ForegroundColor Green
} else {
    Write-Host "KHONG TIM THAY PostgreSQL!" -ForegroundColor Red
    Write-Host "Cai dat bang lenh: winget install PostgreSQL.PostgreSQL.17" -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat"
    exit
}

# Tạo database nếu chưa có
Write-Host "`nTao database 'picklebank'..." -ForegroundColor Yellow
$pgPath = (Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1)
if ($pgPath) {
    $psql = "$($pgPath.FullName)\bin\psql.exe"
    & $psql -U postgres -c "CREATE DATABASE picklebank;" 2>&1 | Out-Null
    Write-Host "Database: OK" -ForegroundColor Green
}

# Migrate
Write-Host "`nChay Prisma migrate..." -ForegroundColor Yellow
Push-Location $backendDir
npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration: OK" -ForegroundColor Green
} else {
    npx prisma migrate dev --name init 2>&1
}

# Seed
Write-Host "`nChay Seed data..." -ForegroundColor Yellow
npx prisma db seed 2>&1
Write-Host "Seed: OK" -ForegroundColor Green
Pop-Location

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup hoan thanh!" -ForegroundColor Green
Write-Host "  Chay start-all.ps1 de khoi dong app" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "`nNhan Enter de thoat"
