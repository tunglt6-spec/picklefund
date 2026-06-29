# LiteLLM — AI Gateway

**Mục đích:** Mô tả LiteLLM gateway trong AI Platform
**Trạng thái:** PLANNED — V2.1, chưa phát triển
**Cập nhật:** 2026-06-29

---

## LiteLLM là gì?

LiteLLM là open-source proxy cho phép gọi nhiều LLM provider (Claude, GPT-4, Gemini...) qua một API thống nhất.

---

## Tại sao dùng LiteLLM? (Planned rationale)

- Tránh vendor lock-in với một LLM duy nhất
- Dễ switch model khi cần (cost vs performance)
- Fallback tự động khi một provider gặp sự cố
- Cost tracking thống nhất

---

## Cấu hình dự kiến (Planned)

```yaml
model_list:
  - model_name: maika-model
    litellm_params:
      model: claude-3-5-sonnet-latest
  - model_name: lisa-model
    litellm_params:
      model: claude-3-haiku-latest
```

---

## Trạng thái

Chưa có cài đặt nào. Đây là kiến trúc dự kiến cho V2.1.
