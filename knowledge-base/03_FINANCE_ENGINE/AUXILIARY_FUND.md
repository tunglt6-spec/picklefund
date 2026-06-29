# Quỹ Phụ (Auxiliary Fund / Mini Fund)

**Mục đích:** Mô tả chi tiết nghiệp vụ Quỹ Phụ  
**Đối tượng:** Developer, CLB Admin  
**Cập nhật:** 2026-06-29

---

## Định nghĩa

**Quỹ Phụ** (còn gọi là Mini Fund) là quỹ phụ trợ độc lập, hoàn toàn tách biệt với Quỹ Chính.

Mục đích điển hình:
- Quỹ minigame (thu từ người chơi minigame, thưởng cho người thắng)
- Quỹ tài trợ (nhận tài trợ từ bên ngoài)
- Quỹ thưởng đặc biệt

---

## Đặc điểm quan trọng

1. **Hoàn toàn độc lập** với Quỹ Chính — không chia sẻ giao dịch
2. **KHÔNG cộng vào Tổng tài sản CLB** — Tổng tài sản CLB chỉ tính Quỹ Chính
3. Mỗi CLB có thể có nhiều Quỹ Phụ
4. Quỹ Phụ có báo cáo riêng

---

## Luồng nghiệp vụ

### Thu Quỹ Phụ
- Ghi nhận khoản thu (minigame, tài trợ...)
- Lưu vào `mini_fund_transactions` với `type = INCOME`

### Chi Quỹ Phụ
- Ghi nhận khoản chi (thưởng, giải thưởng...)
- Lưu vào `mini_fund_transactions` với `type = EXPENSE`

### Số dư Quỹ Phụ
```
Số dư Quỹ Phụ = Σ INCOME - Σ EXPENSE
```

---

## Lý do không cộng vào Tổng tài sản CLB

Quỹ Phụ có mục đích và nguồn gốc khác với Quỹ Chính:
- Tiền Quỹ Phụ thường có ràng buộc sử dụng riêng (thưởng minigame, hoàn lại cho người đóng góp)
- Không phản ánh sức khỏe tài chính vận hành của CLB
- Trộn lẫn sẽ gây nhầm lẫn về số tiền CLB thực sự có thể dùng

Quyết định này được ghi lại tại [ADR-001](../08_ADR/ADR-001-Fund-Separation.md).

---

## Phân biệt với Quỹ Chính

| | Quỹ Chính | Quỹ Phụ |
|---|---|---|
| Cộng vào Tổng tài sản CLB | CÓ | KHÔNG |
| Theo kỳ quỹ | CÓ | KHÔNG (rolling) |
| Carry Forward | CÓ | Không cần |
| Thu từ | Quỹ thành viên | Minigame, tài trợ |
| Chi cho | Sân, sinh hoạt | Thưởng, giải |
