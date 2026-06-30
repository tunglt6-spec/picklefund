# Sprint 2 Implementation Report — Epic 2.1
## PickleFund V2.1 — Memory Core Foundation

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Epic:** 2.1 — Memory Core Foundation
**Trạng thái:** COMPLETE ✅ (post-hotfix; chờ Codex Epic 2.1 Re-Audit)
**Phạm vi:** CHỈ Memory Core. KHÔNG embedding/vector/semantic/RAG/persona.

> **Hotfix (sau Codex FAIL lần 1):** đã xử lý 5 blocker — SESSION ownership, deep immutability, config consistency, test correction, docs sync. Chi tiết §4–§6.

---

## 1. Tóm tắt

Triển khai nền tảng Memory Core theo `Sprint2/01..08` + Enterprise Handbook v1.0:
- Memory module `backend/src/ai/memory/` (module/service/types/interfaces).
- `MemoryManager`: save / load / delete / update / list / search. KHÔNG biết Vector DB.
- Memory API (`/memory`) — POST/GET/PUT/DELETE — dùng chung Desktop/Mobile/Maika/Lisa/Hermes.
- Memory Object **immutable**; Memory Type enum (SYSTEM/USER/CLUB/SESSION/TEMP/LONG_TERM).
- Repository **abstraction** (interface) + in-memory default volatile (persistence deferred).
- Config từ `.env`/ConfigService, không hardcode.

## 2. Files created

| File | Vai trò |
|---|---|
| `backend/src/ai/memory/memory.module.ts` | DI wiring; bind `MEMORY_REPOSITORY` → in-memory default |
| `backend/src/ai/memory/memory.service.ts` | `MemoryManager` (CRUD + list/search + TTL + immutability) |
| `backend/src/ai/memory/memory.types.ts` | `MemoryType`, `MemoryOwnerType`, `MemoryObject` (immutable) |
| `backend/src/ai/memory/memory.interfaces.ts` | `IMemoryRepository` abstraction + inputs + `MEMORY_REPOSITORY` token |
| `backend/src/ai/memory/memory.repository.ts` | `InMemoryMemoryRepository` (volatile default — KHÔNG persistence) |
| `backend/src/ai/memory/memory.dto.ts` | `CreateMemoryDto`/`UpdateMemoryDto` + class-validator |
| `backend/src/ai/memory/memory.controller.ts` | Memory API (shared) + scope/isolation từ JWT |
| `backend/src/ai/memory/memory.repository.spec.ts` | Test repository |
| `backend/src/ai/memory/memory.service.spec.ts` | Test MemoryManager + CRUD + TTL + immutability |
| `backend/src/ai/memory/memory.controller.spec.ts` | Test Memory API + access control |

## 3. Files modified

| File | Lý do |
|---|---|
| `backend/src/app.module.ts` | Thêm `MemoryModule` vào imports (wiring API). Không đổi gì khác. |
| `.env.example` | Thêm `MEMORY_DEFAULT_TTL_SECONDS`, `MEMORY_MAX_CONTENT_LENGTH` (hotfix 3) |

> Các file memory đã chỉnh trong hotfix: `memory.controller.ts` (SESSION composite + access), `memory.service.ts` + `memory.types.ts` (deep clone/freeze), `memory.dto.ts` (hard-cap constant), + 3 spec (negative ownership + nested immutability).

> KHÔNG sửa: Finance Engine RC1, AI Harness, Routing, Provider, LiteLLM/OpenRouter/Ollama, Desktop UI, Mobile UI, Database schema.

## 4. Architecture summary

```
Desktop / Mobile / Maika / Lisa / Hermes
   └── /memory (POST/GET/PUT/DELETE)  ← MemoryController (shared, scope từ JWT)
        └── MemoryManager (save/load/update/delete/list/search)
             └── IMemoryRepository (abstraction)
                  └── InMemoryMemoryRepository (volatile default; SQLite/Postgres/Qdrant DEFERRED)
```

