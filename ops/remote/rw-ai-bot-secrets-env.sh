#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ5 bước 3: chuyển khóa viết cứng trong main.py (DEEPSEEK_API_KEY, DEFAULT_ZALO_TOKEN, ZALO_SECRET_TOKEN)
# sang /opt/ai-bot-saas/.env.secrets (chmod 600, nạp bằng env_file). GIỮ NGUYÊN giá trị → hành vi không đổi; không in giá trị.
# LƯU Ý: khóa cũ đã từng nằm trong mã/git cục bộ — muốn an toàn thật phải ĐỔI khóa DeepSeek rồi sửa .env.secrets.
# Sao lưu main.py + compose; lỗi → khôi phục + tạo lại container.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; BOT=bot_7be4d5962d80; TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
cp -p main.py "main.py.bak_pre_secretsenv_${TS}"
cp -p docker-compose.yml "docker-compose.yml.bak_pre_secretsenv_${TS}"
[ -f .env.secrets ] && cp -p .env.secrets ".env.secrets.bak_${TS}" || true

OUT=$(python3 - <<'PY'
import re, os, ast
p = "/opt/ai-bot-saas/main.py"; envp = "/opt/ai-bot-saas/.env.secrets"
s = open(p, encoding="utf-8").read()
found = {}
def fb(m):
    name = m.group(2); found[name] = m.group(4)
    return f'{m.group(1)}os.environ.get("{name}", "")'
# NAME = os.environ.get("ENV", "literal") cho 2 khóa
for var in ("DEEPSEEK_API_KEY", "DEFAULT_ZALO_TOKEN"):
    pat = re.compile(r'^(' + var + r' = os\.environ\.get\()"([A-Za-z0-9_]+)"(, )"([^"]{12,})"\)', re.M)
    m = pat.search(s)
    if m:
        found[m.group(2)] = m.group(4)
        s = pat.sub(lambda m: f'{m.group(1)}"{m.group(2)}"{m.group(3)}"")', s, count=1)
m = re.search(r'^ZALO_SECRET_TOKEN = "([^"]{8,})"$', s, re.M)
if m:
    found["ZALO_SECRET_TOKEN"] = m.group(1)
    s = re.sub(r'^ZALO_SECRET_TOKEN = "[^"]+"$', 'ZALO_SECRET_TOKEN = os.environ.get("ZALO_SECRET_TOKEN", "")', s, count=1, flags=re.M)
if not found:
    print("không còn khóa viết cứng — bỏ qua"); raise SystemExit(0)
ast.parse(s)
cur = open(envp, encoding="utf-8").read() if os.path.exists(envp) else ""
have = {l.split("=", 1)[0] for l in cur.splitlines() if "=" in l}
add = "".join(f"{k}={v}\n" for k, v in found.items() if k not in have)
open(envp, "a", encoding="utf-8").write(("" if cur.endswith("\n") or not cur else "\n") + add)
os.chmod(envp, 0o600)
open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
print("đã chuyển", len(found), "khóa sang .env.secrets:", ", ".join(sorted(found)))
PY
)
echo "$OUT"
case "$OUT" in *"bỏ qua"*) echo "không có gì để đổi — không tạo lại container"; exit 0;; esac
[ -f .env.secrets ] || { echo "không có khóa để chuyển — kết thúc"; exit 0; }
chmod 600 .env.secrets
grep -q 'env_file' docker-compose.yml || python3 - <<'PY'
p = "/opt/ai-bot-saas/docker-compose.yml"; s = open(p, encoding="utf-8").read()
A = "    restart: always\n"
assert s.count(A) == 1, "compose khác dự kiến"
open(p, "w", encoding="utf-8").write(s.replace(A, A + "    env_file:\n      - .env.secrets\n", 1))
PY
docker compose -f docker-compose.yml config -q

rollback() {
  echo "LỖI: $1 — KHÔI PHỤC"
  cp -p "main.py.bak_pre_secretsenv_${TS}" main.py
  cp -p "docker-compose.yml.bak_pre_secretsenv_${TS}" docker-compose.yml
  docker compose -f docker-compose.yml up -d --no-deps --force-recreate "$C" >/dev/null 2>&1 || true
  exit 1
}
docker compose -f docker-compose.yml up -d --no-deps --force-recreate "$C" 2>&1 | tail -3
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done

echo "== Kiểm tra =="
for v in DEEPSEEK_API_KEY ZALO_SECRET_TOKEN; do
  n=$(docker exec "$C" printenv "$v" 2>/dev/null | tr -d '\n' | wc -c) || n=0
  [ "$n" -ge 8 ] && echo "$v nạp được từ env ($n ký tự)" || rollback "$v không nạp được từ env"
done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz, cryptography" 2>/dev/null || rollback "mất gói đọc file"
docker exec picklefund-api node -e "fetch('http://maika-saas-engine:4105/api/hub/v1/health').then(r=>r.text()).then(t=>{if(!t.includes('\"enabled\":true'))process.exit(2)}).catch(()=>process.exit(3))" || rollback "hub-net hỏng"
echo "khóa còn viết cứng trong main.py: $(grep -c -E 'sk-[A-Za-z0-9]{20,}' main.py || true)"
git add main.py docker-compose.yml 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "GĐ5: khóa chuyển sang .env.secrets (env_file)"
echo "=== xong ==="
exit 0
