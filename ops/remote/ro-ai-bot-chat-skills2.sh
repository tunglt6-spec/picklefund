#!/usr/bin/env bash
# CHỈ ĐỌC. Mã tạo lịch nhắc/nhiệm vụ từ tin nhắn chat (che khóa).
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-240; }
sec() { echo "##### main.py $1-$2"; sed -n "$1,$2p" main.py | red; }
sec 1822 1845
sec 2186 2260
sec 2360 2400
sec 2520 2640
exit 0
