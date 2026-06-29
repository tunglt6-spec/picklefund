# 01 — Vector Store Boundary
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial vector store boundary (design only) |

## Purpose
Chốt ranh giới Vector Store cho Epic 2.4 (implementation), trên nền Baseline v1.0.

## Scope
Vector Store provider + embedding storage + vector retrieval (thiết kế ranh giới).

## Boundaries
- Vector Store thuộc **Epic 2.4**.
- Vector Store **KHÔNG phải Source of Truth**; **Memory Object vẫn là SoT**.
- Index/Vector là **derived view** — phải **rebuild được** từ Memory Object.
- Vector Store **KHÔNG truy cập Finance trực tiếp**.
- **KHÔNG ghi đè deterministic retrieval** (Epic 2.3) — vector là lớp bổ sung (hybrid).

## Risks
- R: coi vector là SoT → cấm (INV-05); rebuild từ Memory Object.
- R: vector ghi đè deterministic → hybrid merge, fallback deterministic.

## Cross References
`04_HYBRID_RETRIEVAL_DESIGN.md` · `07_PROVIDER_SELECTION_MATRIX.md` · Baseline `03_ARCHITECTURE_INVARIANTS.md`.
