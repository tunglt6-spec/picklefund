# Báo cáo tài chính PickleFund

**Mục đích:** Mô tả các loại báo cáo  
**Đối tượng:** Developer, CLB Admin  
**Cập nhật:** 2026-06-29

---

## 1. Báo cáo kỳ (Period Report)

Tổng quan tài chính của một kỳ quỹ.

**Nội dung:**
- Số dư đầu kỳ (carryForwardBalance)
- Tổng thu kỳ (breakdown theo thành viên)
- Tổng chi kỳ (breakdown theo loại chi)
- Số dư cuối kỳ

**API:** `GET /reports/period/:id`

---

## 2. Phiếu thu thành viên

Xem chi tiết tại [MEMBER_RECEIPTS.md](MEMBER_RECEIPTS.md)

---

## 3. Báo cáo Quỹ Phụ

Tổng quan thu/chi của từng Quỹ Phụ.

**Nội dung:**
- Số dư hiện tại
- Lịch sử thu
- Lịch sử chi

---

## Lỗi phổ biến trong báo cáo

### Double-count totalExpense (Bug đã fix V2.0 RC1)

**Vấn đề:** Tổng chi phí bị tính double do gộp nhầm expenses từ cả Quỹ Chính và Quỹ Phụ.

**Fix:** Tách filter rõ ràng — expenses của Quỹ Chính và Quỹ Phụ dùng nguồn dữ liệu khác nhau.

**Trạng thái:** Fix trong V2.0 RC1, hotfix đang pending commit.

---

## Công thức báo cáo bắt buộc

### Chi phí sân — chia đều:
```
Mỗi thành viên = Tổng chi phí sân / memberCount
```

### Chi phí sinh hoạt — theo buổi tham dự:
```
Thành viên X = Tổng chi sinh hoạt × (Buổi X tham dự / Tổng buổi kỳ)
```

**KHÔNG được dùng công thức khác** nếu chưa có ADR mới ghi đè.
