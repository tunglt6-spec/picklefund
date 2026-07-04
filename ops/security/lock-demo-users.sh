#!/usr/bin/env bash
# ============================================================================
# lock-demo-users.sh — P0-2C khoá tài khoản demo/seed trên production
# ----------------------------------------------------------------------------
# Dùng PRODUCTION API (không đụng DB trực tiếp). Với mỗi demo user:
#   PUT /users/:id { password: <random không lưu>, isActive: false }
# auth.service + jwt.strategy đều từ chối isActive=false → khoá tức thì kể cả
# token đang có. Mật khẩu ngẫu nhiên là lớp phòng thủ thứ 2 (không ai biết).
#
# ⚠️ GATE A BẮT BUỘC: phải có sẵn 1 tài khoản admin THẬT (không phải demo) và
#    ADMIN_TOKEN dưới đây là token của tài khoản đó — KHÔNG dùng token demo,
#    nếu không bạn sẽ tự khoá mình khỏi hệ thống.
#
# Chế độ:
#   DRY_RUN=1                    → chỉ liệt kê ứng viên, KHÔNG sửa gì.
#   CONFIRM_LOCK_DEMO_USERS=YES  → thực thi khoá (bắt buộc để ghi).
#
# Env:
#   ADMIN_TOKEN  (bắt buộc) — access token của admin THẬT.
#   API_BASE     (mặc định https://api.picklefund.uk/api)
#   DEMO_USERS   (mặc định "admin superadmin treasurer member")
# ============================================================================
set -euo pipefail

API_BASE="${API_BASE:-https://api.picklefund.uk/api}"
DRY_RUN="${DRY_RUN:-0}"
DEMO_USERS="${DEMO_USERS:-admin superadmin treasurer member}"

log()  { printf '[lock-demo] %s\n' "$1"; }
fail() { printf '[lock-demo][ERROR] %s\n' "$1" >&2; exit 1; }

command -v curl    >/dev/null 2>&1 || fail "curl không có."
command -v python3 >/dev/null 2>&1 || fail "python3 không có (dùng để parse JSON)."
command -v openssl >/dev/null 2>&1 || fail "openssl không có (sinh mật khẩu random)."
[ -n "${ADMIN_TOKEN:-}" ] || fail "Thiếu ADMIN_TOKEN (token của admin THẬT, KHÔNG phải demo)."

AUTH="Authorization: Bearer ${ADMIN_TOKEN}"

# ── Lấy danh sách user (không in token) ──────────────────────────────────────
USERS_JSON="$(curl -s -m 20 -H "$AUTH" "$API_BASE/users")" || fail "Gọi GET /users thất bại."
echo "$USERS_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null \
  || fail "Phản hồi /users không phải JSON hợp lệ (token hết hạn? không đủ quyền?)."

# ── Liệt kê ứng viên demo (id/username/role/isActive) ────────────────────────
log "Ứng viên demo phát hiện được:"
CANDIDATES="$(printf '%s' "$USERS_JSON" | DEMO_USERS="$DEMO_USERS" python3 -c '
import sys, json, os
data = json.load(sys.stdin)
rows = data.get("data", data)
rows = rows.get("items", rows) if isinstance(rows, dict) else rows
demo = set(os.environ["DEMO_USERS"].split())
for u in rows:
    if u.get("username") in demo:
        print("%s\t%s\t%s\t%s" % (u.get("id"), u.get("username"),
              u.get("role"), u.get("isActive")))
')"

if [ -z "$CANDIDATES" ]; then
  log "Không tìm thấy user demo nào trong danh sách (có thể đã khoá/đổi tên). Không có gì để làm."
  exit 0
fi
printf '  ID\tUSERNAME\tROLE\tISACTIVE\n'
printf '%s\n' "$CANDIDATES" | sed 's/^/  /'

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN=1 — chỉ liệt kê, KHÔNG khoá. Kết thúc an toàn."
  exit 0
fi

[ "${CONFIRM_LOCK_DEMO_USERS:-}" = "YES" ] \
  || fail "Cần CONFIRM_LOCK_DEMO_USERS=YES để thực thi. (Đã xác nhận Gate A — có admin thật chưa?)"

# ── Khoá từng user ───────────────────────────────────────────────────────────
FAILED=0
while IFS=$'\t' read -r UID UNAME UROLE UACTIVE; do
  [ -n "$UID" ] || continue
  RNDPW="$(openssl rand -base64 32 | tr -d '\n')"      # KHÔNG in, KHÔNG lưu
  BODY="$(RNDPW="$RNDPW" python3 -c 'import json,os; print(json.dumps({"password":os.environ["RNDPW"],"isActive":False}))')"
  unset RNDPW
  CODE="$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X PUT \
    -H "$AUTH" -H 'Content-Type: application/json' \
    -d "$BODY" "$API_BASE/users/$UID")"
  unset BODY
  if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
    log "Đã khoá: $UNAME ($UROLE) → isActive=false, password rotated [$CODE]"
  else
    log "LỖI khoá $UNAME: HTTP $CODE"
    FAILED=$((FAILED+1))
  fi
done <<< "$CANDIDATES"

[ "$FAILED" = "0" ] || fail "$FAILED user khoá thất bại — xem log."

# ── Verify demo login đều fail ───────────────────────────────────────────────
log "Xác minh demo credentials không login được nữa:"
declare -A DEMO_PW=( [admin]=admin123 [superadmin]=super123 [treasurer]=treasurer123 [member]=member123 )
VERIFY_FAIL=0
for u in $DEMO_USERS; do
  pw="${DEMO_PW[$u]:-}"
  [ -n "$pw" ] || continue
  CODE="$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d "$(u="$u" pw="$pw" python3 -c 'import json,os; print(json.dumps({"username":os.environ["u"],"password":os.environ["pw"]}))')" \
    "$API_BASE/auth/login")"
  if [ "$CODE" = "401" ] || [ "$CODE" = "403" ]; then
    log "  $u/**** → $CODE (BỊ CHẶN ✓)"
  else
    log "  $u/**** → $CODE (⚠️ VẪN LOGIN ĐƯỢC — kiểm tra lại!)"
    VERIFY_FAIL=$((VERIFY_FAIL+1))
  fi
done
[ "$VERIFY_FAIL" = "0" ] || fail "$VERIFY_FAIL demo account vẫn login được sau khi khoá."

log "Hoàn tất: demo users đã khoá + verify chặn. Nhớ giữ tài khoản admin THẬT để truy cập."
