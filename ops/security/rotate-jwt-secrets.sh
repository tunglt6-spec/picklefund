#!/usr/bin/env bash
# ============================================================================
# rotate-jwt-secrets.sh — P0-2B production JWT secret rotation
# ----------------------------------------------------------------------------
# CHẠY TRÊN VPS trong /opt/picklefund. KHÔNG chạy trên máy dev.
#
# ⚠️ KHÔNG BAO GIỜ paste secret vào terminal/chat/commit. Script tự sinh secret
#    bằng `openssl rand` và ghi thẳng vào .env — không echo giá trị ra màn hình.
#
# Chế độ:
#   DRY_RUN=1   → chỉ kiểm tra tiền đề (env tồn tại, có key, openssl có sẵn),
#                 KHÔNG ghi, KHÔNG restart. Dùng để review an toàn.
#   (mặc định)  → backup .env → rotate JWT_SECRET + JWT_REFRESH_SECRET → restart
#                 backend → health check. Mọi phiên đăng nhập hiện tại bị vô hiệu.
#
# Yêu cầu Gate B (backup) + Gate C (approval rotate) trong runbook trước khi chạy
# chế độ ghi. Xem ops/security/P0-2-production-secret-rotation-and-demo-lockdown.md
# ============================================================================
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/picklefund}"
ENV_FILE="$REPO_DIR/.env"
DRY_RUN="${DRY_RUN:-0}"
HEALTH_URL="${HEALTH_URL:-https://api.picklefund.uk/health}"

log() { printf '[rotate-jwt] %s\n' "$1"; }
fail() { printf '[rotate-jwt][ERROR] %s\n' "$1" >&2; exit 1; }

# ── Tiền đề ────────────────────────────────────────────────────────────────
command -v openssl >/dev/null 2>&1 || fail "openssl không có trên host."
command -v docker  >/dev/null 2>&1 || fail "docker không có trên host."
[ -f "$ENV_FILE" ] || fail "Không thấy $ENV_FILE (chạy đúng trên VPS /opt/picklefund?)."

grep -qE '^JWT_SECRET='         "$ENV_FILE" || fail "Thiếu key JWT_SECRET trong .env."
grep -qE '^JWT_REFRESH_SECRET=' "$ENV_FILE" || fail "Thiếu key JWT_REFRESH_SECRET trong .env."
log "Tiền đề OK: .env tồn tại, có cả 2 key JWT."

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN=1 — chỉ kiểm tra, KHÔNG ghi/restart. Kết thúc an toàn."
  exit 0
fi

# ── Gate B: backup .env (600) ────────────────────────────────────────────────
mkdir -p "$REPO_DIR/backups"
TS="$(date +%Y%m%d_%H%M%S)"
ENV_BAK="$REPO_DIR/backups/env_${TS}.bak"
cp "$ENV_FILE" "$ENV_BAK"
chmod 600 "$ENV_BAK" 2>/dev/null || log "CẢNH BÁO: không chmod 600 được $ENV_BAK — kiểm tra quyền."
[ -s "$ENV_BAK" ] || fail "Backup .env rỗng — dừng, không rotate."
log "Backup env: $ENV_BAK ($(wc -c < "$ENV_BAK") bytes)"

# ── Sinh secret (KHÔNG echo giá trị) ─────────────────────────────────────────
NEW_JWT="$(openssl rand -base64 64 | tr -d '\n')"
NEW_REFRESH="$(openssl rand -base64 64 | tr -d '\n')"
[ -n "$NEW_JWT" ] && [ -n "$NEW_REFRESH" ] || fail "Sinh secret thất bại."

# ── Thay thế in-place, chỉ 2 dòng JWT (dùng | delimiter tránh xung đột base64 /+=)
# Ghi qua file tạm để an toàn nếu sed lỗi giữa chừng.
TMP="$(mktemp)"
JWT_ESC="${NEW_JWT//&/\\&}"; REFRESH_ESC="${NEW_REFRESH//&/\\&}"
sed -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_ESC}|" \
    -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${REFRESH_ESC}|" \
    "$ENV_FILE" > "$TMP"
unset NEW_JWT NEW_REFRESH JWT_ESC REFRESH_ESC

# Xác minh file tạm vẫn có đúng 2 key (không in giá trị) trước khi thay.
[ "$(grep -cE '^JWT_SECRET='         "$TMP")" = "1" ] || { rm -f "$TMP"; fail "Sau thay thế JWT_SECRET không đúng 1 dòng."; }
[ "$(grep -cE '^JWT_REFRESH_SECRET=' "$TMP")" = "1" ] || { rm -f "$TMP"; fail "Sau thay thế JWT_REFRESH_SECRET không đúng 1 dòng."; }
mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true
log "Đã rotate JWT_SECRET + JWT_REFRESH_SECRET (giá trị KHÔNG in). Các key khác giữ nguyên."

# ── Restart backend ──────────────────────────────────────────────────────────
cd "$REPO_DIR"
log "Restart backend..."
docker compose up -d backend || fail "docker compose up -d backend thất bại — khôi phục: cp $ENV_BAK $ENV_FILE && docker compose up -d backend"

# ── Health check (retry) ─────────────────────────────────────────────────────
OK=0
for i in 1 2 3 4 5 6; do
  sleep 10
  if curl -sf -o /dev/null "$HEALTH_URL"; then OK=1; break; fi
  log "Health chưa sẵn sàng (thử $i)..."
done
[ "$OK" = "1" ] || fail "Health check FAIL sau restart. ROLLBACK: cp $ENV_BAK $ENV_FILE && docker compose up -d backend"

log "HEALTH OK. Rotation hoàn tất. Mọi token cũ đã vô hiệu — người dùng cần đăng nhập lại."
log "Backup để rollback: $ENV_BAK"
log "Bước tiếp: chạy ops/security/verify-production-security.sh để xác nhận."
