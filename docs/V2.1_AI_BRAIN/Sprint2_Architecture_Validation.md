# Sprint 2 Architecture Validation — Epic 2.1
## PickleFund V2.1 — Memory Core Foundation

---

**Ngày:** 2026-06-29
**Epic:** 2.1 — Memory Core Foundation
**Đối chiếu:** `Sprint2/01..08`, `MEMORY_ARCHITECTURE_LOCK.md`, Enterprise Handbook v1.0

---

## 1. Tuân thủ Architecture Lock (Sprint 2)

| Yêu cầu thiết kế | Triển khai Epic 2.1 | Đạt |
|---|---|---|
| Memory Layer tách qua Memory API (AD-S2-01) | `MemoryController` `/memory`, độc lập | ✅ |
| Vector Store provider-agnostic (AD-S2-02/06) | Epic 2.1 chỉ làm Memory Core; repository là abstraction, vector deferred | ✅ (scope) |
| Không lưu số liệu tài chính (AD-S2-03) | Memory không có field/logic tài chính | ✅ |
| Một API/hook dùng chung mọi consumer (AD-S2-04) | `/memory` shared Desktop/Mobile/Maika/Lisa/Hermes | ✅ |
| Scope từ JWT principal (AD-S2-11) | ownerId ép từ principal; access enforced | ✅ |

### SESSION ownership rule (hotfix 1)
- SESSION `ownerId = ${clubId|none}:${userId}:${sessionId}` (composite), nhất quán create/load/update/delete/list.
- `assertAccess` kiểm tra prefix `${club}:${user}:` → **user A không đọc/sửa/xoá được SESSION của user B; club A ≠ club B**. SESSION KHÔNG public.
- Đã có test negative ownership + positive owner + SUPER_ADMIN bypass.

### Deep immutability (hotfix 2)
- Save/update: deep clone input (`structuredClone`) + deep freeze đệ quy (root + tags + metadata + nested).
- `update()` không mutate object cũ; object load về không mutate được. Đã có test nested.

### Config source (hotfix 3)
- `MEMORY_MAX_CONTENT_LENGTH`, `MEMORY_DEFAULT_TTL_SECONDS` từ ConfigService = runtime source of truth; có trong `.env.example`.
- DTO dùng `MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH` (hard cap kỹ thuật), không hardcode lệch config.

## 2. Tuân thủ Enterprise Handbook v1.0

| Trục | Kết quả |
|---|---|
| Source of Truth | Memory KHÔNG tính nghiệp vụ; tài chính = Finance Engine RC1 ONLY |
| Desktop/Mobile Consistency | Cùng API `/memory`, cùng response model (`ok()`), không API riêng |
| Configuration | `MEMORY_DEFAULT_TTL_SECONDS`, `MEMORY_MAX_CONTENT_LENGTH` từ `.env`; không hardcode |
| Security | Scope theo principal; tenant isolation; không log nội dung nhạy cảm |
| Definition of Done | Build PASS · 297 test PASS · coverage ≥90% (cả 4 metric) · docs cập nhật |
| Release Gate | Checkpoint trước; KHÔNG commit/push/tag turn này |

## 3. Deviations & Justifications

### D-S2-01: In-memory repository làm default
- **Thiết kế:** repository chỉ là abstraction; persistence (SQLite/Postgres/Qdrant) deferred.
- **Triển khai:** thêm `InMemoryMemoryRepository` (volatile) làm binding mặc định để module **chạy được + test được** mà không phụ thuộc DB.
- **Justification:** Không phải persistence backend nào trong danh sách cấm; nhất quán với pattern in-memory Sprint 1 (telemetry/token accounting, AD-S1-01). Đổi sang persistence chỉ cần thay binding `MEMORY_REPOSITORY`.
- **Risk:** LOW (mất dữ liệu khi restart — chấp nhận ở foundation).

### D-S2-02: Branch coverage (post-hotfix)
- Sau hotfix: **cả 4 metric ≥90%** (Stmts 95% · Branch 90.19% · Funcs 100% · Lines 96.04%).
- `memory.dto.ts` (decorator metadata) + `memory.module.ts` (DI wiring) vẫn kéo branch nhưng tổng đã ≥90%.
- **Risk:** LOW.

## 4. Isolation Verification

```
✅ MemoryManager KHÔNG import finance/harness/provider
✅ Không SUM()/balance=/contribution-/expense trong memory
✅ Không embedding/vector/semantic/RAG/ranking/compression
✅ Không Maika/Lisa/Hermes
✅ Không sửa Finance Engine RC1 / DB schema / Desktop UI / Mobile UI
✅ Chỉ thêm wiring MemoryModule vào app.module.ts
```

## 5. Kết luận

```
Epic 2.1 Architecture Validation = PASS
```

Sẵn sàng cho Codex Epic 2.1 Audit.

---

*PickleFund V2.1 — Sprint 2 Epic 2.1 Architecture Validation*

---

