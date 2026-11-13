#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT — Nhiệm vụ & Lịch nhắc:
#  (1) thêm LẶP LẠI hằng tuần / tháng / năm (ô "Lặp lại" trong khung tạo), bỏ các nút "Gợi ý mốc thời gian chuẩn";
#  (2) SỬA LỖI: bot đã nhắc nhiệm vụ trong nhóm xong mà nhiệm vụ vẫn PENDING (không gạch ngang) → nay tự chuyển COMPLETED;
#      nhiệm vụ lặp lại thì dời sang kỳ sau (vẫn PENDING). Sửa luôn lỗi Lịch nhắc lặp không bao giờ lặp (SELECT thiếu cột recurrence);
#  (3) dữ liệu cũ: nhiệm vụ PENDING mà bot thực sự đã nhắc (tạo trước hạn, hạn đã qua) → COMPLETED.
# Nguồn: ops/ai-bot-tasks/{migrate_db,patch_main,patch_html}.py tại commit OPS_SHA. Sao lưu main.py, index.html, DB. KHÔNG recreate container (docker restart).
# Lỗi sau khi vá → khôi phục main.py + index.html + restart (cột DB mới vô hại, giữ lại).
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
mkdir -p data/backups
cp -p main.py "main.py.bak_pre_tasksrecur_${TS}"; cp -p static/index.html "static/index.html.bak_pre_tasksrecur_${TS}"
chmod 600 "main.py.bak_pre_tasksrecur_${TS}"
docker exec -i "$C" python - "$TS" <<'PY'
import sqlite3, sys
src = sqlite3.connect("/app/data/saas_bots.sqlite"); dst = sqlite3.connect(f"/app/data/backups/saas_bots_pre_tasksrecur_{sys.argv[1]}.sqlite")
src.backup(dst); dst.close(); src.close(); print("đã sao lưu DB: saas_bots_pre_tasksrecur_" + sys.argv[1] + ".sqlite")
PY
TMPD=$(mktemp -d)
for f in migrate_db.py patch_main.py patch_html.py; do (cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-tasks/$f") > "$TMPD/$f"; done
for f in migrate_db.py patch_main.py patch_html.py; do python3 -c "import ast,sys; ast.parse(open('$TMPD/$f', encoding='utf-8').read())"; done
echo "đã lấy 3 file vá từ commit ${OPS_SHA:0:8} (cú pháp OK)"
rollback() {
  echo "LỖI: $1 — KHÔI PHỤC main.py + index.html"
  cp -p "main.py.bak_pre_tasksrecur_${TS}" main.py; cp -p "static/index.html.bak_pre_tasksrecur_${TS}" static/index.html
  docker restart "$C" >/dev/null || true
  rm -rf "$TMPD"; exit 1
}

echo "== 1. Cột DB + sửa dữ liệu cũ =="
docker exec -i "$C" python - --apply < "$TMPD/migrate_db.py" || rollback "migrate DB lỗi"
echo "== 2. Vá main.py và index.html =="
AB="$AB" python3 "$TMPD/patch_main.py" || rollback "vá main.py lỗi"
AB="$AB" python3 "$TMPD/patch_html.py" || rollback "vá index.html lỗi"

echo "== 3. Restart (KHÔNG tạo lại container) =="
docker restart "$C" >/dev/null
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
P=$(curl -s -m 10 http://127.0.0.1:4105/)
grep -qF 'id="qc-select-recur"' <<<"$P" || rollback "trang chủ thiếu ô Lặp lại"
if grep -qF "setQuickPreset('today_09')" <<<"$P"; then rollback "vẫn còn nút gợi ý mốc"; fi
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"

echo "== 4. Tự kiểm thử API bằng dữ liệu tạm (xóa ngay sau đó) =="
J='Content-Type: application/json'
curl -s -m 15 -X POST -H "$J" -d '{"owner_id":"__selftest__","bot_id":"__selftest__","channel":"zalo","chat_id":"x","title":"__selftest__","remind_at_utc":"2030-01-31T02:00:00.000Z","recurrence":"monthly"}' http://127.0.0.1:4105/api/skills/reminder | grep -q '"ok":true' || rollback "tạo lịch nhắc lặp lỗi"
curl -s -m 15 -X POST -H "$J" -d '{"creator_id":"__selftest__","assignee_id":"__selftest__","bot_id":"__selftest__","title":"__selftest__","due_date":"09:00 31/01/2030","priority":"normal","recurrence":"yearly","due_at_utc":"2030-01-31T02:00:00.000Z"}' http://127.0.0.1:4105/api/skills/task | grep -q '"ok":true' || rollback "tạo nhiệm vụ lặp lỗi"
curl -s -m 15 "http://127.0.0.1:4105/api/tasks?account_id=__selftest__" | grep -q '"recurrence":"yearly"' || rollback "GET /api/tasks không trả recurrence"
docker exec -i "$C" python - <<'PY' || rollback "kiểm tra dữ liệu thử lỗi"
import sqlite3
c = sqlite3.connect("/app/data/saas_bots.sqlite")
r = c.execute("select recurrence, recur_anchor_day from skill_reminders where owner_id='__selftest__'").fetchall()
t = c.execute("select recurrence, due_at_utc, recur_anchor_day, status from skill_tasks where assignee_id='__selftest__'").fetchall()
print("lịch nhắc thử:", r, "| nhiệm vụ thử:", t)
assert r == [("monthly", 31)] and len(t) == 1 and t[0][0] == "yearly" and t[0][2] == 31 and t[0][3] == "PENDING", "dữ liệu thử không đúng"
c.execute("delete from skill_reminders where owner_id='__selftest__'"); c.execute("delete from skill_tasks where assignee_id='__selftest__'"); c.commit()
print("đã xóa dữ liệu thử")
PY
sleep 12
if docker logs --since 1m "$C" 2>&1 | grep -q "Daemon loop error"; then docker logs --since 1m "$C" 2>&1 | grep "Daemon loop error" | tail -2 | cut -c1-200; rollback "bộ lập lịch báo lỗi"; fi
docker logs --since 5m "$C" 2>&1 | grep -c "SCHEDULER" | sed 's/^/dòng log SCHEDULER 5 phút gần nhất: /' || true
rm -rf "$TMPD"
git add main.py static/index.html 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "AI-BOT: lặp lại tuần/tháng/năm, bỏ gợi ý mốc, nhiệm vụ tự hoàn thành sau khi bot nhắc"
echo "=== xong ==="
exit 0
