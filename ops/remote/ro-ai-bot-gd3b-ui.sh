#!/usr/bin/env bash
# CHỈ ĐỌC. Trích static/index.html quanh modal tạo bot, thẻ bot (nút Cấu Hình Bot) và modal cấu hình bot để đưa tùy chọn PickleFund vào đúng chỗ.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
show() { echo "##### $1 (dòng $2-$3)"; sed -n "$2,$3p" "$F" | cut -c1-230; }
a=$(grep -n 'id="create-bot-modal"' "$F" | head -1 | cut -d: -f1); echo "create-bot-modal ở dòng $a"
show "create-bot-modal" "$a" "$((a+140))"
echo "##### vị trí các hàm/nút"
grep -n -E "Cấu Hình Bot|openBotConfig|function openBotSettings|function selectPlatform|selectedPlatform *=|id=\"bot-config-modal\"|function openEditBot|function saveBotConfig|id=\"edit-bot-modal\"" "$F" | cut -c1-200 | head -30
exit 0
