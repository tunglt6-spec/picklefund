# Sprint 2 — Epic 2.3 Close Report
## PickleFund V2.1 — Club Memory + Deterministic Retrieval

---

**Ngày:** 2026-06-29 · **Branch:** `main` · **Epic 2.3 Commit:** `00b68e7cd5fecd3dc03354e2d3acdfedfb750dd9`

## 1. Objective
Triển khai Club Memory + Retrieval Engine (deterministic keyword/tag/metadata) + Index Manager (derived) + Semantic Search interface (No-op) + tích hợp Context Builder — theo AI Brain Baseline v1.0 + Epic 2.3 Gate. KHÔNG embedding/vector/RAG.

## 2. Scope
Club Memory (module/service/controller/repo/types/dto/interfaces) · Retrieval Engine · Index Manager · ISemanticSearchProvider + Noop · Context Builder integration · API `/club-memory` + `/retrieval` · Tests · Docs.

## 3. Files Created
| Module | Files |
|---|---|
| `backend/src/ai/club-memory/` | module/service/controller/types/dto/interfaces/repository + 3 spec |
| `backend/src/ai/retrieval/` | module/service/controller/types/index-manager/semantic-search.interface/noop-semantic-search.provider + 4 spec |

## 4. Files Modified
`app.module.ts` (wire 2 module) · `conversation/conversation.module.ts` (import RetrievalModule) · `conversation/conversation.context-builder.ts(.spec)` (additive Club Memory source) · `Sprint2_{Implementation,Test,Architecture_Validation}` docs.

## 5. Codex Audit Result
Lần 1: FAIL (Metadata Retrieval NOT IMPLEMENTED). Sau hotfix → Final Delta Audit: **PASS** → APPROVED.

## 6. Hotfix Summary
Metadata retrieval triển khai: `RetrievalQuery.metadata` + `IndexEntry.metadata` (derived), filter exact-match + AND logic; tie-break deterministic `score → updatedAt → memoryId`. KHÔNG fuzzy/semantic/embedding/LLM.

## 7. Tests
Epic 2.3: club-memory + retrieval = 6 suites / 37 tests (+ context-builder integration). Toàn backend: **42 suites / 392 tests PASS**. `nest build` PASS.

## 8. Coverage (club-memory + retrieval)
Statements **100%** · Functions **100%** · Lines **100%** · Branches logic **93%** (≥90% cả 4 metric; branch tổng incl-DTO 89.28% do decorator metadata). Không làm tròn.

## 9. Technical Debt
| # | Nợ | Kế hoạch |
|---|---|---|
| TD-1 | In-memory repository + index volatile | Epic 2.4 (persistence) |
| TD-2 | Spec lỗi `no-unsafe-*` (pattern repo) | Đợt dọn lint riêng |
| TD-3 | `backend/coverage/` artifact untracked | Nên gitignore |

## 10. Deferred Items
Vector Store · Embedding · Hybrid/Semantic retrieval thật · RAG · Persistent Repository · Optimization → Epic 2.4+.

## 11. Final Decision
```
EPIC 2.3 = CLOSED

Ready for:
EPIC 2.4 — Vector Store + Embedding + Optimization
```

*PickleFund V2.1 — Sprint 2 Epic 2.3 Close Report*
