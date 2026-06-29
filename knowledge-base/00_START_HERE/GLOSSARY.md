# Thuật ngữ & Định nghĩa — PickleFund

**Mục đích:** Chuẩn hóa ngôn ngữ dùng trong toàn bộ dự án  
**Đối tượng:** Tất cả thành viên đội ngũ  
**Cập nhật:** 2026-06-29

---

## A

**ADR (Architecture Decision Record)**  
Tài liệu ghi lại một quyết định kiến trúc quan trọng, bao gồm bối cảnh, các lựa chọn đã xem xét, quyết định được chọn, và hệ quả. Xem [08_ADR/](../08_ADR/).

**Argon2**  
Thuật toán hashing mật khẩu hiện đại, được PickleFund dùng để hash password thay vì bcrypt.

---

## C

**Carry Forward (Số dư chuyển kỳ)**  
Số dư Quỹ Chính từ kỳ closed/finalized gần nhất được chuyển sang kỳ mới. Là một phần của Tổng tài sản CLB. KHÔNG phải số dư Quỹ Phụ. Xem [03_FINANCE_ENGINE/CARRY_FORWARD.md](../03_FINANCE_ENGINE/CARRY_FORWARD.md).

**CLB (Câu lạc bộ)**  
Đơn vị tenant trong hệ thống PickleFund. Mỗi CLB có dữ liệu hoàn toàn độc lập.

**Common Fund (Quỹ Chính)**  
Quỹ vận hành chính của CLB. Thu từ quỹ thành viên, chi cho sân, sinh hoạt, hoạt động CLB. Xem [03_FINANCE_ENGINE/COMMON_FUND.md](../03_FINANCE_ENGINE/COMMON_FUND.md).

---

## D

**Dashboard**  
Giao diện tổng quan của CLB. Phiên bản V2.0 có dark sidebar (#0F1629) và gradient KPI cards.

---

## F

**Finance Calculator**  
Module pure function tính toán tài chính. KHÔNG tự lấy dữ liệu — nhận dữ liệu từ caller (fund-periods.service) qua CalculateOptions.

**Fund Period (Kỳ quỹ)**  
Một chu kỳ tài chính của CLB (ví dụ: tháng 6/2026). Có các trạng thái: OPEN → CLOSED → FINALIZED.

**Fund Period Status:**
- `OPEN`: Kỳ đang hoạt động, đang thu/chi
- `CLOSED`: Kỳ đã đóng, không cho phép chỉnh sửa
- `FINALIZED`: Kỳ đã quyết toán, số dư sẽ được chuyển kỳ tiếp theo

---

## J

**JWT (JSON Web Token)**  
Token xác thực người dùng. PickleFund dùng cặp Access Token (ngắn hạn) + Refresh Token (dài hạn).

---

## K

**KPI Card**  
Thẻ hiển thị chỉ số quan trọng trên Dashboard. Phiên bản V2.0 dùng gradient màu sắc.

---

## L

**LiteLLM**  
Gateway proxy thống nhất cho nhiều LLM provider khác nhau. Planned cho V2.1 AI Platform.

---

## M

**Maika**  
AI Teammate chuyên về tài chính và báo cáo. Planned cho V2.1.

**Member Receipt (Phiếu thu thành viên)**  
Tài liệu xác nhận thành viên đã đóng quỹ cho một kỳ. Có thể xuất PDF.

**Mini Fund (Quỹ Phụ/Quỹ Mini)**  
Quỹ phụ trợ độc lập của CLB (minigame, thưởng, tài trợ). Hoàn toàn tách biệt với Quỹ Chính. Xem [03_FINANCE_ENGINE/AUXILIARY_FUND.md](../03_FINANCE_ENGINE/AUXILIARY_FUND.md).

**Multi-tenant**  
Kiến trúc một hệ thống phục vụ nhiều CLB, mỗi CLB (tenant) có dữ liệu riêng biệt và cô lập.

---

## N

**NavLink**  
Component React Router dùng để tạo link điều hướng có trạng thái active. PickleFund dùng `className` callback thay vì `classList.contains('active')`.

---

## P

**PickleFund**  
Tên sản phẩm. Nền tảng SaaS quản lý tài chính CLB Pickleball.

---

## Q

**Quỹ Chính** → Xem Common Fund  
**Quỹ Phụ** → Xem Mini Fund

---

## R

**Refresh Token**  
Token dài hạn dùng để lấy Access Token mới khi hết hạn. Được hash bằng Argon2 trước khi lưu DB.

**RC (Release Candidate)**  
Phiên bản ứng viên phát hành. V2.0 RC1 là phiên bản baseline hiện tại.

---

## S

**SaaS (Software as a Service)**  
Mô hình phần mềm dịch vụ. PickleFund cung cấp nền tảng quản lý tài chính như một dịch vụ.

**Sidebar**  
Thanh điều hướng bên trái. V2.0 dùng màu nền #0F1629 (dark navy).

---

## T

**Tenant** → Xem CLB

**Tổng tài sản CLB**  
`Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ`  
Quỹ Phụ KHÔNG được cộng vào đây. Xem [03_FINANCE_ENGINE/CLUB_ASSETS.md](../03_FINANCE_ENGINE/CLUB_ASSETS.md).

---

## V

**VPS (Virtual Private Server)**  
Máy chủ ảo nơi production của PickleFund đang chạy.
