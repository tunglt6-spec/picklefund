# PickleFund V2.0 — Hướng Dẫn Admin

## 1. Dashboard Admin

Trang chủ Admin hiển thị:
- Kỳ quỹ đang active (tên, ngày bắt đầu, tổng thu/chi tạm tính)
- Số thành viên active
- Số buổi trong kỳ
- Cảnh báo: khoản đóng chờ xác nhận, chi phí chưa phân loại

---

## 2. Quản lý thành viên

**Menu:** Thành Viên

### Thêm thành viên
1. Nhấn **Thêm thành viên**
2. Nhập: họ tên, username, email (tùy chọn), mật khẩu tạm
3. Chọn vai trò: **Member** / **Treasurer** / **Admin**
4. Trạng thái: **Active** / **Inactive**
5. Nhấn **Lưu** — hệ thống tạo tài khoản ngay

### Sửa thành viên
Nhấn biểu tượng chỉnh sửa trên dòng thành viên → cập nhật thông tin → **Lưu**.

### Xóa / Deactivate
- **Deactivate** (khuyến nghị): thành viên không đăng nhập được, không phát sinh chi phí kỳ mới, dữ liệu lịch sử giữ nguyên.
- **Xóa**: xóa vĩnh viễn. Chỉ dùng khi thành viên chưa có giao dịch nào.

### Phân quyền
- **Member**: xem dữ liệu cá nhân
- **Treasurer**: xem + xác nhận thu quỹ, nhập chi phí
- **Admin**: toàn quyền

---

## 3. Kỳ Quỹ (Fund Periods)

**Menu:** Kỳ Quỹ

### Tạo kỳ mới
1. Nhấn **Tạo kỳ mới**
2. Nhập tên kỳ (ví dụ: "Tháng 7/2026"), ngày bắt đầu, ngày kết thúc dự kiến
3. Nhấn **Tạo** — kỳ mới ở trạng thái **Active**

> Chỉ có 1 kỳ Active tại một thời điểm.

### Xem summary kỳ
Chọn kỳ → tab **Tổng quan**: tổng thu, tổng chi, số dư, danh sách thành viên và bill từng người.

### Đóng kỳ
Nhấn **Đóng kỳ** → xác nhận. Sau khi đóng:
- Dữ liệu kỳ bị khóa, không sửa được
- Phiếu cá nhân trở thành chính thức
- Hệ thống cho phép tạo kỳ mới

---

## 4. Điểm danh (Attendance)

**Menu:** Điểm Danh

### Tạo buổi
1. Nhấn **Tạo buổi mới**
2. Nhập: ngày, sân (court name), phí sân (số tiền tổng), số thành viên tham dự
3. Nhấn **Lưu**

### Nhập điểm danh
Chọn buổi → **Điểm danh** → tick checkbox từng thành viên có mặt → **Lưu**.

### Chỉnh sửa phí sân
Trong buổi đã tạo → **Sửa** → cập nhật `courtCost` → **Lưu**. Hệ thống tự tính lại phí sân phân bổ.

> Phí sân tổng của kỳ = tổng `courtCost` tất cả buổi. Chia đều cho memberCount active.

---

## 5. Thu quỹ chung (Contributions)

**Menu:** Thu Quỹ → Quỹ Chung

### Thêm khoản đóng
1. Nhấn **Thêm**
2. Chọn thành viên, nhập số tiền, ngày đóng, ghi chú (tùy chọn)
3. Nhấn **Lưu** — khoản vào trạng thái **Chờ xác nhận**

### Xác nhận khoản đóng
Chọn khoản → **Xác nhận** (sau khi đã kiểm tra chuyển khoản thực tế).

### Xuất danh sách
Nhấn **Xuất CSV** hoặc **Xuất PDF** để lấy danh sách thu quỹ kỳ hiện tại.

---

## 6. Thu quỹ mini (Minigame Fund)

