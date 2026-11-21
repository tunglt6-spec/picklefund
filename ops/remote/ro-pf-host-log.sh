#!/usr/bin/env bash
# CHỈ ĐỌC. Log nginx định dạng mới (scheme://host) cho /api/ trong 20 phút: đếm theo host+mã, và các dòng 308/4xx/5xx.
set -uo pipefail
L=$(docker logs --since 20m picklefund-nginx 2>&1 | grep -E 'https?://[^ ]+ "[A-Z]+ /api/' | grep -vE 'opendir|zgrab|nmap|Go-http')
echo "== đếm theo host + mã =="
echo "$L" | awk '{print $4, $(NF-3)}' | sort | uniq -c | sort -rn | head -20
echo "== 12 dòng lỗi/chuyển hướng gần nhất =="
echo "$L" | grep -E '" (30[0-9]|4[0-9]{2}|5[0-9]{2}) ' | tail -12 | cut -c1-230
exit 0
