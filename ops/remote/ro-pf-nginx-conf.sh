#!/usr/bin/env bash
# CHỈ ĐỌC. Cấu hình nginx ĐANG CHẠY: server_name / listen / return 30x (không in khóa, không in nội dung chứng chỉ).
set -uo pipefail
docker exec picklefund-nginx nginx -T 2>/dev/null | grep -nE '^\s*(server_name|listen|return 30|location|log_format|access_log|include) ' | cut -c1-170 | head -90
echo "== thử từ trong host =="
for h in picklefund.vn www.picklefund.vn api.picklefund.uk app.picklefund.uk; do
  printf '%s 443 /api/x -> ' "$h"; curl -sk -m 8 -o /dev/null -w '%{http_code}\n' --resolve "$h:443:127.0.0.1" "https://$h/api/x"
  printf '%s 80  /api/x -> ' "$h"; curl -s -m 8 -o /dev/null -w '%{http_code} %{redirect_url}\n' -H "Host: $h" http://127.0.0.1/api/x
done
exit 0
