# Backup dữ liệu PickleFund

**Mục đích:** Quy trình backup database
**Đối tượng:** DevOps, Ops
**Cập nhật:** 2026-06-29

---

## Backup tự động (trong pipeline)

Mỗi lần deploy, pipeline tự động backup trước:

```bash
set -a; source .env; set +a
pg_dump $DATABASE_URL > /backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

**QUAN TRỌNG:** Phải `source .env` trước `pg_dump` vì pg_dump không tự load biến môi trường.

---

## Backup thủ công

```bash
cd /opt/picklefund  # hoặc thư mục dự án trên VPS
set -a; source .env; set +a
pg_dump $DATABASE_URL > /backups/manual_$(date +%Y%m%d_%H%M%S).sql
```

---

## Lưu trữ backup

- Thư mục: `/backups/` trên VPS
- Giữ 7 ngày gần nhất
- Xóa cũ hơn 7 ngày:
```bash
find /backups -name "*.sql" -mtime +7 -delete
```

---

## Kiểm tra backup

```bash
# Kiểm tra file backup có tồn tại và không rỗng
ls -lh /backups/backup_*.sql | tail -5
```
