#!/usr/bin/env bash
# CHỈ ĐỌC. Dạng dòng khóa viết cứng (che giá trị) để chuyển sang biến môi trường.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
for n in 181 4683; do echo "--- dòng $n ---"; sed -n "$((n-2)),$((n+2))p" main.py | sed -E 's/(["'"'"'])[A-Za-z0-9_:.\-]{12,}(["'"'"'])/\1<che>\2/g' | cut -c1-150; done
echo "--- các chỗ dùng tên biến ---"
grep -n -E "^[A-Z_]*(KEY|TOKEN|SECRET)[A-Z_]* *=" main.py | sed -E 's/(["'"'"'])[A-Za-z0-9_:.\-]{12,}(["'"'"'])/\1<che>\2/g' | cut -c1-140
echo "--- env_file / environment trong compose: đã có? ---"; grep -c env_file docker-compose.yml
exit 0
