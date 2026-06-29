# 05 — Vector Store Boundary
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial vector store boundary (design only) |

---

## 1. Nguyên tắc
- **Vector Store thuộc Epic 2.4.** Epic 2.3 **chỉ tạo interface** nếu cần (embedding-ready), KHÔNG triển khai.
- KHÔNG triển khai Chroma/Qdrant/PGVector/Pinecone.
- KHÔNG thêm dependency vector DB · KHÔNG thêm Docker service · KHÔNG thêm migration · KHÔNG gọi external embedding API.

## 2. Capability Matrix

| Capability | Epic 2.3 | Epic 2.4 |
|---|---|---|
| Club Memory CRUD | ✅ | (giữ) |
| Keyword/tag/metadata retrieval | ✅ | (giữ) |
| `SemanticSearch` interface (embedding-ready) | ✅ interface | ✅ dùng |
| Vector Store provider (Chroma/PGVector/…) | ❌ | ✅ |
| Embedding service / external API | ❌ | ✅ |
| Similarity/vector search | ❌ | ✅ |
| Vector DB dependency/Docker/migration | ❌ | ✅ |
| RAG | ❌ | ✅ (hoặc sau) |

## Clear Boundaries
Epic 2.3 dừng ở interface + keyword retrieval. Mọi thứ “vector/embedding” là Epic 2.4.

## DoD
Không có code/dependency/Docker/migration vector DB trong Epic 2.3; chỉ interface (nếu cần). Codex xác nhận.

## Risks
- R: thêm dependency vector DB sớm → Mitigation: matrix §2 + acceptance checklist.
- R: gọi external embedding API → Mitigation: cấm tường minh.

## Security Notes
Không gửi dữ liệu CLB ra external embedding API ở Epic 2.3 (tránh rò rỉ tenant data).

## Cross References
`SEMANTIC_SEARCH_BOUNDARY.md` · `INDEXING_STRATEGY.md` · Sprint2 `02_VECTOR_STORE_SPECIFICATION.md`
