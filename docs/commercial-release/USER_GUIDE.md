# PickleFund V2.0 — Hướng Dẫn Thành Viên

## 1. Giới thiệu

PickleFund là ứng dụng quản lý tài chính câu lạc bộ Pickleball. Thành viên dùng để xem số dư quỹ, lịch sử đóng tiền, và phiếu chi phí cá nhân từng kỳ.

---

## 2. Đăng nhập

- Truy cập URL câu lạc bộ (do Admin cung cấp), ví dụ: `https://pick.yourclub.com`
- Nhập **username** và **password** do Admin cấp
- Nhấn **Đăng nhập**

**Quên mật khẩu:** Liên hệ Admin để reset. Hiện tại hệ thống chưa hỗ trợ tự reset qua email.

---

## 3. Dashboard thành viên

Sau khi đăng nhập, Dashboard hiển thị:
- Kỳ quỹ đang hoạt động (tên kỳ, ngày bắt đầu)
- Tổng số buổi đã tham dự trong kỳ
- Tổng đã đóng quỹ chung / quỹ mini
- Số dư cá nhân ước tính (nếu kỳ chưa đóng, số liệu tạm thời)

---

## 4. Xem kỳ quỹ hiện tại

**Menu:** Kỳ Quỹ → Kỳ hiện tại

Hiển thị:
- Tổng thu (quỹ chung + quỹ mini)
- Tổng chi (phí sân + sinh hoạt phí)
- Số dư kỳ
- Danh sách buổi đã điểm danh

> Kỳ quỹ chưa "Đóng kỳ" thì số liệu có thể thay đổi.

---

## 5. Xem lịch sử đóng quỹ cá nhân

**Menu:** Thu Quỹ → Của tôi

Hiển thị tất cả lần đóng quỹ chung (Quỹ Chung) và quỹ game (Quỹ Mini) theo từng kỳ. Mỗi dòng gồm: ngày đóng, số tiền, trạng thái xác nhận (Đã xác nhận / Chờ xác nhận).

---

## 6. Phiếu tài chính cá nhân

**Menu:** Phiếu Cá Nhân

Phiếu tài chính tổng hợp cho từng kỳ, gồm:

| Mục | Mô tả |
|-----|-------|
| **Phí sân (courtFee)** | Chi phí sân chia đều cho tất cả thành viên trong kỳ |
| **Sinh hoạt phí (livingFee)** | Chi phí sinh hoạt phân bổ theo tỉ lệ buổi tham dự |
| **Đã đóng quỹ** | Tổng tiền đã nộp trong kỳ |
| **Số dư (balance)** | Đã đóng − (courtFee + livingFee) |

**Xuất PDF:** Nhấn nút **Xuất PDF** trên phiếu để tải về file PDF cá nhân.

> Số dư dương = thành viên đang thừa tiền. Số dư âm = còn thiếu.

---

## 7. Xem báo cáo CLB

Nếu Admin cấp quyền xem báo cáo, vào **Menu:** Báo Cáo để xem:
- Tổng thu/chi toàn kỳ
- Danh sách bill từng thành viên
- Xuất PDF báo cáo tổng

---

## 8. Thay đổi mật khẩu

**Menu:** Hồ Sơ → Đổi Mật Khẩu

Nhập mật khẩu cũ, mật khẩu mới (tối thiểu 8 ký tự), xác nhận mật khẩu mới → **Lưu**.

---

## 9. FAQ

**Q: Tại sao số tiền của tôi không khớp với tính toán thủ công?**
Phí sân chia đều cho *tất cả thành viên active* trong kỳ (kể cả người vắng). Sinh hoạt phí phân bổ theo số buổi tham dự. Xem công thức chi tiết ở Phiếu Cá Nhân.

**Q: Khi nào khoản đóng quỹ được xác nhận?**
Admin hoặc Treasurer xác nhận thủ công sau khi kiểm tra chuyển khoản. Thường trong vòng 24–48 giờ.

**Q: Tôi đóng tiền rồi nhưng không thấy trong hệ thống?**
Liên hệ Admin. Có thể Admin chưa nhập hoặc chưa xác nhận.

**Q: Kỳ quỹ "Đóng kỳ" có nghĩa gì?**
Admin đã chốt số liệu kỳ đó. Sau khi đóng, dữ liệu không thay đổi và phiếu cá nhân là chính thức.

**Q: Phiếu PDF có giá trị pháp lý không?**
Phiếu PDF là tài liệu nội bộ CLB, không phải hóa đơn tài chính chính thức.