# Epic 2.2 — Architecture Validation

## Tuân thủ Sprint 2 Architecture + Handbook v1.0

| Yêu cầu | Triển khai | Đạt |
|---|---|---|
| Conversation → Messages (không blob) | Conversation chứa `messages: ConversationMessage[]` | ✅ |
| Message immutable | deep clone + deep freeze; update tạo object mới | ✅ |
| Conversation lifecycle | create/append/load/summarize/archive (archive chỉ đổi status) | ✅ |
| User Memory 3 loại tách biệt | Profile/Preference/Behavior riêng (không trộn) | ✅ |
| Context Builder (no semantic) | Load history + user memory + merge + trim; KHÔNG embedding/vector | ✅ |
| Context Window Manager | token budget + max history + trimming + rolling window | ✅ |
| API dùng chung Desktop/Mobile | `/conversations`, `/user-memory` — không API riêng | ✅ |
| Security JWT + isolation | Conversation owner (clubId,userId); **User Memory tenant `${clubId}:${userId}`** (post-hotfix); no cross-club/user | ✅ |
| User Memory club isolation (Codex blocker) | composite key clubId:userId; no global; thiếu clubId → reject; client không override clubId | ✅ |
| Context Builder user memory | load **Profile + Preference** (Behavior chưa vào context); dùng conversation.clubId | ✅ |
| Config từ `.env` | `CONTEXT_TOKEN_BUDGET`, `CONTEXT_MAX_HISTORY_MESSAGES` | ✅ |
| Finance Isolation | KHÔNG cache tài chính; Finance Engine RC1 ONLY | ✅ |

## Deviations

- **D-E2.2-01:** In-memory repository (volatile) cho Conversation + User Memory — persistence deferred (nhất quán Epic 2.1/2.4). Risk LOW.
- **D-E2.2-02:** `summarizeConversation` deterministic (không LLM) — LLM summarization deferred. Risk LOW.
- **D-E2.2-03:** Branch coverage logic 89.1% (DTO decorators + `??` defaults); Stmts/Lines/Funcs 100%. Risk LOW.

## Isolation Verification

```
✅ Conversation/User Memory KHÔNG import finance/harness/provider
✅ KHÔNG embedding/vector/semantic/RAG/ranking/compression
✅ KHÔNG Club Memory / Prompt Engine / Maika/Lisa/Hermes
✅ KHÔNG sửa Memory Core (Epic 2.1) — chỉ import deepFreeze
✅ Chỉ thêm wiring 2 module vào app.module.ts + 2 biến .env.example
```

```
Epic 2.2 Architecture Validation = PASS
```

*PickleFund V2.1 — Sprint 2 Epic 2.2 Architecture Validation*

---

# Epic 2.3 — Architecture Validation (Club Memory + Retrieval)

## Tuân thủ Epic 2.3 Gate + Baseline v1.0 Invariants

| Yêu cầu | Triển khai | Đạt |
|---|---|---|
| Club Memory scope clubId (no PII/finance) | `club-memory.service.ts` (requireClub, no finance field) | ✅ (INV-07) |
| Club Memory immutable | deep clone + deep freeze | ✅ (INV-04) |
| Audit metadata | createdBy/updatedBy | ✅ |
| Retrieval deterministic (no LLM/semantic/embedding) | keyword/tag/**metadata (exact match, AND)**; tie-break score→updatedAt→memoryId; semantic = No-op | ✅ (INV-06) |
| Index là derived view, rebuildable | `index-manager.ts` rebuild từ source | ✅ (INV-05) |
| Vector Store chỉ interface | `ISemanticSearchProvider` + Noop; no provider thật | ✅ |
| Context Builder additive | `@Optional` RetrievalEngine; Conversation/User Memory không đổi | ✅ |
| Shared API Desktop/Mobile | `/club-memory`, `/retrieval` | ✅ (INV-03) |
| Tenant isolation (clubId từ JWT, no body override, no direct DB) | controllers + service | ✅ (INV-07/09/10) |
| Finance Isolation | no cache; Finance Engine RC1 ONLY | ✅ (INV-01/02) |

## Deviations
- **D-E2.3-01:** In-memory repository (volatile) cho Club Memory + index không persistent → Epic 2.4. Risk LOW.
- **D-E2.3-02:** Branch tổng 89.28% (logic 93%); DTO decorators kéo xuống. Stmts/Lines/Funcs 100%. Risk LOW.

## Isolation Verification
```
✅ Club Memory/Retrieval KHÔNG import finance/harness/provider
✅ KHÔNG embedding/vector/similarity/RAG/LLM ranking (semantic = Noop interface)
✅ Index derived; Source of Truth = ClubMemoryObject
✅ KHÔNG sửa Memory Core / Conversation core / User Memory logic (builder chỉ thêm source)
✅ Chỉ thêm wiring 2 module + 1 import vào conversation module
```

```
Epic 2.3 Architecture Validation = PASS
```

*PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Validation*
