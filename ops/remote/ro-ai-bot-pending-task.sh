#!/usr/bin/env bash
# CHỈ ĐỌC. Siêu dữ liệu (không tiêu đề/mô tả) của nhiệm vụ PENDING và nhật ký bộ lập lịch gần đây.
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True); c.row_factory = sqlite3.Row
for r in c.execute("select t.id, t.due_date, t.reminder_sent, t.created_at, t.updated_at, t.recurrence, t.due_at_utc, t.group_id != '' as has_group, b.is_active, b.platform from skill_tasks t left join bots b on b.bot_id=t.bot_id where t.status='PENDING'"):
    print(dict(r))
print("tổng theo trạng thái:", c.execute("select status, reminder_sent, count(*) from skill_tasks group by 1,2").fetchall())
print("5 nhiệm vụ gần nhất (id, trạng thái, reminder_sent, hạn):", [tuple(x) for x in c.execute("select id, status, reminder_sent, due_date from skill_tasks order by id desc limit 5")])
PY
echo "== SCHEDULER log (24h) =="
docker logs --since 24h maika-saas-engine 2>&1 | grep "SCHEDULER" | sed -E "s/'[^']*'/'…'/g" | tail -15 | cut -c1-200
exit 0
