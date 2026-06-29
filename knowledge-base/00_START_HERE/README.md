# PickleFund Enterprise Knowledge System

**Phiên bản:** V2.0 RC1  
**Ngày cập nhật:** 2026-06-29  
**Đối tượng:** Toàn bộ đội ngũ PickleFund (dev, ops, sales, PM)

---

## Giới thiệu

Đây là Knowledge Base chính thức của dự án **PickleFund** — nền tảng SaaS multi-tenant quản lý tài chính CLB Pickleball tại Việt Nam.

Knowledge Base này được thiết kế để:
- Onboard thành viên mới nhanh chóng
- Là nguồn sự thật duy nhất (single source of truth) cho toàn bộ quyết định kỹ thuật và sản phẩm
- Hỗ trợ Claude Code / Codex Audit làm việc đúng với ngữ cảnh dự án
- Lưu trữ các bài học kinh nghiệm và ADR (Architecture Decision Records)

---

## Cách điều hướng nhanh

| Bạn cần gì? | Đọc ở đâu? |
|---|---|
| Hiểu tổng quan dự án | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) |
| Tra cứu thuật ngữ | [GLOSSARY.md](GLOSSARY.md) |
| Tìm file theo chủ đề | [INDEX.md](INDEX.md) |
| Hướng dẫn dùng KB này | [HOW_TO_USE_KB.md](HOW_TO_USE_KB.md) |
| Nghiệp vụ tài chính | [03_FINANCE_ENGINE/](../03_FINANCE_ENGINE/) |
| Kiến trúc hệ thống | [02_ARCHITECTURE/](../02_ARCHITECTURE/) |
| Xử lý sự cố | [07_TROUBLESHOOTING/](../07_TROUBLESHOOTING/) |
| Prompt AI reusable | [10_PROMPTS/](../10_PROMPTS/) |

---

## Nguyên tắc quan trọng nhất

> **Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ**  
> Quỹ Phụ là độc lập, KHÔNG cộng vào Tổng tài sản CLB.

Xem chi tiết tại [03_FINANCE_ENGINE/CLUB_ASSETS.md](../03_FINANCE_ENGINE/CLUB_ASSETS.md)

---

## Trạng thái Knowledge Base

- **Baseline:** V2.0 RC1 (2026-06-29)
- **Backend tests:** 175/175 PASS
- **Cập nhật tiếp theo:** Khi có thay đổi lớn về kiến trúc hoặc nghiệp vụ
