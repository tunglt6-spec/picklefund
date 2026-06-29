# 06 — Multi-Tenant Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial multi-tenant certification |

---

## Purpose
Chứng nhận cách ly đa tenant trên toàn AI Brain.

## Scope
clubId isolation · userId isolation · session owner key · user memory owner key · club memory scope · no cross-club access · no global user memory · no public session memory.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| clubId isolation | scope theo clubId từ JWT | tenant guard + controllers | PENDING |
| userId isolation | user memory/conversation theo userId | `user-memory`, `conversation` | PENDING |
| session owner key | `${club}:${user}:${session}` | `memory.controller.ts` | PENDING |
| user memory owner key | `${clubId}:${userId}` | `user-memory.types.ts` (ownerKey) | PENDING |
| club memory scope | clubId (design) | `Epic2.3_Gate/CLUB_MEMORY_MODEL.md` | PENDING |
| no cross-club access | negative tests | user-memory/conversation specs | PENDING |
| no global user memory | thiếu clubId → reject | `user-memory.service.ts` (requireClub) | PENDING |
| no public session memory | SESSION prefix check | `memory.controller.ts` (Sprint1.1 hotfix) | PENDING |

## Evidence Placeholder
`[Evidence: isolation tests (same-user/diff-club, same-club/diff-user, SESSION) — Codex confirm]`

## Risk Notes
- R: tenant spoof qua body → clubId chỉ từ JWT (không body override).

## Cross References
`05_SECURITY_CERTIFICATION.md` · `03_MEMORY_LAYER_CERTIFICATION.md`
