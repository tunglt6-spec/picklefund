#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT: (1) chặn AI "bịa" khi người dùng hỏi/trích dẫn file mà bot KHÔNG có nội dung file → trả lời cố định thành thật;
# (2) ghi CẤU TRÚC (chỉ tên trường/kiểu, KHÔNG giá trị) của sự kiện Zalo liên quan tới tệp vào /opt/ai-bot-saas/data/zalo_event_shapes.jsonl
# để biết Zalo thật sự gửi gì khi có file (đọc bằng ro-ai-bot-event-shapes.sh).
# Làm: sao lưu main.py → chép aibot_filesafe.py (stdlib) → vá main.py (đúng 3 chỗ, có assert) → docker restart (KHÔNG tạo lại container)
# → kiểm tra hành vi cũ không đổi + chạy test trong container + thử file_guard thật → commit git cục bộ. Tự khôi phục nếu lỗi. Idempotent.
# Quay lại: cp main.py.bak_pre_fileguard_<ts> main.py && docker restart maika-saas-engine (rm aibot_filesafe.py không bắt buộc).
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"

echo "== 1. Sao lưu =="
cp -p main.py "main.py.bak_pre_fileguard_${TS}"
echo "đã sao lưu main.py (bak_pre_fileguard_${TS})"

echo "== 2. Chép aibot_filesafe.py từ commit ${OPS_SHA:0:8} =="
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/aibot_filesafe.py") > aibot_filesafe.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_filesafe.py") > /tmp/test_filesafe.py
python3 -c "import ast; ast.parse(open('aibot_filesafe.py.new',encoding='utf-8').read()); print('aibot_filesafe.py cú pháp OK')"
mv aibot_filesafe.py.new aibot_filesafe.py

echo "== 3. Vá main.py (3 chỗ) =="
python3 - <<'PY'
import ast, os
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
changed = []

# (a) ghi cấu trúc sự kiện ngay sau dòng log payload của webhook Zalo
A_ANCHOR = '    logger.info(f"Incoming Zalo Webhook payload: {data}")\n'
if "_log_event_shape(data)" not in s:
    assert s.count(A_ANCHOR) == 1, "kỳ vọng đúng 1 dòng log payload Zalo, thực tế %d" % s.count(A_ANCHOR)
    s = s.replace(A_ANCHOR, A_ANCHOR + "    _log_event_shape(data)  # --- FILE GUARD (GĐ1b): chỉ ghi cấu trúc, không ghi giá trị ---\n", 1)
    changed.append("shape")

# (b) chặn AI bịa khi nói về file mà không có nội dung: đổi `if DEEPSEEK_API_KEY:` của nhánh Zalo thành guard + elif
B_ANCHOR = (
    "        # 3. Conversational Agentic response via DeepSeek V3\n"
    "        if DEEPSEEK_API_KEY:\n"
    "            res = await process_agentic_interaction(\n"
    "                bot_id=target_bot_id,\n"
    "                bot_name=bot_name,\n"
    "                platform=\"zalo\",\n"
)
if "_file_guard(att_res" not in s:
    assert s.count(B_ANCHOR) == 1, "kỳ vọng đúng 1 chỗ gọi AI của nhánh Zalo, thực tế %d" % s.count(B_ANCHOR)
    new_b = B_ANCHOR.replace(
        "        if DEEPSEEK_API_KEY:\n",
        "        _fg = _file_guard(att_res, reply_context, text)  # --- FILE GUARD (GĐ1b): không để AI bịa nội dung file ---\n"
        "        if _fg:\n"
        "            reply = _fg\n"
        "        elif DEEPSEEK_API_KEY:\n", 1)
    s = s.replace(B_ANCHOR, new_b, 1)
    changed.append("guard")

# (c) import ở cuối file
C_MARK = "# --- FILE GUARD (GĐ1b) ---"
if C_MARK not in s:
    s = s.rstrip("\n") + "\n\n\n" + C_MARK + "\nfrom aibot_filesafe import file_guard as _file_guard, log_event_shape as _log_event_shape\n"
    changed.append("import")

ast.parse(s)
if changed:
    open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
    print("đã vá main.py:", ", ".join(changed), "(đã kiểm tra cú pháp)")
else:
    print("main.py đã được vá trước đó — bỏ qua")
PY

rollback() {
  echo "LỖI ở bước $1: ${2:-không rõ}"
  echo "--- log container gần nhất (trước khi khôi phục):"
  docker logs --tail 30 "$C" 2>&1 | cut -c1-200 | tail -30 || true
  echo "--- khôi phục main.py + restart"
  cp -p "main.py.bak_pre_fileguard_${TS}" main.py
  docker restart "$C" >/dev/null 2>&1 || true
  exit 1
}

echo "== 4. Restart (KHÔNG tạo lại container) và kiểm tra hành vi cũ =="
docker restart "$C" >/dev/null
ok=0
for i in $(seq 1 40); do
  curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1 && { ok=1; break; }
  sleep 2
done
[ "$ok" = 1 ] || rollback 4 "container không khỏe sau 80 giây"
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback 4 "trang chủ không 200"
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 4 "GET webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 4 "POST webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback 4 "POST webhook Telegram không 200"
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":false' || rollback 4 "hub không còn ở trạng thái tắt"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback 4 "mất gói đọc file"
echo "OK: trang chủ, webhook Zalo/Telegram, hub (tắt), gói đọc file đều như cũ"

echo "== 5. Thử guard thật trong container + bộ kiểm thử =="
docker exec -i "$C" python - <<'PY' || rollback 5 "file_guard trả sai"
import aibot_filesafe as fs
r1 = fs.file_guard({"has_file": False, "extracted_text": ""}, "[File] Nâng cấp AI-BOT.docx", "đọc phân tích giải pháp trong file này")
r2 = fs.file_guard({"has_file": True, "extracted_text": "có nội dung"}, "[File] a.docx", "đọc file")
r3 = fs.file_guard({}, "", "hôm nay tập mấy giờ")
assert r1 == fs.MSG_NO_CONTENT and r2 is None and r3 is None, (r1 is not None, r2, r3)
print("file_guard: file không có nội dung → trả lời thành thật; có nội dung → để AI đọc; chat thường → không đụng")
PY
docker exec -i -e HUB_DIR=/app "$C" python -W ignore - < /tmp/test_filesafe.py > /tmp/test_filesafe.out 2>&1 && tail -3 /tmp/test_filesafe.out || { tail -20 /tmp/test_filesafe.out; rollback 5 "bộ kiểm thử aibot_filesafe lỗi trong container"; }
rm -f /tmp/test_filesafe.py /tmp/test_filesafe.out

echo "== 6. Commit git cục bộ =="
git add aibot_filesafe.py main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "file guard: chặn AI bịa nội dung file + ghi cấu trúc sự kiện tệp Zalo"
echo "commit: $(git log --oneline -1 | cut -c1-70)"
echo "=== xong: guard đã bật; cấu trúc sự kiện tệp sẽ ghi vào data/zalo_event_shapes.jsonl ==="
exit 0
