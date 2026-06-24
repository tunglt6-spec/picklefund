#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

BASE_URL="${PICKLEFUND_API_BASE_URL:-}"
TOKEN="${PICKLEFUND_API_TOKEN:-}"

if [ -z "$BASE_URL" ]; then
  echo "PICKLEFUND_API_BASE_URL is required"
  exit 1
fi

call_api() {
  local path="$1"
  echo "Testing $path"
  status="$(curl -sS -o /tmp/picklefund-test.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE_URL%/}$path" || true)"

  case "$status" in
    2*) echo "[ok] $path" ;;
    401) echo "[auth] Token khong hop le hoac da het han: $path"; exit 1 ;;
    403) echo "[forbidden] Token khong co quyen: $path"; exit 1 ;;
    5*) echo "[server] PickleFund API dang loi may chu: $path"; exit 1 ;;
    *) echo "[fail] $path returned HTTP $status"; cat /tmp/picklefund-test.json; exit 1 ;;
  esac
}

call_api "/api/members"
call_api "/api/fund-periods"
call_api "/api/contributions"
call_api "/api/expenses"
call_api "/api/contributions/summary"
call_api "/api/expenses/summary"
