# 01 — AI Brain Baseline v1.0 Overview
## PickleFund V2.1

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial AI Brain Baseline v1.0 (docs only) |

---

## Purpose
Khóa toàn bộ kiến trúc **AI Brain** thành nền tảng chuẩn (Baseline v1.0) trước khi code Epic 2.3 và tích hợp Agent. Sau lock, mọi thay đổi vùng baseline phải qua Change Control (`08`).

## Scope
AI Harness (Sprint 1) · Memory Core (2.1) · Conversation + User Memory (2.2) · Retrieval/Club Memory architecture (2.3 gate) · Finance Isolation · Multi-tenant · Desktop/Mobile.

## Components Included
AI Gateway, Provider Manager, Routing, Retry, Circuit Breaker, Telemetry, Token Accounting, Config Center, Memory Core/API/Manager, Conversation Memory, User Memory, Context Builder, Context Window Manager, Retrieval design + Club Memory model.

## Components Excluded (không thuộc baseline lock này)
Semantic Search/Vector Store/Embedding implementation, Club Memory implementation, Agent (Maika/Lisa/Hermes), Persistent repository — đều **Deferred** (`06`).

## Relationship
```mermaid
flowchart LR
    H["Enterprise Handbook v1.0 (LOCKED)"] --> M1["M1 Architecture Lock"]
    M1 --> S1["Sprint 1 Harness"]
    S1 --> E21["Epic 2.1 Memory Core"]
    E21 --> E22["Epic 2.2 Conv+User Memory"]
    E22 --> E23["Epic 2.3 Gate (design)"]
    E23 --> M2["M2 Certification"]
    M2 --> BL["AI Brain Baseline v1.0"]
    BL --> S3["Sprint 3: Maika / Lisa / Hermes"]
    style BL fill:#9B59B6,color:#fff
    style S3 fill:#27AE60,color:#fff
```

## Cross References
`02`–`10` trong thư mục này · `../ENTERPRISE_DEVELOPMENT_HANDBOOK.md` · `../M2_AI_BRAIN_CERTIFICATION/*` · `../Sprint2/Epic2.3_Gate/*`.

## Risks
- R: thay đổi baseline không qua review → Change Control Policy (`08`).
- R: tự lock trước governance → mặc định PENDING.

## References
Handbook v1.0, M1/M2, Sprint 1/2, Epic 2.1/2.2 close reports, Epic 2.3 gate.