**Menu:** Thu Quỹ → Quỹ Mini

Tương tự Quỹ Chung nhưng gắn với Kỳ Mini (mini fund period). Dùng để track riêng tiền game, tách biệt với quỹ vận hành CLB.

### Tạo kỳ mini
1. Vào Quỹ Mini → **Tạo kỳ mini**
2. Nhập tên, liên kết với kỳ quỹ chính nếu cần
3. Thêm khoản thu game theo từng thành viên

---

## 7. Chi quỹ chung (Expenses)

**Menu:** Chi Quỹ → Quỹ Chung

### Nhập chi phí
1. Nhấn **Thêm chi phí**
2. Nhập: tên khoản, số tiền, ngày, **loại chi phí**:
   - **Phí sân (Court)**: chia đều tất cả thành viên
   - **Sinh hoạt (Living)**: phân bổ theo tỉ lệ buổi tham dự
3. Nhấn **Lưu**

> Phân loại đúng loại chi phí để công thức phân bổ chính xác.

### Sửa / Xóa chi phí
Cho phép khi kỳ chưa đóng. Sau khi đóng kỳ, chi phí bị khóa.

---

## 8. Chi quỹ mini (Minigame Expenses)

**Menu:** Chi Quỹ → Quỹ Mini

Nhập chi phí phát sinh từ hoạt động game (giải thưởng, thiết bị mini, v.v.). Không ảnh hưởng đến phiếu cá nhân quỹ chính.

---

## 9. Báo cáo tài chính

**Menu:** Báo Cáo

### Xem tổng quan
- Tổng thu / tổng chi / số dư kỳ
- Breakdown: phí sân, sinh hoạt phí, quỹ mini
- Biểu đồ thu chi (nếu có)

### Bill thành viên
Tab **Bill thành viên**: danh sách từng người với `courtFee`, `livingFee`, `tổng đóng`, `balance`.

### Xuất PDF báo cáo
Nhấn **Xuất PDF** → chọn kỳ → tải file. File bao gồm tổng quan CLB và bill từng thành viên.

---

## 10. Infographic

**Menu:** Báo Cáo → Infographic

- **Xuất ảnh tổng quan**: PNG tóm tắt thu chi kỳ, dùng đăng nhóm Zalo/Facebook
- **Xuất bill thành viên**: PNG bill cá nhân từng người

Chọn kỳ → chọn loại ảnh → **Tải PNG**.

---

## 11. Quản lý phân quyền

**Menu:** Thành Viên → chọn thành viên → **Phân quyền**

Thay đổi role có hiệu lực ngay. Thành viên cần đăng xuất và đăng nhập lại để nhận quyền mới.

---

## 12. Quy trình vận hành hằng tháng (SOP)

```
1. Tạo kỳ quỹ mới (đầu tháng)
2. Nhập từng buổi điểm danh (theo tuần / sau mỗi buổi)
3. Xác nhận khoản thu quỹ từ thành viên
4. Nhập chi phí sân + sinh hoạt khi phát sinh
5. Cuối kỳ: review summary, kiểm tra balance
6. Đóng kỳ → thông báo thành viên xem phiếu cá nhân
7. Xuất PDF báo cáo lưu trữ
8. (Tùy chọn) Xuất Infographic gửi nhóm
```

---

## 13. Minigame — Bốc thăm đội

**Menu:** Minigame

### Bốc thăm đội (Random Doubles Draw)
1. Chọn danh sách người chơi có mặt (tick từ danh sách thành viên)
2. Nhấn **Bốc thăm** → hệ thống random chia đội đôi
3. Xem kết quả ghép cặp → có thể **Bốc lại** nếu muốn

### Nhập kết quả
Sau trận → nhập điểm từng cặp → **Lưu kết quả**.

### Xem lịch sử
Tab **Lịch sử** → danh sách trận đã chơi, điểm số, ngày.
