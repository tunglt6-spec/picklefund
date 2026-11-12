#!/usr/bin/env bash
# CHỈ ĐỌC. Kiểm bảo mật cho GĐ5 Zalo Hub (không in giá trị bí mật):
#  - webhook_zalo có kiểm secret header không (chỉ in tên dòng/ngữ cảnh, che giá trị)
#  - cổng 4105 đang bind ở đâu, ai đang nghe cổng công khai
#  - khóa/token viết cứng trong main.py (chỉ ĐẾM và in số dòng, không in giá trị)
#  - chat_id giả (zgr-<mã link ngắn>) trong group_chat_history
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
echo "== 1. Kiểm secret webhook Zalo =="
grep -n -i -E "secret[-_ ]?token|X-Bot-Api-Secret|secret_token" main.py | sed -E 's/(["'"'"'])[A-Za-z0-9_:\-]{16,}(["'"'"'])/\1<che>\2/g' | head -20
echo "== 2. Cổng đang nghe =="
docker port maika-saas-engine 2>/dev/null
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ':4105|cloudflared' | head
echo "== 3. Tiến trình tunnel =="
ps aux 2>/dev/null | grep -i -E "cloudflared|ngrok" | grep -v grep | sed -E 's/(--token|--credentials-file)[ =][^ ]+/\1 <che>/g' | cut -c1-200 | head -5
echo "== 4. Khóa viết cứng trong main.py (chỉ số dòng) =="
grep -n -E "sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|[0-9]{8,10}:[A-Za-z0-9_-]{30,}" main.py | cut -d: -f1 | tr '\n' ' '; echo
echo "== 5. Nhóm có chat_id nghi giả (zgr- + mã ngắn < 18 ký tự) =="
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
for r in c.execute("select bot_id, chat_id, count(*), max(created_at) from group_chat_history where chat_id like 'zgr-%' and length(chat_id) < 22 group by bot_id, chat_id"):
    print(r)
PY
echo "=== xong ==="
exit 0
