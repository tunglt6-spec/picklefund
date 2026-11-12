#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT: thay "guard theo từ khóa + câu trả lời cố định" (rw-ai-bot-file-guard.sh) bằng CHỈ THỊ cho AI tự trả lời tự nhiên.
# Lý do (user, 2026-11-12): không khóa theo câu lệnh/từ ngữ khi giao việc cho bot; để ngôn ngữ tự nhiên theo cách AI hiểu.
# Cách mới: code chỉ cung cấp SỰ THẬT (không có nội dung tệp; hoặc tin trích dẫn là "[File] tên"); chỉ thị nối vào custom_prompt của bot để AI tự
# quyết định có liên quan hay không và trả lời đúng vai/xưng hô, không bịa nội dung. Chat thường: chỉ thị yêu cầu bỏ qua, không nhắc tới.
# Làm: sao lưu → chép aibot_filesafe.py mới (+ test) → vá main.py: gỡ guard cũ, nối _file_note vào custom_prompt của nhánh Zalo (assert neo) →
# docker restart (KHÔNG tạo lại container) → kiểm tra hành vi cũ + test trong container + thử file_note thật → commit git cục bộ.
# Tự khôi phục main.py nếu lỗi. Idempotent. Quay lại: cp main.py.bak_pre_filenote_<ts> main.py && docker restart maika-saas-engine.
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"

echo "== 1. Sao lưu =="
cp -p main.py "main.py.bak_pre_filenote_${TS}"
cp -p aibot_filesafe.py "aibot_filesafe.py.bak_pre_filenote_${TS}" 2>/dev/null || true
echo "đã sao lưu main.py, aibot_filesafe.py (bak_pre_filenote_${TS})"

echo "== 2. Chép aibot_filesafe.py (bản file_note) từ commit ${OPS_SHA:0:8} =="
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/aibot_filesafe.py") > aibot_filesafe.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_filesafe.py") > /tmp/test_filesafe.py
python3 -c "
import ast
s = open('aibot_filesafe.py.new', encoding='utf-8').read()
assert '\x00' not in s and 'def file_note' in s, 'tệp lỗi'
ast.parse(s); print('aibot_filesafe.py cú pháp OK')"
mv aibot_filesafe.py.new aibot_filesafe.py

echo "== 3. Vá main.py =="
python3 - <<'PY'
import ast, os
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
changed = []

# (a) gỡ guard cũ (nếu có) và nối chỉ thị vào custom_prompt của nhánh Zalo
OLD = (
    "        _fg = _file_guard(att_res, reply_context, text)  # --- FILE GUARD (GĐ1b): không để AI bịa nội dung file ---\n"
    "        if _fg:\n"
    "            reply = _fg\n"
    "        elif DEEPSEEK_API_KEY:\n"
    "            res = await process_agentic_interaction(\n"
    "                bot_id=target_bot_id,\n"
    "                bot_name=bot_name,\n"
    "                platform=\"zalo\",\n"
    "                custom_prompt=custom_prompt or \"\",\n"
)
NEW = (
    "        if DEEPSEEK_API_KEY:\n"
    "            res = await process_agentic_interaction(\n"
    "                bot_id=target_bot_id,\n"
    "                bot_name=bot_name,\n"
    "                platform=\"zalo\",\n"
    "                custom_prompt=(custom_prompt or \"\") + _file_note(att_res, reply_context, text),  # FILE NOTE (GĐ1b): AI tự trả lời, không bịa file\n"
)
if "_file_note(att_res" not in s:
    assert s.count(OLD) == 1, "kỳ vọng đúng 1 khối guard cũ, thực tế %d" % s.count(OLD)
    s = s.replace(OLD, NEW, 1)
    changed.append("note")

# (b) đổi import ở cuối file
OLD_IMP = "from aibot_filesafe import file_guard as _file_guard, log_event_shape as _log_event_shape\n"
NEW_IMP = "from aibot_filesafe import file_note as _file_note, log_event_shape as _log_event_shape\n"
if NEW_IMP not in s:
    assert s.count(OLD_IMP) == 1, "kỳ vọng đúng 1 dòng import cũ, thực tế %d" % s.count(OLD_IMP)
    s = s.replace(OLD_IMP, NEW_IMP, 1)
    changed.append("import")

assert "_file_guard" not in s, "còn tham chiếu _file_guard"
ast.parse(s)
if changed:
    open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
    print("đã vá main.py:", ", ".join(changed), "(đã kiểm tra cú pháp)")
else:
    print("main.py đã ở bản file_note — bỏ qua")
PY

rollback() {
  echo "LỖI ở bước $1: ${2:-không rõ}"
  echo "--- log container gần nhất (trước khi khôi phục):"
  docker logs --tail 30 "$C" 2>&1 | cut -c1-200 | tail -30 || true
  echo "--- khôi phục main.py + aibot_filesafe.py + restart"
  cp -p "main.py.bak_pre_filenote_${TS}" main.py
  [ -f "aibot_filesafe.py.bak_pre_filenote_${TS}" ] && cp -p "aibot_filesafe.py.bak_pre_filenote_${TS}" aibot_filesafe.py || true
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

echo "== 5. Thử file_note thật trong container + bộ kiểm thử =="
docker exec -i "$C" python - <<'PY' || rollback 5 "file_note trả sai"
import aibot_filesafe as fs
n1 = fs.file_note({"has_file": False, "extracted_text": ""}, "[File] Nâng cấp AI-BOT.docx", "đọc tổng hợp nội dung file này cho chú nhé")
n2 = fs.file_note({"has_file": True, "extracted_text": "có nội dung thật"}, "[File] a.docx", "đọc file")
n3 = fs.file_note({}, "", "hôm nay tập mấy giờ")
assert n1.startswith(fs.NOTE_RULE) and "«Nâng cấp AI-BOT.docx»" in n1, "thiếu ngữ cảnh tệp"
assert n2 == "", "có nội dung mà vẫn thêm quy tắc"
assert n3 == fs.NOTE_RULE, "chat thường phải nhận cùng chỉ thị (AI tự bỏ qua), không phụ thuộc từ khóa"
print("file_note: không có nội dung → chỉ thị chống bịa (+ngữ cảnh tên tệp khi có trích dẫn); có nội dung → không thêm; không khóa theo từ khóa")
PY
docker exec -i -e HUB_DIR=/app "$C" python -W ignore - < /tmp/test_filesafe.py > /tmp/test_filesafe.out 2>&1 && tail -3 /tmp/test_filesafe.out || { tail -20 /tmp/test_filesafe.out; rollback 5 "bộ kiểm thử aibot_filesafe lỗi trong container"; }
rm -f /tmp/test_filesafe.py /tmp/test_filesafe.out

echo "== 6. Commit git cục bộ =="
git add aibot_filesafe.py main.py 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "file note: chỉ thị AI tự trả lời tự nhiên, không khóa từ khóa (thay guard cố định)"
echo "commit: $(git log --oneline -1 | cut -c1-70)"
echo "=== xong: AI tự trả lời tự nhiên khi không có nội dung file; vẫn ghi cấu trúc sự kiện tệp ==="
exit 0
