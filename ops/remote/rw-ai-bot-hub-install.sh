#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ1 Zalo Hub (bản 3): cài module hub.py vào AI-BOT (/opt/ai-bot-saas), TẮT MẶC ĐỊNH (HUB_ENABLED=0).
# BÀI HỌC từ 2 lần trước: KHÔNG tạo lại container (docker compose up --force-recreate làm mất các gói pip cài tay trong container). Bản này:
#   - KHÔNG đổi docker-compose.yml, KHÔNG tạo lại container; chỉ `docker restart maika-saas-engine` (giữ nguyên hệ tệp container);
#   - hub.py chỉ dùng thư viện chuẩn + fastapi/pydantic/httpx (đã có trong image), không thêm gói;
#   - cấu hình hub đọc từ /opt/ai-bot-saas/.env.hub (thấy trong container là /app/.env.hub), đổi HUB_ENABLED có hiệu lực ngay, không cần restart.
# Làm: (1) kiểm tra container có đủ gói nền (fastapi/pydantic/httpx) và gói đã khôi phục (markitdown/docx/fitz) — thiếu thì dừng;
# (2) sao lưu main.py + DB; (3) chép hub.py từ commit đang chạy; (4) tạo .env.hub (chmod 600, khóa ngẫu nhiên, không in) nếu chưa có;
# (5) vá main.py: nối hub ở cuối file + 1 hook trong webhook_zalo (SAU khi chọn bot, TRƯỚC chặn chat 1:1);
# (6) restart + kiểm tra hành vi cũ không đổi; (7) chạy bộ kiểm thử hub TRONG container trên DB TẠM; (8) commit git cục bộ.
# Tự khôi phục main.py (và restart) nếu bước 6 hoặc 7 lỗi. Idempotent.
# Quay lại: cp main.py.bak_pre_hub_<ts> main.py && docker restart maika-saas-engine.
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"

echo "== 1. Kiểm tra gói trong container =="
docker exec -i "$C" python - <<'PY'
import importlib.util, sys
need = ["fastapi", "pydantic", "httpx"]
nice = ["markitdown", "docx", "fitz"]
bad = [m for m in need if importlib.util.find_spec(m) is None]
print("gói nền:", "đủ" if not bad else "THIẾU " + ",".join(bad))
print("gói đã khôi phục (markitdown/docx/fitz):", {m: importlib.util.find_spec(m) is not None for m in nice})
sys.exit(1 if bad else 0)
PY
miss=$(docker exec "$C" python -c "import importlib.util as u;print(sum(1 for m in ('markitdown','docx','fitz') if u.find_spec(m) is None))")
[ "$miss" = 0 ] || { echo "Thiếu gói đã mất do tạo lại container — chạy rw-ai-bot-restore-deps.sh trước"; exit 1; }

echo "== 2. Sao lưu =="
cp -p main.py "main.py.bak_pre_hub_${TS}"
mkdir -p data/backups
docker exec -i "$C" python - "$TS" <<'PY'
import sqlite3, sys
src = sqlite3.connect("/app/data/saas_bots.sqlite"); dst = sqlite3.connect(f"/app/data/backups/saas_bots_pre_hub_{sys.argv[1]}.sqlite")
src.backup(dst); dst.close(); src.close(); print("đã sao lưu DB: saas_bots_pre_hub_" + sys.argv[1] + ".sqlite")
PY
echo "đã sao lưu main.py (hậu tố bak_pre_hub_${TS})"

echo "== 3. Chép hub.py từ commit ${OPS_SHA:0:8} =="
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub.py") > hub.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_hub.py") > /tmp/test_hub.py
python3 -c "import ast; ast.parse(open('hub.py.new',encoding='utf-8').read()); print('hub.py cú pháp OK')"
grep -q -E '^\s*(import|from) (jwt|cryptography)' hub.py.new && { echo "hub.py còn phụ thuộc gói ngoài — dừng"; exit 1; } || true
mv hub.py.new hub.py
echo "sha256 hub.py: $(sha256sum hub.py | cut -c1-16)…"

echo "== 4. Tệp cấu hình .env.hub =="
if [ -f .env.hub ]; then
  echo ".env.hub đã có — giữ nguyên"
else
  umask 077
  KEY=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
  SES=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
  printf 'HUB_ENABLED=0\nHUB_KEY=%s\nAIBOT_SESSION_SECRET=%s\nHUB_ALLOWED_EVENT_HOSTS=picklefund-api:3000\n' "$KEY" "$SES" > .env.hub
  echo "đã tạo .env.hub (chmod 600), HUB_ENABLED=0"
