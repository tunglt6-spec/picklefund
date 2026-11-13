#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT — nút SỬA / XÓA trên từng thẻ Nhiệm vụ & Lịch nhắc (widget Tổng quan + "Xem tất cả"):
#  - main.py: PUT/DELETE /api/skills/task/{id} và /api/skills/reminder/{id}, xác thực token phiên (hub_token) + kiểm quyền sở hữu;
#  - index.html: nút biểu tượng chuẩn SaaS (32px, 36px trên mobile, tooltip, aria-label, focus ring), hộp xác nhận xóa, sửa dùng lại khung tạo.
# Cần rw-ai-bot-tasks-recur.sh đã chạy. Sao lưu main.py + index.html; docker restart (KHÔNG recreate); lỗi → khôi phục.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
grep -q "def _norm_recurrence" main.py || { echo "thiếu patch_main (TASKS-RECUR) — dừng"; exit 1; }
grep -q 'id="qc-select-recur"' static/index.html || { echo "thiếu ô Lặp lại (patch_html) — dừng"; exit 1; }
cp -p main.py "main.py.bak_pre_taskscrud_${TS}"; chmod 600 "main.py.bak_pre_taskscrud_${TS}"
cp -p static/index.html "static/index.html.bak_pre_taskscrud_${TS}"
TMPD=$(mktemp -d)
for f in patch_crud_main.py patch_crud_html.py tasks_ui.js; do (cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-tasks/$f") > "$TMPD/$f"; done
for f in patch_crud_main.py patch_crud_html.py; do python3 -c "import ast; ast.parse(open('$TMPD/$f', encoding='utf-8').read())"; done
echo "đã lấy 3 file từ commit ${OPS_SHA:0:8}"
rollback() { echo "LỖI: $1 — KHÔI PHỤC main.py + index.html"; cp -p "main.py.bak_pre_taskscrud_${TS}" main.py; cp -p "static/index.html.bak_pre_taskscrud_${TS}" static/index.html; docker restart "$C" >/dev/null || true; rm -rf "$TMPD"; exit 1; }
cp -p "$TMPD/tasks_ui.js" "$AB/tasks_ui.js"
AB="$AB" python3 "$TMPD/patch_crud_main.py" || rollback "vá main.py lỗi"
AB="$AB" python3 "$TMPD/patch_crud_html.py" || rollback "vá index.html lỗi"
docker restart "$C" >/dev/null
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
P=$(curl -s -m 10 http://127.0.0.1:4105/)
for k in 'id="tasks-crud-ui"' 'window.rowActions' "window.rowActions('task', t.id)" "window.rowActions('reminder', r.id)"; do grep -qF "$k" <<<"$P" || rollback "trang chủ thiếu: $k"; done
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"

echo "== Tự kiểm thử API sửa/xóa bằng dữ liệu tạm =="
[ "$(code -X PUT -H 'Content-Type: application/json' -d '{"title":"x"}' http://127.0.0.1:4105/api/skills/task/1)" = 401 ] || rollback "PUT không token phải 401"
[ "$(code -X DELETE http://127.0.0.1:4105/api/skills/reminder/1)" = 401 ] || rollback "DELETE không token phải 401"
T_OWN=$(docker exec -w /app "$C" python -c "import hub; print(hub.issue_session_token('__selftest__','customer'))" 2>/dev/null) || rollback "không cấp được token thử"
T_OTH=$(docker exec -w /app "$C" python -c "import hub; print(hub.issue_session_token('__other__','customer'))" 2>/dev/null) || rollback "không cấp được token thử 2"
J='Content-Type: application/json'
TID=$(curl -s -m 15 -X POST -H "$J" -d '{"creator_id":"__selftest__","assignee_id":"__selftest__","bot_id":"__selftest__","title":"__selftest__","due_date":"09:00 31/01/2030","due_at_utc":"2030-01-31T02:00:00.000Z"}' http://127.0.0.1:4105/api/skills/task | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])") || rollback "tạo nhiệm vụ thử lỗi"
RID=$(curl -s -m 15 -X POST -H "$J" -d '{"owner_id":"__selftest__","bot_id":"__selftest__","channel":"zalo","chat_id":"x","title":"__selftest__","remind_at_utc":"2030-01-31T02:00:00.000Z"}' http://127.0.0.1:4105/api/skills/reminder | python3 -c "import sys,json; print(json.load(sys.stdin)['reminder_id'])") || rollback "tạo lịch nhắc thử lỗi"
[ "$(code -X PUT -H "$J" -H "Authorization: Bearer $T_OTH" -d '{"title":"hack"}' http://127.0.0.1:4105/api/skills/task/$TID)" = 404 ] || rollback "người khác sửa được nhiệm vụ"
[ "$(code -X DELETE -H "Authorization: Bearer $T_OTH" http://127.0.0.1:4105/api/skills/reminder/$RID)" = 404 ] || rollback "người khác xóa được lịch nhắc"
[ "$(code -X PUT -H "$J" -H "Authorization: Bearer $T_OWN" -d '{"title":"__selftest__ sua","recurrence":"weekly","due_at_utc":"2030-02-07T02:00:00.000Z"}' http://127.0.0.1:4105/api/skills/task/$TID)" = 200 ] || rollback "chủ sửa nhiệm vụ lỗi"
[ "$(code -X PUT -H "$J" -H "Authorization: Bearer $T_OWN" -d '{"title":"__selftest__ sua","recurrence":"monthly","remind_at_utc":"2030-03-05T02:00:00.000Z"}' http://127.0.0.1:4105/api/skills/reminder/$RID)" = 200 ] || rollback "chủ sửa lịch nhắc lỗi"
curl -s -m 15 "http://127.0.0.1:4105/api/tasks?account_id=__selftest__" | grep -q '"recurrence":"weekly"' || rollback "sửa nhiệm vụ không ghi nhận"
curl -s -m 15 "http://127.0.0.1:4105/api/reminders?account_id=__selftest__" | grep -q '"recurrence":"monthly"' || rollback "sửa lịch nhắc không ghi nhận"
[ "$(code -X DELETE -H "Authorization: Bearer $T_OWN" http://127.0.0.1:4105/api/skills/task/$TID)" = 200 ] || rollback "chủ xóa nhiệm vụ lỗi"
[ "$(code -X DELETE -H "Authorization: Bearer $T_OWN" http://127.0.0.1:4105/api/skills/reminder/$RID)" = 200 ] || rollback "chủ xóa lịch nhắc lỗi"
docker exec -i "$C" python - <<'PY' || rollback "dọn dữ liệu thử lỗi"
import sqlite3
c = sqlite3.connect("/app/data/saas_bots.sqlite")
n = c.execute("select count(*) from skill_tasks where assignee_id='__selftest__'").fetchone()[0] + c.execute("select count(*) from skill_reminders where owner_id='__selftest__'").fetchone()[0]
print("dữ liệu thử còn lại sau khi xóa:", n)
c.execute("delete from skill_tasks where assignee_id='__selftest__'"); c.execute("delete from skill_reminders where owner_id='__selftest__'"); c.commit()
assert n == 0, "dữ liệu thử chưa được xóa"
PY
sleep 3
if docker logs --since 1m "$C" 2>&1 | grep -q -E "Traceback|Daemon loop error"; then docker logs --since 1m "$C" 2>&1 | grep -E -A2 "Traceback|Daemon loop error" | tail -5 | cut -c1-200; rollback "log có lỗi"; fi
rm -rf "$TMPD"
git add main.py static/index.html tasks_ui.js 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "AI-BOT: nút Sửa/Xóa trên thẻ Nhiệm vụ & Lịch nhắc (API xác thực phiên + quyền sở hữu)"
echo "=== xong ==="
exit 0
