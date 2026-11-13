#!/usr/bin/env bash
# CHỈ ĐỌC. Mẫu dựng thẻ lịch nhắc ở widget Tổng quan + hàm toggleTaskStatus/api dashboard trả gì cho reminders_today/my_tasks.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
sed -n '9396,9420p' "$F" | cut -c1-260
echo "##### dashboard stats: reminders_today / my_tasks lấy từ"
grep -n "reminders_today\|\"my_tasks\"\|my_tasks" main.py | cut -c1-170 | head
exit 0
