# Sprint 2 — Epic 2.1 Close Report
## PickleFund V2.1 — Memory Core Foundation

---

**Ngày:** 2026-06-29
**Branch:** `main`
**Epic 2.1 Commit:** `ca7285f73a1ea33d4c4983b6f49cba48dada0e28`

---

## 1. Objective

Xây dựng nền tảng Memory Core (Sprint 2 Epic 2.1) theo `Sprint2/01..08` + Enterprise Development Handbook v1.0: lưu trữ Memory Object có vòng đời, API dùng chung, cách ly tenant — KHÔNG embedding/vector/semantic.

## 2. Scope

Memory Core · Memory API · Memory Manager · Repository Abstraction · In-memory Repository (volatile) · Deep Immutability · SESSION Ownership · Config Consistency · Tests · Docs.

## 3. Files Created

| File | Vai trò |
|---|---|
| `backend/src/ai/memory/memory.module.ts` | DI wiring + bind `MEMORY_REPOSITORY` |
| `backend/src/ai/memory/memory.service.ts` | `MemoryManager` (CRUD/list/search/TTL/deep-immutability) |
| `backend/src/ai/memory/memory.types.ts` | enum + `MemoryObject` + `deepFreeze` + hard-cap constant |
| `backend/src/ai/memory/memory.interfaces.ts` | `IMemoryRepository` abstraction + token |
| `backend/src/ai/memory/memory.repository.ts` | `InMemoryMemoryRepository` (volatile default) |
| `backend/src/ai/memory/memory.dto.ts` | Create/Update DTO |
| `backend/src/ai/memory/memory.controller.ts` | Memory API `/memory` (shared) |
| `backend/src/ai/memory/*.spec.ts` (3) | repository/service/controller tests |
| `docs/V2.1_AI_BRAIN/Sprint2_Implementation_Report.md` | báo cáo triển khai |
| `docs/V2.1_AI_BRAIN/Sprint2_Test_Report.md` | báo cáo test |
| `docs/V2.1_AI_BRAIN/Sprint2_Architecture_Validation.md` | validation kiến trúc |

## 4. Files Modified

| File | Lý do |
|---|---|
| `backend/src/app.module.ts` | Wire `MemoryModule` |
| `.env.example` | `MEMORY_DEFAULT_TTL_SECONDS`, `MEMORY_MAX_CONTENT_LENGTH` |

## 5. Codex Audit Result

- Lần 1: **FAIL** (5 blocker).
- Sau hotfix → Re-Audit: **PASS** → **EPIC 2.1 APPROVED**.

## 6. Blockers Fixed (hotfix)

1. SESSION ownership: composite `${club}:${user}:${session}` + prefix access (không còn public).
2. Deep immutability: deep clone (`structuredClone`) + deep freeze đệ quy; update không mutate object cũ.
3. Config consistency: DTO dùng hard-cap `MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH`; service đọc `MEMORY_MAX_CONTENT_LENGTH` (runtime SoT); `.env.example` bổ sung.
4. Test correction: xoá test SESSION sai; thêm negative ownership + nested immutability + config tests.
5. Docs sync: 3 docs khớp code.

## 7. Tests

| Phạm vi | Kết quả |
|---|---|
| Memory | 3 suites / 57 PASS |
| Backend toàn bộ | 28 suites / 297 PASS |
| `nest build` | PASS (0 lỗi) |
| ESLint memory source (non-test) | 0 lỗi |

## 8. Coverage (memory)

| Metric | Giá trị |
|---|---|
| Statements | 95% |
| Branches | 90.19% |
| Functions | 100% |
| Lines | 96.04% |

Cả 4 metric ≥ 90% (số liệu thật). `memory.dto.ts` (decorator) + `memory.module.ts` (DI) kéo branch nhưng tổng vẫn ≥ 90%.

## 9. Known Technical Debt

| # | Nợ | Kế hoạch |
|---|---|---|
| TD-1 | In-memory repository volatile (mất khi restart) | Persistence — Epic 2.4 |
| TD-2 | Spec files có lỗi `no-unsafe-*` (pattern toàn repo) | Đợt dọn lint riêng |
| TD-3 | `backend/coverage/` artifact untracked | Nên gitignore |

## 10. Out of Scope (KHÔNG triển khai)

Conversation Memory · User Memory · Club Memory · Semantic Search · Embedding · Vector Store · Similarity · RAG · Ranking · Compression · Maika/Lisa/Hermes. Finance Engine RC1 / AI Harness Sprint 1 không đổi.

## 11. Decision

```
EPIC 2.1 = CLOSED
```

**Ready for:** EPIC 2.2 — Conversation Memory + User Memory (chưa bắt đầu).

---

*PickleFund V2.1 — Sprint 2 Epic 2.1 Close Report*
