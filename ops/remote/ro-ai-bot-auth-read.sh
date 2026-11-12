#!/usr/bin/env bash
# CHỈ ĐỌC. Đọc phần xác thực của AI-BOT để viết bản vá đăng nhập. Chuỗi trong dòng có từ khóa mật khẩu bị che.
set -uo pipefail
M=/opt/ai-bot-saas/main.py
mask() { sed -E '/([Pp]ass|admin|123456|secret)/ s/"[^"]{2,}"/"<str>"/g; /([Pp]ass|admin|123456|secret)/ s/'"'"'[^'"'"']{2,}'"'"'/'"'"'<str>'"'"'/g'; }
sec() { printf '\n===== %s =====\n' "$1"; }

sec "Seed người dùng mặc định (dòng 385-430)"
sed -n 385,430p "$M" | mask | cut -c1-170
sec "register + change-password (dòng 715-830)"
sed -n 715,830p "$M" | mask | cut -c1-170
sec "Mọi chỗ nhắc tới băm/đăng nhập/mật khẩu (số dòng + 90 ký tự đã che)"
grep -n -E 'sha256|password_hash|raw_p|admin123|is_first_login' "$M" | mask | cut -c1-120 | head -60
sec "Các file giao diện chứa form đăng nhập/mật khẩu mặc định gợi ý"
grep -n -i -E 'admin123|mật khẩu mặc định|default password|123456' /opt/ai-bot-saas/static/*.html 2>/dev/null | mask | cut -c1-140 | head -20
sec "Số người dùng theo vai trò (không in tên)"
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -20
import sqlite3
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
print(list(c.execute("select role, count(*), sum(is_first_login) from users group by role")))
print("độ dài băm:", sorted({len(r[0] or '') for r in c.execute("select password_hash from users")}))
PY
echo "=== xong ==="
exit 0
