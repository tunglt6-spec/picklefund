#!/usr/bin/env bash
# CHỈ ĐỌC. Với bot The PING (bot_7be4d5962d80): các nhóm Zalo nó đã nhận tin (mã nhóm thật chat_id, số tin, số người gửi khác nhau, đầu/cuối).
# Không in nội dung tin, tên người gửi hay thông tin nhóm của khách khác.
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -30
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
rows = c.execute("""
  select chat_id, count(*), count(distinct sender_id), min(created_at), max(created_at)
  from group_chat_history
  where bot_id='bot_7be4d5962d80' and lower(channel)='zalo'
  group by chat_id order by max(created_at) desc limit 12
""").fetchall()
print("bot_7be4d5962d80 — chat_id | số tin | số người gửi | đầu | cuối:")
for r in rows:
    print(" ", r[0], "|", r[1], "|", r[2], "|", (r[3] or "")[:16], "|", (r[4] or "")[:16])
PY
echo "=== xong ==="
exit 0
