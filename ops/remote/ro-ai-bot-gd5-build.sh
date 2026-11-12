#!/usr/bin/env bash
# CHỈ ĐỌC. Hiện trạng để dựng image AI-BOT: compose, Dockerfile, requirements, gói pip đang có trong container.
set -uo pipefail
cd /opt/ai-bot-saas || exit 0
echo "== compose =="; sed -E 's/^([[:space:]]*-?[[:space:]]*[A-Za-z_]*(KEY|TOKEN|SECRET|PASS)[A-Za-z_]*[[:space:]]*[:=]).*/\1 <che>/I' docker-compose.yml | head -50
echo "== Dockerfile =="; ls Dockerfile* 2>/dev/null; cat Dockerfile 2>/dev/null | head -40
echo "== requirements.txt =="; cat requirements.txt 2>/dev/null | head -40
echo "== image/container =="; docker inspect maika-saas-engine --format 'image={{.Config.Image}} cmd={{.Config.Cmd}} entry={{.Config.Entrypoint}} restart={{.HostConfig.RestartPolicy.Name}}'
echo "== gói pip trong container (quan trọng) =="
docker exec maika-saas-engine pip list 2>/dev/null | grep -i -E "markitdown|docx|pymupdf|jwt|cryptography|fastapi|uvicorn|httpx|pydantic|weasy" 
echo "== cloudflared =="; ps aux | grep -i cloudflared | grep -v grep | sed -E 's/--token [^ ]+/--token <che>/' | cut -c1-180
systemctl list-units --type=service 2>/dev/null | grep -i -E "cloudflared|tunnel" | head
echo "== đĩa =="; df -h / | tail -1
exit 0
