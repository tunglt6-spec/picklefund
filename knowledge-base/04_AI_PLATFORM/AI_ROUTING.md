# AI Routing — Định tuyến AI Requests

**Mục đích:** Mô tả cơ chế định tuyến request đến AI Teammates
**Trạng thái:** PLANNED — V2.1, chưa phát triển
**Cập nhật:** 2026-06-29

---

## Concept (Planned)

Khi user gửi câu hỏi trong PickleFund, hệ thống cần xác định AI Teammate nào sẽ xử lý:

```
User query
    ↓
Router (intent classification)
    ├── Finance query → Maika
    ├── Member query  → Lisa
    └── Ops query     → Hermes
```

---

## Phương pháp routing dự kiến (Planned)

**Option A:** Rule-based routing (keyword matching)
- Đơn giản, dễ debug
- Kém linh hoạt

**Option B:** LLM-based intent classification
- Linh hoạt hơn
- Tốn thêm token

**Quyết định:** Chưa xác định — sẽ quyết định khi bắt đầu V2.1.
