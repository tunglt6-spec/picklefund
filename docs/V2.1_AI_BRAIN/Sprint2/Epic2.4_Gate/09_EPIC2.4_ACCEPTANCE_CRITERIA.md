# 09 — Epic 2.4 Acceptance Criteria
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial DoD for Epic 2.4 |

## Purpose
Định nghĩa DoD cho Epic 2.4 (khi triển khai).

## Scope
Vector Store + Embedding + Hybrid retrieval + Optimization.

## Definition of Done
| # | Tiêu chí |
|---|---|
| 1 | Vector provider interface (`IVectorStore`) implemented |
| 2 | Embedding abstraction implemented |
| 3 | ≥1 default provider implemented (khuyến nghị PGVector) |
| 4 | **Deterministic fallback works** (semantic fail → keyword/tag/metadata) |
| 5 | **No Finance calculation** (RC1 only) |
| 6 | **No cross-club leakage** (vector scope clubId) |
| 7 | Hybrid merge + score normalization + tie-break deterministic |
| 8 | KHÔNG refactor core (RetrievalEngine/ContextBuilder/ClubMemory) |
| 9 | Tests PASS (coverage stmts/lines/funcs ≥90%) |
| 10 | Codex PASS |

## Boundaries
KHÔNG full RAG/response generation; KHÔNG LLM ranking; KHÔNG embed PII/finance.

## Risks
- R: refactor core → checklist #8; chỉ thay binding provider.

## Cross References
`01`–`08` · `10_EPIC2.4_CODEX_AUDIT_PROMPT.md`.
