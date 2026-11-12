#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ1 Zalo Hub: cài module hub.py vào AI-BOT (/opt/ai-bot-saas), TẮT MẶC ĐỊNH (HUB_ENABLED=0).
# Làm: (1) sao lưu main.py + docker-compose.yml + DB; (2) chép hub.py từ commit đang chạy (ops/ai-bot-hub/hub.py);
# (3) tạo /opt/ai-bot-saas/.env.hub (chmod 600) với khóa ngẫu nhiên, HUB_ENABLED=0 — KHÔNG in ra log;
# (4) compose: thêm env_file; (5) main.py: nối hub ở cuối file + 1 hook trong webhook_zalo (đặt SAU khi chọn bot, TRƯỚC chặn chat 1:1);
# (6) tạo lại container, kiểm tra khỏe + hành vi cũ không đổi (webhook Zalo/Telegram, trang chủ, hub báo enabled=false);
# (7) chạy bộ kiểm thử hub trong chính container trên DB TẠM (không đụng DB thật); (8) commit vào git cục bộ.
# Tự khôi phục main.py + compose nếu bước 6 hoặc 7 lỗi. Idempotent. Quay lại: cp main.py.bak_pre_hub_<ts> main.py; cp docker-compose.yml.bak_pre_hub_<ts>
# docker-compose.yml; docker compose -p ai-bot-saas -f /opt/ai-bot-saas/docker-compose.yml up -d --force-recreate.
set -euo pipefail
AB=/opt/ai-bot-saas
TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"

echo "== 1. Sao lưu =="
cp -p main.py "main.py.bak_pre_hub_${TS}"
cp -p docker-compose.yml "docker-compose.yml.bak_pre_hub_${TS}"
mkdir -p data/backups
docker exec -i maika-saas-engine python - "$TS" <<'PY'
import sqlite3, sys
src = sqlite3.connect("/app/data/saas_bots.sqlite"); dst = sqlite3.connect(f"/app/data/backups/saas_bots_pre_hub_{sys.argv[1]}.sqlite")
src.backup(dst); dst.close(); src.close(); print("đã sao lưu DB: saas_bots_pre_hub_" + sys.argv[1] + ".sqlite")
PY
echo "đã sao lưu main.py, docker-compose.yml (hậu tố bak_pre_hub_${TS})"

echo "== 2. Chép hub.py từ commit ${OPS_SHA:0:8} =="
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub.py") > hub.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_hub.py") > /tmp/test_hub.py
python3 -c "import ast,sys; ast.parse(open('hub.py.new',encoding='utf-8').read()); print('hub.py cú pháp OK')"
mv hub.py.new hub.py
echo "sha256 hub.py: $(sha256sum hub.py | cut -c1-16)…"

echo "== 3. Tệp môi trường .env.hub (khóa ngẫu nhiên, không in) =="
if [ -f .env.hub ]; then
  echo ".env.hub đã có — giữ nguyên"
else
  umask 077
  KEY=$(docker exec maika-saas-engine python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())")
  SES=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
  printf 'HUB_ENABLED=0\nHUB_KEY=%s\nAIBOT_SESSION_SECRET=%s\nHUB_ALLOWED_EVENT_HOSTS=picklefund-api:3000\n' "$KEY" "$SES" > .env.hub
  chmod 600 .env.hub
  echo "đã tạo .env.hub (chmod 600), HUB_ENABLED=0"
fi

echo "== 4. docker-compose: env_file =="
python3 - <<'PY'
p = "/opt/ai-bot-saas/docker-compose.yml"
s = open(p, encoding="utf-8").read()
if "env_file" in s:
    print("compose đã có env_file — bỏ qua")
else:
    anchor = "    restart: always\n"
    assert s.count(anchor) == 1, "kỳ vọng đúng 1 dòng 'restart: always'"
    s = s.replace(anchor, anchor + "    env_file:\n      - /opt/ai-bot-saas/.env.hub\n", 1)
    open(p + ".new", "w", encoding="utf-8").write(s)
    import os; os.replace(p + ".new", p)
    print("đã thêm env_file vào compose")
PY

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
  echo "LỖI ở bước $1 — khôi phục main.py + compose"
  cp -p "main.py.bak_pre_hub_${TS}" main.py
  cp -p "docker-compose.yml.bak_pre_hub_${TS}" docker-compose.yml
  docker compose -p ai-bot-saas -f /opt/ai-bot-saas/docker-compose.yml up -d --force-recreate >/dev/null 2>&1 || true
  exit 1
}

echo "== 6. Tạo lại container và kiểm tra hành vi cũ =="
docker compose -p ai-bot-saas -f /opt/ai-bot-saas/docker-compose.yml up -d --force-recreate >/dev/null 2>&1 || rollback 6
ok=0
for i in $(seq 1 40); do
  curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1 && { ok=1; break; }
  sleep 2
done
[ "$ok" = 1 ] || rollback 6
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
HUBH=$(curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health)
echo "hub/health: $HUBH"
echo "$HUBH" | grep -q '"enabled":false' || rollback 6
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback 6
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 6
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 6
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback 6
[ "$(code -X POST -H 'Content-Type: application/json' -d '{"bot_id":"x"}' http://127.0.0.1:4105/api/hub/v1/links/code)" = 404 ] || rollback 6
echo "OK: trang chủ, webhook Zalo/Telegram vẫn 200; API hub báo tắt (404 khi chưa bật)"
docker exec maika-saas-engine sh -c 'test -n "$HUB_KEY" && test -n "$AIBOT_SESSION_SECRET" && echo "biến môi trường hub có trong container (không in giá trị)"' || rollback 6

echo "== 7. Bộ kiểm thử hub trong container (DB tạm, không đụng dữ liệu thật) =="
docker exec -i -e HUB_DIR=/app maika-saas-engine python - < /tmp/test_hub.py 2>&1 | tail -6 || rollback 7
docker exec -i -e HUB_DIR=/app maika-saas-engine python - < /tmp/test_hub.py >/dev/null 2>&1 || rollback 7
rm -f /tmp/test_hub.py

echo "== 8. Commit vào git cục bộ =="
grep -q '^\.env\.\*' .gitignore || printf '.env.*\n' >> .gitignore
git add .gitignore hub.py main.py docker-compose.yml 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "zalo hub GĐ1: hub.py, hook webhook_zalo, env_file (HUB_ENABLED=0)"
echo "commit: $(git log --oneline -1 | cut -c1-70)"
echo "=== xong: Zalo Hub đã cài, ĐANG TẮT (HUB_ENABLED=0) ==="
exit 0
