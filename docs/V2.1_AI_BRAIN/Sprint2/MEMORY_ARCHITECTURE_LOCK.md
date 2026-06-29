# Memory Architecture Lock
## PickleFund V2.1 — Sprint 2 (Memory Layer)

> Chốt kiến trúc Memory Layer trước khi triển khai. KHÔNG code.

---

## 1. Architecture Review

Đã review 8 tài liệu thiết kế (`01`–`08`). Memory Layer:
- Tách rời, tích hợp AI Gateway Sprint 1 qua **Memory API**.
- Vector Store **provider-agnostic** (Chroma/PGVector primary; Pinecone/Qdrant future).
- Dùng chung Desktop/Mobile (và sẵn sàng cho Maika/Lisa/Hermes ở sprint sau).
- **Cách ly tài chính tuyệt đối:** không lưu số liệu; chỉ đọc RC1 on-demand.

## 2. Architecture Decisions (tổng hợp)

| ID | Quyết định |
|---|---|
| AD-S2-01 | Memory Layer tách qua Memory API |
| AD-S2-02 | Vector Store provider-agnostic |
| AD-S2-03 | Không lưu số liệu tài chính trong memory |
| AD-S2-04 | Một API/hook dùng chung mọi consumer |
| AD-S2-05 | Tách metadata/TTL (relational) khỏi embeddings (vector) |
| AD-S2-06 | `IVectorStore` + nhiều adapter |
| AD-S2-07 | Namespace per tenant/club + memory-type |
| AD-S2-08 | Metadata filter ở tầng query |
| AD-S2-09 | PGVector mặc định ở prod |
| AD-S2-10..13 | Memory API: prefix `/memory`, scope JWT, budget context, response thống nhất |
| AD-S2-14..16 | Search: embedding qua LiteLLM, re-rank similarity+recency+priority, minScore+topK |
| AD-S2-17..19 | Context: sliding window + summarization, cắt theo ưu tiên, finance on-demand |
| AD-S2-20..23 | Manager: TTL theo loại, retention tối thiểu, archive trước purge, scheduler hiện có |

## 3. Known Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Rò rỉ tài chính | AD-S2-03/19; checklist Finance Isolation (`08`) |
| Khoá cứng provider | Abstraction `IVectorStore` (AD-S2-06) |
| Embedding cost/latency | Cache + topK/minScore (AD-S2-14) |
| PII trong log | Sanitize (kế thừa Sprint 1) |

## 4. Dependencies

AI Gateway ✅ · AI Config ✅ · Token Accounting ✅ · PostgreSQL ✅ · LiteLLM embedding (cần model).

## 5. Definition of Done (Architecture)

| Tiêu chí | Đạt |
|---|---|
| 8 tài liệu thiết kế hoàn chỉnh | ✅ |
| Mermaid diagrams cho memory flow & semantic search | ✅ |
| Provider-agnostic vector store | ✅ |
| Memory API dùng chung định nghĩa | ✅ |
| Finance Isolation thể hiện trong thiết kế | ✅ |
| Cross-reference nhất quán | ✅ |

## 6. Architecture Status

```
LOCKED
```

*Chờ Codex Architecture Audit. KHÔNG triển khai Sprint 2 cho đến khi PASS.*
