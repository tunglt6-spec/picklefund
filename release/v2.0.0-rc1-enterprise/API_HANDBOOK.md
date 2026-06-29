# API Handbook — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Base URL:** `https://api.picklefund.uk`  
> **Đối tượng:** Developer tích hợp, Frontend team

---

## 1. Xác thực

### Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "clubId": "uuid"
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

### Sử dụng Access Token

Thêm vào header mọi request cần xác thực:

```http
Authorization: Bearer <accessToken>
```

---

## 2. Health Check

```http
GET /health
```

**Response 200:**
```json
{ "status": "ok" }
```

Không yêu cầu xác thực.

---

## 3. Fund Periods API

### Lấy danh sách kỳ tài chính

```http
GET /api/fund-periods
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Tháng 6/2026",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "status": "active",
    "clubId": "uuid"
  }
]
```

### Lấy summary tài chính của kỳ

```http
GET /api/fund-periods/:id/summary
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "periodId": "uuid",
  "commonFund": {
    "income": 5000000,
    "expense": 3200000,
    "balance": 1800000
  },
  "miniFund": {
    "income": 500000,
    "expense": 200000,
    "balance": 300000
  },
  "carryForward": {
    "balance": 500000,
    "fromPeriodName": "Tháng 5/2026"
  },
  "clubAssets": {
    "balance": 2300000
  }
}
```

**Công thức:** `clubAssets.balance = commonFund.balance + carryForward.balance`  
**Lưu ý:** `miniFund.balance` KHÔNG cộng vào `clubAssets.balance`.

---

## 4. Contributions API (Thu quỹ)

### Lấy danh sách thu quỹ

```http
GET /api/contributions?periodId=uuid
Authorization: Bearer <token>
```

### Tạo thu quỹ mới

```http
POST /api/contributions
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": "uuid",
  "periodId": "uuid",
  "amount": 300000,
  "date": "2026-06-15",
  "note": "Đóng quỹ tháng 6"
}
```

---

## 5. Expenses API (Chi phí)

### Lấy danh sách chi phí

```http
GET /api/expenses?periodId=uuid
Authorization: Bearer <token>
```

### Tạo chi phí mới

```http
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "periodId": "uuid",
  "type": "court",
  "amount": 1500000,
  "date": "2026-06-10",
  "description": "Thuê sân buổi sáng",
  "memberCount": 8
}
```

**Các loại chi phí (`type`):**
- `court` — Chi phí sân (chia đều theo `memberCount`)
- `activity` — Sinh hoạt (tỉ lệ theo số buổi tham dự)
- `club` — Hoạt động CLB
- `minigame` — Quỹ Phụ (không ảnh hưởng Quỹ Chính)

---

## 6. Attendance API (Điểm danh)

### Ghi nhận điểm danh

```http
POST /api/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "periodId": "uuid",
  "date": "2026-06-15",
  "memberIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## 7. Reports API (Báo cáo)

### Xuất báo cáo PDF

```http
GET /api/reports/:periodId/pdf
Authorization: Bearer <token>
```

**Response:** Binary PDF file  
**Content-Type:** `application/pdf`

---

## 8. Members API

### Lấy danh sách thành viên

```http
GET /api/members
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0900000001",
    "joinedAt": "2026-01-01",
    "status": "active"
  }
]
```

---

## 9. Mã lỗi HTTP

| Code | Ý nghĩa |
|---|---|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Chưa xác thực hoặc token hết hạn |
| 403 | Không có quyền truy cập |
| 404 | Không tìm thấy resource |
| 500 | Lỗi server |

**Response lỗi chuẩn:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## 10. Rate limiting & Giới hạn

- Không có rate limiting chính thức trong RC1
- Request timeout: 30 giây
- Upload file tối đa: 10 MB (nếu có)
- Tất cả timestamps theo ISO 8601, timezone UTC+7 (Việt Nam)
