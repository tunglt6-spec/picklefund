#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Cập nhật hub.py (vá audit 2026-11-13) từ commit hiện tại, chạy bộ test TRONG container, restart (KHÔNG recreate), kiểm lại.
# Thay đổi chính: nhóm KHÔNG còn tự được "xác nhận" khi có lệnh; event_url chỉ nhận /api/zalo/hub/<id>; IP thật sau tunnel cho giới hạn đổi mã;
# photo_url chỉ https; dọn hub_messages; token header sai dạng → 401; báo vào nhóm khi chuyển lệnh lỗi; timeout chuyển lệnh 15s.
# Kèm: chmod 600 mọi file *.bak_* (chứa mã/khóa cũ) trong /opt/ai-bot-saas. Lỗi → khôi phục hub.py + restart.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; BOT=bot_7be4d5962d80; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
cp -p hub.py "hub.py.bak_pre_audit_${TS}"
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub.py") > hub.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_hub.py") > /tmp/test_hub.py
python3 -c "
import ast
s = open('hub.py.new', encoding='utf-8').read()
assert '\x00' not in s and 'EVENT_PATH_RE' in s and '_notify_failure' in s, 'hub.py không đúng bản vá'
ast.parse(s); print('hub.py mới: cú pháp OK')"
grep -q -E '^\s*(import|from) (jwt|cryptography)' hub.py.new && { echo "hub.py còn phụ thuộc gói ngoài — dừng"; rm -f hub.py.new; exit 1; } || true
mv hub.py.new hub.py
rollback() {
  echo "LỖI: $1 — KHÔI PHỤC hub.py"
  cp -p "hub.py.bak_pre_audit_${TS}" hub.py
  docker restart "$C" >/dev/null || true
  exit 1
}
echo "== Test trong container =="
if docker exec -i -e HUB_DIR=/app "$C" python -W ignore - < /tmp/test_hub.py > /tmp/test_hub.out 2>&1; then tail -4 /tmp/test_hub.out; else tail -25 /tmp/test_hub.out; rm -f /tmp/test_hub.py /tmp/test_hub.out; rollback "bộ kiểm thử lỗi"; fi
rm -f /tmp/test_hub.py /tmp/test_hub.out
echo "== Restart + kiểm tra =="
docker restart "$C" >/dev/null
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec picklefund-api node -e "fetch('http://maika-saas-engine:4105/api/hub/v1/health').then(r=>r.text()).then(t=>{if(!t.includes('\"enabled\":true'))process.exit(2)}).catch(()=>process.exit(3))" || rollback "hub-net hỏng"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"
echo "== Quyền file sao lưu =="
find "$AB" -maxdepth 2 \( -name '*.bak_*' -o -name '*.bak' \) -type f -exec chmod 600 {} + 2>/dev/null || true
echo "số file sao lưu đã chmod 600: $(find "$AB" -maxdepth 2 \( -name '*.bak_*' -o -name '*.bak' \) -type f | wc -l)"
git add hub.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "hub: vá audit 2026-11-13"
echo "=== xong ==="
exit 0
