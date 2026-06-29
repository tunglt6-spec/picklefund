# Quy trình Deploy PickleFund

**Mục đích:** Hướng dẫn deploy lên production
**Đối tượng:** DevOps, Developer
**Cập nhật:** 2026-06-29

---

## Quy trình deploy V2 (GitHub Actions)

Deploy tự động trigger khi push lên nhánh `main`.

### Bước 1: Chạy tests
```bash
cd backend && npm test
# Phải PASS 175/175 trước khi tiếp tục
```

### Bước 2: SSH vào VPS

### Bước 3: Backup database
```bash
set -a; source .env; set +a
pg_dump $DATABASE_URL > /backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Bước 4: Sync code từ GitHub
```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```
**KHÔNG dùng `git pull`** — dễ fail khi VPS có local changes.

### Bước 5: Build và khởi động
```bash
docker compose up -d --build
```

### Bước 6: Health check
```bash
sleep 10
curl -f http://127.0.0.1:3000/health || {
  echo "Health check FAILED — rolling back"
  docker compose down
  # restore backup nếu cần
  exit 1
}
```

### Bước 7: Notify
```bash
printf 'Deploy SUCCESS: PickleFund V2.0\nCommit: %s' "$GIT_SHA" | \
  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d chat_id="$CHAT_ID" \
  --data-urlencode text@-
```

---

## Lưu ý YAML / Telegram notification

**KHÔNG dùng literal newlines trong YAML:**
```yaml
# SAI
message: "Line 1
Line 2"
```

**ĐÚNG — dùng printf:**
```bash
printf 'Line 1\nLine 2'
```

---

## Rollback thủ công

Nếu health check fail và auto rollback không đủ:
```bash
# Restore backup gần nhất
set -a; source .env; set +a
psql $DATABASE_URL < /backups/backup_YYYYMMDD_HHMMSS.sql

# Hoặc rollback về commit trước
git reset --hard HEAD~1
docker compose up -d --build
```
