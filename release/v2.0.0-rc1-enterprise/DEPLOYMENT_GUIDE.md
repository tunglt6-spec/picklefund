# Hướng dẫn Triển khai Production — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** DevOps, Kỹ thuật viên hệ thống

---

## 1. Yêu cầu hạ tầng

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|---|---|---|
| VPS | 2 vCPU, 4 GB RAM | 4 vCPU, 8 GB RAM |
| Ổ cứng | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Docker Engine | 24.x | Latest |
| Docker Compose | V2 plugin | Latest |
| Domain | Đã trỏ về VPS | Cloudflare proxy bật |
| SSL | Let's Encrypt | Cloudflare managed |

---

## 2. Chuẩn bị VPS lần đầu

### 2.1 Cài Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 2.2 Clone repository

```bash
sudo mkdir -p /opt/picklefund
sudo chown $USER:$USER /opt/picklefund
cd /opt/picklefund
git clone https://github.com/your-org/picklefund.git .
```

### 2.3 Tạo file môi trường production

```bash
cp .env.example .env.production
nano .env.production
```

Điền đầy đủ giá trị thực (không để placeholder):

```env
# PostgreSQL
POSTGRES_USER=picklefund
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
POSTGRES_DB=picklefund

# Redis
REDIS_PASSWORD=<STRONG_RANDOM_PASSWORD>

# Backend
DATABASE_URL=postgresql://picklefund:<PASSWORD>@postgres:5432/picklefund?schema=public
JWT_SECRET=<64_CHARS_RANDOM_SECRET>
JWT_REFRESH_SECRET=<64_CHARS_RANDOM_SECRET>
ALLOWED_ORIGINS=https://app.picklefund.uk

# Frontend (dùng trong container build)
VITE_API_URL=https://api.picklefund.uk

# Node
NODE_ENV=production
```

> ⚠️ `VITE_API_URL` phải trỏ về subdomain API (`https://api.picklefund.uk`), **không phải** relative path (`/api`).

### 2.4 Tạo symlink `.env` → `.env.production`

```bash
ln -sf /opt/picklefund/.env.production /opt/picklefund/.env
```

### 2.5 Tạo thư mục SSL

```bash
mkdir -p /opt/picklefund/ssl
# Copy cert.pem và key.pem từ Cloudflare/Let's Encrypt vào đây
```

### 2.6 Tạo thư mục backup

```bash
mkdir -p /opt/picklefund/backups
```

---

## 3. Cấu hình Nginx

File: `nginx/nginx.conf` — đã có trong repository.

**Điểm quan trọng cần kiểm tra:**
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl;
    server_name api.picklefund.uk;
    location / {
        proxy_pass http://backend;   # Dùng upstream name, không có port
    }
}

server {
    listen 443 ssl;
    server_name app.picklefund.uk;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend/api/;   # Phải có block này
    }
}
```

---

## 4. Deploy lần đầu (manual)

```bash
cd /opt/picklefund

# Build toàn bộ images
docker compose build --no-cache

# Khởi động services
docker compose up -d

# Chờ services healthy (30-60 giây)
sleep 30
docker compose ps

# Chạy database migrations
docker compose exec backend npx prisma migrate deploy

