#!/usr/bin/env bash
# CHỈ ĐỌC. Log các lệnh PUT/DELETE /api/skills/* gần đây của AI-BOT (không có nội dung body).
set -uo pipefail
docker logs --since 40m maika-saas-engine 2>&1 | grep -E '"(PUT|DELETE) /api/skills|Traceback|Error' | tail -25 | cut -c1-220
exit 0
