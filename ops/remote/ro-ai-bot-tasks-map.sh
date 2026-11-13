#!/usr/bin/env bash
# CHỈ ĐỌC. Bản đồ Nhiệm vụ / Lịch nhắc của AI-BOT: bảng DB, endpoint, bộ lập lịch, hàm giao diện.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
echo "== bảng liên quan (schema, không dữ liệu) =="
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
for (n, sql) in c.execute("select name, sql from sqlite_master where type='table' and (name like '%task%' or name like '%remind%' or name like '%schedul%' or name like '%skill%')"):
    print("--", n); print(sql)
for t in ("skill_tasks", "tasks", "reminders", "skill_reminders"):
    try:
        print(t, "rows:", c.execute(f"select count(*) from {t}").fetchone()[0])
        print(" status:", c.execute(f"select status, count(*) from {t} group by status").fetchall())
    except Exception as e: pass
PY
echo "== endpoint =="
grep -n -E '@app\.(get|post|put|patch|delete)\("[^"]*(task|remind|schedule|memor)' main.py | cut -c1-160
echo "== bộ lập lịch / gửi nhắc =="
grep -n -E "def .*(remind|schedul|task|cron|due)|asyncio.create_task|on_event\(\"startup\"\)|while True" main.py | cut -c1-170 | head -50
echo "== giao diện =="
grep -n -E "function (openAddTask|openTaskModal|saveTask|saveReminder|submitTask|setQuickTime|applyQuick|renderTasks|renderReminders|toggleTaskStatus|switchTaskTab|openCreateTask)[A-Za-z]*|Gợi ý mốc|Chạm để chọn nhanh|line-through" static/index.html | cut -c1-200 | head -40
exit 0