# Kiểm tra health
curl -sf https://api.picklefund.uk/health
curl -sf https://app.picklefund.uk/
```

---

## 5. Cấu hình GitHub Actions (Auto Deploy)

### 5.1 Cấu hình secrets trên GitHub

Vào **Repository Settings → Secrets and Variables → Actions**, thêm:

| Secret | Mô tả |
|---|---|
| `SSH_HOST` | IP hoặc hostname của VPS |
| `SSH_USERNAME` | User SSH (ví dụ: `ubuntu`) |
| `SSH_PRIVATE_KEY` | Nội dung private key SSH |
| `SSH_PORT` | Port SSH (thường `22`) |
| `TELEGRAM_BOT_TOKEN` | (Optional) Token bot Telegram |
| `TELEGRAM_CHAT_ID` | (Optional) Chat ID nhận thông báo |

### 5.2 Workflow deploy

File: `.github/workflows/deploy.yml` — đã có trong repository.

Deploy tự động kích hoạt khi push vào nhánh `main`.

**Pipeline V2 bao gồm:**
1. Kết nối VPS qua SSH
2. `git fetch origin main` + `git reset --hard origin/main`
3. `git clean -fd` (bảo vệ `.env`, `.env.production`, `ssl/`, `*.sql`)
4. Backup database: `pg_dump → backups/picklefund_YYYYMMDD_HHMMSS.sql`
5. `docker compose build --no-cache`
6. `docker compose down && docker compose up -d`
7. Sleep 30 giây
8. Health check: `api.picklefund.uk/health` + `app.picklefund.uk`
9. Nếu fail: auto rollback về commit trước
10. Telegram notification (nếu đã cấu hình)

---

## 6. Kiểm tra sau deploy

```bash
# Services đang chạy
docker compose ps

# Logs backend
docker compose logs backend --tail=50

# Logs nginx
docker compose logs nginx --tail=50

# Health API
curl https://api.picklefund.uk/health

# Test đăng nhập
curl -X POST https://api.picklefund.uk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test"}'
```

---

## 7. Xem và dọn backup

```bash
# Danh sách backup files
ls -lh /opt/picklefund/backups/

# Xem dung lượng
du -sh /opt/picklefund/backups/

# Xóa backup cũ hơn 30 ngày
find /opt/picklefund/backups/ -name "*.sql" -mtime +30 -delete
```

---

## 8. Rollback thủ công

Nếu cần rollback thủ công về commit cụ thể:

```bash
cd /opt/picklefund

# Xem danh sách commits
git log --oneline -10

# Rollback về commit hash
PREV_COMMIT=abc1234
git reset --hard $PREV_COMMIT

# Rebuild
docker compose build --no-cache
docker compose down --remove-orphans
docker compose up -d
sleep 30

# Restore database nếu cần
docker compose exec -T postgres psql -U picklefund -d picklefund < /opt/picklefund/backups/picklefund_YYYYMMDD_HHMMSS.sql
```

---

## 9. Checklist deploy production

### Trước khi deploy
- [ ] `.env.production` đã điền đầy đủ, không có placeholder
- [ ] `ssl/cert.pem` và `ssl/key.pem` tồn tại
- [ ] GitHub Secrets đã cấu hình đủ (`SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `SSH_PORT`)
- [ ] `VITE_API_URL=https://api.picklefund.uk` (không phải `/api`)
- [ ] Backup database lần cuối trước deploy thủ công

### Sau khi deploy
- [ ] `docker compose ps` — tất cả services `Up (healthy)`
- [ ] `curl https://api.picklefund.uk/health` → `{"status":"ok"}`
- [ ] `curl https://app.picklefund.uk/` → HTTP 200
- [ ] Login thành công qua UI
- [ ] Finance dashboard load đúng 4 card KPI
- [ ] Kiểm tra logs không có lỗi runtime

---

## 10. Lỗi thường gặp khi deploy

### `git pull: Your local changes would be overwritten`
Đã fix trong Pipeline V2 — pipeline dùng `git reset --hard`, không dùng `git pull`.  
Thủ công: `git fetch origin main && git reset --hard origin/main && git clean -fd`

### `proxy_pass upstream already defines port`
Nginx không dùng `http://backend:3000/api/` khi đã khai báo `upstream backend { server backend:3000; }`.  
Fix: dùng `proxy_pass http://backend/api/`.

### `env_file: .env not found`
Fix: `env_file: [{path: .env, required: false}]` trong `docker-compose.yml`.

### `pg_dump: connection refused`
PostgreSQL chưa healthy khi backup. Đảm bảo container `postgres` đã `(healthy)` trước khi chạy `pg_dump`.

### Telegram notification không gửi
Kiểm tra: `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` đã thêm vào GitHub Secrets. Đây là optional — deploy vẫn chạy bình thường nếu không cấu hình.
