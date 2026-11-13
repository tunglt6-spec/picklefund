#!/usr/bin/env bash
# CHỈ ĐỌC. Model Task/Reminder, compute_next_recurrence_utc, JS modal tạo nhanh, hiển thị danh sách (che khóa).
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-200; }
for pat in "class TaskCreateReq" "class ReminderCreateReq" "def compute_next_recurrence_utc" "def format_utc_to_vn_badge"; do
  n=$(grep -n "$pat" main.py | head -1 | cut -d: -f1); [ -n "$n" ] && { echo "##### main.py $pat ($n)"; sed -n "$n,$((n+38))p" main.py | red; }
done
F=static/index.html
sec() { echo "##### index.html $1-$2"; sed -n "$1,$2p" "$F" | red; }
sec 9364 9378
sec 9425 9445
sec 9785 9800
sec 9912 9925
sec 9976 10260
echo "##### đã có UI lặp lại chưa?"; grep -n -i "recurrence\|lặp lại" "$F" | cut -c1-160 | head -20
exit 0
