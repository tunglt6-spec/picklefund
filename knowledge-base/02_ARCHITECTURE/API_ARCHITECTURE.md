# Kiến trúc API PickleFund

**Mục đích:** Mô tả thiết kế REST API  
**Đối tượng:** Backend & Frontend Developer  
**Cập nhật:** 2026-06-29

---

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://api.picklefund.uk`

Frontend cấu hình qua `VITE_API_URL`.

---

## Nhóm endpoints chính

### Auth
```
POST /auth/register      — Đăng ký CLB mới
POST /auth/login         — Đăng nhập
POST /auth/refresh       — Làm mới Access Token
POST /auth/logout        — Đăng xuất
```

### Members
```
GET    /members          — Danh sách thành viên
POST   /members          — Thêm thành viên
PUT    /members/:id      — Cập nhật thành viên
DELETE /members/:id      — Xóa thành viên
```

### Fund Periods (Kỳ quỹ)
```
GET    /fund-periods           — Danh sách kỳ
POST   /fund-periods           — Tạo kỳ mới
GET    /fund-periods/:id       — Chi tiết kỳ
PUT    /fund-periods/:id/close    — Đóng kỳ
PUT    /fund-periods/:id/finalize — Finalize kỳ
```

### Contributions (Thu quỹ)
```
GET    /contributions                        — Danh sách thu
POST   /contributions                        — Ghi nhận đóng quỹ
DELETE /contributions/:id                    — Xóa giao dịch
```

### Expenses (Chi phí)
```
GET    /expenses              — Danh sách chi
POST   /expenses              — Thêm chi phí
DELETE /expenses/:id          — Xóa chi phí
```

### Mini Funds (Quỹ Phụ)
```
GET    /mini-funds            — Danh sách quỹ phụ
POST   /mini-funds            — Tạo quỹ phụ
POST   /mini-funds/:id/transactions  — Thêm giao dịch
```

### Reports
```
GET    /reports/period/:id    — Báo cáo kỳ
GET    /reports/receipt/:memberId/:periodId  — Phiếu thu
```

---

## Authentication

Mọi endpoint (trừ `/auth/*`) yêu cầu:
```
Authorization: Bearer <access_token>
```

---

## Response format

```json
{
  "data": { ... },
  "message": "Success",
  "statusCode": 200
}
```

Error:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Nginx routing

Nginx proxy `/api/` path lên backend. Frontend phải dùng path `/api/auth/login` khi gọi qua Nginx trực tiếp, hoặc `VITE_API_URL` trực tiếp trỏ API domain.

**Lưu ý Nginx 405 bug:** Xem [07_TROUBLESHOOTING/LOGIN.md](../07_TROUBLESHOOTING/LOGIN.md)
