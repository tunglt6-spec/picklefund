#!/usr/bin/env bash
# CHỈ ĐỌC. In repr() các dòng quanh neo vá của list_bots (khoảng trắng/ký tự ẩn). Không chứa dữ liệu nhạy cảm.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
python3 - <<'PY'
s = open("main.py", encoding="utf-8").read()
a = s.index("async def list_bots(")
seg = s[a:s.index("\n@app.", a)]
i = seg.index("rows = c.fetchall()")
print(repr(seg[i - 20:i + 120]))
j = seg.index('"webhook_url"')
print(repr(seg[j - 40:j + 110]))
print("CRLF trong main.py:", "\r\n" in s)
PY
echo "=== xong ==="
exit 0
