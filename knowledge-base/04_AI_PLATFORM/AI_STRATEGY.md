# Chiến lược AI Platform PickleFund

**Mục đích:** Định hướng tích hợp AI vào PickleFund
**Đối tượng:** PM, Developer, Architect
**Cập nhật:** 2026-06-29
**Trạng thái:** PLANNED — Định hướng cho V2.1, chưa bắt đầu phát triển

---

## Tầm nhìn AI

PickleFund sẽ tích hợp AI Teammates để tự động hóa và thông minh hóa việc quản lý CLB.

Không phải chatbot đơn thuần — AI Teammates là các agent chuyên biệt có:
- Hiểu ngữ cảnh tài chính PickleFund
- Công cụ (tools) để đọc/ghi dữ liệu CLB
- Khả năng tư vấn chủ động

---

## Ba AI Teammates (Planned)

### Maika — Finance AI
- Chuyên về phân tích tài chính
- Tư vấn tối ưu chi phí
- Phát hiện bất thường trong thu/chi

### Lisa — Member Support AI
- Hỗ trợ thành viên tra cứu thông tin
- Nhắc nhở đóng quỹ
- Trả lời câu hỏi thường gặp

### Hermes — Operations AI
- Hỗ trợ ban quản lý vận hành
- Tự động hóa tác vụ lặp lại
- Báo cáo tóm tắt định kỳ

---

## Tech Stack dự kiến (Planned)

- **LiteLLM:** Gateway thống nhất, hỗ trợ nhiều LLM provider
- **OpenClaw:** Framework AI Teammate nội bộ
- **Model:** Chưa xác định (Claude, GPT-4, Gemini — tùy cost/performance)

---

## Timeline (Dự kiến)

- V2.1 — Q4 2026: AI Platform MVP
- V2.2 — 2027: AI nâng cao
