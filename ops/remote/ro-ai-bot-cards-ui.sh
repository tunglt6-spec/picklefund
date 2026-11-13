#!/usr/bin/env bash
# CHỈ ĐỌC. Mã dựng thẻ Lịch nhắc / Nhiệm vụ (widget Tổng quan + modal "Xem tất cả") và vài hàm phụ.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-260; }
n=$(grep -n "const remContainer\|remindersContainer\|widget-reminders-list" "$F" | head -3 | cut -d: -f1 | head -1); echo "mốc widget lịch nhắc dòng: $n"
sed -n "$((n-4)),$((n+34))p" "$F" | red
echo "##### widget nhiệm vụ (dòng 9418-9432)"; sed -n '9418,9432p' "$F" | red
echo "##### modal Xem tất cả: 9722-9800"; sed -n '9722,9800p' "$F" | red
echo "##### hàm tiện ích/ghi chú"; grep -n -E "function (openModal|closeModal|showToast|loadDashboardStats|populateFullRemindersTasksModal|refreshData)\b|id=\"(full-reminders|full-tasks)[a-z-]*\"|confirm-modal|function .*[Cc]onfirm" "$F" | cut -c1-170 | head -20
exit 0
