$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$ollamaUrl = if ($env:OLLAMA_BASE_URL_HOST) { $env:OLLAMA_BASE_URL_HOST } else { "http://localhost:11434" }
$model = if ($env:OLLAMA_TEST_MODEL) { $env:OLLAMA_TEST_MODEL } else { "qwen2.5:7b" }

Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -Method Get | Out-Null
Write-Host "[ok] Ollama container responds"

Write-Host "Pulling/checking model $model"
Invoke-RestMethod -Uri "$ollamaUrl/api/pull" -Method Post -ContentType "application/json" -Body (@{
  name = $model
  stream = $false
} | ConvertTo-Json) | Out-Null

Write-Host "Testing local chat"
Invoke-RestMethod -Uri "$ollamaUrl/api/chat" -Method Post -ContentType "application/json" -Body (@{
  model = $model
  messages = @(@{ role = "user"; content = "Noi 'Ollama OK' ngan gon." })
  stream = $false
} | ConvertTo-Json -Depth 5) | Out-Null

Write-Host "[ok] Ollama local chat works"

