#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cảnh báo hạ tầng PickleFund: (1) đĩa root sắp đầy, (2) API trả 502/không phản hồi.
# Chạy qua cron trên VPS (khuyến nghị mỗi 5 phút). Gửi Telegram (đọc token/chat từ
# /opt/picklefund/.env.production — CÙNG bot pipeline deploy dùng).
#
# Có DEBOUNCE: chỉ báo khi CHUYỂN trạng thái (good→bad và bad→good) để không spam.
#
# Cấu hình qua env (đều có mặc định):
#   PF_ENV_FILE       (mặc định /opt/picklefund/.env.production) — nguồn token Telegram
#   PF_DISK_THRESHOLD (mặc định 85) — % đĩa root vượt là cảnh báo
#   PF_API_URL        (mặc định https://api.picklefund.uk/health)
#   PF_STATE_DIR      (mặc định /var/tmp/pf-health) — lưu trạng thái debounce
#
# Cài cron (chạy trên VPS):
#   ( crontab -l 2>/dev/null | grep -v 'health-alert.sh' ; \
#     echo '*/5 * * * * /opt/picklefund/ops/health-alert.sh >> /var/log/pf-health.log 2>&1' ) | crontab -
# Test gửi Telegram ngay: PF_DISK_THRESHOLD=0 /opt/picklefund/ops/health-alert.sh
# ─────────────────────────────────────────────────────────────────────────────
set -u

DISK_THRESHOLD="${PF_DISK_THRESHOLD:-85}"
API_URL="${PF_API_URL:-https://api.picklefund.uk/health}"
STATE_DIR="${PF_STATE_DIR:-/var/tmp/pf-health}"
mkdir -p "$STATE_DIR"

# Nạp token Telegram (không in ra log). Thử CẢ .env.production và .env — backend đặt
# TELEGRAM_* ở /opt/picklefund/.env (qua compose env_file). PF_ENV_FILE nếu đặt sẽ được
# nạp CUỐI (đè giá trị), để tùy biến nguồn.
ENV_CANDIDATES="/opt/picklefund/.env.production /opt/picklefund/.env"
[ -n "${PF_ENV_FILE:-}" ] && ENV_CANDIDATES="$ENV_CANDIDATES $PF_ENV_FILE"
for _envf in $ENV_CANDIDATES; do
  [ -f "$_envf" ] || continue
  set -a
  # shellcheck disable=SC1090
  . "$_envf"
  set +a
done
BOT="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"

send() {
  local msg="$1"
  if [ -z "$BOT" ] || [ -z "$CHAT" ]; then
    echo "[health] Telegram chưa cấu hình — bỏ qua gửi: $msg"
    return
  fi
  curl -s -X POST "https://api.telegram.org/bot${BOT}/sendMessage" \
    --data-urlencode "chat_id=${CHAT}" \
    --data-urlencode "text=${msg}" \
    -d "parse_mode=HTML" >/dev/null 2>&1 || true
}

# Chỉ báo khi CHUYỂN trạng thái. $1=key $2=is_bad(0/1) $3=bad_msg $4=recover_msg
check_transition() {
  local key="$1" bad="$2" bad_msg="$3" ok_msg="$4"
  local f="$STATE_DIR/$key"
  local prev="ok"
  [ -f "$f" ] && prev="$(cat "$f" 2>/dev/null || echo ok)"
  if [ "$bad" = "1" ]; then
    [ "$prev" != "bad" ] && send "$bad_msg"
    echo "bad" >"$f"
  else
    [ "$prev" = "bad" ] && [ -n "$ok_msg" ] && send "$ok_msg"
    echo "ok" >"$f"
  fi
}

# ── 1) Đĩa root ──────────────────────────────────────────────────────────────
USE="$(df -P / | awk 'NR==2 { gsub("%","",$5); print $5 }')"
USE="${USE:-0}"
if [ "$USE" -ge "$DISK_THRESHOLD" ]; then
  check_transition disk 1 \
    "🟠 PickleFund VPS: đĩa / đầy ${USE}% (ngưỡng ${DISK_THRESHOLD}%). Kiểm: du -sh /var/lib/containerd; docker system df; prune dangling." \
    ""
else
  check_transition disk 0 "" \
    "🟢 PickleFund VPS: đĩa / đã về ${USE}% (dưới ngưỡng ${DISK_THRESHOLD}%)."
fi

# ── 2) API health ────────────────────────────────────────────────────────────
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_URL")"
case "$CODE" in
  502 | 503 | 504 | 000) API_BAD=1 ;;  # nginx/backend/DB chết hoặc không kết nối
  *) API_BAD=0 ;;                        # 200/404... = API sống
esac
if [ "$API_BAD" = "1" ]; then
  check_transition api 1 \
    "🔴 PickleFund: API ${API_URL} trả HTTP ${CODE}. Kiểm nginx upstream (reload) / backend picklefund-api / Postgres." \
    ""
else
  check_transition api 0 "" \
    "🟢 PickleFund: API đã hồi phục (HTTP ${CODE})."
fi
