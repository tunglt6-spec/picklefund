# 03 — Memory Layer Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial Memory Layer certification |

---

## Purpose
Chứng nhận Memory Layer (Epic 2.1 + 2.2) và trạng thái gate Epic 2.3.

## Scope
Memory Core · Memory API · Memory Manager · Repository Abstraction · In-memory Repository · Deep Immutability · Conversation Memory · User Memory · Context Builder · Context Window Manager.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| Memory Core | CRUD + types + interfaces | `backend/src/ai/memory/` | PENDING |
| Memory API | `/memory` shared, scope JWT | `memory.controller.ts` | PENDING |
| Memory Manager | save/load/update/delete/list/search | `memory.service.ts` | PENDING |
| Repository Abstraction | interface; persistence deferred | `memory.interfaces.ts` | PENDING |
| In-memory Repository | volatile default | `memory.repository.ts` | PENDING |
| Deep Immutability | deep clone + deep freeze | `memory.types.ts` (deepFreeze) | PENDING |
| Conversation Memory | Conversation→Messages immutable | `ai/conversation/` | PENDING |
| User Memory | Profile/Preference/Behavior tách biệt | `ai/user-memory/` | PENDING |
| Context Builder | history + user memory, no semantic | `conversation.context-builder.ts` | PENDING |
| Context Window Manager | budget + rolling window | `conversation.context-window.ts` | PENDING |

## Epic Status
- **Epic 2.1 Memory Core:** CLOSED (commit ca7285f).
- **Epic 2.2 Conversation + User Memory:** CLOSED (commit f7990da); User Memory tenant `clubId:userId`.
- **Epic 2.3 Retrieval:** Architecture Gate LOCKED (design), implementation chờ Codex gate audit.

## Known Deferred Items
- Persistent repository (Epic 2.4) · Behavior Memory chưa vào Context Builder · LLM summarization · Semantic/Vector (Epic 2.3 impl + 2.4).

## Evidence Placeholder
`[Evidence: backend tests 348 PASS; memory coverage stmts/lines/funcs 100% — xác nhận bởi Codex]`

## Risk Notes
- R: volatile in-memory → deferred persistence.

## Cross References
`04_RETRIEVAL_CERTIFICATION.md` · `06_MULTI_TENANT_CERTIFICATION.md` · Epic 2.1/2.2 close reports.
