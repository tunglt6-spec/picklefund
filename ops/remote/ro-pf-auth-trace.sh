#!/usr/bin/env bash
# CHỈ ĐỌC. Dấu vết đăng nhập/refresh + các API chính của app (mã trả về), 3 giờ gần nhất. Bỏ IP/query.
set -uo pipefail
L=$(docker logs --since 3h picklefund-nginx 2>&1 | grep -vE 'opendir|zgrab|nmap|Go-http|redfish|\.git|phpinfo' | sed -E 's/^[0-9a-f.:]+ - [^ ]* //; s/\?[^ ]*//')
echo "== đếm theo (đường dẫn rút gọn, mã) =="
echo "$L" | grep -E '"(GET|POST|PUT|PATCH|DELETE) /api/' | sed -E 's#/[0-9a-f]{8}-[0-9a-f-]{27}#/:id#g' | awk '{print $6, $8}' | sed 's/"//' | sort | uniq -c | sort -rn | head -30
echo "== auth/* =="
echo "$L" | grep -E '/api/auth/' | tail -12 | cut -c1-210
echo "== host khác picklefund.vn (api.picklefund.uk...) =="
docker logs --since 3h picklefund-nginx 2>&1 | grep -E '" 308 ' | grep -E '/api/' | tail -5 | sed -E 's/^[0-9a-f.:]+ - [^ ]* //; s/\?[^ ]*//' | cut -c1-220
exit 0
