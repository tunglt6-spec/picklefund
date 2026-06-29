# 08 — Epic 2.3 Acceptance Criteria
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial DoD for Epic 2.3 (design only) |

---

## Definition of Done (Epic 2.3 — khi triển khai)

| # | Tiêu chí |
|---|---|
| 1 | Club Memory implemented (scope clubId; Facts/Rules/Preferences/Policies/Knowledge/Operational Notes) |
| 2 | Retrieval interface implemented (embedding-ready) |
| 3 | Keyword/tag/metadata retrieval implemented |
| 4 | **No Vector DB provider** (chỉ interface) |
| 5 | **No Embedding implementation** / no external embedding API |
| 6 | **No Finance calculation** (reference RC1 only) |
| 7 | **No cross-club leak** (tenant isolation theo clubId) |
| 8 | Context Builder integration safe (additive source, không phá Epic 2.2) |
| 9 | Tests PASS (Club Memory CRUD, retrieval, isolation, integration) — coverage stmts/lines/funcs ≥ 90% |
| 10 | Codex PASS |

## Checklists

### Boundary
- [ ] Không Chroma/Qdrant/PGVector/Pinecone
- [ ] Không dependency/Docker/migration vector DB
- [ ] Index là derived view, rebuild từ Memory Object

### Security/Tenant
- [ ] clubId từ JWT; không body override
- [ ] Không PII/tài chính trong Club Memory
- [ ] Không log prompt/vector/secret

### Integration
- [ ] Context Builder thêm source, không viết lại
- [ ] AI Gateway / Prompt Engine / Finance Engine không đổi

## Clear Boundaries
DoD này chốt giới hạn Epic 2.3; vượt (vector/embedding) → từ chối, đẩy sang Epic 2.4.

## Risks
- R: scope creep sang 2.4 → Mitigation: checklist Boundary.

## Security Notes
Xem `SECURITY_AND_TENANT_ISOLATION.md`.

## Cross References
`SEMANTIC_SEARCH_BOUNDARY.md` · `EPIC2.3_CODEX_AUDIT_PROMPT.md`
