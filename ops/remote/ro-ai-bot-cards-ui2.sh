#!/usr/bin/env bash
# CHỈ ĐỌC. JS dựng widget Lịch nhắc ở Tổng quan, hàm showSaasConfirmModal, phần cuối widget nhiệm vụ.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-250; }
echo "##### nơi gán widget-reminders-list"; grep -n "widget-reminders-list\|remContainer\b\|remindersContainer\|reminderContainer" "$F" | cut -c1-140 | head
n=$(grep -n "getElementById('widget-reminders-list')" "$F" | head -1 | cut -d: -f1)
[ -n "$n" ] && { echo "##### quanh $n"; sed -n "$((n-3)),$((n+6))p" "$F" | red; }
m=$(grep -n "r.recurrence\b\|const reminders = " "$F" | head -3 | cut -d: -f1 | head -1)
echo "##### showSaasConfirmModal"; sed -n '4651,4730p' "$F" | red
echo "##### cuối widget nhiệm vụ"; sed -n '9432,9446p' "$F" | red
exit 0
