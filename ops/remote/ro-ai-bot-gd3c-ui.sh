#!/usr/bin/env bash
# CHỈ ĐỌC. Phần còn lại của modal tạo bot (nút gửi), footer thẻ bot, và modal cấu hình bot.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
F=static/index.html
show() { echo "##### $1 (dòng $2-$3)"; sed -n "$2,$3p" "$F" | cut -c1-200; }
show "cuối modal tạo bot" 3724 3790
show "footer thẻ bot" 7384 7406
oc=$(sed -n 7385,7402p "$F" | grep -o "onclick=\"[A-Za-z]*(" | head -3); echo "onclick trong footer: $oc"
fn=$(sed -n 7385,7402p "$F" | grep -o "onclick=\"[A-Za-z]*(" | grep -i -E "config|train|setting" | head -1 | sed 's/onclick="//; s/(//')
echo "hàm cấu hình: $fn"
n=$(grep -n "function $fn" "$F" | head -1 | cut -d: -f1); [ -n "$n" ] && show "hàm $fn" "$n" "$((n+45))"
m=$(grep -n 'id="bot-config-modal"\|id="config-bot-modal"\|id="edit-bot-modal"' "$F" | head -1 | cut -d: -f1); echo "modal cấu hình ở dòng: $m"
[ -n "$m" ] && show "modal cấu hình (đầu)" "$m" "$((m+40))"
exit 0
