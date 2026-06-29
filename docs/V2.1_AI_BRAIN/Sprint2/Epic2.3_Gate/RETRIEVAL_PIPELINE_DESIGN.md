# 03 — Retrieval Pipeline Design
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial retrieval pipeline (design only) |

---

## 1. Pipeline

```mermaid
flowchart TD
    Q["Input Query"] --> I["Intent (phân loại nhẹ, không LLM)"]
    I --> S["Scope (clubId từ principal)"]
    S --> C["Candidate Selection (Club Memory theo clubId)"]
    C --> KF["Keyword / Tag / Metadata Filter"]
    KF --> CA["Context Assembly (trim theo budget)"]
    CA --> O["Output Context"]
    KF -.Epic 2.4.-> EMB["Embedding similarity (deferred)"]
    style EMB stroke-dasharray:5 5
```

## 2. Quy tắc
- Epic 2.3 **chưa dùng embedding** (chưa có Vector Store) → retrieval bằng **keyword/tag/metadata**.
- `SemanticSearch` interface thiết kế “embedding-ready” để Epic 2.4 nối Embedding mà không đổi caller.
- **KHÔNG gọi LLM** để ranking ở Epic 2.3; ranking = điểm khớp keyword + recency + tag (deterministic).
- Scope bắt buộc theo `clubId`; ứng viên chỉ từ Club Memory của club đó.

## 3. Interface (mô tả, không code)
| Thao tác | Input | Output |
|---|---|---|
| `retrieve` | clubId, query, filter(tags/type), topK | matches[] (id, score, snippet, metadata) |
| (Epic 2.4) `embed`/vector | — | deferred |

## Clear Boundaries
Retrieval đọc Club Memory (Source of Truth) qua keyword/metadata; KHÔNG embedding/LLM ở 2.3.

## DoD
Pipeline keyword/tag/metadata chạy, interface embedding-ready, không LLM ranking. Xem `EPIC2.3_ACCEPTANCE_CRITERIA.md`.

## Risks
- R: lén thêm embedding/LLM ranking → Mitigation: quy tắc §2 + acceptance checklist.
- R: trả ứng viên cross-club → Mitigation: scope clubId ở bước Candidate Selection.

## Security Notes
Filter tenant trước khi assembly; snippet không chứa PII/secret; không tính tài chính.

## Cross References
`SEMANTIC_SEARCH_BOUNDARY.md` · `INDEXING_STRATEGY.md` · `CONTEXT_BUILDER_INTEGRATION.md`
