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
