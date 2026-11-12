#!/usr/bin/env bash
# CHỈ ĐỌC. Thống kê log "zalo-secret-audit" theo bot (ok / has_header) từ log container.
set -uo pipefail
docker logs maika-saas-engine 2>&1 | grep -o "zalo-secret-audit bot=[^ ]* ok=[A-Za-z]* has_header=[A-Za-z]*" | sort | uniq -c | sort -rn | head -30
echo "=== xong ==="
exit 0
