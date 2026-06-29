# Hướng dẫn Bảo mật — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** DevOps, Admin kỹ thuật

---

## 1. Mô hình xác thực

### JWT + Refresh Token

| Token | TTL | Lưu trữ |
|---|---|---|
| Access Token | 15 phút | Memory (không localStorage) |
| Refresh Token | 7 ngày | HttpOnly cookie hoặc secure storage |

- **Algorithm:** HS256
- **Secret:** Tối thiểu 64 ký tự random (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- Refresh token hash lưu trong DB — rotate khi dùng, revoke khi logout

### Password Hashing

- **Algorithm:** Argon2id (argon2 npm package)
- **Không dùng:** bcrypt, MD5, SHA-1, plain text
- Tất cả password được hash trước khi lưu DB

---

## 2. Biến môi trường nhạy cảm

### Danh sách secrets cần bảo vệ

| Biến | Mức độ | Ghi chú |
|---|---|---|
| `POSTGRES_PASSWORD` | 🔴 Nghiêm trọng | Không để trong git |
| `JWT_SECRET` | 🔴 Nghiêm trọng | Tối thiểu 64 ký tự |
| `JWT_REFRESH_SECRET` | 🔴 Nghiêm trọng | Khác với JWT_SECRET |
| `REDIS_PASSWORD` | 🟡 Quan trọng | Không để trống |
| `TELEGRAM_BOT_TOKEN` | 🟡 Quan trọng | Chỉ dùng trong GitHub Secrets |
| `TELEGRAM_CHAT_ID` | 🟢 Thấp | Không phải secret thật sự |

### Quy tắc quản lý secrets

1. **Không commit** `.env`, `.env.production` vào git
2. Chỉ commit `.env.example` với placeholder (không có giá trị thật)
3. Secrets production lưu trong **GitHub Secrets** (cho CI/CD) và **file `.env.production`** trên VPS
4. **Không echo** secrets trong logs: `echo $JWT_SECRET` → CẤM
5. `TELEGRAM_BOT_TOKEN` không được log ra stdout kể cả trong script deploy

---

## 3. Bảo mật mạng

### Firewall VPS

Chỉ mở các cổng cần thiết:

```bash
# Cho phép HTTP và HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# SSH chỉ từ IP DevOps (khuyến nghị)
ufw allow from <YOUR_IP> to any port 22

# Chặn tất cả còn lại
ufw default deny incoming
ufw enable
```

### Docker network isolation

- PostgreSQL và Redis **không expose** port ra host: chỉ accessible trong Docker network nội bộ
- Nginx là điểm tiếp nhận duy nhất từ internet
- Backend chỉ accessible qua Nginx proxy

### HTTPS bắt buộc

- Nginx redirect HTTP 80 → HTTPS 443
- Cloudflare proxy bật: DDoS protection + CDN
- SSL termination tại Nginx với cert hợp lệ

---

## 4. Bảo mật database

### Không expose PostgreSQL ra ngoài

```yaml
# docker-compose.yml — ĐÚNG
services:
  postgres:
    ports: []  # Không có port mapping ra host

# SAI — không làm thế này
  postgres:
    ports:
      - "5432:5432"  # Expose ra host → nguy hiểm
```

### Backup bảo mật

- Backup SQL lưu tại `/opt/picklefund/backups/` — không có trong git
- `git clean -fd -e "*.sql"` bảo vệ backup không bị xóa khi deploy
- Cân nhắc encrypt backup nếu dữ liệu nhạy cảm

---

## 5. Dependency security

```bash
# Kiểm tra vulnerabilities định kỳ
cd backend && npm audit
cd frontend && npm audit

# Fix auto
npm audit fix

# Xem báo cáo chi tiết
npm audit --json
```

**Khuyến nghị:** Chạy `npm audit` trước mỗi release.

---

## 6. CORS

Backend chỉ chấp nhận requests từ domain được whitelist:

```env
ALLOWED_ORIGINS=https://app.picklefund.uk
```

Môi trường dev: `ALLOWED_ORIGINS=http://localhost:5173`

**Không dùng `ALLOWED_ORIGINS=*`** trong production.

---

## 7. Checklist bảo mật trước release

- [ ] `JWT_SECRET` ≥ 64 ký tự random
- [ ] `JWT_REFRESH_SECRET` ≥ 64 ký tự, khác `JWT_SECRET`
- [ ] `POSTGRES_PASSWORD` đủ mạnh (≥ 20 ký tự, có số và ký tự đặc biệt)
- [ ] Không có `.env` thật trong git history (`git log --all -- .env`)
- [ ] `ALLOWED_ORIGINS` chỉ chứa domain chính thức
- [ ] PostgreSQL không expose port ra host
- [ ] Firewall VPS chỉ mở 80, 443, 22
- [ ] `npm audit` — không có critical vulnerabilities
- [ ] HTTPS hoạt động cho cả hai subdomain
- [ ] Refresh token rotation hoạt động đúng
- [ ] Logout revoke refresh token trong DB

---

## 8. Ứng phó sự cố bảo mật

Nếu nghi ngờ bị xâm phạm:

1. **Lập tức:** Rotate tất cả secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`)
2. **Revoke** tất cả refresh tokens trong DB:
   ```sql
   UPDATE users SET refresh_token_hash = NULL;
   ```
3. **Kiểm tra** logs: `docker compose logs backend --tail=500`
4. **Backup** database ngay lập tức
5. **Thông báo** cho admin CLB nếu dữ liệu thành viên bị ảnh hưởng
