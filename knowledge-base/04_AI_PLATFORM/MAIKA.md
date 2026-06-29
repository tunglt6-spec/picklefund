# Maika — Finance AI Teammate

**Mục đích:** Mô tả AI Teammate Maika
**Trạng thái:** PLANNED — V2.1, chưa phát triển
**Cập nhật:** 2026-06-29

---

## Vai trò

Maika là AI Teammate chuyên về **phân tích và tư vấn tài chính** cho CLB.

---

## Năng lực dự kiến (Planned)

- Phân tích xu hướng thu/chi theo thời gian
- Phát hiện bất thường (chi phí tăng đột biến, thành viên nợ dài)
- Tư vấn tối ưu chi phí sân
- Tóm tắt tình trạng tài chính cuối kỳ
- Trả lời câu hỏi: "CLB còn bao nhiêu tiền?", "Tháng này chi nhiều nhất khoản gì?"

---

## Tools dự kiến (Planned)

- `get_fund_period_summary` — Lấy tóm tắt kỳ quỹ
- `get_expense_breakdown` — Chi tiết chi phí
- `get_member_contribution_status` — Trạng thái đóng quỹ
- `get_club_balance` — Số dư hiện tại

---

## Lưu ý

Maika KHÔNG được tự ý tạo/sửa/xóa giao dịch. Chỉ đọc và tư vấn.
Mọi thay đổi phải do Admin confirm trên UI.