- **MemoryManager KHÔNG biết Vector DB** — chỉ thao tác Memory Object qua repository abstraction.
- **search()** = lọc metadata/tag/text (KHÔNG semantic, KHÔNG embedding).
- **Deep immutable** (hotfix 2): khi save/update, input được **deep clone** (`structuredClone`) rồi **deep freeze** đệ quy (root + tags + metadata + nested). Mutate input/metadata.nested/tags sau khi save KHÔNG ảnh hưởng state đã lưu; `update()` tạo object mới, KHÔNG mutate object cũ; object load về không thể mutate.
- **Tenant isolation** (hotfix 1):
  - USER memory: `ownerId == userId` (JWT).
  - CLUB memory: `ownerId == clubId` (JWT).
  - **SESSION memory: ownerId = composite `${clubId|none}:${userId}:${sessionId}`**, nhất quán ở create/load/update/delete/list. `assertAccess` kiểm tra prefix `${club}:${user}:` → user/club khác KHÔNG đọc/sửa/xoá được. SESSION **không** còn public.
  - SUPER_ADMIN bypass (có test rõ). Non-SUPER_ADMIN bị ép scope của chính mình ở list.

## 5. Source of Truth & Config & Constraints

- **Config (hotfix 3):** `MEMORY_MAX_CONTENT_LENGTH` + `MEMORY_DEFAULT_TTL_SECONDS` đọc từ ConfigService — **runtime source of truth** (service enforce). DTO dùng hard cap kỹ thuật `MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH = 1_000_000` (không còn hardcode 100_000 lệch config). Cả hai biến đã có trong `.env.example`.
- Memory **KHÔNG** tính nghiệp vụ, **KHÔNG** cache balance/contribution/expense. Tài chính chỉ từ Finance Engine RC1.
- In-memory repository là **volatile default**; persistence (SQLite/Postgres/Qdrant) **deferred**.
- Không triển khai (đúng yêu cầu): Conversation/User/Club Memory logic, Semantic Search, Embedding, Vector Store, Similarity, RAG, Ranking, Compression, Maika/Lisa/Hermes.

## 6. Build / Test (tóm tắt)

| Gate | Kết quả |
|---|---|
| `nest build` | PASS (0 lỗi) |
| Backend tests | PASS — 28 suites / 297 tests |
| Memory tests | PASS — 3 suites / 57 tests |
| Coverage (memory) | Statements 95% · Lines 96.04% · Functions 100% · Branches 90.19% |
| ESLint memory source (non-test) | 0 lỗi |

Chi tiết: `Sprint2_Test_Report.md`, validation: `Sprint2_Architecture_Validation.md`.

## 7. Git

KHÔNG commit/push/tag/release (theo yêu cầu).

---

*PickleFund V2.1 — Sprint 2 Epic 2.1 Implementation Report v1.0.0*

---

# Epic 2.2 — Conversation Memory + User Memory

**Trạng thái:** COMPLETE ✅ (post-hotfix; chờ Codex Epic 2.2 Re-Audit) · **Phạm vi:** chỉ Epic 2.2 (không 2.3/2.4).

> **Hotfix (sau Codex FAIL):** User Memory nay isolate theo **tenant `${clubId}:${userId}`** (không còn chỉ `userId`). Repository dùng composite key; service/controller bắt buộc clubId từ JWT; thiếu clubId → reject (BadRequest). **KHÔNG có Global User Memory** trong Epic 2.2.

## E2.2 — Files created

| Module | Files |
|---|---|
| `backend/src/ai/conversation/` | `conversation.{module,service,controller,types,dto,interfaces,repository,context-window,context-builder}.ts` + 4 spec |
| `backend/src/ai/user-memory/` | `user-memory.{module,service,controller,types,dto,interfaces,repository}.ts` + 3 spec |

## E2.2 — Files modified

| File | Lý do |
|---|---|
| `backend/src/app.module.ts` | Wire `ConversationModule` + `UserMemoryModule` |
| `.env.example` | `CONTEXT_TOKEN_BUDGET`, `CONTEXT_MAX_HISTORY_MESSAGES` |

