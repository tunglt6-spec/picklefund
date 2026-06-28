# PickleFund V2.0 — Hướng Dẫn Cài Đặt

## 1. Yêu cầu hệ thống

### VPS (Self-hosted)
| Thành phần | Tối thiểu | Khuyến nghị |
|------------|-----------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 22.04 LTS |
| Docker | 24.x+ | 27.x |
| Docker Compose | v2.x | v2.27+ |

### Desktop (Electron)
- Windows 10/11 x64
- Không cần cài Docker

---

## 2. Cài bản Docker trên VPS

### 2.1. Cài Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 2.2. Clone repo / tải release

```bash
git clone https://github.com/your-org/picklefund.git /opt/picklefund
cd /opt/picklefund
```

Hoặc tải release archive và giải nén vào `/opt/picklefund`.

### 2.3. Cấu hình môi trường

```bash
cp .env.example .env.production
nano .env.production
```

Xem chi tiết từng biến tại [Mục 4](#4-cấu-hình-env).

### 2.4. Cấu hình SSL

**Tùy chọn A — Cloudflare (khuyến nghị):**
- Bật proxy Cloudflare → SSL Full (strict) hoặc Flexible
- Không cần cert trên VPS nếu dùng Flexible

**Tùy chọn B — Let's Encrypt (Certbot):**

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
# Cert lưu tại: /etc/letsencrypt/live/your-domain.com/
```

Cập nhật đường dẫn cert trong `docker-compose.production.yml` hoặc `.env.production`.

### 2.5. Khởi động

```bash
docker compose -f docker-compose.production.yml up -d
```

### 2.6. Kiểm tra health

```bash
# Kiểm tra containers
docker compose -f docker-compose.production.yml ps

# Kiểm tra health endpoint
curl https://your-domain.com/api/health

# Xem logs
docker compose -f docker-compose.production.yml logs -f backend
```

Response thành công:
```json
{ "status": "ok", "database": "connected" }
```

---

## 3. Cài bản Desktop Windows (Electron)

1. Tải file `PickleFund-Setup-v2.x.x.exe` từ trang release
2. Chạy installer → Next → Install → Finish
3. Mở PickleFund → app mặc định trỏ đến production URL chính thức

### Cấu hình URL tùy chỉnh (nếu self-hosted)
- Vào **Settings → Server URL**
- Nhập URL VPS của bạn, ví dụ: `https://pick.yourclub.com`
- Nhấn **Save & Reconnect**

---

## 4. Cấu hình .env

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=picklefund
DB_USER=picklefund
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT
JWT_SECRET=CHANGE_ME_RANDOM_64_CHARS
JWT_REFRESH_SECRET=CHANGE_ME_ANOTHER_RANDOM_64_CHARS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# SSL (nếu dùng cert trực tiếp)
SSL_CERT_PATH=/etc/ssl/certs/your-domain.crt
SSL_KEY_PATH=/etc/ssl/private/your-domain.key

# Optional: Email (chưa bắt buộc trong V2.0)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=app_password
```

> Không commit file `.env.production` lên git. Dùng `.gitignore`.

---

## 5. Khởi tạo database

Migration chạy **tự động** khi container `backend` khởi động lần đầu. Không cần chạy thủ công.

Kiểm tra migration:
```bash
docker compose -f docker-compose.production.yml logs backend | grep migration
```

---

## 6. Tạo tài khoản Admin đầu tiên

### Qua API (khuyến nghị)

```bash
curl -X POST https://your-domain.com/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourStrongPassword123!",
    "fullName": "Club Admin",
    "adminSecret": "ADMIN_BOOTSTRAP_SECRET"
  }'
```

`ADMIN_BOOTSTRAP_SECRET` cấu hình trong `.env.production`:
```env
ADMIN_BOOTSTRAP_SECRET=CHANGE_ME_BOOTSTRAP_SECRET
```

### Qua seed script (dev/staging)

```bash
docker compose -f docker-compose.production.yml exec backend npm run seed:admin
```

---

## 7. Backup database

```bash
# Backup
docker exec picklefund-db pg_dump -U picklefund picklefund > backup_$(date +%Y%m%d).sql

# Nén backup
gzip backup_$(date +%Y%m%d).sql
```

**Lịch backup tự động (crontab):**
```bash
0 2 * * * docker exec picklefund-db pg_dump -U picklefund picklefund | gzip > /opt/backups/picklefund_$(date +\%Y\%m\%d).sql.gz
```

---

## 8. Restore database

```bash
# Giải nén nếu cần
gunzip backup_20260628.sql.gz

# Restore
docker exec -i picklefund-db psql -U picklefund picklefund < backup_20260628.sql
```

> Restore sẽ ghi đè dữ liệu hiện tại. Backup trước khi restore.

---

## 9. Update lên version mới

```bash
cd /opt/picklefund

# Pull code mới
git pull origin main

# Rebuild và restart
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --build

# Kiểm tra
docker compose -f docker-compose.production.yml ps
curl https://your-domain.com/api/health
```

Migration tự động chạy khi backend khởi động lại.

---

## 10. Troubleshooting

### Container không khởi động
```bash
docker compose -f docker-compose.production.yml logs backend
docker compose -f docker-compose.production.yml logs postgres
```

### Lỗi kết nối database
- Kiểm tra `DB_HOST`, `DB_USER`, `DB_PASSWORD` trong `.env.production`
- Đảm bảo container `postgres` đang chạy: `docker ps`

### API trả về 502/503
- Backend chưa ready: đợi 10–30 giây sau `up -d`
- Xem logs: `docker logs picklefund-backend`

### Health endpoint lỗi
```bash
curl -v https://your-domain.com/api/health
# Hoặc kiểm tra nội bộ (bỏ qua nginx)
docker exec picklefund-backend curl http://localhost:3000/api/health
```

### Reset mật khẩu admin
```bash
docker compose -f docker-compose.production.yml exec backend npm run reset-password -- --username admin --password NewPassword123!
```

### Xem Swagger UI
Truy cập: `https://your-domain.com/api/docs`
(Chỉ khả dụng khi `NODE_ENV=development` hoặc cấu hình `ENABLE_SWAGGER=true`)
