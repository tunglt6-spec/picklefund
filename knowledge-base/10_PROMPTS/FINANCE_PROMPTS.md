# Finance Prompts — PickleFund

> **Mục đích:** Prompt chuẩn cho các task liên quan nghiệp vụ tài chính  
> **Đối tượng:** Developer, AI agents (Maika, Lisa)

---

## Prompt 1: Giải thích công thức tài chính

```
Giải thích nghiệp vụ tài chính PickleFund cho [ĐỐI TƯỢNG]:

Công thức:
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ

Trong đó:
- Quỹ Chính = Tổng thu Quỹ Chính - Tổng chi Quỹ Chính
  (Thu: đóng quỹ thành viên | Chi: sân bãi, sinh hoạt, hoạt động CLB)
- Số dư chuyển kỳ = Balance Quỹ Chính kỳ tài chính liền trước đã đóng/finalized
- Quỹ Phụ = Độc lập (minigame, thưởng, tài trợ) — KHÔNG cộng vào Tổng tài sản CLB

Giải thích bằng ngôn ngữ phù hợp với [ĐỐI TƯỢNG].
Dùng ví dụ số tiền cụ thể nếu hữu ích.
```

---

## Prompt 2: Kiểm tra tính toán tài chính

```
Kiểm tra tính toán tài chính PickleFund:

Dữ liệu kỳ [TÊN KỲ]:
- Thu Quỹ Chính: [SỐ TIỀN]
- Chi phí sân: [SỐ TIỀN]
- Chi phí sinh hoạt: [SỐ TIỀN]
- Thu Quỹ Phụ: [SỐ TIỀN]
- Chi Quỹ Phụ: [SỐ TIỀN]
- Số dư kỳ trước (carryForward): [SỐ TIỀN]

Tính:
1. Quỹ Chính = ?
2. Quỹ Phụ = ?
3. Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ = ?

Xác nhận Quỹ Phụ KHÔNG cộng vào Tổng tài sản CLB.
```

---

## Prompt 3: Phân tích Health Score

```
Phân tích Health Score tài chính CLB PickleFund:

Dữ liệu:
- Quỹ Chính balance: [SỐ TIỀN]
- Tổng tài sản CLB: [SỐ TIỀN]
- Tổng chi Quỹ Chính kỳ này: [SỐ TIỀN]
- Tổng thu Quỹ Chính kỳ này: [SỐ TIỀN]

Phân tích:
1. Health Score: tốt/cảnh báo/nguy hiểm?
2. Nguyên nhân chính?
3. Khuyến nghị cụ thể (kèm số tiền nếu có)?

Format: ngắn gọn, dễ hiểu cho Admin CLB không chuyên tài chính.
```

---

## Prompt 4: Maika Finance Analysis (V2.1 Planned)

```
[DÀNH CHO MAIKA AI — V2.1]
Bạn là Maika, Club Intelligence Manager của PickleFund.

Phân tích tài chính CLB [TÊN CLB] kỳ [KỲ]:

Dữ liệu API summary:
[DÁN JSON RESPONSE VÀO ĐÂY]

Yêu cầu:
1. Tóm tắt tình trạng tài chính (1-2 câu)
2. Health Score và lý do
3. 2-3 khuyến nghị cụ thể với số tiền
4. Cảnh báo nếu có nguy cơ âm quỹ

Ngôn ngữ: tiếng Việt, thân thiện với Admin CLB.
Không đề cập kỹ thuật nội bộ (CalculateOptions, carryForward pattern...).
```
