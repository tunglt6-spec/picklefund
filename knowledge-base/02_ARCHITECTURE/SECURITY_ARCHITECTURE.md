# Kiến trúc Bảo mật PickleFund

**Mục đích:** Mô tả các lớp bảo mật  
**Đối tượng:** Developer, Security  
**Cập nhật:** 2026-06-29

---

## 1. Password Security

- **Algorithm:** Argon2 (không dùng bcrypt hay MD5)
- Plain text password KHÔNG được lưu ở bất kỳ đâu
- Password hash chỉ lưu trong bảng `users.passwordHash`

---

## 2. Token Strategy

### Access Token (JWT)
- Short-lived (ví dụ: 15 phút)
- Chứa: `userId`, `clubId`, `role`
- Ký bằng `JWT_SECRET`

### Refresh Token
- Long-lived (ví dụ: 7 ngày)
- Random string, KHÔNG phải JWT
- Hash trước khi lưu Redis
- Khi dùng: verify hash, sau đó rotate (issue mới, xóa cũ)

---

## 3. Multi-tenant Isolation

- Mọi request đều phải có JWT hợp lệ
- `clubId` extract từ JWT, không nhận từ request body
- Guard enforce `clubId` filter trên mọi DB query
- Không có cross-tenant data access

---

## 4. Network Security

- Backend KHÔNG expose port ra host machine
- Chỉ Nginx tiếp nhận traffic từ ngoài
- Cloudflare: DDoS protection, SSL termination
- Internal services giao tiếp qua Docker network

---

## 5. Secret Management

- `.env` file trên VPS, KHÔNG commit vào git
- `.gitignore` phải include `.env`
- Rotate secrets định kỳ

---

## 6. CORS

Backend cấu hình CORS cho phép `app.picklefund.uk` và localhost (dev).

---

## 7. SQL Injection Prevention

- TypeORM parameterized queries
- Không dùng raw SQL với user input

---

## 8. Audit Log (Planned)

- Ghi lại mọi thay đổi tài chính quan trọng
- Ai thêm/sửa/xóa giao dịch
- Trạng thái: Planned cho V2.1+
