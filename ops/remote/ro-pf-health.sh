#!/usr/bin/env bash
# CHỈ ĐỌC. Sức khỏe PickleFund: container, đĩa, RAM, log lỗi backend/postgres gần đây (che khóa).
set -uo pipefail
red() { sed -E 's/(sk-|AIza|eyJ)[A-Za-z0-9_.-]{12,}/<che>/g' | cut -c1-240; }
echo "== df =="; df -h / | tail -1
echo "== free =="; free -m | sed -n 1,2p
echo "== containers =="; docker ps -a --format '{{.Names}}  {{.Status}}' | head -20
for c in $(docker ps -a --format '{{.Names}}' | grep -iE 'backend|api|postgres|db' | head -4); do
  echo "== log $c (60 phút, lỗi) =="
  docker logs --since 60m "$c" 2>&1 | grep -iE 'error|exception|fail|ECONN|timeout|denied|no space|P20|P10' | tail -15 | red
done
echo "== summary http (nội bộ) =="
for c in $(docker ps --format '{{.Names}}' | grep -iE 'backend|api' | head -1); do
  docker exec "$c" sh -c 'wget -qO- -T 5 http://127.0.0.1:3000/api/health 2>&1 || wget -qO- -T 5 http://127.0.0.1:3000/health 2>&1' | head -c 300
done
echo
exit 0
