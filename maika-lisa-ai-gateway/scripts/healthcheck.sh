#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

failures=0

check_url() {
  local name="$1"
  local url="$2"
  if curl -fsS --max-time 10 "$url" >/dev/null; then
    echo "[ok] $name"
  else
    echo "[fail] $name ($url)"
    failures=$((failures + 1))
  fi
}

check_url "LiteLLM" "http://localhost:${LITELLM_PORT:-4000}/health/readiness"
check_url "Ollama" "http://localhost:11434/api/tags"
check_url "Maika adapter" "http://localhost:${MAIKA_PORT:-4101}/health"
check_url "Lisa adapter" "http://localhost:${LISA_PORT:-4102}/health"

if [ -n "${PICKLEFUND_API_BASE_URL:-}" ]; then
  check_url "PickleFund API" "${PICKLEFUND_API_BASE_URL%/}/health"
else
  echo "[skip] PickleFund API: PICKLEFUND_API_BASE_URL is empty"
fi

if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  echo "[ok] OpenRouter key configured as backup"
else
  echo "[skip] OpenRouter key is empty"
fi

if [ -n "${ANTHROPIC_API_KEY:-}${OPENAI_API_KEY:-}${GEMINI_API_KEY:-}${QWEN_API_KEY:-}${DEEPSEEK_API_KEY:-}" ]; then
  echo "[ok] At least one direct provider key configured"
else
  echo "[warn] No direct provider key configured"
fi

exit "$failures"
