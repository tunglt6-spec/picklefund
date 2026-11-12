#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ4a Zalo Hub: nối AI-BOT vào mạng hub-net, gắn mẫu CLB cho bot The PING, BẬT hub.
# Điều kiện: CI đã deploy PickleFund bản có `hub-net` (backend picklefund-api đã nằm trong mạng hub-net). Chưa thì script dừng, không đổi gì.
# Làm:
#  1. Kiểm tra: mạng hub-net có, picklefund-api ở trong đó.
#  2. Sao lưu: docker-compose.yml, DB (backup sqlite), .env.hub.
#  3. `docker network connect hub-net maika-saas-engine` (KHÔNG tạo lại container — tạo lại sẽ mất gói pip cài tay).
#  4. Ghi bền vào docker-compose.yml của AI-BOT (service gắn default + hub-net; khai báo hub-net kiểu `name:` như commerce-net), kiểm bằng `docker compose config -q`.
#  5. bots.template_key='thethao' cho bot The PING (bot_7be4d5962d80).
#  6. .env.hub: HUB_ENABLED=1, bảo đảm HUB_ALLOWED_EVENT_HOSTS có picklefund-api:3000 (đổi có hiệu lực ngay, không restart).
#  7. Kiểm tra: AI-BOT↔PickleFund gọi được nhau qua hub-net, hub/health enabled=true, các route cũ vẫn 200.
# Tự quay lại (hub tắt, gỡ khỏi hub-net, khôi phục compose/DB template_key) nếu bước 7 lỗi. Idempotent.
# Quay lại tay: sed -i 's/^HUB_ENABLED=.*/HUB_ENABLED=0/' /opt/ai-bot-saas/.env.hub; docker network disconnect hub-net maika-saas-engine
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
BOT=bot_7be4d5962d80
TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"

echo "== 1. Điều kiện =="
docker network inspect hub-net >/dev/null 2>&1 || { echo "Chưa có mạng hub-net — chờ CI deploy PickleFund bản mới rồi chạy lại (không đổi gì)"; exit 1; }
docker inspect picklefund-api --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw hub-net || { echo "picklefund-api chưa nằm trong hub-net — chờ deploy xong rồi chạy lại (không đổi gì)"; exit 1; }
echo "OK: hub-net có, picklefund-api ở trong đó"

echo "== 2. Sao lưu =="
cp -p docker-compose.yml "docker-compose.yml.bak_pre_hubnet_${TS}"
cp -p .env.hub ".env.hub.bak_pre_hubnet_${TS}"
mkdir -p data/backups
docker exec -i "$C" python - "$TS" <<'PY'
import sqlite3, sys
src = sqlite3.connect("/app/data/saas_bots.sqlite"); dst = sqlite3.connect(f"/app/data/backups/saas_bots_pre_hubnet_{sys.argv[1]}.sqlite")
src.backup(dst); dst.close(); src.close(); print("đã sao lưu DB: saas_bots_pre_hubnet_" + sys.argv[1] + ".sqlite")
PY

rollback() {
  echo "LỖI ở bước $1: ${2:-không rõ} — QUAY LẠI"
  sed -i 's/^HUB_ENABLED=.*/HUB_ENABLED=0/' "$AB/.env.hub" || true
  docker network disconnect hub-net "$C" >/dev/null 2>&1 || true
  cp -p "docker-compose.yml.bak_pre_hubnet_${TS}" docker-compose.yml || true
  docker exec -i "$C" python - "$BOT" <<'PY' || true
import sqlite3, sys
c = sqlite3.connect("/app/data/saas_bots.sqlite"); c.execute("UPDATE bots SET template_key=NULL WHERE bot_id=?", (sys.argv[1],)); c.commit()
PY
  exit 1
}

echo "== 3. Nối AI-BOT vào hub-net (không tạo lại container) =="
if docker inspect "$C" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw hub-net; then
  echo "đã ở trong hub-net"
