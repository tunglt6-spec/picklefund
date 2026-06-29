# Hướng dẫn Cài đặt — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** Lập trình viên, DevOps, Kỹ thuật viên

---

## Mục đích tài liệu

Hướng dẫn này mô tả quy trình cài đặt PickleFund trên môi trường **local development**. Để triển khai lên production, xem [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 1. Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu | Khuyến nghị |
|---|---|---|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Docker Desktop | 24.x | Latest |
| Docker Compose | V2 (plugin) | Latest |
| Git | 2.x | Latest |
| RAM | 4 GB | 8 GB |
| Ổ cứng | 10 GB free | 20 GB |

---

## 2. Clone repository

```bash
git clone https://github.com/your-org/picklefund.git
cd picklefund
```

---

## 3. Tạo file môi trường

```bash
# Tạo .env từ template
cp .env.example .env
```

Mở `.env` và điền các giá trị thực:

```env
# PostgreSQL
POSTGRES_USER=picklefund
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=picklefund

# Redis
REDIS_PASSWORD=your_redis_password

# Backend
DATABASE_URL=postgresql://picklefund:your_strong_password@localhost:5432/picklefund?schema=public
JWT_SECRET=your_jwt_secret_at_least_64_chars
JWT_REFRESH_SECRET=your_refresh_secret_at_least_64_chars
ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3000
```

> ⚠️ **Không commit file `.env`** vào git. File này đã được thêm vào `.gitignore`.

---

## 4. Khởi động PostgreSQL và Redis bằng Docker

```bash
# Khởi động chỉ database và redis
docker compose up postgres redis -d

# Kiểm tra
docker compose ps
```

Chờ cho đến khi thấy `(healthy)` bên cạnh `picklefund-db` và `picklefund-redis`.

---

## 5. Cài đặt và chạy Backend

```bash
cd backend

# Cài dependencies
npm ci

# Chạy Prisma migrations
npx prisma migrate deploy

# (Tuỳ chọn) Seed dữ liệu mẫu
npx prisma db seed

# Chạy development server
npm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3000`

Health check: `curl http://localhost:3000/health`

---

## 6. Cài đặt và chạy Frontend

```bash
cd frontend

# Cài dependencies
npm ci

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

---

## 7. Chạy toàn bộ bằng Docker Compose (tuỳ chọn)

Nếu muốn chạy toàn bộ stack trong Docker:

```bash
# Build và khởi động tất cả services
docker compose up --build -d

# Xem logs
docker compose logs -f

# Dừng tất cả
docker compose down
```

---

## 8. Kiểm tra sau cài đặt

```bash
# Kiểm tra backend
curl http://localhost:3000/health
# Kỳ vọng: {"status":"ok"}

# Chạy backend tests
cd backend && npm test -- --runInBand

# Build frontend
cd frontend && npm run build
```

---

## 9. Lỗi thường gặp

### Lỗi: `Cannot connect to database`
- Kiểm tra PostgreSQL đang chạy: `docker compose ps`
- Kiểm tra `DATABASE_URL` trong `.env` đúng host (`localhost` cho local, `postgres` trong Docker)

### Lỗi: `Port 3000 already in use`
- Dừng process đang dùng port: `lsof -i :3000` (macOS/Linux) hoặc kiểm tra Task Manager (Windows)

### Lỗi: `Prisma migration failed`
- Đảm bảo PostgreSQL đang chạy và `DATABASE_URL` đúng
- Thử: `npx prisma migrate reset` (⚠️ xóa dữ liệu)

### Lỗi: `VITE_API_URL not set`
- Kiểm tra file `.env` trong thư mục `frontend/`
- Frontend Vite đọc từ `frontend/.env`, không phải root `.env`

### Lỗi: Docker upstream port conflict
- Không dùng `http://backend:3000` trong nginx nếu đã có `upstream backend { server backend:3000; }`
- Dùng `http://backend/api/` — upstream đã khai báo port

---

## 10. Checklist cài đặt

- [ ] Node.js 20.x đã cài
- [ ] Docker Desktop đang chạy
- [ ] Repository đã clone
- [ ] `.env` đã tạo từ `.env.example`
- [ ] PostgreSQL container đang chạy và healthy
- [ ] Redis container đang chạy và healthy
- [ ] `npm ci` backend thành công
- [ ] Prisma migrations đã chạy
- [ ] Backend `npm run start:dev` không có lỗi
- [ ] `npm ci` frontend thành công
- [ ] Frontend `npm run dev` không có lỗi
- [ ] `http://localhost:5173` hiển thị trang đăng nhập
- [ ] `http://localhost:3000/health` trả về `{"status":"ok"}`
- [ ] Backend tests: 175/175 PASS
