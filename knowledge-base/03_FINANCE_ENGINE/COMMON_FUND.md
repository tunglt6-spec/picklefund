# Quỹ Chính (Common Fund)

**Mục đích:** Mô tả chi tiết nghiệp vụ Quỹ Chính  
**Đối tượng:** Developer, CLB Admin  
**Cập nhật:** 2026-06-29

---

## Định nghĩa

**Quỹ Chính** là quỹ vận hành chính thức của CLB, bao gồm:
- **Thu:** Quỹ thành viên đóng theo kỳ
- **Chi:** Tiền sân, sinh hoạt, hoạt động CLB
- **Số dư:** Chuyển sang kỳ tiếp theo (carry forward)

---

## Vòng đời kỳ quỹ

### 1. Tạo kỳ mới (OPEN)
- Admin tạo kỳ mới với tên và thời gian
- Hệ thống tự inject `carryForwardBalance` từ kỳ trước (nếu có)
- Bắt đầu thu/chi

### 2. Ghi nhận thu (Contributions)
- Từng thành viên đóng quỹ theo số tiền kỳ
- Lưu vào bảng `contributions`

### 3. Ghi nhận chi (Expenses)
- **Chi phí sân:** Type = `COURT`
- **Chi sinh hoạt:** Type = `ACTIVITY`
- **Chi hoạt động CLB:** Type = `OTHER`

### 4. Đóng kỳ (CLOSED)
- Admin click "Đóng kỳ"
- Không cho phép thêm/sửa giao dịch
- Vẫn chưa chuyển số dư

### 5. Finalize kỳ (FINALIZED)
- Admin confirm quyết toán
- Hệ thống tính toán số dư còn lại
- Số dư này trở thành `carryForwardBalance` của kỳ tiếp

---

## Công thức thu

```
Tổng thu kỳ = Σ contributions.amount (của kỳ đó)
```

---

## Công thức chi

```
Tổng chi kỳ = Σ expenses.amount (của kỳ đó)
            = Chi sân + Chi sinh hoạt + Chi khác
```

**Phân bổ chi phí sân cho thành viên:**
```
Phần sân của thành viên X = Tổng chi sân / memberCount
```

**Phân bổ chi sinh hoạt cho thành viên:**
```
Phần sinh hoạt của X = Tổng chi sinh hoạt × (Buổi X tham dự / Tổng buổi kỳ)
```

---

## Số dư Quỹ Chính trong kỳ

```
Số dư = carryForwardBalance + Tổng thu - Tổng chi
```

---

## Lưu ý quan trọng

- Quỹ Chính KHÔNG bao gồm bất kỳ khoản nào từ Quỹ Phụ
- `carryForwardBalance` được inject từ `fund-periods.service`, KHÔNG tự tính trong calculator
- Xem ADR-002 để hiểu tại sao thiết kế như vậy