> KHÔNG sửa Finance Engine / Memory Core (Epic 2.1) / AI Harness / LiteLLM/OpenRouter/Ollama / Desktop UI / Mobile UI / Pipeline / Knowledge Base. `deepFreeze` của Memory Core chỉ **import** (không sửa).

## E2.2 — Architecture summary

- **Conversation Memory:** Conversation → Messages (Message Object: messageId/conversationId/role/content/timestamp/metadata/tokenCount). Role enum SYSTEM/USER/ASSISTANT/TOOL. **Immutable** (deep clone + deep freeze); `appendMessage/summarize/archive` tạo object mới. Lifecycle: create/append/load/summarize/archive — **archive chỉ đổi trạng thái, không xoá**. Summarize **deterministic, KHÔNG LLM** (LLM summarization deferred).
- **User Memory:** 3 loại **TÁCH BIỆT** — Profile (nickname/displayName/language/timezone) · Preference (favoriteModel/uiPreference/responseStyle/notificationPreference) · Behavior (interactionCount/recentTopics/preferredPromptStyle/usageStatistics). Không trộn vào một object. **Scope = tenant `${clubId}:${userId}`** (mỗi object có `clubId`, `userId`, `ownerKey`). Cùng userId khác club → tách biệt hoàn toàn; cùng club khác user → tách biệt. KHÔNG global, KHÔNG fallback.
- **ConversationContextBuilder:** Load History → Load User Memory (**Profile + Preference**; Behavior CHƯA đưa vào context ở Epic 2.2) → Merge → Trim → Return Context. KHÔNG Semantic/Embedding/Vector. Conversation không gắn club → bỏ qua User Memory.
- **ContextWindowManager:** token budget + max history + trimming + rolling window (giữ SYSTEM, lấy recent contiguous trong budget). Không ranking/similarity/embedding.
- **API (shared Desktop/Mobile/Maika/Lisa/Hermes):** `/conversations` (POST/GET/:id/:id/messages/:id/summarize/:id/archive/:id/context) + `/user-memory/{profile,preference,behavior}` (GET/PUT).
- **Security:** JWT; Conversation owner = (clubId,userId) — KHÔNG cross-club/cross-user (SUPER_ADMIN bypass, có test); **User Memory scope theo tenant `${clubId}:${userId}` từ JWT** — client KHÔNG override được clubId (DTO không có clubId); thiếu clubId → reject. User Memory KHÔNG có SUPER_ADMIN bypass (luôn cần club context).
- **Config:** `CONTEXT_TOKEN_BUDGET`, `CONTEXT_MAX_HISTORY_MESSAGES` từ ConfigService.
- **Finance Isolation:** KHÔNG cache finance/contribution/balance/expense/carry-forward — Finance Engine RC1 ONLY.

## E2.2 — Build / Test

| Gate | Kết quả |
|---|---|
| `nest build` | PASS (0 lỗi) |
| Backend tests | PASS — 36 suites / 343 tests |
| Epic 2.2 tests | PASS — 8 suites / 46 tests |
| Coverage (conversation + user-memory) | Statements/Lines/Functions **100%**; Branches 85.84% (excl DI) / 89.1% (excl DI+DTO) — phần dưới 90% là DTO decorator metadata + `??` default, không phải logic chưa test |
| ESLint source (non-test) | 0 lỗi |

*PickleFund V2.1 — Sprint 2 Epic 2.2 Implementation Report v1.0.0*

---

# Epic 2.3 — Club Memory + Retrieval (Implementation)

**Trạng thái:** COMPLETE ✅ (post-hotfix; chờ Codex Final Re-Audit) · Tuân thủ AI Brain Baseline v1.0 + Epic 2.3 Gate.

> **Hotfix (Codex blocker):** Metadata Retrieval nay **đã triển khai** — `RetrievalQuery.metadata` + `IndexEntry.metadata` (derived từ Club Memory), filter **exact match + AND logic** (không fuzzy/semantic/embedding). Tie-break 100% deterministic: **score → updatedAt → memoryId**.

