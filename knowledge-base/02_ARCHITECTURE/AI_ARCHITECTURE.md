# Kiến trúc AI Platform PickleFund

**Mục đích:** Mô tả kiến trúc dự kiến cho AI Platform  
**Đối tượng:** Developer, Architect  
**Cập nhật:** 2026-06-29  
**Trạng thái:** PLANNED — Chưa bắt đầu phát triển. Đây là thiết kế định hướng cho V2.1.

---

## Tổng quan (Planned — V2.1)

AI Platform sẽ tích hợp các AI Teammates vào PickleFund để hỗ trợ ban quản lý CLB thông minh hơn.

---

## Kiến trúc dự kiến

```
[PickleFund Backend] ←→ [OpenClaw Framework]
                              ↓
                    [LiteLLM Gateway]
                    ├── Claude (Anthropic)
                    ├── GPT-4 (OpenAI)
                    └── Gemini (Google)
                              ↓
                    [AI Teammates]
                    ├── Maika (Finance)
                    ├── Lisa (Member Support)
                    └── Hermes (Operations)
```

---

## Các thành phần (Planned)

### LiteLLM Gateway
- Proxy thống nhất cho nhiều LLM provider
- Cấu hình model routing
- Cost tracking
- Fallback mechanism

### OpenClaw Framework
- Framework nội bộ cho AI Teammate
- Tool definitions
- Memory management
- Context injection

### AI Teammates
- Maika, Lisa, Hermes (xem [04_AI_PLATFORM/](../04_AI_PLATFORM/))

---

## Lưu ý

Toàn bộ phần này là **PLANNED**. Không có code nào được viết cho AI Platform tính đến V2.0 RC1.
