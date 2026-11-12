#!/usr/bin/env bash
# CHỈ ĐỌC. Tìm giao diện đổi mật khẩu của AI-BOT (static/index.html) và menu tài khoản của Super Admin.
# Chỉ in mã HTML/JS giao diện (vốn công khai khi truy cập trang), không in dữ liệu hay bí mật.
set -uo pipefail
F=/opt/ai-bot-saas/static/index.html
sec() { printf '\n===== %s =====\n' "$1"; }
sec "Vị trí các từ khóa"
grep -n -i -E 'change-password|changepassword|openChangePw|doi-mat-khau|Đổi mật khẩu|Đăng Xuất|function (logout|handleLogout|toggleUserMenu|toggleProfile)' "$F" | cut -c1-170 | head -50
sec "Các chỗ gọi /api/auth/change-password"
n=$(grep -n "/api/auth/change-password" "$F" | head -1 | cut -d: -f1)
[ -n "$n" ] && sed -n "$((n-28)),$((n+22))p" "$F" | cut -c1-190
sec "Menu tài khoản Super Admin: quanh chữ 'Đăng Xuất' (lần xuất hiện đầu và cuối)"
for k in 1 2 3; do
  m=$(grep -n -i 'Đăng Xuất' "$F" | sed -n "${k}p" | cut -d: -f1)
  [ -n "$m" ] && { echo "--- lần $k (dòng $m)"; sed -n "$((m-14)),$((m+6))p" "$F" | cut -c1-200; }
done
sec "Số dòng file"
wc -l "$F"
echo "=== xong ==="
exit 0
