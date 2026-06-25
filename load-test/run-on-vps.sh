#!/bin/bash
# PickleFund Load Test — chạy trên VPS
# Upload script này lên VPS rồi chạy: bash load-test/run-on-vps.sh
#
# Yêu cầu: VPS đang chạy backend Docker, cần điền BASE_URL + credentials bên dưới

set -e

# ─── Config — SỬA PHẦN NÀY ────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-https://api.picklefund.vn/api}"
TEST_USERNAME="${TEST_USERNAME:-admin}"
TEST_PASSWORD="${TEST_PASSWORD:-changeme123}"
# ──────────────────────────────────────────────────────────────────────────────

echo "=== PickleFund Load Test ==="
echo "Target: $BASE_URL"
echo ""

# 1. Cài k6 nếu chưa có
if ! command -v k6 &>/dev/null; then
  echo "[1/3] Cài đặt k6..."
  sudo gpg -k 2>/dev/null || true
  sudo gpg --no-default-keyring \
    --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 \
    --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 2>/dev/null
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
    | sudo tee /etc/apt/sources.list.d/k6.list >/dev/null
  sudo apt-get update -qq && sudo apt-get install -y k6 -qq
  echo "✅ k6 đã cài: $(k6 version)"
else
  echo "[1/3] k6 đã có: $(k6 version)"
fi

# 2. Test email endpoint (cần backend đang chạy và đã đăng nhập)
echo ""
echo "[2/3] Test email endpoint..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "⚠️  Không lấy được token — bỏ qua email/telegram test"
else
  echo "✅ Login OK"

  # Test email
  EMAIL_RESULT=$(curl -s -X POST "$BASE_URL/hermes/test-email" \
    -H "Authorization: Bearer $TOKEN")
  echo "📧 Email test: $EMAIL_RESULT"

  # Test Telegram
  TG_RESULT=$(curl -s -X POST "$BASE_URL/telegram/test" \
    -H "Authorization: Bearer $TOKEN")
  echo "📱 Telegram test: $TG_RESULT"
fi

# 3. Chạy k6 load test
echo ""
echo "[3/3] Chạy k6 load test (2 phút)..."
echo "──────────────────────────────────"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
k6 run \
  --env BASE_URL="$BASE_URL" \
  --env TEST_USERNAME="$TEST_USERNAME" \
  --env TEST_PASSWORD="$TEST_PASSWORD" \
  "$SCRIPT_DIR/k6-script.js"

echo ""
echo "=== Xong! ==="
