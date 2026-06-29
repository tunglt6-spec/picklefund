# Hướng dẫn Phục hồi Thảm họa — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** DevOps, Admin kỹ thuật  
> **Mục đích:** Phục hồi hệ thống trong các tình huống sự cố nghiêm trọng

---

## 1. Phân loại sự cố

| Mức độ | Mô tả | RTO mục tiêu |
|---|---|---|
| P1 — Nghiêm trọng | App hoàn toàn không truy cập được | 30 phút |
| P2 — Cao | Một service bị lỗi, app bị hạn chế | 1 giờ |
| P3 — Trung bình | Tính năng cụ thể bị lỗi | 4 giờ |
| P4 — Thấp | Vấn đề nhỏ, có workaround | 1 ngày làm việc |

**RTO (Recovery Time Objective):** Thời gian tối đa để phục hồi  
**RPO (Recovery Point Objective):** Mất tối đa dữ liệu của 1 lần deploy gần nhất

---

## 2. Sự cố: Deploy thất bại — Rollback tự động

Pipeline V2 đã có **auto rollback** — kích hoạt tự động nếu health check sau deploy thất bại.

**Nếu auto rollback cũng thất bại**, thực hiện rollback thủ công:

```bash
cd /opt/picklefund

# Xem commit đang chạy vs commit trước
git log --oneline -5

# Lấy commit hash cần rollback về
PREV_COMMIT=$(cat /tmp/picklefund-last-commit.txt 2>/dev/null || git log --oneline -2 | tail -1 | cut -d' ' -f1)
echo "Rollback về: $PREV_COMMIT"

# Reset code
git reset --hard $PREV_COMMIT

# Rebuild với code cũ
docker compose build --no-cache
docker compose down --remove-orphans
docker compose up -d

sleep 30

# Kiểm tra
curl -sf https://api.picklefund.uk/health && echo "✅ API OK" || echo "❌ API FAIL"
curl -sf https://app.picklefund.uk/ && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"
```

---

## 3. Sự cố: Database bị hỏng — Restore từ backup

### 3.1 Xác định backup gần nhất

```bash
ls -lt /opt/picklefund/backups/*.sql | head -5
# Ví dụ: picklefund_20260629_143022.sql
```

### 3.2 Dừng backend (tránh write trong khi restore)

```bash
docker compose stop backend
```

### 3.3 Restore database

```bash
BACKUP_FILE="/opt/picklefund/backups/picklefund_20260629_143022.sql"

# Drop và recreate database
docker compose exec -T postgres psql -U picklefund -c "DROP DATABASE IF EXISTS picklefund_restore;"
docker compose exec -T postgres psql -U picklefund -c "CREATE DATABASE picklefund_restore;"

# Restore vào DB mới (kiểm tra trước)
docker compose exec -T postgres psql -U picklefund -d picklefund_restore < "$BACKUP_FILE"

# Nếu restore thành công → swap
docker compose exec -T postgres psql -U picklefund -c "DROP DATABASE picklefund;"
docker compose exec -T postgres psql -U picklefund -c "ALTER DATABASE picklefund_restore RENAME TO picklefund;"
```

### 3.4 Khởi động lại backend

```bash
docker compose start backend
sleep 15
curl -sf https://api.picklefund.uk/health && echo "✅ Phục hồi thành công"
```

---

## 4. Sự cố: VPS không phản hồi

### 4.1 Kiểm tra qua Control Panel nhà cung cấp

- Đăng nhập Control Panel VPS (DigitalOcean, Vultr, Hetzner...)
- Xem trạng thái VPS: Running / Stopped
- Xem console (IPMI/VNC) nếu SSH không vào được

### 4.2 Khởi động lại VPS qua Control Panel

- Hard reboot nếu VPS treo
- Sau khi VPS lên, Docker Compose tự restart (nếu đã cấu hình `restart: unless-stopped`)

### 4.3 Kiểm tra sau khi VPS lên

```bash
ssh user@vps-ip
cd /opt/picklefund
docker compose ps
docker compose up -d  # Nếu services chưa tự start
```

---

## 5. Sự cố: Mất file .env production

Nếu file `.env.production` bị xóa hoặc hỏng:

```bash
# Tạo lại từ .env.example
cp .env.example .env.production
nano .env.production
# Điền lại toàn bộ giá trị thực từ nguồn lưu trữ an toàn (KeePass, 1Password, Vault...)

# Tạo lại symlink
ln -sf /opt/picklefund/.env.production /opt/picklefund/.env

# Rebuild
docker compose build --no-cache
docker compose down && docker compose up -d
```

> ⚠️ Luôn lưu secrets ở nơi an toàn ngoài VPS (password manager hoặc KMS). Không chỉ dựa vào file trên server.

---

## 6. Sự cố: SSL cert hết hạn

```bash
# Kiểm tra hạn SSL
echo | openssl s_client -connect api.picklefund.uk:443 2>/dev/null | openssl x509 -noout -dates

# Nếu dùng Cloudflare: cert tự gia hạn, kiểm tra Cloudflare dashboard
# Nếu dùng Let's Encrypt:
certbot renew
# Copy cert mới vào ssl/
cp /etc/letsencrypt/live/picklefund.uk/fullchain.pem /opt/picklefund/ssl/cert.pem
cp /etc/letsencrypt/live/picklefund.uk/privkey.pem /opt/picklefund/ssl/key.pem
docker compose restart nginx
```

---

## 7. Checklist phục hồi hoàn tất

- [ ] Tất cả services `Up (healthy)`: `docker compose ps`
- [ ] Health API: `curl -sf https://api.picklefund.uk/health`
- [ ] Health Frontend: `curl -sf https://app.picklefund.uk/`
- [ ] Đăng nhập admin thành công
- [ ] Finance dashboard load đúng 4 card KPI
- [ ] Dữ liệu thành viên/kỳ tài chính còn nguyên vẹn
- [ ] Backup mới nhất đã được kiểm tra
- [ ] Ghi nhận incident vào log vận hành

---

## 8. Liên hệ khẩn cấp

| Vai trò | Trách nhiệm |
|---|---|
| DevOps Lead | Phục hồi hạ tầng, database |
| Dev Lead | Debug application errors |
| Admin CLB | Thông báo cho thành viên nếu downtime kéo dài |

**Thông báo downtime:** Nếu service down quá 30 phút, thông báo cho Admin CLB để họ có thể báo cho thành viên.
