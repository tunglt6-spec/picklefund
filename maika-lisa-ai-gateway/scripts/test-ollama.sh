#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

OLLAMA_URL="${OLLAMA_BASE_URL_HOST:-http://localhost:11434}"
MODEL="${OLLAMA_TEST_MODEL:-qwen2.5:7b}"

curl -fsS "$OLLAMA_URL/api/tags" >/dev/null
echo "[ok] Ollama container responds"

echo "Pulling/checking model $MODEL"
curl -fsS "$OLLAMA_URL/api/pull" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$MODEL\",\"stream\":false}" >/dev/null

echo "Testing local chat"
curl -fsS "$OLLAMA_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Noi 'Ollama OK' ngan gon.\"}],\"stream\":false}" >/dev/null

echo "[ok] Ollama local chat works"
