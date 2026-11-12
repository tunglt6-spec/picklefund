#!/usr/bin/env bash
# CHỈ ĐỌC. Thu thập thông tin AI-BOT (/opt/ai-bot-saas) và mạng Docker để thiết kế "Zalo Hub".
# Không in token/khóa: chỉ in tên biến môi trường, cấu trúc bảng, đoạn mã cần xem.
set -uo pipefail
AB=/opt/ai-bot-saas
sec() { printf '\n===== %s =====\n' "$1"; }

sec "AI-BOT: thư mục"
ls -la "$AB" | head -30
(cd "$AB" && git status 2>&1 | head -2) || true

sec "AI-BOT: docker-compose (che giá trị khóa)"
sed -E 's/((KEY|TOKEN|SECRET|PASSWORD)[A-Z_]*[=:] *).*/\1<hidden>/I' "$AB/docker-compose.yml" | cut -c1-160
sec "AI-BOT: Dockerfile + requirements"
cut -c1-160 "$AB/Dockerfile"; echo ---; cut -c1-100 "$AB/requirements.txt"

sec "Container và mạng Docker"
docker ps --format '{{.Names}} | {{.Ports}} | {{.Networks}}' | cut -c1-170
docker network ls --format '{{.Name}} {{.Driver}}'
for n in ai-bot-saas_default picklefund_picklefund-net; do
  echo "--- $n:"; docker network inspect "$n" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null
done

sec "Biến môi trường (CHỈ TÊN) của picklefund-api và maika-saas-engine"
docker exec picklefund-api printenv 2>/dev/null | cut -d= -f1 | sort | tr '\n' ' '; echo
docker exec maika-saas-engine printenv 2>/dev/null | cut -d= -f1 | sort | tr '\n' ' '; echo
echo "--- thư viện mã hóa trong container AI-BOT:"
docker exec maika-saas-engine python -c "import importlib.util as u;print({m: bool(u.find_spec(m)) for m in ['cryptography','jwt','jose','nacl','pytest','httpx']})" 2>&1 | head -3

sec "AI-BOT: lớp BotCreateRequest và LoginRequest"
grep -n -A14 'class BotCreateRequest' "$AB/main.py" | cut -c1-170
grep -n -A8 'class LoginRequest' "$AB/main.py" | cut -c1-170

sec "AI-BOT: đoạn login (trả gì về giao diện)"
sed -n 763,806p "$AB/main.py" | cut -c1-170

sec "AI-BOT: BOT_TEMPLATES (static/index.html)"
n=$(grep -n 'const BOT_TEMPLATES' "$AB/static/index.html" | head -1 | cut -d: -f1)
[ -n "$n" ] && sed -n "${n},$((n+45))p" "$AB/static/index.html" | cut -c1-200
echo "--- hàm áp mẫu / tạo bot phía giao diện:"
grep -n -E 'function (applyBotTemplate|selectBotTemplate|createNewBot|submitCreateBot|openCreateBotModal|submitNewBot)|BOT_TEMPLATES\[' "$AB/static/index.html" | cut -c1-170 | head -12
echo "--- thẻ bot: nơi vẽ danh sách bot:"
grep -n -E 'function (renderBots|renderBotCards|loadBots|renderMyBots)' "$AB/static/index.html" | cut -c1-170 | head

sec "AI-BOT: cấu trúc DB (chỉ tên bảng/cột)"
docker exec maika-saas-engine python - <<'PY' 2>&1 | head -60
import sqlite3, glob
for p in ("/app/data/saas_bots.sqlite",):
    try:
        c = sqlite3.connect("file:%s?mode=ro" % p, uri=True)
        print("DB", p)
        for (n,) in c.execute("select name from sqlite_master where type='table' order by 1"):
            cols = [r[1] for r in c.execute("pragma table_info(%s)" % n)]
            print(" ", n, cols)
    except Exception as e:
        print("lỗi", p, e)
PY

sec "AI-BOT: tiến trình khởi động và log gần nhất (200 dòng, đã che)"
docker logs --tail 60 maika-saas-engine 2>&1 | cut -c1-180

sec "maika-tunnel: địa chỉ hiện tại"
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /opt/picklefund/maika-lisa-ai-gateway/logs/tunnel.log 2>/dev/null | tail -1

sec "PickleFund: compose áp dụng khi deploy"
cd /opt/picklefund && docker compose config --services 2>/dev/null | tr '\n' ' '; echo
echo "--- ip gateway các mạng (để biết đường từ container ra host):"
for n in picklefund_picklefund-net ai-bot-saas_default; do echo -n "$n: "; docker network inspect "$n" --format '{{range .IPAM.Config}}{{.Gateway}} {{end}}' 2>/dev/null; done
echo "=== xong ==="
