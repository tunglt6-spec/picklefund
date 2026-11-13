#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Đặt lịch tự kiểm Zalo Hub (user đã duyệt 2026-11-13): /etc/cron.d/ai-bot-hub-selfcheck, mỗi 10 phút, chạy hub_selfcheck.sh.
# Script tự kiểm chỉ ĐỌC (grep main.py, curl localhost) và chỉ ghi data/hub_selfcheck.log khi đổi trạng thái. Gỡ: rm /etc/cron.d/ai-bot-hub-selfcheck
set -euo pipefail
[ -x /opt/ai-bot-saas/hub_selfcheck.sh ] || { echo "thiếu hub_selfcheck.sh — chạy rw-ai-bot-hub-harden.sh trước"; exit 1; }
echo '*/10 * * * * root /opt/ai-bot-saas/hub_selfcheck.sh' > /etc/cron.d/ai-bot-hub-selfcheck
chmod 644 /etc/cron.d/ai-bot-hub-selfcheck
echo "cron đã đặt:"; cat /etc/cron.d/ai-bot-hub-selfcheck
systemctl is-active cron 2>/dev/null || systemctl is-active crond 2>/dev/null || echo "CẢNH BÁO: dịch vụ cron không active"
echo "=== xong ==="
exit 0
