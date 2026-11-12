#!/usr/bin/env bash
# CHỈ ĐỌC. Hoạt động Zalo của AI-BOT hôm nay: kết quả đăng ký webhook lúc khởi động, số request /webhook/zalo theo giờ,
# số tin ghi vào lịch sử theo giờ cho nhóm CLB. Không in nội dung tin, tên, token hay payload.
set -uo pipefail
echo "=== đăng ký webhook Zalo/Telegram lúc khởi động (dòng log SetWebhook, không có token) ==="
docker logs --since 12h maika-saas-engine 2>&1 | grep -E 'SetWebhook \[(Zalo|Telegram)\]|ZALO_WEBHOOK_AUTO|TELEGRAM_WEBHOOK_AUTO' | sed -E 's/^(INFO|WARNING|ERROR)[: ]+//' | cut -c1-140 | tail -12
echo "=== request /webhook/zalo theo giờ (giờ VN) và mã trả về ==="
docker logs --since 12h -t maika-saas-engine 2>&1 | grep -E '"POST /webhook/zalo' | sed -E 's/^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}).*"POST (\/webhook\/zalo[^ ]*) HTTP[^"]*" ([0-9]{3}).*/\1 \2h \3 \4/' | sort | uniq -c | tail -30
echo "=== số tin ghi vào lịch sử cho nhóm CLB (zgr-d6bd…) từ 10:00 hôm nay, theo giờ và bot_id ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -30
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
rows = c.execute("""
  select substr(created_at,12,2) as hh, bot_id, count(*), count(distinct sender_id)
  from group_chat_history
  where chat_id='zgr-d6bd97da8ebb67e53eaa' and created_at >= '2026-11-12T10:00'
  group by hh, bot_id order by hh""").fetchall()
print("giờ | bot_id | số tin | số người gửi")
for r in rows: print(" ", r[0], "|", r[1], "|", r[2], "|", r[3])
print("tổng:", sum(r[2] for r in rows))
mx = c.execute("select max(created_at) from group_chat_history where chat_id='zgr-d6bd97da8ebb67e53eaa'").fetchone()[0]
print("tin gần nhất của nhóm trong lịch sử:", (mx or '')[:19])
PY
echo "=== xong ==="
exit 0
