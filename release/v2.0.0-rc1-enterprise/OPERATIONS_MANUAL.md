# Sổ tay Vận hành — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** DevOps, Admin kỹ thuật vận hành hàng ngày

---

## 1. Kiểm tra hệ thống hàng ngày

### 1.1 Kiểm tra services

```bash
cd /opt/picklefund
docker compose ps
```

Kết quả mong đợi — tất cả `Up (healthy)`:
```
NAME                   STATUS              PORTS
picklefund-db          Up (healthy)
picklefund-redis       Up (healthy)
picklefund-api         Up (healthy)
picklefund-proxy       Up
```

### 1.2 Kiểm tra health endpoints

```bash
curl -sf https://api.picklefund.uk/health && echo "✅ API OK" || echo "❌ API FAIL"
curl -sf https://app.picklefund.uk/ && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"
```

### 1.3 Kiểm tra dung lượng

```bash
# Ổ cứng tổng
df -h /opt/picklefund

# Dung lượng backup
du -sh /opt/picklefund/backups/

# Docker volumes
docker system df
```

---

## 2. Xem logs

### Backend logs
```bash
docker compose logs backend --tail=100
docker compose logs backend --tail=100 --follow  # Realtime
```

### Nginx logs
```bash
docker compose logs nginx --tail=50
```

### Database logs
```bash
docker compose logs postgres --tail=50
```

### Lọc lỗi trong logs
```bash
docker compose logs backend --tail=500 | grep -i error
docker compose logs backend --tail=500 | grep -i "exception"
```

---

## 3. Khởi động lại services

### Khởi động lại một service cụ thể
```bash
docker compose restart backend
docker compose restart nginx
docker compose restart postgres
```

### Khởi động lại toàn bộ
```bash
docker compose down && docker compose up -d
```

> ⚠️ **Không dùng `docker compose restart` cho PostgreSQL** khi đang có transaction đang chạy — dùng `docker compose stop postgres && docker compose start postgres`.

---

## 4. Quản lý backup

### Tạo backup thủ công
```bash
cd /opt/picklefund
source .env
BACKUP_FILE="backups/picklefund_manual_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"
echo "Backup: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"
```

### Dọn dẹp backup cũ
```bash
# Xóa backup cũ hơn 30 ngày
find /opt/picklefund/backups/ -name "*.sql" -mtime +30 -delete

# Xem danh sách backup còn lại
ls -lh /opt/picklefund/backups/ | sort
```

### Restore từ backup
```bash
BACKUP_FILE="backups/picklefund_YYYYMMDD_HHMMSS.sql"
docker compose exec -T postgres psql -U picklefund -d picklefund < "$BACKUP_FILE"
```

---

## 5. Deploy cập nhật

Deploy tự động kích hoạt khi push lên `main`. Để deploy thủ công:

```bash
cd /opt/picklefund

# Sync code
git fetch origin main
git reset --hard origin/main
git clean -fd -e .env -e .env.production -e "*.sql" -e "backup_*.sql" -e "ssl/"

# Chạy migrations nếu có
docker compose exec backend npx prisma migrate deploy

# Rebuild và restart
docker compose build --no-cache
docker compose down --remove-orphans
docker compose up -d

# Kiểm tra
sleep 30
curl -sf https://api.picklefund.uk/health && echo "✅" || echo "❌"
```

---

## 6. Quản lý database

### Kết nối vào PostgreSQL
```bash
docker compose exec postgres psql -U picklefund -d picklefund
```

### Kiểm tra kích thước tables
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Chạy Prisma migrations
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma migrate status
```

---

## 7. Xử lý sự cố phổ biến

### Service bị crash loop

```bash
docker compose logs backend --tail=50
# Đọc lỗi → fix → rebuild
docker compose up -d --build backend
```

### Hết dung lượng ổ cứng

```bash
# Xóa Docker images không dùng
docker image prune -a

# Xóa backup cũ
find /opt/picklefund/backups/ -name "*.sql" -mtime +7 -delete

# Xóa Docker build cache
docker builder prune
```

### Database connection refused

```bash
# Kiểm tra PostgreSQL
docker compose ps postgres
docker compose logs postgres --tail=20

# Khởi động lại nếu cần
docker compose restart postgres
sleep 10
docker compose restart backend
```

### Memory cao bất thường

```bash
docker stats --no-stream
# Xem process nào dùng nhiều RAM
# Restart service nếu cần
```

---

## 8. Lịch bảo trì khuyến nghị

| Tần suất | Công việc |
|---|---|
| Hàng ngày | Kiểm tra health endpoints, xem logs lỗi |
| Hàng tuần | Backup thủ công, kiểm tra dung lượng |
| Hàng tháng | Xóa backup cũ, `npm audit`, cập nhật Docker images |
| Hàng quý | Review secrets, rotation JWT nếu cần |
