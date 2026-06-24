$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

function Read-DotEnv {
  param([string]$Path)
  if (!(Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#") -or !$line.Contains("=")) { return }
    $parts = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
  }
}

Read-DotEnv ".env"

$baseUrl = $env:PICKLEFUND_API_BASE_URL
$token = $env:PICKLEFUND_API_TOKEN
if (!$baseUrl) { throw "PICKLEFUND_API_BASE_URL is required" }
$baseUrl = $baseUrl.TrimEnd("/")

function Test-Api {
  param([string]$Path)
  Write-Host "Testing $Path"
  try {
    Invoke-RestMethod -Uri "$baseUrl$Path" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Host "[ok] $Path"
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -eq 401) { throw "Token khong hop le hoac da het han: $Path" }
    if ($status -eq 403) { throw "Token khong co quyen: $Path" }
    if ($status -ge 500) { throw "PickleFund API dang loi may chu: $Path" }
    throw "$Path returned HTTP $status"
  }
}

Test-Api "/api/members"
Test-Api "/api/fund-periods"
Test-Api "/api/contributions"
Test-Api "/api/expenses"
Test-Api "/api/contributions/summary"
Test-Api "/api/expenses/summary"

