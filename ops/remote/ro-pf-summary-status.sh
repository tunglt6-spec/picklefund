#!/usr/bin/env bash
# CHỈ ĐỌC. Mã trả về của /api/fund-periods/*/summary trong log nginx + log API quanh các lỗi 4xx/5xx (không ghi token).
set -uo pipefail
echo "== nginx: fund-periods summary (mã, số lượng, 6h gần nhất) =="
docker logs --since 6h picklefund-nginx 2>&1 | grep -E 'fund-periods/[^ ]*/summary' | grep -oE '" [0-9]{3} ' | sort | uniq -c
echo "== 12 dòng gần nhất (đã bỏ query/IP) =="
docker logs --since 6h picklefund-nginx 2>&1 | grep -E 'fund-periods/[^ ]*/summary' | tail -12 | sed -E 's/^[0-9.]+ - - //; s/\?[^ ]*//' | cut -c1-200
echo "== mọi 5xx /api trong 6h =="
docker logs --since 6h picklefund-nginx 2>&1 | grep -E '" 5[0-9]{2} ' | tail -10 | sed -E 's/^[0-9.]+ - - //; s/\?[^ ]*//' | cut -c1-200
echo "== api: log 6h có 'summary' hoặc 'Exception' =="
docker logs --since 6h picklefund-api 2>&1 | grep -iE 'summary|exception|prisma' | grep -v Hermes | tail -12 | cut -c1-240
exit 0
