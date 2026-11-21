#!/usr/bin/env bash
# CHỈ ĐỌC. Log nginx (scheme://host) 40 phút: các yêu cầu /api/ liên quan thu quỹ / kỳ quỹ / tổng quan của thiết bị Android (kèm mã trả về, bỏ IP).
set -uo pipefail
L=$(docker logs --since 40m picklefund-nginx 2>&1 | grep -E ' https?://[^ ]+ "[A-Z]+ ' | grep -E 'Android')
echo "== Android: contributions / fund-periods / summary (mọi mã) =="
echo "$L" | grep -E '"[A-Z]+ /api/(contributions|fund-periods|clubs/me)' | sed -E 's/^[0-9a-f.:]+ //; s/"Mozilla.*$//' | cut -c1-190 | tail -40
echo "== đếm mã theo đường dẫn =="
echo "$L" | grep -E '"[A-Z]+ /api/(contributions|fund-periods)' | sed -E 's#/[0-9a-f]{8}-[0-9a-f-]{27}#/:id#g; s/^.*"([A-Z]+ [^ ]+) HTTP[^"]*" ([0-9]{3}) .*$/\1 \2/' | sort | uniq -c
exit 0
