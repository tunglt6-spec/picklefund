# PickleFund V2.0 — API Reference

## 1. Base URL

```
https://your-domain.com/api/v1
```

Swagger UI: `https://your-domain.com/api/docs`

---

## 2. Authentication

### Đăng nhập

```
POST /auth/login
```

```json
// Request
{ "username": "admin", "password": "yourpassword" }

// Response 200
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900
}
```

### Sử dụng token

Gắn header vào mọi request cần xác thực:
```
Authorization: Bearer <accessToken>
```

### Refresh token

```
POST /auth/refresh
```
```json
// Request
{ "refreshToken": "eyJ..." }
// Response: accessToken mới
```

### Logout

```
POST /auth/logout
```
Truyền `refreshToken` trong body để invalidate.

---

## 3. Roles

| Role | Quyền |
|------|-------|
| `admin` | Toàn quyền trên club |
| `treasurer` | Xem + xác nhận thu quỹ, nhập chi phí |
| `member` | Xem dữ liệu cá nhân |

Endpoint có chú thích `[admin]`, `[treasurer+]`, hoặc `[member+]` để chỉ role tối thiểu cần thiết.

---

## 4. Clubs API

```
GET    /clubs/:id                    [member+]  Thông tin club
PATCH  /clubs/:id/settings           [admin]    Cập nhật cài đặt club (tên, logo URL, v.v.)
```

---

## 5. Members API

```
GET    /clubs/:clubId/members              [admin]    Danh sách thành viên
POST   /clubs/:clubId/members              [admin]    Tạo thành viên mới
GET    /clubs/:clubId/members/:id          [admin]    Chi tiết thành viên
PATCH  /clubs/:clubId/members/:id          [admin]    Cập nhật thông tin / role / trạng thái
DELETE /clubs/:clubId/members/:id          [admin]    Xóa thành viên (chỉ khi chưa có giao dịch)
```

---

## 6. Fund Periods API

```
GET    /clubs/:clubId/fund-periods           [member+]  Danh sách kỳ quỹ
POST   /clubs/:clubId/fund-periods           [admin]    Tạo kỳ mới
GET    /clubs/:clubId/fund-periods/:id       [member+]  Chi tiết kỳ
GET    /clubs/:clubId/fund-periods/:id/summary [admin]  Tổng quan thu/chi, bill thành viên
POST   /clubs/:clubId/fund-periods/:id/close [admin]    Đóng kỳ (lock dữ liệu)
```

---

## 7. Contributions API

```
GET    /clubs/:clubId/contributions                [treasurer+]  Danh sách thu quỹ (filter by period, member)
POST   /clubs/:clubId/contributions                [treasurer+]  Thêm khoản đóng quỹ
PATCH  /clubs/:clubId/contributions/:id            [treasurer+]  Sửa khoản (khi chưa xác nhận)
DELETE /clubs/:clubId/contributions/:id            [admin]       Xóa khoản
POST   /clubs/:clubId/contributions/:id/confirm    [treasurer+]  Xác nhận khoản đóng
GET    /clubs/:clubId/contributions/mine           [member+]     Lịch sử đóng quỹ cá nhân
```

---

## 8. Expenses API

```
GET    /clubs/:clubId/expenses           [treasurer+]  Danh sách chi phí (filter by period, type)
POST   /clubs/:clubId/expenses           [treasurer+]  Nhập chi phí mới
PATCH  /clubs/:clubId/expenses/:id       [treasurer+]  Sửa chi phí
DELETE /clubs/:clubId/expenses/:id       [admin]       Xóa chi phí
```

Body khi tạo chi phí:
```json
{
  "name": "Thuê sân tháng 7",
  "amount": 2000000,
  "date": "2026-07-15",
  "type": "court",        // "court" | "living"
  "fundPeriodId": "uuid"
}
```

---

## 9. Attendance API

```
GET    /clubs/:clubId/attendance/sessions             [member+]     Danh sách buổi
POST   /clubs/:clubId/attendance/sessions             [treasurer+]  Tạo buổi mới
PATCH  /clubs/:clubId/attendance/sessions/:id         [treasurer+]  Cập nhật buổi (courtCost, ngày)
DELETE /clubs/:clubId/attendance/sessions/:id         [admin]       Xóa buổi
POST   /clubs/:clubId/attendance/sessions/:id/record  [treasurer+]  Nhập điểm danh (danh sách memberId)
GET    /clubs/:clubId/attendance/sessions/:id/records [member+]     Xem điểm danh buổi
```

---

## 10. Reports API

```
GET  /clubs/:clubId/reports/summary     [admin]    Báo cáo tổng thu/chi kỳ, bill thành viên
GET  /clubs/:clubId/reports/pdf         [admin]    Tải PDF báo cáo (query: ?periodId=uuid)
```

Response `summary`:
```json
{
  "period": { "id": "uuid", "name": "Tháng 7/2026" },
  "totalIncome": 5000000,
  "totalExpense": 4200000,
  "balance": 800000,
  "memberBills": [
    {
      "memberId": "uuid",
      "memberName": "Nguyễn Văn A",
      "courtFee": 200000,
      "livingFee": 150000,
      "totalPaid": 400000,
      "balance": 50000
    }
  ]
}
```

---

## 11. Personal Receipts API

```
GET   /clubs/:clubId/personal-receipts            [member+]  Phiếu cá nhân các kỳ
GET   /clubs/:clubId/personal-receipts/:periodId  [member+]  Phiếu cá nhân kỳ cụ thể
POST  /clubs/:clubId/personal-receipts/generate   [admin]    Sinh lại toàn bộ phiếu kỳ
GET   /clubs/:clubId/personal-receipts/:periodId/pdf [member+] Tải PDF phiếu cá nhân
```

---

## 12. Error Response Format

```json
{
  "statusCode": 400,
  "message": "validation error",
  "error": "Bad Request"
}
```

| statusCode | Ý nghĩa |
|------------|---------|
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Chưa xác thực / token hết hạn |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy resource |
| 409 | Conflict (ví dụ: kỳ đã đóng) |
| 500 | Lỗi server |

---

## 13. Rate Limiting

- Mặc định: **100 request/phút** per IP
- Endpoint login: **10 request/phút** per IP (chống brute force)
- Vượt giới hạn: HTTP 429 `Too Many Requests`

Header response khi gần đạt giới hạn:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1751234567
```

---

## 14. Swagger UI

Truy cập đầy đủ schema, thử API trực tiếp:
```
https://your-domain.com/api/docs
```

> Swagger chỉ khả dụng khi `ENABLE_SWAGGER=true` trong `.env.production`.
