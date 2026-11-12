#!/usr/bin/env bash
# CHỈ ĐỌC. Bot trả lời "đã đọc file" dựa trên tài liệu nào? So bot/nhóm của file duy nhất trong kho với bot/nhóm đang trò chuyện hôm nay.
# Không in nội dung file hay tin nhắn.
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -30
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
v = c.execute("select bot_id, chat_id, file_size, length(coalesce(extracted_text,'')) from chat_file_vault order by id desc limit 1").fetchone()
print("file trong kho: bot_id=%s | chat_id=%s | cỡ=%s | chữ trích=%s" % v)
rows = c.execute("select chat_id, count(*), max(created_at) from group_chat_history where bot_id='bot_b7056fc789c3' group by chat_id order by max(created_at) desc limit 5").fetchall()
print("nhóm bot_b7056fc789c3 (bot giúp việc) có tin trong lịch sử:")
for r in rows: print("  ", r[0], "|", r[1], "tin | cuối", (r[2] or "")[:16], "| trùng nhóm của file trong kho:", r[0] == v[1])
bot = c.execute("select bot_name, linked_groups from bots where bot_id='bot_b7056fc789c3'").fetchone()
print("tên bot:", bot[0])
PY
echo "=== xong ==="
exit 0
