#!/usr/bin/env bash
# ============================================================================
# verify-production-security.sh — kiểm tra AN TOÀN (read-only) trạng thái prod
# ----------------------------------------------------------------------------
# KHÔNG sửa gì. Có thể chạy từ máy dev. In PASS / FAIL / NOT VERIFIED.
#
# Env (tuỳ chọn):
#   API_BASE          (mặc định https://api.picklefund.uk/api)
#   APP_BASE          (mặc định https://app.picklefund.uk)
#   REAL_ADMIN_TOKEN  — nếu có, kiểm tra thêm endpoint cần auth trả 200.
# ============================================================================
set -uo pipefail

API_BASE="${API_BASE:-https://api.picklefund.uk/api}"
APP_BASE="${APP_BASE:-https://app.picklefund.uk}"
PASS=0; FAIL=0; NV=0
p() { printf '  [PASS] %s\n' "$1"; PASS=$((PASS+1)); }
f() { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL+1)); }
n() { printf '  [NOT VERIFIED] %s\n' "$1"; NV=$((NV+1)); }

code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
login_code() {
  curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" "$API_BASE/auth/login"
}

echo "== 1. Health =="
[ "$(code "$API_BASE/../health")" = "200" ] && p "API /health 200" || f "API /health không 200"

echo "== 2. Demo login BỊ CHẶN (401/403) =="
for pair in "admin:admin123" "superadmin:super123" "treasurer:treasurer123" "member:member123"; do
  u="${pair%%:*}"; pw="${pair##*:}"; c="$(login_code "$u" "$pw")"
  if [ "$c" = "401" ] || [ "$c" = "403" ]; then p "$u bị chặn ($c)"; else f "$u VẪN login được ($c)"; fi
done

echo "== 3. EPIC4-9 endpoints KHÔNG 404 (401 khi chưa auth là đúng) =="
for ep in "ai/actions" "ai/actions/summary" "workflows/templates" "workflows/rules" "workflows/runs" \
          "workflows/runtime/status" "workflows/runtime/history" "notification-runtime/channels" "notification-runtime/jobs"; do
  c="$(code "$API_BASE/$ep")"
  if [ "$c" != "404" ]; then p "$ep → $c"; else f "$ep → 404 (chưa deploy?)"; fi
done

echo "== 4. Frontend bundle KHÔNG chứa demo credential =="
BUNDLE="$(curl -s -m 15 "$APP_BASE/?v=$$" | grep -oE 'assets/index-[^"]+\.js' | head -1)"
if [ -n "$BUNDLE" ]; then
  TMP="$(mktemp)"; curl -s -m 30 "$APP_BASE/$BUNDLE" -o "$TMP"
  if grep -qE 'admin123|super123|member123|treasurer123' "$TMP"; then
    f "bundle $BUNDLE CHỨA chuỗi credential"
  else
    p "bundle $BUNDLE sạch (0 credential)"
  fi
  if grep -qE 'admin/ai-manager|admin/workflows' "$TMP"; then p "bundle có routes AI Manager/Workflows"; else f "bundle THIẾU routes Epic"; fi
  rm -f "$TMP"
else
  n "không lấy được bundle hash"
fi

echo "== 5. Authenticated checks (cần REAL_ADMIN_TOKEN) =="
if [ -n "${REAL_ADMIN_TOKEN:-}" ]; then
  c="$(code -H "Authorization: Bearer $REAL_ADMIN_TOKEN" "$API_BASE/ai/actions/summary")"
  [ "$c" = "200" ] && p "admin thật gọi ai/actions/summary → 200" || f "admin thật → $c (token hợp lệ?)"
else
  n "REAL_ADMIN_TOKEN chưa set — bỏ qua authenticated checks"
fi

echo "== 6. Web / Desktop / Mobile checklist =="
echo "  Web:     kiểm tra qua HTTP + bundle ở trên (PASS/FAIL bên trên)"
n "Desktop: chỉ PASS khi launch Electron thủ công (wrapper trỏ $APP_BASE)"
n "Mobile responsive: chỉ PASS khi chạy viewport 390px thủ công/real device"

echo ""
echo "== TỔNG KẾT: PASS=$PASS FAIL=$FAIL NOT_VERIFIED=$NV =="
[ "$FAIL" = "0" ] || exit 1
