# Troubleshooting: Redis — PickleFund

> **Mục đích:** Ghi lại các sự cố Redis đã gặp  
> **Đối tượng:** DevOps, Developer

---

## Vai trò Redis trong PickleFund

Redis được dùng cho:
- Session/token cache
- BullMQ job queues (nếu có)
- Rate limiting (nếu có)

---

## Vấn đề 1: Redis authentication failed

### Triệu chứng
```
ReplyError: WRONGPASS invalid username-password pair
```

### Nguyên nhân
`REDIS_PASSWORD` trong `.env` không khớp với Redis container.

### Fix
```bash
# Kiểm tra .env
grep REDIS_PASSWORD /opt/picklefund/.env

# Kiểm tra Redis đang chạy với password gì
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
# Kỳ vọng: PONG
```

---

## Vấn đề 2: Redis không connect

### Triệu chứng
```
Error: connect ECONNREFUSED redis:6379
```

### Nguyên nhân
- Redis container chưa healthy
- Host sai (`localhost` thay vì `redis` trong Docker)

### Fix
```bash
# Kiểm tra Redis container
docker compose ps redis
docker compose logs redis --tail=20

# Khởi động lại
docker compose restart redis
sleep 5
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
```

---

## Vấn đề 3: Redis hết memory

### Triệu chứng
Redis slow hoặc lỗi OOM.

### Fix
```bash
# Xem memory Redis đang dùng
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" info memory

# Flush cache nếu cần (CẨNTHẬN — xóa tất cả data)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" flushall
```

---

## Lệnh Redis hữu ích

```bash
# Kết nối Redis CLI
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"

# Xem tất cả keys
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" keys "*"

# Monitor realtime
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" monitor
```

---

## Lưu ý bảo mật

- Redis **không expose port** ra host — chỉ backend container connect được
- `REDIS_PASSWORD` phải đủ mạnh — không để trống
- Không dùng `requirepass ""` trong production
