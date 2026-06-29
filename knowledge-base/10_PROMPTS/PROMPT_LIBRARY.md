# Thư viện Prompt — PickleFund

> **Mục đích:** Tổng hợp tất cả prompt theo category, dễ tìm và copy  
> **Đối tượng:** Developer, DevOps, AI team, Maika/Lisa/Hermes

---

## Mục lục

| Category | File | Số prompt |
|---|---|---|
| Claude Code Setup | [CLAUDE_SYSTEM_PROMPTS.md](CLAUDE_SYSTEM_PROMPTS.md) | 4 |
| Codex Audit | [CODEX_AUDIT_PROMPTS.md](CODEX_AUDIT_PROMPTS.md) | 4 |
| Frontend/UI | [UI_PROMPTS.md](UI_PROMPTS.md) | 4 |
| DevOps | [DEVOPS_PROMPTS.md](DEVOPS_PROMPTS.md) | 4 |
| Finance | [FINANCE_PROMPTS.md](FINANCE_PROMPTS.md) | 4 |

---

## Quick Reference — Prompt theo use case

### Bắt đầu làm việc với PickleFund (Claude Code)
→ [CLAUDE_SYSTEM_PROMPTS.md — Prompt 1: System Prompt chung](CLAUDE_SYSTEM_PROMPTS.md)

### Audit code trước commit
→ [CODEX_AUDIT_PROMPTS.md — Prompt 1: Audit tổng quát](CODEX_AUDIT_PROMPTS.md)

### Audit finance engine
→ [CODEX_AUDIT_PROMPTS.md — Prompt 2: Finance Engine](CODEX_AUDIT_PROMPTS.md)

### Audit pipeline
→ [CODEX_AUDIT_PROMPTS.md — Prompt 4: Pipeline V2](CODEX_AUDIT_PROMPTS.md)

### Tạo component React mới
→ [UI_PROMPTS.md — Prompt 1](UI_PROMPTS.md)

### Fix overflow UI
→ [UI_PROMPTS.md — Prompt 2](UI_PROMPTS.md)

### Fix pipeline issue
→ [DEVOPS_PROMPTS.md — Prompt 1](DEVOPS_PROMPTS.md)

### Debug Docker
→ [DEVOPS_PROMPTS.md — Prompt 2](DEVOPS_PROMPTS.md)

### Tính toán tài chính
→ [FINANCE_PROMPTS.md — Prompt 2](FINANCE_PROMPTS.md)

### Phân tích Health Score
→ [FINANCE_PROMPTS.md — Prompt 3](FINANCE_PROMPTS.md)

---

## Placeholders chuẩn

Khi dùng prompt, thay thế các placeholder sau:

| Placeholder | Ý nghĩa |
|---|---|
| `[TÊN COMPONENT]` | Tên component React cụ thể |
| `[PATH]` | Đường dẫn file cụ thể |
| `[MÔ TẢ VẤN ĐỀ]` | Mô tả rõ vấn đề cần giải quyết |
| `[DÁN ERROR OUTPUT]` | Copy-paste output lỗi thực tế |
| `[SỐ TIỀN]` | Số tiền cụ thể (VND) |
| `[TÊN CLB]` | Tên CLB cụ thể |
| `[KỲ]` | Tên kỳ tài chính (ví dụ: Tháng 6/2026) |
| `[ĐỐI TƯỢNG]` | Đối tượng nhận giải thích (Admin, thành viên, AI...) |

---

## Nguyên tắc viết prompt tốt

1. **Cung cấp context đủ:** Stack, file liên quan, ràng buộc
2. **Nêu rõ KHÔNG làm gì:** Giúp AI tránh vi phạm nghiệp vụ
3. **Yêu cầu format output:** Format báo cáo cụ thể
4. **Dùng placeholder rõ ràng:** `[PLACEHOLDER]` để dễ thay thế
5. **Ngắn gọn, có cấu trúc:** Dùng bullet point, không viết dài dòng

---

## Đóng góp prompt mới

Khi có prompt hiệu quả mới:
1. Thêm vào file category phù hợp (CLAUDE_SYSTEM_PROMPTS.md, UI_PROMPTS.md...)
2. Cập nhật bảng Mục lục và Quick Reference trong file này
3. Đảm bảo prompt có placeholder rõ ràng và ràng buộc tài chính đúng
