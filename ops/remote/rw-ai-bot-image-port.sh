#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ5 bước 2: dựng lại image AI-BOT có SẴN gói pip (cryptography thêm vào requirements) rồi
# đổi cổng 4105 về 127.0.0.1 (tunnel cloudflared đã trỏ 127.0.0.1:4105; hub-net không dùng cổng host).
# Thứ tự an toàn: (1) build image mới KHÔNG đụng container đang chạy; (2) kiểm gói trong image mới; (3) mới tạo lại container (~10 giây ngừng).
# Lỗi sau khi tạo lại → trả cổng cũ (giữ image mới vì có đủ gói). Giữ tag ảnh cũ ai-bot-saas:pre_gd5.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; BOT=bot_7be4d5962d80; TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
echo "== 1. Điều kiện =="
df -P / | awk 'NR==2{ if ($4 < 4000000) { print "đĩa trống < 4GB — dừng"; exit 1 } else print "đĩa OK" }'
grep -q '"4105:4105"' docker-compose.yml || { grep -q '127.0.0.1:4105:4105' docker-compose.yml && echo "cổng đã là 127.0.0.1" || { echo "compose khác dự kiến"; exit 1; }; }
cp -p docker-compose.yml "docker-compose.yml.bak_pre_gd5_${TS}"
cp -p requirements.txt "requirements.txt.bak_pre_gd5_${TS}"
docker tag ai-bot-saas:latest ai-bot-saas:pre_gd5

echo "== 2. requirements + build image mới (container cũ vẫn chạy) =="
grep -qi '^cryptography' requirements.txt || echo 'cryptography' >> requirements.txt
if ! docker compose -f docker-compose.yml build 2>&1 | tail -5; then echo "build lỗi — khôi phục requirements"; cp -p "requirements.txt.bak_pre_gd5_${TS}" requirements.txt; exit 1; fi
docker run --rm --entrypoint python ai-bot-saas:latest -c "import markitdown, docx, fitz, cryptography, fastapi, uvicorn, httpx; print('image mới: đủ gói')" || { echo "image mới thiếu gói — KHÔNG tạo lại container"; cp -p "requirements.txt.bak_pre_gd5_${TS}" requirements.txt; exit 1; }

echo "== 3. Đổi cổng + tạo lại container từ image mới =="
sed -i 's|"4105:4105"|"127.0.0.1:4105:4105"|' docker-compose.yml
docker compose -f docker-compose.yml config -q
rollback() {
  echo "LỖI: $1 — trả cổng cũ (giữ image mới)"
  sed -i 's|"127.0.0.1:4105:4105"|"4105:4105"|' docker-compose.yml
  docker compose -f docker-compose.yml up -d --no-deps --force-recreate maika-saas-engine >/dev/null 2>&1 || true
  exit 1
}
docker compose -f docker-compose.yml up -d --no-deps --force-recreate maika-saas-engine 2>&1 | tail -3
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done

echo "== 4. Kiểm tra =="
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz, cryptography" || rollback "mất gói đọc file"
docker exec picklefund-api node -e "fetch('http://maika-saas-engine:4105/api/hub/v1/health').then(r=>r.text()).then(t=>{if(!t.includes('\"enabled\":true'))process.exit(2)}).catch(()=>process.exit(3))" || rollback "PickleFund không gọi được AI-BOT qua hub-net"
docker exec "$C" python -c "
import urllib.request, urllib.error
try: urllib.request.urlopen('http://picklefund-api:3000/api/zalo/hub/probe', timeout=8)
except urllib.error.HTTPError as e: print('AI-BOT → PickleFund OK', e.code)
" || rollback "AI-BOT không gọi được PickleFund"
docker inspect "$C" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw hub-net || rollback "container mất hub-net"
echo "cổng host: $(docker port "$C" | tr '\n' ' ')"
ss -ltn 2>/dev/null | grep ':4105' || true
# ngoài loopback không còn nghe cổng 4105
IP=$(hostname -I | awk '{print $1}')
[ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://$IP:4105/" || true)" = 000 ] && echo "OK: $IP:4105 không còn truy cập được từ ngoài loopback" || echo "CẢNH BÁO: $IP:4105 vẫn trả lời"
# tunnel vẫn tới được qua loopback
systemctl is-active maika-tunnel.service || true
git add docker-compose.yml requirements.txt 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "GĐ5: image có sẵn gói pip, cổng 4105 chỉ loopback"
echo "=== xong ==="
exit 0
