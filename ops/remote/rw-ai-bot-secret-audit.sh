#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ5 bước 1: webhook_zalo GHI LOG (không chặn) việc header secret của Zalo đúng/sai.
# Mỗi sự kiện ghi 1 dòng: "zalo-secret-audit bot=<id> ok=<True|False> has_header=<True|False>" (không ghi giá trị).
# Không đổi hành vi xử lý tin. Sao lưu main.py, kiểm cú pháp, docker restart (KHÔNG recreate), kiểm lại route; lỗi thì khôi phục.
# Đọc kết quả: ro-ai-bot-secret-stats.sh
set -euo pipefail
AB=/opt/ai-bot-saas; C=maika-saas-engine; TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
cp -p main.py "main.py.bak_pre_secretaudit_${TS}"
python3 - <<'PY'
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
if "zalo-secret-audit" in s:
    print("đã vá — bỏ qua"); raise SystemExit(0)
A = "    _log_event_shape(data)  # --- FILE GUARD (GĐ1b): chỉ ghi cấu trúc, không ghi giá trị ---\n"
assert s.count(A) == 1, "neo _log_event_shape không đúng 1 lần"
B = A + (
    "    try:  # zalo-secret-audit (GĐ5): chỉ ghi log, KHÔNG chặn\n"
    "        import hmac as _hm\n"
    "        _hdr = request.headers.get(\"x-bot-api-secret-token\", \"\")\n"
    "        logger.info(f\"zalo-secret-audit bot={bot_id} ok={_hm.compare_digest(_hdr.encode(), ZALO_SECRET_TOKEN.encode())} has_header={bool(_hdr)}\")\n"
    "    except Exception:\n"
    "        pass\n"
)
s = s.replace(A, B, 1)
import ast; ast.parse(s)
open(p + ".new", "w", encoding="utf-8").write(s)
import os; os.replace(p + ".new", p)
print("đã vá main.py")
PY
rollback() { echo "LỖI: $1 — KHÔI PHỤC"; cp -p "main.py.bak_pre_secretaudit_${TS}" main.py; docker restart "$C" >/dev/null; exit 1; }
docker restart "$C" >/dev/null
for i in $(seq 1 30); do [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] && break; sleep 2; done
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{"message":{"chat":{"id":"zgr-audittest"},"text":""}}' http://127.0.0.1:4105/webhook/zalo/bot_zalo_nonexistent)" != 000 ] || rollback "webhook không phản hồi"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":true' || rollback "hub health lỗi"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback "mất gói đọc file"
docker logs --since 2m "$C" 2>&1 | grep -c "zalo-secret-audit" | sed 's/^/số dòng audit sau thử: /'
git add main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "GĐ5: ghi log kiểm secret webhook Zalo (chưa chặn)"
echo "=== xong ==="
exit 0
