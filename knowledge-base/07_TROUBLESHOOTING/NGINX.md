# Troubleshooting: Nginx — PickleFund

> **Mục đích:** Ghi lại các sự cố Nginx đã gặp và cách fix  
> **Đối tượng:** DevOps

---

## Vấn đề 1: upstream already defines port

### Triệu chứng
Nginx crash khi start với error:
```
nginx: [emerg] invalid parameter "already" in upstream "backend"
```
Hoặc:
```
proxy_pass cannot have URI part in location given by regular expression
```

### Nguyên nhân
Khai báo `upstream backend { server backend:3000; }` nhưng `proxy_pass` lại chỉ định port:
```nginx
# ❌ SAI
upstream backend { server backend:3000; }
location /api/ {
    proxy_pass http://backend:3000/api/;  # Conflict — port đã trong upstream
}
```

### Fix
```nginx
# ✅ ĐÚNG
upstream backend { server backend:3000; }
location /api/ {
    proxy_pass http://backend/api/;  # Dùng upstream name, không có port
}
```

---

## Vấn đề 2: 404 khi truy cập app (React SPA)

### Triệu chứng
Truy cập `https://app.picklefund.uk/dashboard` → 404 Not Found

### Nguyên nhân
Thiếu `try_files $uri $uri/ /index.html` — Nginx tìm file tĩnh thay vì serve `index.html` cho React Router.

### Fix
```nginx
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;  # BẮT BUỘC cho React SPA
}
```

---

## Vấn đề 3: SSL certificate error

### Triệu chứng
```
nginx: [emerg] cannot load certificate
ssl/cert.pem: No such file or directory
```

### Nguyên nhân
File SSL cert không tồn tại tại đường dẫn config.

### Fix
```bash
# Kiểm tra file tồn tại
ls -la /opt/picklefund/ssl/

# Copy cert từ Cloudflare/Let's Encrypt
cp /path/to/cert.pem /opt/picklefund/ssl/cert.pem
cp /path/to/key.pem /opt/picklefund/ssl/key.pem

# Khởi động lại nginx
docker compose restart nginx
```

---

## Vấn đề 4: Nginx logs

```bash
# Xem access log
docker compose logs nginx --tail=100

# Lọc lỗi
docker compose logs nginx --tail=500 | grep -i "error\|502\|503\|404\|405"

# Test config
docker compose exec nginx nginx -t
```

---

## Config Nginx chuẩn PickleFund

```nginx
upstream backend {
    server backend:3000;
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name app.picklefund.uk api.picklefund.uk;
    return 301 https://$host$request_uri;
}

# API domain
server {
    listen 443 ssl;
    server_name api.picklefund.uk;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# App domain
server {
    listen 443 ssl;
    server_name app.picklefund.uk;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    root /usr/share/nginx/html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