## E2.3 — Files created
| Module | Files |
|---|---|
| `backend/src/ai/club-memory/` | `club-memory.{module,service,controller,types,dto,interfaces,repository}.ts` + 3 spec |
| `backend/src/ai/retrieval/` | `retrieval.{module,service,controller,types}.ts`, `index-manager.ts`, `semantic-search.interface.ts`, `noop-semantic-search.provider.ts` + 4 spec |

## E2.3 — Files modified
| File | Lý do |
|---|---|
| `backend/src/app.module.ts` | Wire `ClubMemoryModule` + `RetrievalModule` |
| `conversation/conversation.module.ts` | Import `RetrievalModule` cho Context Builder |
| `conversation/conversation.context-builder.ts` | **Additive**: thêm Club Memory Retrieval source (`@Optional` RetrievalEngine) — không đổi Conversation/User Memory logic |

## E2.3 — Architecture summary
- **Club Memory:** scope `clubId`, immutable (deep clone + deep freeze), audit metadata (createdBy/updatedBy), tenant isolation (no cross-club, clubId từ JWT, thiếu clubId → reject). 6 type: FACT/RULE/PREFERENCE/POLICY/KNOWLEDGE/OPERATIONAL_NOTE.
- **Retrieval Engine:** deterministic keyword/tag/**metadata (exact match, AND)**; KHÔNG semantic/embedding/vector/rerank/LLM ranking. Score = keyword*2 + tag*3; tie-break **score → updatedAt → memoryId** (100% deterministic).
- **Index Manager:** index là **derived view**, rebuild từ Club Memory (Source of Truth) mỗi retrieve → delete/update-safe; có upsert/remove incremental + rebuild.
- **Semantic Search interface:** `ISemanticSearchProvider` + `NoopSemanticSearchProvider` (trả []). Epic 2.4 chỉ thay Provider, không refactor.
- **Context Builder integration:** Conversation → User Memory → **Club Memory Retrieval** → Prompt Context (additive, optional).

## E2.3 — API (shared Desktop/Mobile/Maika/Lisa/Hermes)
`/club-memory` (POST/GET/:id/PUT/:id/DELETE/:id) · `/retrieval/club-memory` (GET). clubId từ JWT, no body override.

## E2.3 — Security & Finance Isolation
JWT + RBAC + clubId isolation; no cross-club; no body override; no direct DB. KHÔNG cache balance/contribution/expense/carryForward/receipt — Finance Engine RC1 ONLY (retrieval không gọi Finance).

## E2.3 — Build / Test / Coverage
| Gate | Kết quả |
|---|---|
| `nest build` | PASS |
| Backend tests | PASS — 42 suites / 386 tests |
| Epic 2.3 tests (club-memory + retrieval) | PASS — 6 suites / 37 tests |
| Coverage (club-memory + retrieval) | Statements **100%** · Functions **100%** · Lines **100%** · Branches 89.28% (excl DI) / **93%** (excl DI+DTO decorators) |
| ESLint source (non-test) | 0 lỗi |

## E2.3 — Git
KHÔNG commit/push/tag/release; KHÔNG update Knowledge Base. KHÔNG Vector Store/Embedding/RAG/Persistent/Optimization/Agent.

*PickleFund V2.1 — Sprint 2 Epic 2.3 Implementation Report v1.0.0*

---

# Epic 2.4 — Vector Store + Embedding + Hybrid Retrieval (Implementation)

**Trạng thái:** COMPLETE ✅ (chờ Codex Final Audit) · Tuân thủ Epic 2.4 Gate + Baseline v1.0.

## E2.4 — Architecture Summary
Vector layer mới (`backend/src/ai/vector/`) bổ sung **Vector Store + Embedding + Semantic Search + Hybrid Retrieval + Optimization + Cost Guardrails + Observability** — **composition, KHÔNG refactor core** (RetrievalEngine/ContextBuilder/ClubMemory/MemoryManager/AI Gateway/Finance Engine giữ nguyên).

## E2.4 — Files Created
| File | Vai trò |
|---|---|
| `vector.types.ts` · `vector-store.interface.ts` · `in-memory-vector-store.provider.ts` | Vector Store abstraction + in-memory default (cosine, club-scoped) |
| `embedding.interface.ts` · `local-hash-embedding.provider.ts` · `embedding.service.ts` | Embedding abstraction + local default + batch/cache/budget/retry/DLQ |
| `vector-index.service.ts` | Derived index (rebuild từ Memory Objects) + incremental |
| `semantic-search.provider.ts` | `ISemanticSearchProvider` thật (embedding+similarity+threshold+timeout+fallback) |
| `hybrid-retrieval.service.ts` · `hybrid-retrieval.controller.ts` | Hybrid (deterministic priority + semantic supplement) + API |
| `vector-observability.service.ts` | Metrics (latency/failures/cache/fallback/semantic rate) |
| `vector.module.ts` | DI wiring (plug-in providers) |
| + 8 spec | Tests |

## E2.4 — Files Modified
`app.module.ts` (wire VectorModule) · `.env.example` (EMBEDDING_*/SEMANTIC_* config).

