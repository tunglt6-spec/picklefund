# ADR Index — Architecture Decision Records

> **Mục đích:** Mục lục tất cả Architecture Decision Records của PickleFund  
> **Đối tượng:** Developer, Kiến trúc sư, AI agents

---

## Định nghĩa ADR

Architecture Decision Record (ADR) là tài liệu ghi lại một quyết định kiến trúc quan trọng: bối cảnh, quyết định, lý do, và hậu quả. ADR giúp team hiểu **tại sao** hệ thống được xây dựng theo cách hiện tại.

---

## Danh sách ADR

| ADR | Tiêu đề | Trạng thái | Ngày |
|---|---|---|---|
| [ADR-001](ADR-001-Fund-Separation.md) | Tách biệt Quỹ Chính và Quỹ Phụ | ✅ Accepted | 2026-06 |
| [ADR-002](ADR-002-Carry-Forward.md) | carryForward Pattern — inject từ caller | ✅ Accepted | 2026-06 |
| [ADR-003](ADR-003-Deployment-Pipeline-V2.md) | Deployment Pipeline V2 | ✅ Accepted | 2026-06 |
| [ADR-004](ADR-004-Premium-Dashboard.md) | Premium Dashboard — Dark Sidebar + Gradient Cards | ✅ Accepted | 2026-06 |
| [ADR-005](ADR-005-AI-Teammate-Platform.md) | AI Teammate Platform V2.1 | 🔵 Proposed | 2026-06 |

---

## Trạng thái ADR

| Trạng thái | Ý nghĩa |
|---|---|
| ✅ Accepted | Quyết định đã được chấp nhận và áp dụng |
| 🔵 Proposed | Đề xuất, chưa finalize |
| ⚠️ Deprecated | Đã lỗi thời, có ADR mới thay thế |
| ❌ Rejected | Bị từ chối |

---

## Cách tạo ADR mới

Template:
```markdown
# ADR-XXX: Tiêu đề

**Ngày:** YYYY-MM-DD  
**Trạng thái:** Proposed / Accepted / Deprecated

## Bối cảnh
[Mô tả vấn đề cần giải quyết]

## Quyết định
[Quyết định đã chọn]

## Lý do
[Tại sao chọn quyết định này]

## Hậu quả
[Ảnh hưởng tích cực và tiêu cực]

## Các phương án đã xem xét
[Các lựa chọn khác và tại sao không chọn]
```

Đặt tên file: `ADR-XXX-Tên-Ngắn.md`  
Cập nhật ADR-INDEX.md sau khi tạo.
