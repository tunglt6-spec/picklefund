#!/usr/bin/env bash
# CHỈ ĐỌC. Mã bộ lập lịch nhắc/nhiệm vụ, endpoint tạo/toggle/list và giao diện modal (che khóa).
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-210; }
sec() { echo "##### main.py $1-$2"; sed -n "$1,$2p" main.py | red; }
sec 4778 4830
sec 4956 4990
sec 5444 5760
sec 6060 6140
F=static/index.html
n=$(grep -n "Gợi ý mốc thời gian chuẩn" "$F" | head -1 | cut -d: -f1)
echo "##### index.html modal $((n-95))-$((n+80))"; sed -n "$((n-95)),$((n+80))p" "$F" | cut -c1-210
echo "##### index.html hàm liên quan"
grep -n -E "setQuickDeadline|function [A-Za-z]*(Quick|Deadline|Reminder|Task)[A-Za-z]*\(|id=\"(task|reminder|memory)-[a-z-]*\"" "$F" | cut -c1-170 | head -60
exit 0
