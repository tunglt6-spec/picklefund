# Tổng quan Nghiệp vụ Tài chính PickleFund

**Mục đích:** Giới thiệu toàn bộ mô hình tài chính  
**Đối tượng:** Tất cả (Developer, PM, Sales, CLB Admin)  
**Cập nhật:** 2026-06-29

---

## Mô hình tài chính tổng quát

PickleFund quản lý tài chính CLB theo mô hình **hai quỹ độc lập**:

```
CLB Pickleball
├── Quỹ Chính (Common Fund)
│   ├── Thu: Quỹ thành viên
│   ├── Chi: Sân, sinh hoạt, hoạt động CLB
│   └── Số dư → Chuyển kỳ tiếp
│
└── Quỹ Phụ (Mini Fund) — ĐỘC LẬP
    ├── Thu: Minigame, tài trợ, thưởng
    ├── Chi: Thưởng, giải thưởng
    └── Số dư → Quản lý riêng
```

---

## Công thức cốt lõi

### Tổng tài sản CLB
```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
```

> **TUYỆT ĐỐI KHÔNG VIẾT:**  
> `Tổng tài sản CLB = Quỹ Chính + Quỹ Phụ` — ĐÂY LÀ SAI

Quỹ Phụ là độc lập, KHÔNG cộng vào Tổng tài sản CLB.

---

## Chu kỳ quỹ (Fund Period)

Tài chính được tổ chức theo kỳ (thường là 1 tháng):

```
OPEN → CLOSED → FINALIZED
```

- **OPEN:** Đang thu chi
- **CLOSED:** Đã đóng sổ, không chỉnh sửa
- **FINALIZED:** Đã quyết toán, số dư chuyển sang kỳ mới

---

## Công thức phân bổ chi phí

### Chi phí sân (Court Expenses)
```
Mỗi thành viên chịu = Tổng chi phí sân / memberCount
```
Chia đều cho tất cả thành viên trong kỳ.

### Chi phí sinh hoạt (Activity Expenses)
```
Thành viên X chịu = Tổng chi sinh hoạt × (Số buổi X tham dự / Tổng buổi của kỳ)
```
Phân bổ theo tỉ lệ tham dự.

---

## Liên kết chi tiết

- [COMMON_FUND.md](COMMON_FUND.md) — Quỹ Chính
- [AUXILIARY_FUND.md](AUXILIARY_FUND.md) — Quỹ Phụ
- [CARRY_FORWARD.md](CARRY_FORWARD.md) — Số dư chuyển kỳ
- [CLUB_ASSETS.md](CLUB_ASSETS.md) — Tổng tài sản CLB
- [REPORTS.md](REPORTS.md) — Báo cáo tài chính
- [FINANCE_RULES.md](FINANCE_RULES.md) — Quy tắc bất biến
