#!/usr/bin/env bash
# CHỈ ĐỌC. Các request gần đây vào /api/hub/v1 (phương thức, đường dẫn đã che id, mã HTTP) + đăng nhập AI-BOT. Không in nội dung.
set -uo pipefail
echo "== hub API (200 dòng log gần nhất chứa hub/v1) =="
docker logs --since 3h maika-saas-engine 2>&1 | grep -E '"(GET|POST|DELETE) /api/hub/v1' | sed -E 's/(lnk_|hak_)[A-Za-z0-9_-]+/\1<id>/g; s/bot_[a-z0-9]+/bot_<id>/g' | tail -30
echo "== đăng nhập AI-BOT =="
docker logs --since 3h maika-saas-engine 2>&1 | grep -E '"POST /api/auth/login' | tail -5
echo "== lỗi [HUB] =="
docker logs --since 3h maika-saas-engine 2>&1 | grep -i "\[HUB\]" | tail -5
exit 0
