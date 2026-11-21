#!/usr/bin/env bash
# CHỈ ĐỌC. Log nginx (scheme://host) 90 phút: yêu cầu /api/ của thiết bị Android + đếm theo scheme/host/mã.
set -uo pipefail
L=$(docker logs --since 90m picklefund-nginx 2>&1 | grep -E ' https?://[^ ]+ "[A-Z]+ ' | grep -vE 'opendir|zgrab|nmap|Go-http|scanner|curl/')
echo "== đếm theo scheme://host + mã (mọi thiết bị) =="
echo "$L" | sed -E 's/^.* (https?:\/\/[^ ]+) "[A-Z]+ [^"]*" ([0-9]{3}) .*$/\1 \2/' | sort | uniq -c | sort -rn | head -12
echo "== Android: /api/ (30 dòng cuối, bỏ IP) =="
echo "$L" | grep -E 'Android' | grep -E '"[A-Z]+ /api/' | tail -30 | sed -E 's/^[0-9a-f.:]+ //; s/"Mozilla.*$//' | cut -c1-170
echo "== Android: đếm mã =="
echo "$L" | grep -E 'Android' | grep -E '"[A-Z]+ /api/' | sed -E 's/^.* (https?:\/\/[^ ]+) "[A-Z]+ [^"]*" ([0-9]{3}) .*$/\1 \2/' | sort | uniq -c
exit 0
