#!/usr/bin/env bash
# CHỈ ĐỌC. Đường tạo nhiệm vụ/lịch nhắc từ TIN NHẮN (bot @mention): nơi INSERT, parser ý định, chỉ thị cho AI, xử lý lặp lại.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
red() { sed -E 's/(sk-|AIza)[A-Za-z0-9_-]{12,}/<che>/g' | cut -c1-210; }
echo "== mọi INSERT vào skill_reminders / skill_tasks =="
grep -n -E "INSERT (OR [A-Z]+ )?INTO skill_(reminders|tasks)" main.py | cut -c1-120
echo "== từ khóa lặp lại / ý định trong tin nhắn =="
grep -n -i -E "hàng tuần|hang tuan|hàng tháng|hàng năm|mỗi tuần|moi tuan|mỗi tháng|recurrence|weekdays|thu_2_den_thu_6|SET_REMINDER|CREATE_TASK|\[REMIND|\"action\": *\"(remind|task)" main.py | red | head -60
echo "== hàm xử lý kỹ năng từ chat =="
grep -n -E "^(async )?def .*(skill|intent|reminder|task|schedule)[a-z_]*\(" main.py | red | head -40
exit 0
