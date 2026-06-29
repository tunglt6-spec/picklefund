# 08 — Desktop / Mobile Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial Desktop/Mobile certification |

---

## Purpose
Chứng nhận Desktop và Mobile dùng chung hạ tầng AI Brain, không phân nhánh.

## Scope
Shared AI Gateway · shared Memory API · no separate API · no separate business logic · unified error handling · unified permission · unified loading/empty/error state.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| Shared AI Gateway | cùng `POST /ai/chat` qua `useAIGateway` | `frontend/src/hooks/useAIGateway.ts` | PENDING |
| Shared Memory API | `/memory`, `/conversations`, `/user-memory` chung | backend controllers | PENDING |
| No separate API | không endpoint riêng nền tảng | API review | PENDING |
| No separate business logic | logic ở backend service chung | code review | PENDING |
| Unified error handling | cùng error model (`ok()` + HttpException) | `common/response.ts` | PENDING |
| Unified permission | cùng JWT/role/tenant | guards | PENDING |
| Unified loading/empty/error | hook state chung | `useAIGateway` state | PENDING |

## Evidence Placeholder
`[Evidence: shared hook + shared API contract — Codex confirm; Mobile parity theo memory project_mobile_parallel]`

## Risk Notes
- R: Mobile UI triển khai sau có thể lệch → ràng buộc dùng chung hook/API (Desktop/Mobile consistency matrix).

## Cross References
`../../HANDBOOK_REVIEW/05_DESKTOP_MOBILE_CONSISTENCY_MATRIX.md` · `02_AI_HARNESS_CERTIFICATION.md`
