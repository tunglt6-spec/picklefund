# 04 — Retrieval Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial retrieval (design) certification |

---

## Purpose
Chứng nhận **thiết kế** Retrieval (Epic 2.3 Architecture Gate) — chưa phải implementation.

## Scope
Club Memory model · Keyword/Tag/Metadata retrieval · Index as derived view · Deterministic retrieval · No LLM ranking · No Vector Store (Epic 2.3) · Vector Store deferred (Epic 2.4).

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| Club Memory model | scope clubId, no PII/finance | `Epic2.3_Gate/CLUB_MEMORY_MODEL.md` | PENDING |
| Keyword retrieval | thiết kế keyword match | `RETRIEVAL_PIPELINE_DESIGN.md` | PENDING |
| Tag retrieval | filter theo tag | `RETRIEVAL_PIPELINE_DESIGN.md` | PENDING |
| Metadata retrieval | filter clubId/type/recency | `RETRIEVAL_PIPELINE_DESIGN.md` | PENDING |
| Index as derived view | rebuild từ Memory Object (SoT) | `INDEXING_STRATEGY.md` | PENDING |
| Deterministic retrieval | ranking không LLM | `RETRIEVAL_PIPELINE_DESIGN.md` | PENDING |
| No LLM ranking | cấm gọi LLM ranking | gate rule | PENDING |
| No Vector Store (2.3) | chỉ interface | `VECTOR_STORE_BOUNDARY.md` | PENDING |
| Vector Store deferred (2.4) | capability matrix | `VECTOR_STORE_BOUNDARY.md` | PENDING |

## Evidence Placeholder
`[Evidence: Epic 2.3 Gate package (10 docs) — chờ Codex Gate Audit PASS]`

## Risk Notes
- R: scope creep sang embedding/vector ở 2.3 → boundary matrix.
- R: index bị coi là SoT → nguyên tắc derived/rebuild.

## Cross References
`Epic2.3_Gate/*` · `03_MEMORY_LAYER_CERTIFICATION.md` · `07_FINANCE_ISOLATION_CERTIFICATION.md`
