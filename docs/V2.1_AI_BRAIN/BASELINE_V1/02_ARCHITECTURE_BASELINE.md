# 02 — Architecture Baseline
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial architecture baseline inventory |

---

## Purpose
Liệt kê toàn bộ thành phần thuộc baseline + trạng thái + tham chiếu chứng nhận.

## Scope
Toàn bộ AI Brain đã CLOSED/LOCKED tới M2.

## Baseline Inventory

| Component | Status | Certified |
|---|---|---|
| AI Harness (Gateway/Provider/Routing/Retry/CB/Telemetry/Token/Config) | CLOSED (Sprint 1 + 1.1) | M2 `02` (PENDING Codex) |
| Memory Core (Epic 2.1) | CLOSED | M2 `03` (PENDING Codex) |
| Conversation Memory (Epic 2.2) | CLOSED | M2 `03` (PENDING Codex) |
| User Memory (Epic 2.2, tenant clubId:userId) | CLOSED | M2 `03`/`06` (PENDING Codex) |
| Club Memory Architecture | DESIGN (Epic 2.3 gate) | M2 `04` (PENDING Codex) |
| Retrieval Architecture | DESIGN (keyword/tag/metadata) | M2 `04` (PENDING Codex) |
| Finance Isolation | ENFORCED (RC1 only) | M2 `07` (PENDING Codex) |
| Multi-tenant | ENFORCED (club/user/session) | M2 `06` (PENDING Codex) |
| Desktop/Mobile | SHARED Gateway/API | M2 `08` (PENDING Codex) |

## Cross References
`01_BASELINE_OVERVIEW.md` · `03_ARCHITECTURE_INVARIANTS.md` · `../M2_AI_BRAIN_CERTIFICATION/*`.

## Risks
- R: "Certified" còn PENDING Codex → baseline chỉ lock sau M2 audit + governance close.

## References
Sprint 1/2 reports, Epic 2.1/2.2 close, Epic 2.3 gate, M2 package.
