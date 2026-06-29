# 03 — Semantic Provider Contract
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial semantic provider contract |

## Purpose
Định nghĩa hợp đồng để provider thật thay thế Noop (Epic 2.3) mà không refactor core.

## Scope
`ISemanticSearchProvider` (đã định nghĩa ở Epic 2.3): `search(clubId, query, topK): Promise<SemanticMatch[]>`.

## Boundaries (yêu cầu)
- Provider mới là **plug-in replacement** cho Noop provider (đổi binding `SEMANTIC_SEARCH_PROVIDER`).
- **KHÔNG refactor** `RetrievalEngine`.
- **KHÔNG refactor** `ConversationContextBuilder`.
- **KHÔNG refactor** Club Memory.
- Provider **failure → fallback** về deterministic retrieval (keyword/tag/metadata).

## Contract chi tiết
| Mục | Yêu cầu |
|---|---|
| Input | clubId (scope), query text, topK |
| Output | `SemanticMatch[]` (memoryId, score) — chỉ trong clubId |
| Tenant | KHÔNG trả memoryId của club khác |
| Failure | throw/timeout → engine bỏ qua semantic, dùng deterministic |
| Determinism | semantic optional; deterministic luôn là nền |

## Risks
- R: provider refactor core → cấm; chỉ thay binding.
- R: provider fail làm chết retrieval → fallback bắt buộc.

## Cross References
`04_HYBRID_RETRIEVAL_DESIGN.md` · Epic 2.3 `semantic-search.interface.ts` (đã có).
