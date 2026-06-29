# ADR-005: AI Teammate Platform V2.1

**Ngày:** 2026-06  
**Trạng thái:** 🔵 Proposed

---

## Bối cảnh

PickleFund V2.0 đã hoàn thiện nghiệp vụ tài chính chuẩn và giao diện Premium. Bước tiếp theo là V2.1 — tích hợp AI agents để tự động hóa vận hành CLB và nâng cao trải nghiệm thành viên.

**Tầm nhìn:** PickleFund V2.1 = SaaS Platform + AI Teammate Team

---

## Quyết định Đề xuất

**Xây dựng AI Teammate Platform gồm 3 agents chính:**

| Agent | Vai trò | Trạng thái |
|---|---|---|
| **Maika** | Club Intelligence Manager — AI Finance & Operations | Planned |
| **Lisa** | Member Assistant — Notification & Member Care | Baseline có, V2.1 nâng cấp |
| **Hermes** | Workflow Orchestrator | Planned |
| **Mít Đặc** | Operations Bot | Planned |

**Infrastructure AI:**

| Thành phần | Vai trò | Trạng thái |
|---|---|---|
| **LiteLLM** | AI Gateway — route tới nhiều LLM | Planned |
| **OpenClaw** | Bot framework hiện có | Baseline |
| **OpenRouter** | Backup AI provider | Planned |
| **Ollama** | Local LLM fallback | Planned |

---

## Lý do

1. **Tự động hóa vận hành:** Admin CLB mất nhiều giờ cho công việc thủ công (nhắc đóng quỹ, báo cáo tháng, điểm danh) → AI agents làm thay
2. **Member Experience:** Thành viên cần trợ lý tức thời (Lisa) thay vì hỏi Admin
3. **Club Intelligence:** Maika phân tích xu hướng tài chính, cảnh báo sớm
4. **Competitive:** SaaS CLB không AI ngày càng tụt hậu

---

## Hậu quả Dự kiến

**Tích cực:**
- Admin CLB tiết kiệm thời gian vận hành
- Thành viên được phục vụ 24/7
- Health Score và cảnh báo tài chính tự động

**Tiêu cực:**
- Chi phí API AI (LLM tokens)
- Độ phức tạp hệ thống tăng
- Cần xây dựng AI pipeline mới

---

## Phạm vi V2.1 (Đề xuất)

**In scope:**
- Maika: phân tích tài chính, health score tự động, cảnh báo
- Lisa: nhắc nhở thành viên, trả lời câu hỏi về số dư
- Hermes: orchestrate workflow giữa các agents
- LiteLLM gateway setup

**Out of scope V2.1:**
- Marketplace, payment gateway
- Booking sân
- Self-hosted LLM production (Ollama chỉ là fallback dev)

---

## Ghi chú

Đây là ADR **Proposed** — chưa được chấp thuận. Các quyết định cụ thể sẽ được finalize trong Sprint Planning V2.1. ADR sẽ được cập nhật thành **Accepted** khi V2.1 implementation bắt đầu.
