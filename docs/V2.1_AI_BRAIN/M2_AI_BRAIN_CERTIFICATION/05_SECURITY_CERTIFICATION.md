# 05 — Security Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial security certification |

---

## Purpose
Chứng nhận các kiểm soát bảo mật của AI Brain.

## Scope
JWT · RBAC · User/Club/Session isolation · No prompt/response/provider-secret leak · No memory cross-tenant leak · Audit metadata.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| JWT | Mọi AI/Memory endpoint qua JWT guard | global `JwtAuthGuard` | PENDING |
| RBAC | Roles guard; AI controller SUPER_ADMIN | `roles.guard.ts` + `@Roles` | PENDING |
| User isolation | User Memory scope userId | `user-memory.*` | PENDING |
| Club isolation | tenant `clubId` | `user-memory` (clubId:userId) + conversation owner | PENDING |
| Session isolation | SESSION composite key | `memory.controller.ts` (sessionOwnerPrefix) | PENDING |
| No prompt leak | không log prompt | `ai-gateway.service.ts` (log errorType only) | PENDING |
| No response leak | không log response body | gateway/router sanitize | PENDING |
| No provider secret leak | `AIProviderError` sanitize | `errors/ai-provider.error.ts` | PENDING |
| No memory cross-tenant leak | assertAccess theo owner | memory/conversation/user-memory controllers | PENDING |
| Audit metadata | clubId/type/time (no sensitive) | telemetry/token accounting | PENDING |

## Evidence Placeholder
`[Evidence: sanitize tests + isolation tests — xác nhận bởi Codex]`

## Risk Notes
- R: external embedding API (Epic 2.4) có thể rò tenant data → xử lý ở 2.4.

## Cross References
`06_MULTI_TENANT_CERTIFICATION.md` · `Epic2.3_Gate/SECURITY_AND_TENANT_ISOLATION.md`