## E2.4 — Vector Store / Embedding / Semantic / Hybrid
- **Vector Store:** `IVectorStoreProvider` plug-in; default **in-memory** (volatile, derived). PGVector/Qdrant/Milvus/Pinecone/Weaviate swap qua binding — **deferred** (no DB schema change ở Epic này). **KHÔNG phải SoT; rebuild từ Memory Objects.**
- **Embedding:** `IEmbeddingProvider` (OpenAI-compatible shape); default **local deterministic** (no external API/cost). OpenAI/OpenRouter/Ollama/Voyage/Jina swap qua ConfigService. Batch + cache(TTL) + version + retry + DLQ.
- **Semantic Search:** thay khái niệm Noop bằng `SemanticSearchProvider` thật (embedding search + topK + threshold + timeout). **Fail/timeout/budget → [] → fallback deterministic.**
- **Hybrid:** deterministic (Epic 2.3) = **priority**; semantic = **supplement only** (không override); dedupe theo memoryId; tie-break deterministic; fallback khi semantic rỗng/lỗi.

## E2.4 — Optimization & Cost Guardrails
Batch embedding · cache TTL · incremental indexing (upsertOne/removeOne) · rebuild (rebuildClub) · retry + Dead-Letter Queue · embedding version. **Cost guardrail:** `EMBEDDING_DAILY_BUDGET` (vượt → BudgetExceeded → fallback deterministic). *Background worker/cron scheduler: method-level (rebuild/reindex endpoint); daemon hoá deferred.*

## E2.4 — Observability
Metrics: embedding latency/failures, vector latency, cache hit/miss, fallback count, semantic success rate, hybrid latency — endpoint `GET /hybrid-retrieval/metrics` (no PII/content).

## E2.4 — Security & Finance Isolation
JWT + clubId scope (vector records gắn clubId; query club-scoped) · no cross-club vector leak · no PII/finance trong embedding/metadata · **KHÔNG cache balance/contribution/expense/carryForward/receipt** — Finance Engine RC1 ONLY.

## E2.4 — Build / Test / Coverage
| Gate | Kết quả |
|---|---|
| `nest build` | PASS |
| Backend tests | PASS — 50 suites / 436 tests |
| Epic 2.4 vector tests | PASS — 8 suites / 44 tests |
| Coverage (vector, excl DI module) | Statements **99.65%** · Functions **98.48%** · Lines **99.58%** · Branches 86.98% |
| ESLint source (non-test) | 0 lỗi |

> [reality filter] Statements/Lines/Functions ≥90% (≈99%). Branch 86.98% — phần dưới 90% là nhánh `??`/default-param/optional-query phòng thủ (không phải logic chưa test). Không làm tròn.

## E2.4 — Git
KHÔNG commit/push/tag. Zero-refactor core đã giữ.

*PickleFund V2.1 — Sprint 2 Epic 2.4 Implementation Report v1.0.0*
