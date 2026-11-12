#!/usr/bin/env bash
# CHỈ ĐỌC. Nghiệm thu Zalo Hub: trạng thái liên kết, nhóm đã xác nhận, số lệnh chuyển ok/lỗi, thống kê secret webhook (không in khóa).
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3, time
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True); c.row_factory = sqlite3.Row
fmt = lambda t: time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t)) if t else "-"
b = c.execute("select bot_id, bot_name, coalesce(template_key,'-') tk from bots where bot_id='bot_7be4d5962d80'").fetchone()
print("bot:", dict(b) if b else "KHÔNG THẤY")
rows = c.execute("select link_id, app, status, club_ref, fwd_ok, fwd_fail, last_event_at, last_error, created_at from hub_links where bot_id='bot_7be4d5962d80' order by created_at desc").fetchall()
if not rows: print("liên kết: CHƯA CÓ (chưa đổi mã PF- ở PickleFund)")
for r in rows:
    print("liên kết:", r["link_id"], r["status"], "club_ref=", r["club_ref"], "ok/lỗi=", r["fwd_ok"], "/", r["fwd_fail"], "sự kiện cuối=", fmt(r["last_event_at"]), "lỗi cuối=", r["last_error"])
    for g in c.execute("select chat_id, first_seen, last_seen from hub_link_chats where link_id=?", (r["link_id"],)):
        print("  nhóm đã xác nhận:", g["chat_id"], "lần cuối", fmt(g["last_seen"]))
print("mã đang chờ (chưa dùng/chưa hết hạn):", c.execute("select count(*) from hub_link_codes where used_at is null and expires_at>?", (time.time(),)).fetchone()[0])
PY
echo "== secret webhook =="
docker logs maika-saas-engine 2>&1 | grep -o "zalo-secret-audit bot=[^ ]* ok=[A-Za-z]* has_header=[A-Za-z]*" | sort | uniq -c | sort -rn | head
echo "== hub health =="; curl -s -m 8 http://127.0.0.1:4105/api/hub/v1/health; echo
exit 0
