$ErrorActionPreference = "Continue"

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

function Test-Url {
  param([string]$Name, [string]$Url)
  try {
    Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing | Out-Null
    Write-Host "[ok] $Name"
    return $true
  } catch {
    Write-Host "[fail] $Name ($Url)"
    return $false
  }
}

Read-DotEnv ".env"
$failures = 0

$litellmPort = if ($env:LITELLM_PORT) { $env:LITELLM_PORT } else { "4000" }
$maikaPort = if ($env:MAIKA_PORT) { $env:MAIKA_PORT } else { "4101" }
$lisaPort = if ($env:LISA_PORT) { $env:LISA_PORT } else { "4102" }

if (!(Test-Url "LiteLLM" "http://localhost:$litellmPort/health/readiness")) { $failures++ }
if (!(Test-Url "Ollama" "http://localhost:11434/api/tags")) { $failures++ }
if (!(Test-Url "Maika adapter" "http://localhost:$maikaPort/health")) { $failures++ }
if (!(Test-Url "Lisa adapter" "http://localhost:$lisaPort/health")) { $failures++ }

if ($env:PICKLEFUND_API_BASE_URL) {
  if (!(Test-Url "PickleFund API" "$($env:PICKLEFUND_API_BASE_URL.TrimEnd('/'))/health")) { $failures++ }
} else {
  Write-Host "[skip] PickleFund API: PICKLEFUND_API_BASE_URL is empty"
}

if ($env:OPENROUTER_API_KEY) {
  Write-Host "[ok] OpenRouter key configured as backup"
} else {
  Write-Host "[skip] OpenRouter key is empty"
}

if ($env:ANTHROPIC_API_KEY -or $env:OPENAI_API_KEY -or $env:GEMINI_API_KEY -or $env:QWEN_API_KEY -or $env:DEEPSEEK_API_KEY) {
  Write-Host "[ok] At least one direct provider key configured"
} else {
  Write-Host "[warn] No direct provider key configured"
}

exit $failures

