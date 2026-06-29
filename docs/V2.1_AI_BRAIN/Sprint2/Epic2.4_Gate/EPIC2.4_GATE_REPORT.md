# Epic 2.4 Gate Report
## PickleFund V2.1 — Vector Store + Embedding + Optimization Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Gate package tổng hợp (design only) |

## Purpose
Tổng hợp Epic 2.4 Architecture Gate, bàn giao Codex Gate Audit.

## Total documents
**11** (10 tài liệu thiết kế `01`–`10` + báo cáo này):
`01_VECTOR_STORE_BOUNDARY` · `02_EMBEDDING_PIPELINE_DESIGN` · `03_SEMANTIC_PROVIDER_CONTRACT` · `04_HYBRID_RETRIEVAL_DESIGN` · `05_RAG_BOUNDARY` · `06_OPTIMIZATION_STRATEGY` · `07_PROVIDER_SELECTION_MATRIX` · `08_SECURITY_AND_PRIVACY` · `09_EPIC2.4_ACCEPTANCE_CRITERIA` · `10_EPIC2.4_CODEX_AUDIT_PROMPT`.

## Mermaid diagrams
**1** — Hybrid Retrieval flow (doc 04).

## Tables
**18** bảng (10 tài liệu thiết kế).

## Decisions
| ID | Quyết định |
|---|---|
| AD-E2.4-01 | Vector Store là derived view; Memory Object là SoT; rebuild được |
| AD-E2.4-02 | Default provider = PGVector (chi phí thấp, tái dùng Postgres, no lock-in) |
| AD-E2.4-03 | Semantic provider = plug-in thay Noop; KHÔNG refactor core |
| AD-E2.4-04 | Hybrid = deterministic nền + semantic bổ sung; fallback khi semantic fail |
| AD-E2.4-05 | Tie-break deterministic (score→updatedAt→memoryId); no LLM ranking |
| AD-E2.4-06 | Epic 2.4 KHÔNG full RAG/response generation |
| AD-E2.4-07 | Embedding no PII/finance; cost guardrail + cache + batch |

## Risks
| ID | Risk | Mitigation |
|---|---|---|
| R1 | Vendor lock-in | PGVector default + `IVectorStore` abstraction |
| R2 | Cross-club vector leak | scope clubId; filter trước/sau similarity |
| R3 | PII/finance trong embedding | content policy + cấm finance |
| R4 | Cost/latency cao | guardrail/budget/batch/cache + fallback |
| R5 | Refactor core layers | contract plug-in; checklist acceptance |

## Boundaries
Vector/embedding/hybrid = Epic 2.4. RAG response generation = Sprint sau. Memory Object = SoT. Deterministic retrieval (Epic 2.3) không bị ghi đè.

## Deferred items
Full RAG Agent · Prompt Engine · Maika/Lisa/Hermes · response generation.

## Ready for Codex Gate Audit
Tất cả tài liệu có Version · Status · Revision History · Purpose · Scope · Boundaries · Risks · Cross References.

---

```text
EPIC 2.4 ARCHITECTURE GATE = COMPLETE

READY FOR CODEX EPIC 2.4 GATE AUDIT

DO NOT IMPLEMENT EPIC 2.4 UNTIL CODEX PASSES
```

*PickleFund V2.1 — Sprint 2 Epic 2.4 Gate Report*
