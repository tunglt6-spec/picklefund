#!/usr/bin/env bash
# CHỈ ĐỌC. Bản đồ mã AI-BOT cho GĐ3: nơi đăng nhập trả phiên, nơi dựng thẻ bot/trình tạo bot, linked_groups, nơi lưu nhóm.
# Chỉ in số dòng + tên hàm/route + đoạn ngắn (đã cắt 150 ký tự), không in khóa/mật khẩu.
set -uo pipefail
AB=/opt/ai-bot-saas
cd "$AB" || exit 0
echo "== tệp giao diện =="; ls -la --time-style=+%F "$AB" | awk '{print $5, $6, $7}' | grep -Ei "html|js$|css|static|templates" | head -20
for d in static templates public; do [ -d "$d" ] && { echo "-- $d:"; ls "$d" | head -20; }; done
echo "== route đăng nhập / phiên =="
grep -nE '@app\.(post|get)\("(/api)?/(auth|login|logout|me|session)[^"]*"' main.py | cut -c1-150 | head -20
grep -nE 'def (login|api_login|auth_login)|localStorage\.(set|get)Item\(' main.py | grep -vi "password\|secret\|key" | cut -c1-150 | head -30
echo "== route bot / nhóm =="
grep -nE '@app\.(post|get|put|delete)\("[^"]*(bots?|groups?|linked)[^"]*"' main.py | cut -c1-150 | head -40
echo "== linked_groups / template_key =="
grep -nE 'linked_groups|template_key' main.py | cut -c1-150 | head -50
echo "== trình tạo bot (wizard) / thẻ bot =="
grep -nEi 'wizard|step[0-9 ]*[:=]|createBot|renderBotCard|bot-card|botCard|CLB (&|&amp;) Thể' main.py | cut -c1-150 | head -40
echo "== kích thước main.py =="; wc -l main.py
echo "=== xong ==="
exit 0
