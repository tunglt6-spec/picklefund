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

$baseUrl = if ($env:LITELLM_BASE_URL) { $env:LITELLM_BASE_URL } else { "http://localhost:$($(if ($env:LITELLM_PORT) { $env:LITELLM_PORT } else { "4000" }))" }
$key = $env:LITELLM_MASTER_KEY
if (!$key) { throw "LITELLM_MASTER_KEY is required" }

function Test-Model {
  param([string]$Model)
  Write-Host "Testing $Model"
  $body = @{
    model = $Model
    messages = @(@{ role = "user"; content = "Tra loi ngan gon: Gateway song chua?" })
    max_tokens = 64
  } | ConvertTo-Json -Depth 5

  Invoke-RestMethod -Uri "$baseUrl/v1/chat/completions" -Method Post -Headers @{
    Authorization = "Bearer $key"
    "Content-Type" = "application/json"
  } -Body $body | Out-Null
  Write-Host "[ok] $Model"
}

Test-Model "report-primary"
Test-Model "code-primary"
Test-Model "qwen-vietnamese"
Test-Model "offline-local"
Test-Model "openrouter-backup"

Write-Host "Fallback is configured in config/litellm.config.yaml."

