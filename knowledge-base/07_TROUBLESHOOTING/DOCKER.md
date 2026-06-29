# Troubleshooting: Docker — PickleFund

> **Mục đích:** Ghi lại các sự cố Docker đã gặp và cách fix  
> **Đối tượng:** DevOps, Developer

---

## Vấn đề 1: docker compose config fail vì thiếu .env

### Triệu chứng
```
failed to load config from .env: open .env: no such file or directory
```

### Nguyên nhân
`docker-compose.yml` dùng `env_file: .env` yêu cầu file `.env` phải tồn tại. Trên máy dev hoặc CI khi dùng `--env-file .env.example`, file `.env` không tồn tại → fail.

### Fix
Dùng Docker Compose V2 syntax với `required: false`:

```yaml
# ✅ ĐÚNG — không bắt buộc file tồn tại
services:
  postgres:
    env_file:
      - path: .env
        required: false

  backend:
    env_file:
      - path: .env
        required: false

# ❌ SAI — bắt buộc file phải tồn tại
  backend:
    env_file: .env
```

### Verify
```bash
docker compose --env-file .env.example config
# Kỳ vọng: in ra config đầy đủ, không có lỗi
```

---

## Vấn đề 2: Container crash loop

### Triệu chứng
Container restart liên tục, trạng thái `Restarting`.

### Debug
```bash
# Xem logs của container crash
docker compose logs backend --tail=50
docker compose logs postgres --tail=50

# Xem exit code
docker compose ps
```

### Nguyên nhân thường gặp
- Backend: `DATABASE_URL` sai hoặc PostgreSQL chưa ready
- PostgreSQL: volume permissions issue
- Nginx: cert file không tồn tại

---

## Vấn đề 3: Docker build slow / cache stale

### Triệu chứng
Build mất > 10 phút, hoặc thay đổi code không được apply.

### Fix
```bash
# Force rebuild không dùng cache
docker compose build --no-cache

# Xóa cache cũ
docker builder prune

# Rebuild image cụ thể
docker compose build --no-cache backend
```

---

## Vấn đề 4: Hết dung lượng ổ cứng

### Triệu chứng
```
no space left on device
```

### Fix
```bash
# Xem dung lượng Docker
docker system df

# Xóa images không dùng
docker image prune -a

# Xóa build cache
docker builder prune

# Xóa backup SQL cũ
find /opt/picklefund/backups/ -name "*.sql" -mtime +7 -delete
```

---

## Vấn đề 5: Port conflict

### Triệu chứng
```
Bind for 0.0.0.0:443 failed: port is already allocated
```

### Fix
```bash
# Tìm process dùng port
lsof -i :443
# hoặc
ss -tulpn | grep :443

# Dừng service conflict
docker compose down
# hoặc kill process cụ thể
```

---

## Lệnh Docker hữu ích

```bash
# Xem logs realtime
docker compose logs -f backend

# Kết nối vào container
docker compose exec backend sh
docker compose exec postgres psql -U picklefund

# Xem resource usage
docker stats --no-stream

# Restart 1 service
docker compose restart backend
```
