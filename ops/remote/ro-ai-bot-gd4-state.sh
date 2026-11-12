#!/usr/bin/env bash
# CHỈ ĐỌC. Hiện trạng cho GĐ4: compose AI-BOT (đã che giá trị biến), mạng Docker, danh sách bot Zalo (id/tên/tenant/template), nhóm bot The PING.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
echo "== docker-compose.yml AI-BOT (che giá trị environment) =="
sed -E 's/^([[:space:]]*-?[[:space:]]*[A-Za-z_]*(KEY|TOKEN|SECRET|PASS)[A-Za-z_]*[[:space:]]*[:=]).*/\1 <che>/I' docker-compose.yml | head -60
echo "== mạng Docker =="; docker network ls --format '{{.Name}} {{.Driver}}' | head -20
echo "== container và mạng =="; docker ps --format '{{.Names}} | {{.Networks}}' | head -20
echo "== bot Zalo =="
docker exec -i maika-saas-engine python - <<'PY'
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
for r in c.execute("select bot_id, bot_name, tenant_id, platform, coalesce(template_key,'-'), length(coalesce(bot_token,'')) > 0 from bots where platform='zalo'"):
    print(r)
print("nhóm có lịch sử (zgr-) của từng bot:")
for r in c.execute("select bot_id, chat_id, count(*), max(created_at) from group_chat_history where chat_id like 'zgr-%' group by bot_id, chat_id"):
    print(r)
PY
echo "=== xong ==="
exit 0
