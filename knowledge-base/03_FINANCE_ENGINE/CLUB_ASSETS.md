# Tổng tài sản CLB

**Mục đích:** Định nghĩa chính xác công thức Tổng tài sản CLB  
**Đối tượng:** Developer, CLB Admin, Sales  
**Cập nhật:** 2026-06-29

---

## Công thức dứt khoát

```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
```

**Viết đầy đủ:**
```
Tổng tài sản CLB = (Thu kỳ hiện tại - Chi kỳ hiện tại) + Số dư chuyển từ kỳ trước
```

---

## TUYỆT ĐỐI KHÔNG VIẾT

> ~~`Tổng tài sản CLB = Quỹ Chính + Quỹ Phụ`~~ — **ĐÂY LÀ SAI**

Quỹ Phụ là độc lập, có mục đích và nguồn gốc riêng. Cộng vào sẽ gây nhầm lẫn nghiêm trọng.

---

## Ví dụ minh họa

**CLB Pickleball Mẫu — Tháng 6/2026:**

| Khoản mục | Số tiền |
|---|---|
| Số dư chuyển từ tháng 5 (carryForward) | 2,500,000đ |
| Thu quỹ tháng 6 (20 thành viên × 200,000đ) | 4,000,000đ |
| Chi tiền sân tháng 6 | -3,000,000đ |
| Chi sinh hoạt CLB | -500,000đ |
| **Tổng tài sản CLB (Quỹ Chính)** | **3,000,000đ** |

**Quỹ Phụ Minigame:** 1,200,000đ (KHÔNG cộng vào trên)

**Tổng tài sản CLB = 3,000,000đ** (không phải 4,200,000đ)

---

## Hiển thị trên Dashboard

Dashboard V2.0 hiển thị:
- **Tổng tài sản CLB:** Chỉ Quỹ Chính
- **Quỹ Phụ:** Riêng biệt, có label rõ ràng "Quỹ Phụ (không tính vào tổng tài sản)"

---

## Cơ sở pháp lý nội bộ

Quyết định tách biệt được ghi tại [ADR-001](../08_ADR/ADR-001-Fund-Separation.md).
