# 01 — Semantic Search Boundary
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial gate draft (design only) |

---

## 1. Mục tiêu Epic 2.3
Thiết kế + triển khai **Club Memory** và **Semantic Search retrieval** ở mức **keyword/tag/metadata** (chưa embedding), cùng **interface** để Epic 2.4 nối Vector Store. Tích hợp Club Memory như một retrieval source mới cho ConversationContextBuilder mà không phá vỡ các thành phần đã LOCKED.

## 2. Out of Scope (Epic 2.3)
Vector Store provider thật (Chroma/Qdrant/PGVector/Pinecone) · Embedding service · external embedding API · similarity/vector search · RAG · LLM ranking · API/migration/Docker mới cho vector DB · sửa Finance Engine RC1 / AI Harness / Memory Core / Conversation/User Memory / UI.

## 3. Ranh giới thành phần

| Thành phần | Vai trò | Epic 2.3 |
|---|---|---|
| Memory Manager (Epic 2.1) | CRUD Memory Object | KHÔNG sửa; tái dùng pattern |
| Club Memory | Tri thức cấp CLB (scope clubId) | **Triển khai** |
| Semantic Search | Retrieval (keyword/tag/metadata) + interface | **Thiết kế + keyword retrieval** |
| Vector Store | Lưu/embeddings | **Chỉ interface** (impl ở Epic 2.4) |
| Context Builder (Epic 2.2) | Lắp ráp context | Thêm source mới, KHÔNG viết lại |

## 4. Quy tắc
- Epic 2.3 **được phép** thiết kế retrieval + triển khai keyword/tag/metadata retrieval.
- Epic 2.3 **KHÔNG** triển khai Vector DB provider thật.
- Vector Store implementation **thuộc Epic 2.4**.
- Semantic Search interface phải “embedding-ready” nhưng default dùng keyword retrieval.
- KHÔNG gọi LLM để ranking.

## 5. Boundary Diagram

```mermaid
flowchart TD
    Q["Query (intent + scope clubId)"] --> SS["Semantic Search (interface)"]
    SS -->|Epic 2.3| KW["Keyword/Tag/Metadata Retriever"]
    SS -.Epic 2.4.-> VEC["Vector Retriever (embedding)"]
    KW --> CM["Club Memory (clubId)"]
    VEC -.Epic 2.4.-> VS["Vector Store provider"]
    SS --> CB["Context Builder (Epic 2.2)"]
    CB --> GW["AI Gateway (Sprint 1)"]
    SS -. "NEVER tính tài chính" .-> FE["Finance Engine RC1 (reference only)"]
    style VEC stroke-dasharray:5 5
    style VS stroke-dasharray:5 5
    style FE fill:#27AE60,color:#fff
```

## Clear Boundaries
Epic 2.3 = Club Memory + keyword retrieval + interfaces. Epic 2.4 = Vector Store + embedding. KHÔNG vượt ranh.

## DoD
Xem `EPIC2.3_ACCEPTANCE_CRITERIA.md`.

## Risks
- R1: lẫn vector impl vào 2.3 → Mitigation: interface-only, bảng `VECTOR_STORE_BOUNDARY.md`.
- R2: cross-club leakage → `SECURITY_AND_TENANT_ISOLATION.md`.

## Security Notes
Retrieval luôn scope `clubId`; không trả tri thức club khác; không tính tài chính.

## Cross References
`CLUB_MEMORY_MODEL.md` · `RETRIEVAL_PIPELINE_DESIGN.md` · `VECTOR_STORE_BOUNDARY.md` · `CONTEXT_BUILDER_INTEGRATION.md`
