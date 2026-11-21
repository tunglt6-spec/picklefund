#!/usr/bin/env bash
# CHỈ ĐỌC. Log nginx định dạng mới (scheme://host) trong 40 phút: đếm theo scheme://host+mã (mọi đường dẫn, bỏ máy quét),
# và IP nguồn của các yêu cầu http:// (ẩn 1 octet cuối) để biết do client hay do lớp trung gian.
set -uo pipefail
L=$(docker logs --since 40m picklefund-nginx 2>&1 | grep -E ' https?://[^ ]+ "[A-Z]+ ' | grep -vE 'opendir|zgrab|nmap|Go-http|scanner|curl/')
echo "== đếm theo scheme://host + mã =="
echo "$L" | sed -E 's/^.* (https?:\/\/[^ ]+) "[A-Z]+ [^"]*" ([0-9]{3}) .*$/\1 \2/' | sort | uniq -c | sort -rn | head -20
echo "== IP nguồn các yêu cầu http:// (ẩn octet cuối) =="
echo "$L" | grep -E ' http://' | awk '{print $1}' | sed -E 's/\.[0-9]+$/.x/' | sort | uniq -c | sort -rn | head -8
echo "== 5 yêu cầu https:// gần nhất =="
echo "$L" | grep -E ' https://' | tail -5 | cut -c1-200
exit 0
