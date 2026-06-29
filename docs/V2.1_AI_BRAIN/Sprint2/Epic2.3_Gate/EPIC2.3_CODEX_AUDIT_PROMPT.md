# 09 — Epic 2.3 Codex Audit Prompt
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial Codex audit prompt (cho sau khi Epic 2.3 implement) |

---

## Prompt cho Codex (dùng SAU khi Epic 2.3 implementation hoàn thành)

> Bạn là Codex, thực hiện audit Epic 2.3 (Club Memory + Semantic Search). CHỈ review, KHÔNG sửa code/build/commit/push. Đối chiếu code thực tế với các tài liệu gate trong `docs/V2.1_AI_BRAIN/Sprint2/Epic2.3_Gate/`.

Audit theo 10 trục:

| # | Trục | Tiêu chí PASS |
|---|---|---|
| 1 | Club Memory | scope clubId; 6 loại; không PII/tài chính |
| 2 | Retrieval boundary | keyword/tag/metadata; interface embedding-ready; không LLM ranking |
| 3 | Indexing strategy | index là derived view; rebuild từ Memory Object |
| 4 | Source of Truth | Memory Object là SoT; index không phải SoT |
| 5 | Tenant isolation | clubId từ JWT; no cross-club; no body override |
| 6 | No Vector Store impl | không Chroma/Qdrant/PGVector/Pinecone; không dependency/Docker/migration |
| 7 | No Embedding | không embedding service / external API |
| 8 | No Finance calculation | reference RC1 only; không cache balance/contribution/expense/carryForward |
| 9 | Context Builder compatibility | additive source; Epic 2.2 không bị viết lại; Gateway/Prompt Engine không đổi |
| 10 | Documentation sync | docs khớp code; không claim sai |

**Yêu cầu output:** mỗi trục PASS/FAIL/OBSERVATION + findings (Blocker/Major/Minor) + tham chiếu file:line. Kết luận tổng PASS → cho phép đóng Epic 2.3.

## Clear Boundaries
Audit-only; không code/build/commit/push/tag.

## DoD
Codex trả PASS toàn bộ 10 trục.

## Risks
- R: audit thiếu trục boundary → prompt liệt kê đủ 10 trục.

## Security Notes
Audit phải kiểm T1–T6 trong `SECURITY_AND_TENANT_ISOLATION.md`.

## Cross References
`EPIC2.3_ACCEPTANCE_CRITERIA.md` · tất cả tài liệu gate
