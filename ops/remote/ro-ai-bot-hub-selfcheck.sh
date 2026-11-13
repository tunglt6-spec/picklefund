#!/usr/bin/env bash
# CHỈ ĐỌC. Lịch sử đổi trạng thái của tự kiểm Zalo Hub + cron có mặt không.
set -uo pipefail
echo "== cron =="; cat /etc/cron.d/ai-bot-hub-selfcheck 2>/dev/null || echo "CHƯA có cron"
echo "== log tự kiểm (20 dòng cuối) =="; tail -20 /opt/ai-bot-saas/data/hub_selfcheck.log 2>/dev/null || echo "chưa có log"
exit 0
