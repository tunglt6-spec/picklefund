#!/usr/bin/env bash
# CHỈ ĐỌC. In đoạn HTML menu tài khoản Super Admin (static/index.html dòng 1960-2010) để vá nút Đổi Mật Khẩu.
set -uo pipefail
F=/opt/ai-bot-saas/static/index.html
sed -n 1960,2010p "$F" | cut -c1-240
echo "=== xong ==="
exit 0
