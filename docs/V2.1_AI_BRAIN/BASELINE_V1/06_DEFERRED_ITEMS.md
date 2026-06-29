# 06 — Deferred Items
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial deferred items registry |

---

## Purpose
Tổng hợp toàn bộ hạng mục hoãn lại + lý do + phụ thuộc.

## Scope
Các item chưa thuộc baseline v1.0.

## Deferred Registry

| Item | Deferred Sprint/Epic | Reason | Dependency |
|---|---|---|---|
| Club Memory implementation | Epic 2.3 | Chờ gate audit PASS | Epic 2.3 gate |
| Semantic Search implementation | Epic 2.3 (keyword) → 2.4 (vector) | Tách design/impl | Club Memory |
| Embedding | Epic 2.4 | Cần model + vector store | Vector Store |
| Vector Store | Epic 2.4 | Provider abstraction trước | IVectorStore interface |
| RAG | Epic 2.4+ | Sau retrieval + vector | Embedding, Vector Store |
| Behavior Context | Epic sau | Behavior chưa vào Context Builder | Context Builder rules |
| Persistent Repository | Epic 2.4 | Hiện in-memory volatile | DB schema cho memory |
| LLM Summarization | Epic sau | Hiện summarize deterministic | Prompt Engine |

## Cross References
`02_ARCHITECTURE_BASELINE.md` · `05_AGENT_READINESS.md` · `../Sprint2/Epic2.3_Gate/VECTOR_STORE_BOUNDARY.md`.

## Risks
- R: kéo deferred item vào baseline sớm → vi phạm scope; theo Change Control.

## References
Epic 2.3 gate, Sprint 2 architecture package.
