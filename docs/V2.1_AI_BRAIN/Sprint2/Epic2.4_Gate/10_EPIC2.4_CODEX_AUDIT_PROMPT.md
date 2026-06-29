# 10 — Epic 2.4 Codex Audit Prompt
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial Codex audit prompt (cho Epic 2.4 implementation) |

## Purpose
Prompt cho Codex audit Epic 2.4 SAU khi implementation hoàn thành.

## Scope
Vector Store + Embedding + Hybrid + Optimization.

## Prompt (audit-only)
> Bạn là Codex, audit Epic 2.4. CHỈ review, KHÔNG sửa code/build/commit/push. Đối chiếu code với `Epic2.4_Gate/`.

Audit theo các trục:
| # | Trục | Tiêu chí PASS |
|---|---|---|
| 1 | Vector Store boundary | derived view; rebuild từ Memory Object; không phải SoT |
| 2 | Embedding | pipeline (normalize/chunk/version); no PII/finance; cost control |
| 3 | Hybrid retrieval | deterministic + semantic; merge + score norm; tie-break deterministic |
| 4 | Fallback | semantic fail/timeout → deterministic vẫn chạy |
| 5 | No refactor core | RetrievalEngine/ContextBuilder/ClubMemory không bị viết lại |
| 6 | Security | tenant isolation; no cross-club vector leak; secret handling |
| 7 | Cost control | guardrail/budget/batch/cache |
| 8 | Finance isolation | no calc/cache; RC1 only |
| 9 | Tests | coverage ≥90%; fallback + isolation tests |
| 10 | Docs | khớp code; không claim sai |

**Output:** mỗi trục PASS/FAIL/OBSERVATION + findings (Blocker/Major/Minor) + file:line. Kết luận tổng PASS → cho phép đóng Epic 2.4.

## Boundaries
Audit-only; không code/build/commit/push/tag.

## Risks
- R: thiếu trục fallback/security → prompt liệt kê đủ.

## Cross References
`09_EPIC2.4_ACCEPTANCE_CRITERIA.md` · tất cả tài liệu gate.