fi
chmod 600 .env.hub
grep -q '^HUB_ENABLED=0' .env.hub || { echo "CẢNH BÁO: .env.hub không ở trạng thái HUB_ENABLED=0 — ép về 0"; sed -i 's/^HUB_ENABLED=.*/HUB_ENABLED=0/' .env.hub; }

echo "== 5. Vá main.py (nối hub + hook) =="
python3 - <<'PY'
import ast, os
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
MARK_INIT = "# --- ZALO HUB (GĐ1) ---"
MARK_HOOK = "# --- Zalo Hub hook (GĐ1) ---"
changed = False
if MARK_INIT not in s:
    s = s.rstrip("\n") + "\n\n\n" + MARK_INIT + "\n" \
        "import hub as _hub_mod\n" \
        "from hub import hub_try_forward as _hub_try_forward\n" \
        "_hub_mod.init(app, DB_PATH, logger)\n"
    changed = True
if MARK_HOOK not in s:
    anchor = '    target_bot_id = chosen_bot["bot_id"]\n'
    assert s.count(anchor) == 1, "kỳ vọng đúng 1 dòng chọn target_bot_id trong webhook_zalo, thực tế %d" % s.count(anchor)
    hook = (anchor +
            "    " + MARK_HOOK + " lệnh của ứng dụng liên kết (PickleFund) được chuyển đi; AI không trả lời\n"
            "    try:\n"
            "        if await _hub_try_forward(target_bot_id, data, text, chat_id):\n"
            "            return {\"ok\": True, \"status\": \"hub_handled\"}\n"
            "    except Exception as _hub_err:\n"
            "        logger.warning(f\"[HUB] hook lỗi, bỏ qua: {type(_hub_err).__name__}\")\n")
    s = s.replace(anchor, hook, 1)
    changed = True
ast.parse(s)
if changed:
    open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
    print("đã vá main.py (đã kiểm tra cú pháp)")
else:
    print("main.py đã được vá trước đó — bỏ qua")
PY

rollback() {
  echo "LỖI ở bước $1: ${2:-không rõ}"
  echo "--- log container gần nhất (trước khi khôi phục):"
  docker logs --tail 40 "$C" 2>&1 | cut -c1-200 | tail -40 || true
  echo "--- khôi phục main.py + restart"
  cp -p "main.py.bak_pre_hub_${TS}" main.py
  docker restart "$C" >/dev/null 2>&1 || true
  exit 1
}

echo "== 6. Restart (KHÔNG tạo lại container) và kiểm tra hành vi cũ =="
docker restart "$C" >/dev/null
ok=0
for i in $(seq 1 40); do
  curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1 && { ok=1; break; }
  sleep 2
done
[ "$ok" = 1 ] || rollback 6 "container không khỏe sau 80 giây"
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
HUBH=$(curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health)
echo "hub/health: $HUBH"
echo "$HUBH" | grep -q '"enabled":false' || rollback 6 "hub/health không báo enabled=false"
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback 6 "trang chủ không 200"
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 6 "GET webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 6 "POST webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback 6 "POST webhook Telegram không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{"bot_id":"x"}' http://127.0.0.1:4105/api/hub/v1/links/code)" = 404 ] || rollback 6 "API hub không trả 404 khi tắt"
docker exec "$C" python -c "import hub; assert hub.enabled() is False and len(hub._env('HUB_KEY'))>=32; print('hub đọc được .env.hub (HUB_ENABLED=0, có khóa; không in giá trị)')" || rollback 6 "hub không đọc được .env.hub"
echo "OK: trang chủ, webhook Zalo/Telegram vẫn 200; API hub báo tắt"

echo "== 7. Bộ kiểm thử hub trong container (DB tạm, không đụng dữ liệu thật) =="
docker exec -i -e HUB_DIR=/app "$C" python - < /tmp/test_hub.py > /tmp/test_hub.out 2>&1 && tail -4 /tmp/test_hub.out || { tail -25 /tmp/test_hub.out; rollback 7 "bộ kiểm thử hub lỗi trong container"; }
rm -f /tmp/test_hub.py /tmp/test_hub.out

echo "== 8. Commit vào git cục bộ =="
grep -q '^\.env\.\*' .gitignore || printf '.env.*\n' >> .gitignore
git add .gitignore hub.py main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "zalo hub GĐ1: hub.py (stdlib), hook webhook_zalo (HUB_ENABLED=0)"
echo "commit: $(git log --oneline -1 | cut -c1-70)"
echo "=== xong: Zalo Hub đã cài, ĐANG TẮT (HUB_ENABLED=0 trong .env.hub) ==="
exit 0
