#!/usr/bin/env bash
# CHỈ ĐỌC. Liệt kê các nhóm Zalo mà bot đã nhận tin (mã nhóm thật chat_id, số tin, lần cuối) từ bảng group_chat_history của AI-BOT.
# Không in nội dung tin nhắn, tên người gửi hay token.
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -40
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
rows = c.execute("""
  select channel, chat_id, group_name, count(*), min(created_at), max(created_at)
  from group_chat_history
  where lower(channel)='zalo' and chat_id like 'zgr-%'
  group by channel, chat_id, group_name
  order by max(created_at) desc limit 15
""").fetchall()
print("nhóm Zalo có tin trong lịch sử AI-BOT (chat_id | tên đã lưu | số tin | đầu | cuối):")
for r in rows:
    print(" ", r[1], "|", r[2], "|", r[3], "|", (r[4] or "")[:16], "|", (r[5] or "")[:16])
print("tổng số nhóm:", len(rows))
PY
echo "=== xong ==="
exit 0
