# 04 — Source of Truth Baseline
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial source-of-truth baseline |

---

## Purpose
Chốt Source of Truth (SoT) cho từng domain.

## Scope
Toàn hệ thống AI Brain + Finance.

## SoT Matrix

| Domain | Source of Truth | KHÔNG phải SoT |
|---|---|---|
| Finance | **Finance Engine RC1** | AI, Memory, cache bất kỳ |
| Memory (chung) | **Memory Object** | Index, Vector Store (tương lai), AI Agent |
| Conversation | **Conversation Object (messages)** | Summary, context đã trim |
| User | **User Memory Object** (clubId:userId) | Context snapshot |
| Club | **Club Memory Object** (clubId) — design | Retrieval index |
| Retrieval Index | (derived) → SoT là Memory Object | Index không phải SoT |
| Configuration | **`.env` / ConfigService** | Giá trị hardcode |
| Knowledge Base | **`KNOWLEDGE_BASE.md`** (append-only) | Bản sao rời |

## Khẳng định
- **Memory Object là Source of Truth.**
- **Index KHÔNG phải** SoT (derived, rebuildable).
- **Vector Store (sau này) KHÔNG phải** SoT.
- **AI Agent KHÔNG phải** SoT.

## Cross References
`03_ARCHITECTURE_INVARIANTS.md` (INV-01/05) · `../Sprint2/Epic2.3_Gate/INDEXING_STRATEGY.md`.

## Risks
- R: coi index/vector/agent là SoT → vi phạm INV-05; cấm.

## References
Finance Engine RC1, Memory modules, Epic 2.3 indexing strategy.
