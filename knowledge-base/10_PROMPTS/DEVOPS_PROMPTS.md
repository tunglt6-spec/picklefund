# DevOps Prompts — PickleFund

> **Mục đích:** Prompt chuẩn cho các task DevOps/Infrastructure  
> **Đối tượng:** DevOps, Claude Code

---

## Prompt 1: Fix pipeline issue

```
Bạn là Senior DevOps Engineer cho PickleFund.

Vấn đề pipeline: [MÔ TẢ VẤN ĐỀ]

File: .github/workflows/deploy.yml

Ràng buộc khi sửa:
- KHÔNG dùng git pull — chỉ git fetch + git reset --hard
- git clean PHẢI có: -e .env -e .env.production -e "*.sql" -e "ssl/"
- KHÔNG echo TELEGRAM_BOT_TOKEN
- Telegram messages PHẢI dùng printf '...\n...' không dùng literal newlines
- Load .env trước pg_dump: set -a; source .env; set +a
- Kiểm tra backup > 0 bytes trước khi tiếp tục
- KHÔNG sửa logic deploy ngoài scope fix
- KHÔNG commit, KHÔNG push
```

---

## Prompt 2: Debug Docker compose issue

```
Context PickleFund Docker:

docker-compose.yml chuẩn:
- env_file: path: .env, required: false (KHÔNG dùng env_file: .env)
- PostgreSQL: không expose port ra host
- Redis: không expose port ra host
- Nginx: expose :443 và :80

Vấn đề: [MÔ TẢ LỖI]
Output: [DÁN ERROR OUTPUT]

Kiểm tra:
1. docker compose ps
2. docker compose logs [service] --tail=50
3. docker compose config (xem config parsed)

Trả: nguyên nhân và fix cụ thể.
```

---

## Prompt 3: Thêm monitoring

```
Thêm monitoring cho PickleFund:

Hiện có: health check endpoint /health
Cần thêm: [MÔ TẢ MONITORING CẦN]

Ràng buộc:
- KHÔNG thay đổi logic app
- KHÔNG expose port database
- KHÔNG lưu secrets trong code
- KHÔNG commit
```

---

## Prompt 4: Setup VPS mới

```
Setup VPS mới cho PickleFund:

Checklist:
1. Cài Docker Engine: curl -fsSL https://get.docker.com | sh
2. Clone repo: git clone ... /opt/picklefund
3. Tạo .env.production từ .env.example
4. Tạo ssl/ với cert.pem và key.pem
5. Tạo thư mục backups/
6. docker compose build --no-cache
7. docker compose up -d
8. Chạy migrations: docker compose exec backend npx prisma migrate deploy
9. Health check: curl -sf https://api.picklefund.uk/health

Domains cần cấu hình DNS:
- app.picklefund.uk → IP VPS
- api.picklefund.uk → IP VPS

Thực hiện từng bước và báo kết quả.
```
