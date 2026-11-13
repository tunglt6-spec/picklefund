#!/usr/bin/env bash
# CHỈ ĐỌC. HTML 4 thẻ "Thống kê sử dụng" của khách hàng + JS gán số/kích thước chữ.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
echo "##### dòng 2516-2580"; sed -n '2516,2580p' "$F" | cut -c1-250
echo "##### JS gán stat-usage"; grep -n "stat-usage\|stat-mem\|stat-remind\|stat-task\|elUsageVal\|elUsageLabel" "$F" | cut -c1-220 | head -30
n=$(grep -n "elUsageLabel.textContent" "$F" | head -1 | cut -d: -f1); [ -n "$n" ] && { echo "##### dòng $((n-30))-$((n+25))"; sed -n "$((n-30)),$((n+25))p" "$F" | cut -c1-230; }
exit 0
