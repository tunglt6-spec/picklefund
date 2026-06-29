# Hướng dẫn Quản trị — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** Admin CLB — người quản lý tài chính và hoạt động của Câu lạc bộ

---

## 1. Vai trò Admin CLB

Admin CLB là người có quyền truy cập toàn bộ tính năng của PickleFund, bao gồm:
- Xem và quản lý Finance Dashboard
- Tạo và quản lý kỳ tài chính
- Thêm/sửa/xóa thành viên
- Ghi nhận thu quỹ và chi phí
- Điểm danh buổi tập
- Xuất báo cáo PDF
- Quản lý Minigame / Quỹ Phụ

---

## 2. Finance Dashboard

### 2.1 Đọc 4 chỉ số KPI

| Card | Màu | Ý nghĩa |
|---|---|---|
| **Quỹ Chính** | Xanh lá (Emerald) | Số dư vận hành chính: thu quỹ thành viên trừ chi phí sân, sinh hoạt, hoạt động |
| **Quỹ Phụ** | Tím (Purple) | Số dư phụ trợ: minigame, thưởng, tài trợ — hoạt động độc lập |
| **Số dư chuyển kỳ** | Cam (Orange) | Số dư Quỹ Chính từ kỳ liền trước đã đóng |
| **Tổng tài sản CLB** | Xanh dương (Blue) | = Quỹ Chính + Số dư chuyển kỳ |

> 📌 **Quan trọng:** Quỹ Phụ KHÔNG cộng vào Tổng tài sản CLB. Hai quỹ hoạt động hoàn toàn độc lập.

### 2.2 Health Score

Health Score (Sức khỏe tài chính) phản ánh tình trạng tổng quan:
- **Tốt (≥ 80):** Quỹ Chính dương, thu/chi cân đối
- **Cảnh báo (50-79):** Quỹ Chính thấp hoặc chưa cân đối
- **Nguy hiểm (< 50):** Quỹ Chính âm hoặc Tổng tài sản âm

### 2.3 Quick Actions

Row phía dưới dashboard có 6 nút truy cập nhanh:
- **Điểm danh** → Ghi nhận buổi tập
- **Thu quỹ** → Ghi nhận thành viên đóng quỹ
- **Chi phí** → Ghi nhận chi tiêu của CLB
- **Minigame** → Quản lý Quỹ Phụ
- **Báo cáo** → Xuất báo cáo PDF
- **Lisa AI** → Trợ lý AI tài chính

---

## 3. Quản lý kỳ tài chính

### 3.1 Cấu trúc kỳ tài chính

Mỗi CLB hoạt động theo các **kỳ tài chính** (fund period). Thông thường là 1 tháng hoặc 1 quý.

### 3.2 Tạo kỳ mới

1. Vào menu **Kỳ tài chính**
2. Nhấn **Tạo kỳ mới**
3. Điền tên kỳ, ngày bắt đầu, ngày kết thúc
4. Nhấn **Xác nhận**

> Kỳ mới sẽ tự động nhận `Số dư chuyển kỳ` từ kỳ liền trước đã đóng.

### 3.3 Đóng kỳ (Close Period)

Khi kỳ kết thúc:
1. Đảm bảo đã ghi nhận đầy đủ thu chi
2. Nhấn **Đóng kỳ**
3. Hệ thống lưu số dư Quỹ Chính làm `carryForward` cho kỳ tiếp

> ⚠️ Sau khi đóng kỳ, không thể thêm thu chi vào kỳ đó nữa.

---

## 4. Quản lý thành viên

### 4.1 Thêm thành viên
1. Vào menu **Thành viên**
2. Nhấn **Thêm thành viên**
3. Điền tên, email, số điện thoại, ngày tham gia
4. Nhấn **Lưu**

### 4.2 Sửa/Xóa thành viên
- Nhấn vào tên thành viên → **Sửa** hoặc **Xóa**
- Xóa thành viên không xóa lịch sử thu quỹ đã ghi nhận

### 4.3 Phân quyền
- **Admin:** Toàn quyền
- **Member:** Chỉ xem lịch sử cá nhân, điểm danh

---

## 5. Thu quỹ

### 5.1 Ghi nhận thu quỹ thành viên

1. Vào **Thu quỹ** (hoặc nhấn Quick Action)
2. Chọn kỳ tài chính
3. Chọn thành viên
4. Nhập số tiền, ngày, ghi chú (nếu có)
5. Nhấn **Lưu**

### 5.2 Phiếu thu điện tử

Sau khi ghi nhận, có thể xuất **Phiếu thu** gửi cho thành viên.

---

## 6. Chi phí

### 6.1 Loại chi phí

| Loại | Quỹ | Công thức |
|---|---|---|
| Chi phí sân | Quỹ Chính | Chia đều theo số thành viên buổi đó |
| Sinh hoạt | Quỹ Chính | Tỉ lệ theo số buổi tham dự trong kỳ |
| Hoạt động CLB | Quỹ Chính | Phân bổ theo quyết định |
| Minigame | Quỹ Phụ | Độc lập |

### 6.2 Ghi nhận chi phí

1. Vào **Chi phí**
2. Chọn loại chi phí
3. Nhập số tiền, ngày, mô tả
4. Nhấn **Lưu**

---

## 7. Điểm danh

1. Vào **Điểm danh**
2. Chọn ngày buổi tập
3. Tick chọn thành viên có mặt
4. Nhấn **Lưu điểm danh**

Điểm danh ảnh hưởng đến phân bổ chi phí sinh hoạt cuối kỳ.

---

## 8. Báo cáo PDF

1. Vào **Báo cáo**
2. Chọn kỳ tài chính cần xuất
3. Nhấn **Xuất PDF**
4. File PDF tải về — có thể chia sẻ cho thành viên

Báo cáo bao gồm: Tổng thu, Tổng chi, Số dư, Chi tiết từng thành viên.

---

## 9. Lỗi thường gặp (Admin)

### Số dư chuyển kỳ = 0 dù kỳ trước có số dư
→ Kiểm tra xem kỳ trước đã được **đóng** chưa. Chỉ kỳ có trạng thái `closed`/`finalized` mới tạo carryForward.

### Không thể thêm thu chi
→ Kiểm tra xem kỳ tài chính đang ở trạng thái `active`. Kỳ đã đóng không nhận thêm giao dịch.

### Báo cáo PDF không có dữ liệu
→ Đảm bảo đã ghi nhận thu chi và điểm danh trong kỳ đó.
