# Troubleshooting: Deployment — PickleFund

> **Mục đích:** Ghi lại các sự cố deploy đã gặp và cách fix  
> **Đối tượng:** DevOps

---

## Vấn đề 1: git pull bị block do VPS có local changes

### Triệu chứng
```
error: Your local changes to the following files would be overwritten by merge:
    nginx/nginx.conf
Please commit your changes or stash them before you merge.
```

### Nguyên nhân
Ai đó sửa file trực tiếp trên VPS (ví dụ: sửa `nginx.conf` để debug), `git pull` không thể merge.

### Fix — Pipeline V2 (đã áp dụng)
```bash
# Thay vì git pull:
git fetch origin main
git reset --hard origin/main
git clean -fd -e .env -e .env.production -e "*.sql" -e "backup_*.sql" -e "ssl/"
```

**Nguyên tắc:** Không bao giờ sửa file trực tiếp trên VPS. VPS luôn nhận code từ `git reset --hard`.

---

## Vấn đề 2: Health check fail sau deploy

### Triệu chứng
Pipeline V2 báo health check fail sau deploy.

### Debug
```bash
# Xem logs backend
docker compose logs backend --tail=100

# Xem logs nginx
docker compose logs nginx --tail=50

# Test thủ công
curl -sf https://api.picklefund.uk/health
curl -sf https://app.picklefund.uk/
```

### Nguyên nhân thường gặp
- Backend khởi động chậm → tăng sleep time trong pipeline
- Database connection fail → kiểm tra `DATABASE_URL`
- Port conflict → kiểm tra services

---

## Vấn đề 3: YAML parse error trong deploy.yml

### Triệu chứng
```
yaml: line X: did not find expected key
```

### Nguyên nhân
Telegram message string có literal newlines trong YAML block scalar.

### Fix
Dùng `printf` thay vì multiline string:

```yaml
# ✅ ĐÚNG
send_telegram "$(printf '🚀 Deploy started\nCommit: %s' "$SHORT_SHA")"

# ❌ SAI — literal newlines trong YAML string
send_telegram "🚀 Deploy started
Commit: $SHORT_SHA"
```

---

## Vấn đề 4: Rollback thủ công

Khi auto rollback thất bại:

```bash
cd /opt/picklefund

# Lấy commit cũ
PREV_COMMIT=$(cat /tmp/picklefund-last-commit.txt 2>/dev/null)
echo "Rollback về: $PREV_COMMIT"

git reset --hard $PREV_COMMIT
docker compose build --no-cache
docker compose down --remove-orphans
docker compose up -d
sleep 30

# Verify
curl -sf https://api.picklefund.uk/health && echo "✅" || echo "❌"
```

Xem chi tiết tại [05_OPERATIONS/RESTORE.md](../05_OPERATIONS/RESTORE.md).

---

## Vấn đề 5: command_timeout trong GitHub Actions

### Triệu chứng
Pipeline bị kill sau 5 phút (default).

### Fix
Thêm `command_timeout` vào SSH action:
```yaml
- uses: appleboy/ssh-action@v1.0.3
  with:
    command_timeout: 30m
```

Build Docker có thể mất 10-15 phút → cần timeout đủ lớn.
