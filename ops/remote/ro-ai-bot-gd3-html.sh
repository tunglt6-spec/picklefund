#!/usr/bin/env bash
# CHỈ ĐỌC. Trích đoạn index.html AI-BOT cho GĐ3: xử lý đăng nhập, vẽ danh sách bot/thẻ bot, mẫu bot + tạo bot. Lọc dòng nhạy cảm, cắt 230 ký tự.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
H=static/index.html
show() { echo "##### $H $1-$2"; sed -n "$1,$2p" "$H" | grep -viE 'password|secret|api_key|sk-' | cut -c1-230; }
show 4296 4306; show 4326 4340
show 7180 7262
show 7464 7545
echo "=== xong ==="
exit 0
