#!/usr/bin/env bash
# CHỈ ĐỌC. Kiểm tra route webhook Telegram của AI-BOT và trạng thái webhook phía Telegram (KHÔNG in token).
set -uo pipefail
M=/opt/ai-bot-saas/main.py
sec() { printf '\n===== %s =====\n' "$1"; }

sec "Vùng mã quanh route Telegram (decorator / hàm)"
n=$(grep -n '^@app.post("/webhook/telegram/{bot_id}")' "$M" | head -1 | cut -d: -f1)
echo "decorator ở dòng: ${n:-không thấy}"
[ -n "$n" ] && sed -n "$((n-2)),$((n+3))p" "$M" | cut -c1-140
echo "--- dòng định nghĩa các hàm liên quan:"
grep -n -E '^(async )?def (_ops_dispatch|webhook_telegram)\(' "$M" | cut -c1-150
echo "--- mọi chỗ đăng ký route telegram khác:"
grep -n -E 'webhook/telegram' "$M" | cut -c1-130

sec "Webhook phía Telegram của các bot Telegram (chỉ số liệu, không token)"
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -40
import json, sqlite3, urllib.request
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
rows = c.execute("select bot_id, bot_name, is_active, bot_token from bots where lower(platform)='telegram'").fetchall()
print("số bot Telegram:", len(rows))
for bot_id, name, active, tok in rows:
    if not tok or len(tok) < 8:
        print(bot_id, "- không có token"); continue
    try:
        with urllib.request.urlopen("https://api.telegram.org/bot%s/getWebhookInfo" % tok.strip(), timeout=15) as r:
            res = json.load(r).get("result", {})
        url = res.get("url") or ""
        host = url.split("/")[2] if url.count("/") >= 2 else url
        print(bot_id, "| active=%s | webhook_host=%s | pending=%s | last_error=%s" % (
            active, host, res.get("pending_update_count"), (res.get("last_error_message") or "")[:60]))
    except Exception as e:
        print(bot_id, "- lỗi gọi Telegram:", type(e).__name__)
PY

sec "Log 422 trong 200 dòng gần nhất (số lượng theo đường dẫn)"
docker logs --tail 200 maika-saas-engine 2>&1 | grep -E '" 422 ' | sed -E 's/.*"POST ([^ ]+) .*/\1/' | sort | uniq -c
echo "=== xong ==="
exit 0
