# Phiếu thu thành viên (Member Receipts)

**Mục đích:** Mô tả nghiệp vụ phiếu thu  
**Đối tượng:** Developer, CLB Admin  
**Cập nhật:** 2026-06-29

---

## Định nghĩa

**Phiếu thu thành viên** là tài liệu xác nhận thành viên đã đóng quỹ trong một kỳ, kèm chi tiết phân bổ chi phí.

---

## Nội dung phiếu thu

Phiếu thu gồm:
1. **Thông tin thành viên:** Tên, mã thành viên
2. **Kỳ:** Tên kỳ, thời gian
3. **Quỹ đóng:** Số tiền đóng quỹ kỳ này
4. **Phân bổ chi phí sân:** Tổng chi sân / memberCount
5. **Phân bổ chi sinh hoạt:** Theo tỉ lệ tham dự
6. **Kết quả:** Còn lại / Nợ thêm

---

## Công thức phiếu thu

```
Phần sân = Tổng chi phí sân / memberCount

Phần sinh hoạt = Tổng chi sinh hoạt × (Số buổi X tham dự / Tổng buổi kỳ)

Tổng chi phân bổ = Phần sân + Phần sinh hoạt + Chi khác được phân bổ

Kết quả = Quỹ đóng - Tổng chi phân bổ
  > 0: Còn dư (không hoàn lại, đưa vào carry forward)
  < 0: Thiếu (nợ CLB, cần đóng thêm)
  = 0: Đủ
```

---

## Export PDF

- Phiếu thu có thể xuất PDF ngay trên giao diện
- Format: header CLB, thông tin kỳ, bảng chi tiết, kết quả
- Dùng thư viện PDF của NestJS backend

---

## API

```
GET /reports/receipt/:memberId/:periodId
```

Trả về dữ liệu phiếu thu. Frontend render thành PDF.
