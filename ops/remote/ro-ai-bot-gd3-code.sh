#!/usr/bin/env bash
# CHỈ ĐỌC. Trích đoạn mã AI-BOT cần cho GĐ3 (đăng nhập, tạo/liệt kê bot, trình tạo bot + thẻ bot trong index.html).
# Không in dòng có từ khóa nhạy cảm; cắt 220 ký tự/dòng.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
show() { sed -n "$1,$2p" main.py | grep -viE 'password_hash|sha256\(|api_key|secret|sk-' | cut -c1-220; }
echo "##### main.py 763-800 (đăng nhập)"; show 763 800
echo "##### main.py 1144-1232 (tạo/liệt kê bot)"; show 1144 1232
echo "##### index.html: khóa mẫu / tạo bot / thẻ bot"
H=static/index.html; wc -l $H
grep -nE "BOT_TEMPLATES|thethao|CLB &|CLB &amp;|function (render|open|create|save|show)[A-Za-z]*(Bot|Wizard|Modal|Card)[A-Za-z]*|api/bots|api/auth/login|localStorage\.setItem|Authorization" $H | cut -c1-200 | head -70
echo "=== xong ==="
exit 0
