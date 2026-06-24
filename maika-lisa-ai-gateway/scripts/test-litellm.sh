#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

BASE_URL="${LITELLM_BASE_URL:-http://localhost:${LITELLM_PORT:-4000}}"
KEY="${LITELLM_MASTER_KEY:-}"

if [ -z "$KEY" ]; then
  echo "LITELLM_MASTER_KEY is required"
  exit 1
fi

test_model() {
  local model="$1"
  echo "Testing $model"
  curl -fsS "$BASE_URL/v1/chat/completions" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"Tra loi ngan gon: Gateway song chua?\"}],\"max_tokens\":64}" \
    >/dev/null
  echo "[ok] $model"
}

test_model "report-primary"
test_model "code-primary"
test_model "qwen-vietnamese"
test_model "offline-local"
test_model "openrouter-backup"

echo "Fallback is configured in config/litellm.config.yaml. To test provider fallback, temporarily leave one primary provider key empty and rerun this script."
