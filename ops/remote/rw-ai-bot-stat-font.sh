#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). AI-BOT: thẻ "Token sử dụng" (khối Thống kê sử dụng) dùng cỡ chữ số nhỏ hơn 3 thẻ còn lại.
# Đổi số: text-base sm:text-lg lg:text-xl font-black → text-xl sm:text-2xl font-bold (giống Ghi nhớ/Lịch nhắc/Nhiệm vụ);
# nhãn: text-[10px] sm:text-[11px] → text-[11px]. Chỉ sửa static/index.html (không restart). Sao lưu; lỗi → khôi phục.
set -euo pipefail
AB=/opt/ai-bot-saas; TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
cp -p static/index.html "static/index.html.bak_pre_statfont_${TS}"
rollback() { echo "LỖI: $1 — KHÔI PHỤC"; cp -p "static/index.html.bak_pre_statfont_${TS}" static/index.html; exit 1; }
python3 - <<'PY' || rollback "vá thất bại"
import os
p = "/opt/ai-bot-saas/static/index.html"
t = open(p, encoding="utf-8").read()
pairs = [
 ('id="stat-usage-messages" class="text-base sm:text-lg lg:text-xl font-black text-slate-800 leading-none truncate"',
  'id="stat-usage-messages" class="text-xl sm:text-2xl font-bold text-slate-800 leading-none truncate"'),
 ('id="stat-usage-label" class="text-[10px] sm:text-[11px] font-bold text-slate-700 truncate mt-0.5"',
  'id="stat-usage-label" class="text-[11px] font-bold text-slate-700 truncate mt-0.5"'),
]
done = 0
for a, b in pairs:
    if a in t:
        assert t.count(a) == 1, "không duy nhất: " + a[:50]
        t = t.replace(a, b, 1); done += 1
    else:
        assert b in t, "không thấy cả bản cũ lẫn mới: " + a[:50]
open(p + ".new", "w", encoding="utf-8").write(t); os.replace(p + ".new", p)
print("đã sửa %d chỗ" % done)
PY
P=$(curl -s -m 10 http://127.0.0.1:4105/)
grep -qF 'id="stat-usage-messages" class="text-xl sm:text-2xl font-bold' <<<"$P" || rollback "trang chủ chưa có lớp mới"
[ "$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
echo "OK: số thẻ Token cùng cỡ với 3 thẻ còn lại"
git add static/index.html 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "ui: thẻ Token sử dụng cùng cỡ chữ với 3 thẻ thống kê còn lại"
echo "=== xong ==="
exit 0
