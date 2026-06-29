# Troubleshooting: Login / API Proxy — PickleFund

> **Mục đích:** Ghi lại các lỗi login và API proxy đã gặp, cách fix  
> **Đối tượng:** DevOps, Developer

---

## Vấn đề 1: HTTP 405 Method Not Allowed khi login production

### Triệu chứng
```
POST https://app.picklefund.uk/api/auth/login → 405 Method Not Allowed
```

### Nguyên nhân
Nginx config cho `app.picklefund.uk` thiếu `location /api/` block. Nginx nhận POST request đến `/api/auth/login` nhưng không có route để proxy về backend.

### Fix
Thêm `location /api/` block vào server block của `app.picklefund.uk`:

```nginx
server {
    listen 443 ssl;
    server_name app.picklefund.uk;

    # Static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy — BẮT BUỘC CÓ BLOCK NÀY
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Lưu ý quan trọng:** Dùng `http://backend/api/` (upstream name) **không** dùng `http://backend:3000/api/` khi đã khai báo upstream:

```nginx
# ✅ ĐÚNG
upstream backend { server backend:3000; }
proxy_pass http://backend/api/;

# ❌ SAI — gây lỗi "upstream already defines port"
proxy_pass http://backend:3000/api/;
```

### Verify
```bash
curl -X POST https://app.picklefund.uk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
# Kỳ vọng: 401 (sai password) hoặc 200 (đúng) — KHÔNG phải 405
```

---

## Vấn đề 2: Login thành công nhưng redirect sai

### Triệu chứng
Login thành công nhưng không redirect về dashboard.

### Nguyên nhân thường gặp
- `VITE_API_URL` sai — trỏ về relative path `/api` thay vì `https://api.picklefund.uk`
- Frontend build không cập nhật env variable

### Fix
```env
# ✅ ĐÚNG
VITE_API_URL=https://api.picklefund.uk

# ❌ SAI
VITE_API_URL=/api
```

Rebuild frontend sau khi sửa env:
```bash
docker compose build --no-cache frontend
docker compose up -d
```

---

## Vấn đề 3: Token hết hạn, không tự refresh

### Nguyên nhân
Refresh token logic không được gọi đúng khi access token expire.

### Verify
```bash
# Kiểm tra refresh token endpoint
curl -X POST https://api.picklefund.uk/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<token>"}'
```

Xem logs: `docker compose logs backend --tail=50 | grep -i "refresh\|token"`
