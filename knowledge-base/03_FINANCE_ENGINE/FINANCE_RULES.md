# Quy tắc tài chính bất biến PickleFund

**Mục đích:** Liệt kê các quy tắc KHÔNG được vi phạm
**Đối tượng:** Developer, PM, AI (Claude/Codex)
**Cập nhật:** 2026-06-29

---

## RULE-001: Công thức Tổng tài sản CLB

```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
```

Quỹ Phụ KHÔNG cộng vào. Vi phạm rule này là lỗi nghiêm trọng.

---

## RULE-002: Tách biệt Quỹ Chính và Quỹ Phụ

- Giao dịch Quỹ Chính và Quỹ Phụ lưu trong bảng riêng biệt
- KHÔNG gộp chung trong cùng một query tính tổng
- KHÔNG hiển thị Quỹ Phụ trong báo cáo Quỹ Chính

---

## RULE-003: Carry Forward chỉ từ kỳ FINALIZED

- Chỉ kỳ có status = FINALIZED mới tạo carry forward
- Kỳ CLOSED không carry forward
- Calculator nhận carryForwardBalance từ caller, không tự query

---

## RULE-004: Công thức chi phí sân — chia đều

```
Phần sân mỗi thành viên = Tổng chi phí sân / memberCount
```

Không được dùng công thức khác (ví dụ: chia theo số buổi tham dự).

---

## RULE-005: Công thức chi phí sinh hoạt — theo tỉ lệ buổi

```
Phần sinh hoạt của X = Tổng chi sinh hoạt × (Buổi X / Tổng buổi kỳ)
```

Không được dùng chia đều cho loại chi này.

---

## RULE-006: Không double-count expenses

Khi tính tổng chi trong báo cáo kỳ:
- Chỉ tính expenses có `fundPeriodId` = kỳ đó
- Không gộp expenses của Quỹ Phụ vào
- Đã có bug này trong lịch sử (xem REPORTS.md)

---

## Hậu quả vi phạm

| Rule | Vi phạm | Hậu quả |
|---|---|---|
| RULE-001 | Hiển thị sai Tổng tài sản | Mất tin tưởng từ CLB |
| RULE-002 | Query gộp | Số liệu sai trên báo cáo |
| RULE-003 | Carry forward sai kỳ | Sai số dư đầu kỳ |
| RULE-004/005 | Dùng sai công thức | Phiếu thu sai cho thành viên |
| RULE-006 | Double-count | Chi phí tăng gấp đôi |
