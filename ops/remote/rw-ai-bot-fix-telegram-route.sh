#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Sửa lỗi 422 của webhook Telegram trong AI-BOT (/opt/ai-bot-saas/main.py):
# decorator @app.post("/webhook/telegram/{bot_id}") đang đứng trên hàm _ops_dispatch (bị chèn vào giữa) nên route
# Telegram trỏ nhầm hàm và trả 422, còn hàm webhook_telegram không có route. Script chuyển decorator về đúng hàm.
# Telegram đang giữ 5 tin chưa giao cho mỗi bot (đã thấy qua getWebhookInfo). Để không "phát lại" tin cũ (có thể có lệnh
# /ops của chủ) khi route sống lại, script xóa hàng chờ bằng setWebhook(drop_pending_updates=true) với cùng URL.
# An toàn: sao lưu trước; neo đúng 1 chỗ (sai thì dừng, không sửa); kiểm tra cú pháp + AST; khỏe sau khởi động lại;
# POST thử {} vào từng bot phải ra 200 (không còn 422); tự khôi phục main.py nếu lỗi. Idempotent.
# Quay lại: cp main.py.bak_pre_tgroute_<thời điểm> main.py && docker restart maika-saas-engine (tin đã xóa khỏi hàng chờ thì không khôi phục được).
set -euo pipefail
AB=/opt/ai-bot-saas
TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
cp -p main.py "main.py.bak_pre_tgroute_${TS}"
echo "đã sao lưu: main.py.bak_pre_tgroute_${TS}"

echo "== 1. Vá main.py =="
python3 - "$AB/main.py" <<'PY'
import ast, os, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
DEC = '@app.post("/webhook/telegram/{bot_id}")'
lines = src.split("\n")
idx = [k for k, l in enumerate(lines) if l == DEC]
tg = [k for k, l in enumerate(lines) if l.startswith("async def webhook_telegram(")]
assert len(tg) == 1, "kỳ vọng đúng 1 hàm webhook_telegram, thực tế %d" % len(tg)
j = tg[0]
if j > 0 and lines[j - 1] == DEC:
    print("route Telegram đã đúng — bỏ qua bước vá"); raise SystemExit(0)
assert len(idx) == 1, "kỳ vọng đúng 1 decorator Telegram, thực tế %d" % len(idx)
i = idx[0]
assert lines[i + 1].startswith("async def _ops_dispatch("), "decorator không đứng trên _ops_dispatch như dự kiến — dừng"
assert i < j and not lines[j - 1].lstrip().startswith("@"), "vị trí hàm webhook_telegram bất thường — dừng"
del lines[i]
lines.insert(j - 1, DEC)  # sau khi xóa 1 dòng phía trên, vị trí cũ của webhook_telegram là j-1
new = "\n".join(lines)
tree = ast.parse(new)
def decorated_with_route(fn):
    return any(isinstance(d, ast.Call) and getattr(d.func, "attr", "") == "post" and d.args
               and isinstance(d.args[0], ast.Constant) and d.args[0].value == "/webhook/telegram/{bot_id}"
               for d in fn.decorator_list)
fns = {n.name: n for n in ast.walk(tree) if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef))}
assert decorated_with_route(fns["webhook_telegram"]), "AST: webhook_telegram chưa có route"
assert not fns["_ops_dispatch"].decorator_list, "AST: _ops_dispatch vẫn còn decorator"
open(p + ".new", "w", encoding="utf-8").write(new)
os.replace(p + ".new", p)
print("đã chuyển decorator sang webhook_telegram (đã kiểm tra cú pháp + AST)")
PY

echo "== 2. Xóa hàng chờ tin cũ của Telegram (cùng URL, drop_pending_updates) =="
docker exec -i maika-saas-engine python - <<'PY'
import json, sqlite3, urllib.request
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
def call(tok, method, payload=None):
    req = urllib.request.Request("https://api.telegram.org/bot%s/%s" % (tok, method),
          data=json.dumps(payload or {}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)
for bot_id, tok in c.execute("select bot_id, bot_token from bots where lower(platform)='telegram' and is_active=1 and bot_token is not null and length(bot_token)>8"):
    tok = tok.strip()
    info = call(tok, "getWebhookInfo").get("result", {})
    url, pend = info.get("url") or "", info.get("pending_update_count", 0)
    if not url:
        print(bot_id, "- chưa có webhook, bỏ qua"); continue
    if pend:
        ok = call(tok, "setWebhook", {"url": url, "drop_pending_updates": True}).get("ok")
        after = call(tok, "getWebhookInfo").get("result", {}).get("pending_update_count")
        print(bot_id, "- hàng chờ trước:", pend, "| xóa ok:", ok, "| sau:", after)
    else:
        print(bot_id, "- hàng chờ trống")
PY

echo "== 3. Khởi động lại và kiểm tra =="
docker restart maika-saas-engine >/dev/null
ok=0
for i in $(seq 1 30); do
  if curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
bad=0
if [ "$ok" = 1 ]; then
  for b in $(docker exec maika-saas-engine python -c "import sqlite3;print(' '.join(r[0] for r in sqlite3.connect('file:/app/data/saas_bots.sqlite?mode=ro',uri=True).execute(\"select bot_id from bots where lower(platform)='telegram'\")))"); do
    code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:4105/webhook/telegram/${b}")
    echo "POST thử {} vào /webhook/telegram/${b}: HTTP ${code}"
    [ "$code" = 200 ] || bad=1
  done
fi
if [ "$ok" != 1 ] || [ "$bad" != 0 ]; then
  echo "KIỂM TRA THẤT BẠI (khỏe=$ok, có route chưa 200=$bad) — khôi phục main.py"
  cp -p "main.py.bak_pre_tgroute_${TS}" main.py
  docker restart maika-saas-engine >/dev/null
  exit 1
fi
echo "OK: dịch vụ khỏe; route webhook Telegram trả 200 cho mọi bot Telegram"
exit 0
