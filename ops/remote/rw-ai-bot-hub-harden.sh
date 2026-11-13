#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Zalo Hub — củng cố GĐ5 (sau audit):
#  (1) CHẶN sự kiện thiếu/sai secret webhook Zalo, CHỈ với bot đã có liên kết PickleFund (bot khác không đổi). Tắt nhanh: HUB_REQUIRE_ZALO_SECRET=0 trong .env.hub (hiệu lực ngay).
#  (2) Ẩn mã nhóm giả zgr-<mã link ngắn> khỏi danh sách/xác nhận.
#  (3) Script tự kiểm hub_selfcheck.sh (hook/hub/health; ghi khi đổi trạng thái vào data/hub_selfcheck.log). KHÔNG tự đặt lịch; cron chỉ cài khi được duyệt.
# Sao lưu main.py + hub.py; test trong container; restart (KHÔNG recreate); lỗi → khôi phục.
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; BOT=bot_7be4d5962d80; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
cp -p main.py "main.py.bak_pre_harden_${TS}"; cp -p hub.py "hub.py.bak_pre_harden_${TS}"
chmod 600 "main.py.bak_pre_harden_${TS}" "hub.py.bak_pre_harden_${TS}"
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub.py") > hub.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_hub.py") > /tmp/test_hub.py
python3 -c "
import ast
s = open('hub.py.new', encoding='utf-8').read()
assert '\x00' not in s and 'REAL_GROUP_RE' in s and 'secret_ok' in s, 'hub.py không đúng bản vá'
ast.parse(s); print('hub.py mới: cú pháp OK')"
rollback() {
  echo "LỖI: $1 — KHÔI PHỤC main.py + hub.py"
  cp -p "main.py.bak_pre_harden_${TS}" main.py; cp -p "hub.py.bak_pre_harden_${TS}" hub.py
  docker restart "$C" >/dev/null || true
  exit 1
}
mv hub.py.new hub.py

echo "== Vá main.py (kiểm secret cho bot đã liên kết) =="
python3 - <<'PY' || rollback "vá main.py thất bại"
import re, os, ast
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
if "zalo-secret-verify" in s:
    print("main.py đã vá — bỏ qua"); raise SystemExit(0)
pat = re.compile(r"    try:  # zalo-secret-audit \(GĐ5\).*?\n    except Exception:\n        pass\n", re.S)
assert len(pat.findall(s)) == 1, "khối zalo-secret-audit: thực tế %d" % len(pat.findall(s))
NEW = (
    "    _secret_ok = False  # zalo-secret-verify (GĐ5): chỉ ảnh hưởng bot đã liên kết PickleFund (xem hub.py)\n"
    "    try:\n"
    "        import hmac as _hm\n"
    "        _hdr = request.headers.get(\"x-bot-api-secret-token\", \"\")\n"
    "        _secret_ok = bool(ZALO_SECRET_TOKEN) and _hm.compare_digest(_hdr.encode(), ZALO_SECRET_TOKEN.encode())\n"
    "        print(f\"zalo-secret-audit bot={bot_id} ok={_secret_ok} has_header={bool(_hdr)}\", flush=True)\n"
    "    except Exception:\n"
    "        _secret_ok = False\n")
s = pat.sub(lambda m: NEW, s, count=1)
OLD = "_hub_try_forward(target_bot_id, data, text, chat_id)"
assert s.count(OLD) == 1, "lời gọi hook: thực tế %d" % s.count(OLD)
s = s.replace(OLD, "_hub_try_forward(target_bot_id, data, text, chat_id, _secret_ok)", 1)
ast.parse(s)
open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
print("đã vá main.py")
PY

echo "== Test trong container =="
if docker exec -i -e HUB_DIR=/app "$C" python -W ignore - < /tmp/test_hub.py > /tmp/test_hub.out 2>&1; then tail -4 /tmp/test_hub.out; else tail -25 /tmp/test_hub.out; rm -f /tmp/test_hub.py /tmp/test_hub.out; rollback "bộ kiểm thử lỗi"; fi
rm -f /tmp/test_hub.py /tmp/test_hub.out

echo "== Tự kiểm định kỳ =="
cat > "$AB/hub_selfcheck.sh" <<'EOS'
#!/bin/bash
# Tự kiểm Zalo Hub: hook còn trong main.py, hub bật + khỏe, trang chủ 200. Chỉ ghi khi đổi trạng thái.
AB=/opt/ai-bot-saas; LOG=$AB/data/hub_selfcheck.log; st=""
grep -q "Zalo Hub hook (GĐ1)" $AB/main.py || st="$st hook-mat"
grep -q "zalo-secret-verify" $AB/main.py || st="$st secret-verify-mat"
curl -s -m 8 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || st="$st hub-health"
c=$(curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/); [ "$c" = 200 ] || st="$st home-$c"
state=OK; [ -z "$st" ] || state="FAIL$st"
last=$(tail -1 "$LOG" 2>/dev/null | cut -d' ' -f2-)
[ "$last" = "$state" ] || echo "$(date -Is) $state" >> "$LOG"
EOS
chmod 755 "$AB/hub_selfcheck.sh"
# KHÔNG cài cron (chờ chủ hệ thống duyệt riêng); hub_selfcheck.sh chạy tay/lúc nghiệm thu.

echo "== Restart + kiểm tra =="
docker restart "$C" >/dev/null
for i in $(seq 1 40); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{"message":{"chat":{"id":"zgr-x"},"text":"/chi 1"}}' http://127.0.0.1:4105/webhook/zalo/$BOT)" = 200 ] || rollback "webhook Zalo (không secret) không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback "webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec picklefund-api node -e "fetch('http://maika-saas-engine:4105/api/hub/v1/health').then(r=>r.text()).then(t=>{if(!t.includes('\"enabled\":true'))process.exit(2)}).catch(()=>process.exit(3))" || rollback "hub-net hỏng"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"
n=$(docker logs --since 2m "$C" 2>&1 | grep -c "zalo-secret-audit" || true); echo "dòng audit sau thử (kỳ vọng ≥1): $n"
"$AB/hub_selfcheck.sh"; echo "tự kiểm lần đầu: $(tail -1 "$AB/data/hub_selfcheck.log")"
git add hub.py main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "hub: chặn sự kiện thiếu secret cho bot đã liên kết, ẩn nhóm giả, tự kiểm"
echo "=== xong ==="
exit 0
