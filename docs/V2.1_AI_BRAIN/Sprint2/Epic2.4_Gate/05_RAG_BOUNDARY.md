# 05 — RAG Boundary
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial RAG boundary |

## Purpose
Làm rõ ranh giới RAG cho Epic 2.4.

## Scope
Context retrieval layer (vector + deterministic), KHÔNG response generation.

## Boundaries
- Epic 2.4 **KHÔNG triển khai full RAG Agent**.
- Epic 2.4 chỉ cung cấp **context retrieval layer** (matches/context cho prompt).
- **Prompt Engine / Agent RAG thuộc Sprint sau** (Maika/Lisa/Hermes).
- Epic 2.4 **KHÔNG sinh response bằng LLM**.

## Risks
- R: lẫn response-generation vào retrieval → cấm; chỉ trả context.

## Cross References
`04_HYBRID_RETRIEVAL_DESIGN.md` · `09_EPIC2.4_ACCEPTANCE_CRITERIA.md`.
