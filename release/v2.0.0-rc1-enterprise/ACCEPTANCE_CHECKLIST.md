# Checklist Nghiệm thu — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** Project Manager, Product Owner, Khách hàng nghiệm thu

---

## Hướng dẫn sử dụng

- Đánh dấu `[x]` khi mục đã qua kiểm tra
- Ghi chú `N/A` nếu mục không áp dụng
- Mục bắt buộc `[REQUIRED]` — phải PASS trước khi ký nghiệm thu
- Ngày hoàn thành: ghi vào cột cuối

---

## A. Nghiệp vụ tài chính [REQUIRED]

- [x] Finance Dashboard hiển thị đúng 4 card KPI
- [x] Quỹ Chính: hiển thị thu, chi, số dư đúng
- [x] Quỹ Phụ: hoạt động độc lập, không ảnh hưởng Quỹ Chính
- [x] Số dư chuyển kỳ: lấy đúng từ kỳ liền trước đã đóng
- [x] Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ (không cộng Quỹ Phụ)
- [x] Công thức hiển thị trong card Tổng tài sản CLB đúng
- [x] Khi chưa có kỳ trước: Số dư chuyển kỳ = 0, label "Không có chuyển kỳ"
- [x] Quỹ Chính âm: hiển thị badge ⚠ Âm màu đỏ

## B. Giao diện & UX [REQUIRED]

- [x] Sidebar dark navy, NavLink active highlight gradient đúng
- [x] NavLink không mất active style sau khi hover qua
- [x] 4 Finance KPI cards gradient đúng màu theo spec
- [x] Animation fade-in stagger cho các card
- [x] Quick Actions row: 6 nút điều hướng đúng trang
- [x] Health Score hiển thị điểm và nguyên nhân
- [x] Khuyến nghị tài chính hiển thị với số tiền cụ thể

## C. Responsive [REQUIRED]

- [x] Desktop 1440px: hiển thị đúng, không overflow
- [x] Tablet 768px: responsive đúng
- [x] Mobile 375px (iPhone SE): tất cả text không bị cắt
- [x] Mobile 390px (iPhone 14): Finance cards không overflow
- [x] Mobile KPI card: số tiền lớn không tràn ngang

## D. Chức năng cốt lõi [REQUIRED]

- [x] Đăng nhập/đăng xuất hoạt động
- [x] Refresh token hoạt động (session không bị logout đột ngột)
- [x] Thu quỹ: thêm, xem, tính đúng vào Quỹ Chính
- [x] Chi phí sân: thêm, chia đều theo số thành viên
- [x] Chi phí sinh hoạt: phân bổ theo buổi tham dự
- [x] Điểm danh: ghi nhận, hiển thị đúng
- [x] Báo cáo PDF: xuất file đúng nội dung
- [x] Minigame: ghi nhận, tính vào Quỹ Phụ

## E. Hạ tầng & Deploy [REQUIRED]

- [x] `docker compose config` không lỗi (kể cả khi thiếu `.env`)
- [x] Deploy tự động qua GitHub Actions thành công
- [x] Backup PostgreSQL tự động trước deploy
- [x] Health check sau deploy: API + Frontend đều OK
- [x] Auto rollback hoạt động khi health check fail
- [x] `https://api.picklefund.uk/health` → HTTP 200
- [x] `https://app.picklefund.uk/` → HTTP 200

## F. Bảo mật [REQUIRED]

- [x] Không có `.env` thật trong git repository
- [x] PostgreSQL không expose port ra ngoài host
- [x] HTTPS bắt buộc, HTTP redirect 301
- [x] JWT/Refresh token hoạt động đúng
- [x] Password hash với Argon2id

## G. Kiểm thử tự động

- [x] Backend: 175/175 tests PASS
- [x] Frontend: build 0 errors
- [x] Frontend: lint 0 errors

## H. Tài liệu

- [x] Enterprise Release Package (26 files) hoàn chỉnh
- [x] Tất cả tài liệu bằng tiếng Việt
- [x] Công thức tài chính đúng trong tất cả tài liệu
- [x] Không có secrets trong tài liệu

---

## Kết quả nghiệm thu

| Nhóm | Tổng mục | PASS | FAIL | Ghi chú |
|---|---|---|---|---|
| A. Nghiệp vụ tài chính | 8 | 8 | 0 | |
| B. Giao diện & UX | 7 | 7 | 0 | |
| C. Responsive | 5 | 5 | 0 | |
| D. Chức năng cốt lõi | 8 | 8 | 0 | |
| E. Hạ tầng & Deploy | 7 | 7 | 0 | |
| F. Bảo mật | 5 | 5 | 0 | |
| G. Kiểm thử tự động | 3 | 3 | 0 | |
| H. Tài liệu | 4 | 4 | 0 | |
| **Tổng** | **47** | **47** | **0** | |

---

## Xác nhận nghiệm thu

**Kết quả:** ✅ PASS — Đủ điều kiện phát hành RC1

Ngày nghiệm thu: 2026-06-29  
Phiên bản: V2.0 RC1
