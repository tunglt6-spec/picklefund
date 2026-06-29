# Sprint 2 — Epic 2.2 Close Report
## PickleFund V2.1 — Conversation Memory + User Memory

---

**Ngày:** 2026-06-29
**Branch:** `main`
**Epic 2.2 Commit:** `f7990dae8d59c7b0996b46221b15992e49f3900e`

---

## 1. Objective

Triển khai Conversation Memory + User Memory + Conversation Context Builder + Context Window Manager theo Sprint 2 Architecture (LOCKED) và Enterprise Development Handbook v1.0 — KHÔNG embedding/semantic/vector.

## 2. Scope

Conversation Memory · User Memory (Profile/Preference/Behavior tách biệt) · ConversationContextBuilder · ContextWindowManager · API dùng chung · JWT tenant + owner isolation · Config từ `.env` · Tests · Docs.

## 3. Files Created

| Module | Files |
|---|---|
| `backend/src/ai/conversation/` | `conversation.{module,service,controller,types,dto,interfaces,repository,context-window,context-builder}.ts` + 5 spec |
| `backend/src/ai/user-memory/` | `user-memory.{module,service,controller,types,dto,interfaces,repository}.ts` + 3 spec |

## 4. Files Modified

| File | Lý do |
|---|---|
| `backend/src/app.module.ts` | Wire `ConversationModule` + `UserMemoryModule` |
| `.env.example` | `CONTEXT_TOKEN_BUDGET`, `CONTEXT_MAX_HISTORY_MESSAGES` |
| `docs/V2.1_AI_BRAIN/Sprint2_{Implementation_Report,Test_Report,Architecture_Validation}.md` | Append Epic 2.2 (+ hotfix) |

## 5. Codex Audit Result

- Lần 1: **FAIL** — User Memory chưa chứng minh club isolation (chỉ scope `userId`).
- Sau hotfix → Delta Re-Audit: **PASS** → **EPIC 2.2 APPROVED**.

## 6. Hotfix Summary (club isolation)

- User Memory scope đổi từ `userId` → **tenant composite `${clubId}:${userId}`** (`ownerKey`).
- Repository key composite; service mọi method nhận `(clubId, userId)`, throw BadRequest nếu thiếu clubId (**không Global User Memory**).
- Controller lấy `clubId` từ JWT (client không override; DTO không có clubId field).
- ContextBuilder dùng `conversation.clubId`; bỏ qua User Memory nếu conversation không gắn club.
- Tests: same-userId/diff-club, same-club/diff-user isolation; no-override; reject-no-club.

## 7. Tests

| Phạm vi | Kết quả |
|---|---|
| Epic 2.2 | 8 suites / 51 PASS |
| Backend toàn bộ | 36 suites / 348 PASS |
| `nest build` | PASS (0 lỗi) |
| ESLint source (non-test) | 0 lỗi |

## 8. Coverage (conversation + user-memory)

| Phạm vi | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| Excl DI modules | 100 | 85.47 | 100 | 100 |
| Excl DI + DTO (logic) | 100 | 88.57 | 100 | 100 |

Statements/Lines/Functions = **100%**. Branch dưới 90% do **DTO decorator metadata** + vài nhánh `??` (không phải logic chưa test; không làm tròn).

## 9. Technical Debt

| # | Nợ | Kế hoạch |
|---|---|---|
| TD-1 | In-memory repository volatile (mất khi restart) | Persistence — Epic 2.4 |
| TD-2 | Behavior Memory chưa vào Context Builder | Epic sau |
| TD-3 | LLM summarization (summarize hiện deterministic) | Epic sau |
| TD-4 | Spec files lỗi `no-unsafe-*` (pattern repo) | Đợt dọn lint riêng |
| TD-5 | `backend/coverage/` artifact untracked | Nên gitignore |

## 10. Deferred Items (KHÔNG triển khai ở Epic 2.2)

Club Memory · Semantic Search · Embedding · Vector Store · Similarity · RAG · Ranking · Compression · Prompt Engine · Maika/Lisa/Hermes. Finance Engine RC1 / AI Harness / Memory Core (Epic 2.1) không đổi.

## 11. Final Decision

```
EPIC 2.2 = CLOSED
```

**Ready for:** EPIC 2.3 — Club Memory + Semantic Search (chưa bắt đầu).

---

*PickleFund V2.1 — Sprint 2 Epic 2.2 Close Report*
