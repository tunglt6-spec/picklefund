# Sprint 1.1 Test Report
## PickleFund V2.1 — AI Harness Stabilization

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Sprint:** 1.1 — AI Harness Stabilization
**Trạng thái:** ALL TESTS PASS ✅

---

## 1. Tóm tắt

| Metric | Sprint 1 | Sprint 1.1 |
|---|---|---|
| AI Test Suites | 7 | **8** |
| AI Tests | 45 | **65** |
| Backend Test Suites (toàn bộ) | — | **25** |
| Backend Tests (toàn bộ) | — | **240** |
| Failed | 0 | **0** |
| TypeScript errors (`nest build`) | 0 | **0** |

**Kết quả: AI 65/65 · Backend 240/240 PASS ✅**

---

## 2. AI Test Suites (sau Sprint 1.1)

| File | Tests | Ghi chú |
|---|---|---|
| `circuit-breaker.service.spec.ts` | 7 | giữ nguyên |
| `retry-policy.service.spec.ts` | **20** | +14 (jitter, no-retry 4xx, retry 429/5xx, network) |
| `telemetry.service.spec.ts` | 6 | giữ nguyên |
| `token-accounting.service.spec.ts` | 7 | giữ nguyên |
| `ai-router.service.spec.ts` | 6 | giữ nguyên |
| `ai-gateway.service.spec.ts` | 6 | giữ nguyên |
| `ai-harness.integration.spec.ts` | **8** | +1 provider failover |
| `ai.controller.spec.ts` (MỚI) | **5** | `POST /ai/chat` |
| **Tổng** | **65** | |

---

## 3. Test mới theo blocker

### Epic 1 — `POST /ai/chat` (`ai.controller.spec.ts`, 5 tests)
- Route qua Gateway và wrap response (`ok()`).
- `userId` lấy từ JWT principal; không tin body spoof.
- Fallback `clubId` từ principal khi body thiếu.
- Sanitize lỗi provider → `ServiceUnavailableException`, **không lộ** `HTTP 500`/body.
- 429 → message "rate limited".

### Epic 4 — Retry classification (`retry-policy.service.spec.ts`, +14)
- **KHÔNG retry**: 400, 401, 403, 404, 409, 422 (parametrized) + provider TIMEOUT.
- **RETRY**: 429, 500, 502, 503, 504 (parametrized) + NETWORK error.
- Jitter nằm trong `[base/2, base]` khi bật; backoff xác định khi tắt jitter.
- Giữ test cũ: "does not retry on timeout".

### Epic 4 — Provider failover (`ai-harness.integration.spec.ts`, +1)
- Provider 1 lỗi 4xx (non-retryable) → router failover sang provider 2 thành công.

### Epic 3 — Finance Isolation (giữ test integration)
- "finance data is not modified — AI is READ ONLY" vẫn PASS (0 write method trên Gateway).

---

## 4. Verification commands & kết quả

| Lệnh | Kết quả |
|---|---|
| `cd backend && npm run build` | ✅ `nest build` clean |
| `cd backend && npx jest` | ✅ 25 suites / 240 tests PASS |
| `cd backend && npx jest src/ai` | ✅ 8 suites / 65 tests PASS |
| `cd frontend && npx tsc -b` | ✅ PASS |
| `cd frontend && npm run build` | ✅ PASS (chỉ cảnh báo chunk-size sẵn có) |
| `docker compose config` | ✅ hợp lệ (exit 0) |

---

## 5. Lint — trạng thái trung thực

| Phạm vi | Kết quả |
|---|---|
| ESLint AI **source** (`src/ai/**` non-test, no `--fix`) | ✅ **0 lỗi** |
| ESLint frontend `useAIGateway.ts` | ✅ **0 lỗi** |
| ESLint toàn repo backend (`npm run lint`) | ⚠️ **Có nợ lint sẵn có** |

**Giải thích (reality filter):** Cấu hình `eslint.config.mjs` dùng `tseslint.configs.recommendedTypeChecked` áp cho **mọi** `.ts` kể cả file test. Toàn repo backend có **~373 lỗi pre-existing** (chủ yếu `no-unsafe-*` trên `any` và mock trong `*.spec.ts`) ở các module finance/auth/business — tồn tại **trước** Sprint 1.1 và **ngoài phạm vi** (không được sửa RC1). Sprint 1.1:
- Đã làm **sạch toàn bộ file nguồn AI** (providers, gateway, router, config, retry, errors, dto → 0 lỗi).
- File test AI tuân theo đúng convention `*.spec.ts` sẵn có của repo (dùng `as any`/mock — cùng kiểu với các spec hiện hữu).
- **Không** chạy `npm run lint --fix` toàn repo nữa vì nó reformat lan sang file RC1 (sự cố này đã được revert — xem `Sprint1.1_Codex_Blocker_Resolution.md` §8).

> Kết luận: Sprint 1.1 không làm tăng nợ lint; phần nợ còn lại là điều kiện sẵn có toàn repo, cần một đợt dọn lint riêng (ngoài phạm vi stabilization này).

---

## 6. Kết luận

Tất cả test PASS, build sạch, AI source lint sạch, docker config hợp lệ. AI Harness sẵn sàng cho Codex Epic Audit.

**Sprint 1.1 Test: ALL PASS ✅**

---

*PickleFund V2.1 Sprint 1.1 — Test Report v1.0.0*
