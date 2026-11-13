#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT: đường đặt lịch/giao việc TỪ TIN NHẮN (@bot trong nhóm) hiểu và lưu lặp lại tuần/tháng/năm
# (chỉ thị AI + CREATE_REMINDER chuẩn hóa + CREATE_TASK lưu recurrence/due_at_utc). Cần rw-ai-bot-tasks-recur.sh đã chạy.
# Sao lưu main.py; docker restart (KHÔNG recreate); lỗi → khôi phục.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
grep -q "def _norm_recurrence" main.py || { echo "thiếu patch_main (TASKS-RECUR) — dừng"; exit 1; }
cp -p main.py "main.py.bak_pre_chatrecur_${TS}"; chmod 600 "main.py.bak_pre_chatrecur_${TS}"
TMPD=$(mktemp -d)
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-tasks/patch_chat.py") > "$TMPD/patch_chat.py"
python3 -c "import ast; ast.parse(open('$TMPD/patch_chat.py', encoding='utf-8').read())"
rollback() { echo "LỖI: $1 — KHÔI PHỤC main.py"; cp -p "main.py.bak_pre_chatrecur_${TS}" main.py; docker restart "$C" >/dev/null || true; rm -rf "$TMPD"; exit 1; }
AB="$AB" python3 "$TMPD/patch_chat.py" || rollback "vá main.py lỗi"
docker restart "$C" >/dev/null
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "POST webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"
grep -q "TẦN SUẤT LẶP LẠI" main.py && grep -q '"monthly" / "yearly"' main.py || rollback "main.py thiếu chỉ thị mới"
if docker logs --since 2m "$C" 2>&1 | grep -q "Traceback"; then docker logs --since 2m "$C" 2>&1 | grep -A3 "Traceback" | tail -6 | cut -c1-200; rollback "log có Traceback sau restart"; fi
rm -rf "$TMPD"
git add main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "AI-BOT: đường chat đặt lịch/giao việc hiểu lặp lại tuần/tháng/năm"
echo "=== xong ==="
exit 0
