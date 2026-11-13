#!/usr/bin/env bash
# CHỈ ĐỌC. Cách dựng reminders_list / tasks_list của /api/dashboard/stats.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-230; }
sed -n '5960,5999p' main.py | red
echo "#####"
sed -n '6036,6075p' main.py | red
exit 0
