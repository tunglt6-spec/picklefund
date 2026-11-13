#!/usr/bin/env bash
# CHỈ ĐỌC. HTML 4 thẻ "Thống kê sử dụng" (Token / Ghi nhớ / Lịch đã nhắc / Nhiệm vụ hoàn thành) và nơi gán số.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
n=$(grep -n "Token sử dụng" "$F" | head -1 | cut -d: -f1); echo "Token sử dụng ở dòng $n; tất cả vị trí:"; grep -n "Token sử dụng\|Ghi nhớ (Mem0)\|Lịch đã nhắc (tháng)\|Nhiệm vụ hoàn thành" "$F" | cut -c1-160
s=$((n-14)); echo "##### dòng $s-$((n+75))"; sed -n "${s},$((n+75))p" "$F" | cut -c1-260
echo "##### nơi gán số"
grep -n "stat-tokens\|stat-memories\|stat-reminders\|stat-tasks\|usage-tokens" "$F" | cut -c1-200 | head -20
exit 0
