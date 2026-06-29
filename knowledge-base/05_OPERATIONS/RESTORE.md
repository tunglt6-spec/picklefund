# Restore dữ liệu PickleFund

**Mục đích:** Quy trình restore database từ backup
**Đối tượng:** DevOps, Ops
**Cập nhật:** 2026-06-29

---

## Restore từ backup

```bash
# 1. Load env vars
set -a; source .env; set +a

# 2. Drop và recreate database (cẩn thận!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore
psql $DATABASE_URL < /backups/backup_YYYYMMDD_HHMMSS.sql
```

---

## Restore trong Docker

Nếu postgres chạy trong container:
```bash
docker exec -i picklefund_postgres_1 psql -U $POSTGRES_USER -d $POSTGRES_DB \
  < /backups/backup_YYYYMMDD_HHMMSS.sql
```

---

## Kiểm tra sau restore

```bash
# Kiểm tra số bản ghi clubs
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clubs;"

# Kiểm tra bản ghi mới nhất
psql $DATABASE_URL -c "SELECT * FROM fund_periods ORDER BY created_at DESC LIMIT 5;"
```

---

## Lưu ý

- Restore sẽ XÓA dữ liệu hiện tại — xác nhận trước khi thực hiện
- Nên test restore trên môi trường staging trước
- Notify team trước khi restore trên production
