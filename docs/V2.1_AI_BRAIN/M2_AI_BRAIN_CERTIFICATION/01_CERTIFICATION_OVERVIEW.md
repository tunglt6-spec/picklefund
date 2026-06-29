# 01 — M2 AI Brain Certification Overview
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial M2 certification overview (docs only) |

---

## Purpose
Chứng nhận nền tảng **AI Brain** (Harness + Memory + Retrieval design + Security + Multi-tenant + Finance Isolation + Desktop/Mobile + Documentation) đủ điều kiện trước khi tích hợp Agent (Maika/Lisa/Hermes) từ Sprint 3.

## Scope
- AI Harness (Sprint 1), Memory Core (Epic 2.1), Conversation/User Memory (Epic 2.2), Retrieval design gate (Epic 2.3).
- Security, multi-tenant isolation, Finance isolation, Desktop/Mobile consistency, documentation.

## Out of Scope
- Triển khai Agent (Maika/Lisa/Hermes), Semantic Search/Vector Store/Embedding implementation, code mới, sửa Finance Engine RC1 / backend / frontend / DB / pipeline.

## Certification Criteria
Mỗi vùng đạt khi: requirement rõ ràng · evidence trỏ tới code/docs thực tế · không vi phạm ranh giới (Finance isolation, tenant isolation, không vượt scope).

## Certification Levels
| Level | Ý nghĩa |
|---|---|
| CERTIFIED | Codex audit PASS toàn bộ checklist vùng đó |
| CONDITIONAL | PASS kèm deferred items ghi nhận |
| PENDING | Chưa audit (mặc định hiện tại) |
| FAILED | Có blocker |

## Certification Workflow
```mermaid
flowchart LR
    A["Architecture (Sprint 1/2 LOCKED)"] --> C["M2 Certification (docs + checklist)"]
    C --> X["Codex Certification Audit"]
    X -->|PASS| R["Agent Readiness (Sprint 3: Maika/Lisa/Hermes)"]
    X -->|FAIL| C
    style A fill:#9B59B6,color:#fff
    style X fill:#E67E22,color:#fff
    style R fill:#27AE60,color:#fff
```

## Relationship
- **Enterprise Handbook v1.0:** M2 tuân thủ Governance/Release Gate/Source of Truth/DoD.
- **Sprint 1/2:** M2 chứng nhận output của Sprint 1 (Harness) + Sprint 2 (Memory + Retrieval gate).
- **Agents Maika/Lisa/Hermes:** chỉ được khởi động sau khi M2 = CERTIFIED.

## Certification Checklist (overview)
- [ ] AI Harness certified (`02`)
- [ ] Memory Layer certified (`03`)
- [ ] Retrieval design certified (`04`)
- [ ] Security certified (`05`)
- [ ] Multi-tenant certified (`06`)
- [ ] Finance isolation certified (`07`)
- [ ] Desktop/Mobile certified (`08`)
- [ ] Documentation certified (`09`)
- [ ] M2 report finalized (`10`)

## Evidence Placeholder
`[Evidence: tổng hợp từ 02–09 — PENDING CODEX]`

## Risk Notes
- R: tự đánh dấu PASS trước audit → cấm; mặc định PENDING.
- R: phạm vi M2 lẫn implementation Agent → Out of Scope rõ ràng.

## Cross References
`02`–`10` trong thư mục này · `../../ENTERPRISE_DEVELOPMENT_HANDBOOK.md` · Sprint1/Sprint2 docs.
