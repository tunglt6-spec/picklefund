# 05 — Sprint 2 Release Notes (Technical Baseline v2.0)

**Sprint:** 2 — AI Memory Architecture
**Ngày:** 2026-06-30
**Nhánh:** `main`
**Trạng thái:** Approved for Merge / Commit / Tag / Sprint 2 Release (Codex Second Final Re-Audit PASS).

---

## 1. Tóm tắt Sprint 2

Sprint 2 xây toàn bộ lớp **AI Memory Architecture** theo nguyên tắc Zero-Refactor, Finance Isolation và Club Isolation. Mỗi Epic được Codex audit độc lập trước khi đóng.

## 2. Các Epic

### Epic 2.1 — Memory Core Foundation
- `backend/src/ai/memory/`: `MemoryManager` (CRUD + list/search + TTL + immutability), Memory Object immutable, repository abstraction (in-memory volatile default).
- Trạng thái: Close — Codex Re-Audit PASS.

### Epic 2.2 — Conversation Memory + User Memory
- `backend/src/ai/conversation/` (context window + context builder) và `backend/src/ai/user-memory/`.
- Trạng thái: Close — Codex Re-Audit PASS.

### Epic 2.3 — Club Memory + Deterministic Retrieval
- `backend/src/ai/club-memory/` (SoT) + `backend/src/ai/retrieval/` (`RetrievalEngine`, `IndexManager`, keyword + tag).
- Trạng thái: Close — Codex Re-Audit PASS (commit `00b68e7`).

### Epic 2.4 — Vector Layer
Thư mục `backend/src/ai/vector/`:
- **Vector Store** — `in-memory-vector-store.provider.ts` (cosine, derived view).
- **Embedding Service** — `embedding.service.ts` + `local-hash-embedding.provider.ts` (cache SHA-256, batch, cost guardrail, DLQ hash-only).
- **Semantic Search** — `semantic-search.provider.ts` (sanitize-before-embed, timeout, fallback `[]`).
- **Hybrid Retrieval** — `hybrid-retrieval.service.ts` (`HybridRetrievalEngine`) + controller (reindex là `@Post`).
- **Vector Observability** — `vector-observability.service.ts` (counters gồm policySkipped/piiRedacted/financeBlocked).
- **Vector Content Policy** — `vector-content-policy.service.ts` (finance block + PII redact, `policy-v1`).
- Trạng thái: **Codex Second Final Re-Audit PASS**.

## 3. Codex Audit timeline (Epic 2.4)

| Mốc | Kết quả | Hành động |
|---|---|---|
| Initial Audit | **FAIL** | Phát hiện: embed raw title/content, raw snippet trong metadata, DLQ raw text, cache key chưa hash. |
| **Hotfix 1** (Claude Code) | — | Thêm `VectorContentPolicyService` + wire VectorModule; sanitize khi index; DLQ hash-only; cache key SHA-256; `GET→POST` reindex; observability counters. |
| Final Re-Audit | **FAIL** | Phát hiện còn lại: `SemanticSearchProvider` vẫn embed **raw query** người dùng (PII/finance trong query lọt vào embedding). |
| **Hotfix 2** (Claude Code) | — | Inject policy vào `SemanticSearchProvider`; sanitize query **trước** embed; finance → block `[]`; PII → redact; không gọi embed/store khi blocked; thêm tests. |
| **Second Final Re-Audit** | **PASS** ✅ | Approved for Merge / Commit / Tag / Sprint 2 Release. |

> Quy trình tuân thủ đúng: Claude Code triển khai → Codex Audit → Claude sửa → Codex Re-Audit → PASS. Không tự duyệt thay Codex.

## 4. Kết quả validation (Hotfix 2, trạng thái baseline)

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | **PASS** |
| `npx jest src/ai/vector --coverage` | **PASS** — 9 suites / 68 tests |
| `npm test` (toàn backend) | **PASS** — 51 suites / 460 tests |
| `npx eslint "src/ai/vector/**/*.ts"` (gồm specs) | **PASS** — 0 errors |

**Coverage `src/ai/vector`** (số thật, không làm tròn): Stmts 99.45% / Branch 85.71% / Funcs 98.68% / Lines 99.68%. `semantic-search.provider.ts`: Stmts/Lines/Funcs 100%, Branch 77.27%.
> Phần branch thiếu chủ yếu là nhánh phòng thủ (`??`) và decorator metadata DTO, không phải logic chưa test.

## 5. Trạng thái

**Approved for Merge / Commit / Tag / Sprint 2 Release.** Epic 2.5 (Dashboard Light Theme) được phép bắt đầu **sau** bước đóng gói baseline này (xem [06-roadmap-next.md](06-roadmap-next.md)).

## 6. Phạm vi KHÔNG thay đổi trong Epic 2.4

- Frontend/UI — **không** sửa (Epic 2.4 không động UI; Epic 2.5 chưa bắt đầu).
- Finance Engine RC1, Memory Core, Conversation/User/Club Memory, AI Gateway, DB schema — **không** sửa ngoài phạm vi vector.
