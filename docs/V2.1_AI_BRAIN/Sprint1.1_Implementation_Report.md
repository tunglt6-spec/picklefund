# Sprint 1.1 Implementation Report
## PickleFund V2.1 — AI Harness Stabilization

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Sprint:** 1.1 — AI Harness Stabilization (post-Codex audit)
**Trạng thái:** COMPLETE ✅ (chờ Codex Epic Audit)

> Mục tiêu: đưa AI Harness Foundation về **Production Ready** bằng cách xử lý các blocker Codex phát hiện. **Không** thêm tính năng mới (không Maika/Lisa/Hermes/Memory Layer).

---

## 1. Tóm tắt

| Epic | Nội dung | Kết quả |
|---|---|---|
| 1 | `POST /ai/chat` (DTO + validation, qua Gateway) | ✅ DONE |
| 2 | Frontend API (`api-client` → `../lib/api`, hook chung) | ✅ DONE |
| 3 | Finance Isolation (đọc Finance Engine RC1, bỏ tự tính) | ✅ DONE |
| 4 | Retry Policy (phân loại 4xx/5xx/network + jitter) | ✅ DONE |
| 5 | Configuration Center (hết hardcode + fail fast) | ✅ DONE |
| 6 | Document Synchronization | ✅ DONE |

Chi tiết từng blocker: **`Sprint1.1_Codex_Blocker_Resolution.md`**.

---

## 2. Files thay đổi

### Backend — sửa (trong phạm vi AI)

| File | Lý do |
|---|---|
| `ai/ai.controller.ts` | Thêm `POST /ai/chat`, sanitize lỗi provider, dọn `async` thừa |
| `ai/ai.module.ts` | Import `FundPeriodsModule` (Finance Engine RC1 read-only) |
| `ai/ai.service.ts` | Bỏ tự tính tài chính → `getFinanceSummary()` đọc RC1 |
| `ai/harness/retry-policy.service.ts` | Phân loại retry + jitter + `withTimeout` dùng `Promise.race` |
| `ai/harness/ai-config.service.ts` | Env-driven priority/baseUrl/contextWindow + `validateConfig()` fail-fast |
| `ai/harness/ai-gateway.service.ts` | Phân loại `errorType`, log đã sanitize |
| `ai/harness/ai-router.service.ts` | Log chỉ provider + kind, typed catch |
| `ai/harness/circuit-breaker.service.ts` | Bỏ import thừa |
| `ai/harness/providers/{litellm,openrouter,ollama}.provider.ts` | Ném `AIProviderError` (statusCode/kind), type hoá response, sanitize body |
| `ai/harness/interfaces/ai-provider.interface.ts` | Thêm type `OpenAIChatCompletion`, `OllamaChatResponse` |
| `fund-periods/fund-periods.module.ts` | `exports: [FundPeriodsService]` (chỉ thêm export) |

### Backend — tạo mới

| File | Nội dung |
|---|---|
| `ai/dto/chat-request.dto.ts` | `ChatRequestDto` + validation + provider override `@IsIn` |
| `ai/dto/finance-summary.dto.ts` | `FinanceSummaryDTO` (read-only, mirror Finance Engine RC1) |
| `ai/harness/errors/ai-provider.error.ts` | `AIProviderError` + `isRetryableError()` |
| `ai/ai.controller.spec.ts` | Test `POST /ai/chat` (5 tests) |

### Frontend

| File | Lý do |
|---|---|
| `frontend/src/hooks/useAIGateway.ts` | Sửa import, `providerOverride` top-level, `Error(cause)` |

### Khác

| File | Lý do |
|---|---|
| `.env.example` | Biến config mới (priority/baseUrl/contextWindow/jitter) |

> **KHÔNG đụng:** schema Prisma, fund-periods.service, financial-calculator.service, contributions/expenses/attendance service và mọi file RC1 khác (xem `Sprint1.1_Codex_Blocker_Resolution.md` §8 về sự cố `--fix` đã revert).

---

## 3. Kiến trúc luồng chat (sau Sprint 1.1)

```
Desktop / Mobile
   └── useAIGateway (hook DÙNG CHUNG)
        └── POST /ai/chat  (AiController — validate DTO, JWT principal)
             └── AIGatewayService  (telemetry · token accounting · sanitize)
                  └── AIRouterService  (priority + failover)
                       ├── CircuitBreakerService (CLOSED/OPEN/HALF_OPEN)
                       └── RetryPolicyService (classify · backoff · jitter)
                            └── ProviderManager
                                 ├── LiteLLM   (priority 1)
                                 ├── OpenRouter(priority 2)
                                 └── Ollama    (priority 3, local)
```

Finance: `AiService.getFinanceSummary()` → `FundPeriodsService.summary()` (Finance Engine RC1) → AI **chỉ đọc**.

---

## 4. Xác nhận nguyên tắc

- **Finance Engine RC1 là nguồn sự thật duy nhất.** AI không `SUM()`, không `balance =`, không `contribution -`, không tính expense — chỉ GET summary RC1 và đọc.
- **Desktop = Mobile.** Cùng hook `useAIGateway`, cùng endpoint `/ai/chat`, cùng response model (`AIGatewayResponse`), cùng error handling, retry, loading/empty state, permission.

---

## 5. Kết quả build/test/lint (tóm tắt)

| Hạng mục | Kết quả |
|---|---|
| `nest build` (backend) | ✅ 0 lỗi |
| `tsc -b` + `vite build` (frontend) | ✅ PASS |
| Backend tests | ✅ 240/240 (25 suites) |
| AI tests | ✅ 65/65 (8 suites) |
| ESLint — AI source (non-test) | ✅ 0 lỗi |
| `docker compose config` | ✅ hợp lệ |

Chi tiết: **`Sprint1.1_Test_Report.md`**.

---

## 6. Kết luận

Toàn bộ 6 blocker Codex đã xử lý trong phạm vi quy định. AI Harness Foundation đạt trạng thái sẵn sàng cho Codex Epic Audit. **Không commit/push/tag/release.** DỪNG và chờ audit trước khi bắt đầu Sprint 2.

**Sprint 1.1: COMPLETE ✅**

---

*PickleFund V2.1 Sprint 1.1 — Implementation Report v1.0.0*
