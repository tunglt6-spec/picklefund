# Troubleshooting: Database — PickleFund

> **Mục đích:** Ghi lại các sự cố database đã gặp và cách xử lý  
> **Đối tượng:** DevOps, Developer

---

## Vấn đề 1: pg_dump không load được credentials

### Triệu chứng
```
pg_dump: error: connection to server failed: FATAL: password authentication failed
```

### Nguyên nhân
Script deploy gọi `pg_dump -U "$POSTGRES_USER"` nhưng biến `$POSTGRES_USER` không được load từ `.env`.

### Fix
Thêm `set -a; source .env; set +a` trước lệnh pg_dump:

```bash
# Load env variables không echo ra stdout
set -a
[ -f "$REPO_DIR/.env.production" ] && source "$REPO_DIR/.env.production"
[ -f "$REPO_DIR/.env" ] && source "$REPO_DIR/.env"
set +a

# Bây giờ $POSTGRES_USER và $POSTGRES_DB đã có giá trị
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"
```

---

## Vấn đề 2: Backup SQL rỗng (0 bytes)

### Triệu chứng
File backup tạo ra nhưng size = 0.

### Nguyên nhân
- PostgreSQL container chưa `(healthy)` khi chạy pg_dump
- Credentials sai → pg_dump fail silently

### Fix trong Pipeline V2
```bash
# Kiểm tra backup không rỗng
if [ ! -s "$BACKUP_FILE" ]; then
    echo "Backup failed — aborting deploy"
    exit 1
fi
```

### Kiểm tra thủ công
```bash
ls -lh /opt/picklefund/backups/
# File phải > 0 bytes
```

---

## Vấn đề 3: Database connection refused

### Triệu chứng
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Nguyên nhân thường gặp
1. PostgreSQL container chưa healthy
2. `DATABASE_URL` sai host (dùng `localhost` thay vì `postgres` trong Docker)

### Fix
```bash
# Kiểm tra container
docker compose ps postgres
# Phải thấy: (healthy)

# Kiểm tra DATABASE_URL trong .env
# Trong Docker container: DATABASE_URL=postgresql://...@postgres:5432/...
# Local dev:              DATABASE_URL=postgresql://...@localhost:5432/...

# Chờ postgres healthy
docker compose up postgres -d
sleep 15
docker compose ps postgres
```

---

## Vấn đề 4: Prisma migration fail

### Triệu chứng
```
Error: P3009 migrate found failed migrations
```

### Fix
```bash
# Xem trạng thái migrations
docker compose exec backend npx prisma migrate status

# Deploy pending migrations
docker compose exec backend npx prisma migrate deploy

# EMERGENCY — reset (chỉ dùng trên dev, XÓA DỮ LIỆU)
# docker compose exec backend npx prisma migrate reset
```

---

## Vấn đề 5: Restore database từ backup

### Quy trình restore
```bash
BACKUP_FILE="backups/picklefund_20260629_143022.sql"

# Dừng backend để tránh write trong khi restore
docker compose stop backend

# Restore
docker compose exec -T postgres psql -U picklefund -d picklefund < "$BACKUP_FILE"

# Khởi động lại backend
docker compose start backend

# Verify
curl -sf https://api.picklefund.uk/health
```

Xem chi tiết tại [05_OPERATIONS/RESTORE.md](../05_OPERATIONS/RESTORE.md).