else
  docker network connect hub-net "$C"; echo "đã nối"
fi

echo "== 4. Ghi bền vào docker-compose.yml =="
python3 - <<'PY'
p = "/opt/ai-bot-saas/docker-compose.yml"
s = open(p, encoding="utf-8").read()
if "hub-net" in s:
    print("compose đã có hub-net — bỏ qua")
else:
    A = "      - TZ=Asia/Ho_Chi_Minh\n"
    assert s.count(A) == 1 and "networks:" not in s, "compose khác dự kiến (không đúng 1 dòng TZ hoặc đã có networks)"
    s = s.replace(A, A + "    networks:\n      - default\n      - hub-net\n", 1)
    s = s.rstrip("\n") + "\n\nnetworks:\n  hub-net:\n    name: hub-net\n    driver: bridge\n"
    open(p + ".new", "w", encoding="utf-8").write(s)
    import os; os.replace(p + ".new", p)
    print("đã ghi networks vào compose")
PY
docker compose -f docker-compose.yml config -q || rollback 4 "docker compose config không hợp lệ"

echo "== 5. template_key cho bot The PING =="
docker exec -i "$C" python - "$BOT" <<'PY' || rollback 5 "không gắn được template_key"
import sqlite3, sys
c = sqlite3.connect("/app/data/saas_bots.sqlite")
r = c.execute("SELECT bot_name, platform FROM bots WHERE bot_id=?", (sys.argv[1],)).fetchone()
assert r and r[1] == "zalo", "không thấy bot Zalo " + sys.argv[1]
c.execute("UPDATE bots SET template_key='thethao' WHERE bot_id=?", (sys.argv[1],)); c.commit()
print("đã gắn template_key=thethao cho:", r[0])
PY

echo "== 6. Bật hub (.env.hub) =="
grep -q '^HUB_ALLOWED_EVENT_HOSTS=.*picklefund-api:3000' .env.hub || { sed -i '/^HUB_ALLOWED_EVENT_HOSTS=/d' .env.hub; echo 'HUB_ALLOWED_EVENT_HOSTS=picklefund-api:3000' >> .env.hub; }
if grep -q '^HUB_ENABLED=' .env.hub; then sed -i 's/^HUB_ENABLED=.*/HUB_ENABLED=1/' .env.hub; else echo 'HUB_ENABLED=1' >> .env.hub; fi
chmod 600 .env.hub
sleep 1

echo "== 7. Kiểm tra =="
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback 7 "hub/health không báo enabled=true"
docker exec picklefund-api node -e "fetch('http://maika-saas-engine:4105/api/hub/v1/health').then(r=>r.text()).then(t=>{if(!t.includes('\"enabled\":true'))process.exit(2);console.log('PickleFund → AI-BOT qua hub-net: OK')}).catch(()=>process.exit(3))" || rollback 7 "picklefund-api không gọi được AI-BOT"
docker exec "$C" python -c "
import urllib.request, urllib.error
try:
    urllib.request.urlopen('http://picklefund-api:3000/api/zalo/hub/probe', timeout=8)
except urllib.error.HTTPError as e:
    print('AI-BOT → PickleFund qua hub-net: OK (HTTP', e.code, ')')
" || rollback 7 "AI-BOT không gọi được picklefund-api"
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback 7 "trang chủ không 200"
[ "$(code http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback 7 "GET webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback 7 "POST webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback 7 "POST webhook Telegram không 200"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback 7 "mất gói đọc file"
echo "OK: hub BẬT (chưa có liên kết nào nên chưa chuyển lệnh), hai app gọi được nhau, route cũ vẫn 200"

echo "== 8. Commit git cục bộ =="
git add docker-compose.yml 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "zalo hub GĐ4: hub-net trong compose"
echo "=== xong: hub đã BẬT; bước tiếp theo là tạo mã liên kết cho bot The PING ==="
exit 0
