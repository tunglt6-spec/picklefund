#!/usr/bin/env bash
# CHỈ ĐỌC. In đầu hàm webhook_zalo (để vá kiểm secret) + vùng 4683 + số dòng khóa viết cứng.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
n=$(grep -n "async def webhook_zalo" main.py | head -1 | cut -d: -f1)
echo "webhook_zalo ở dòng $n"
sed -n "$((n-3)),$((n+30))p" main.py | cut -c1-170
echo "== dòng 4680-4686 =="; sed -n '4680,4686p' main.py | cut -c1-120
echo "== khóa viết cứng (số dòng) =="
grep -n -E "sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}" main.py | cut -d: -f1 | tr '\n' ' '; echo
echo "== nhóm zgr- ngắn =="
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
for r in c.execute("select bot_id, chat_id, count(*) from group_chat_history where chat_id like 'zgr-%' and length(chat_id) < 22 group by 1,2"): print(r)
PY
exit 0
