# 05 — Agent Readiness
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial agent readiness assessment |

---

## Purpose
Đánh giá mức sẵn sàng nền tảng cho Maika / Lisa / Hermes (chưa triển khai).

## Scope
Maika · Lisa · Hermes (Sprint 3+). Đánh giá dựa trên baseline hiện có.

## Readiness Matrix

| Agent | Ready Components | Missing Components | Dependencies | Earliest Sprint |
|---|---|---|---|---|
| **Maika** (trợ lý CLB) | AI Gateway, Conversation/User Memory, Context Builder, Finance read (RC1 summary) | Prompt Engine, Tool Registry, Club Memory impl | Epic 2.3 impl, Prompt Engine | Sprint 3 |
| **Lisa** (nhắc/scheduler) | AI Gateway, Telemetry, Token Accounting | Prompt Engine, scheduling hooks vào AI | Maika baseline | Sprint 3+ |
| **Hermes** (truyền tin/notify) | AI Gateway, Memory API | Retrieval impl, notification integration | Epic 2.3/2.4 | Sprint 3+ |

## Điều kiện chung
Mọi Agent: tuân thủ Invariants (`03`) — không bypass Memory API, không DB trực tiếp, không tự tính tài chính. Chỉ khởi động sau M2 = CERTIFIED + Baseline LOCKED.

## Cross References
`03_ARCHITECTURE_INVARIANTS.md` · `06_DEFERRED_ITEMS.md` · `../M2_AI_BRAIN_CERTIFICATION/10_M2_CERTIFICATION_REPORT.md`.

## Risks
- R: khởi động Agent trước khi baseline lock → cấm; gate theo M2/baseline.

## References
M2 certification, Sprint 2 architecture (Prompt Engine/Tool Registry specs).
