# Sprint 1.1 — Codex Blocker Resolution
## PickleFund V2.1 — AI Harness Stabilization

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Sprint:** 1.1 — AI Harness Stabilization
**Trạng thái:** RESOLVED ✅ (chờ Codex Epic Audit)
**Phạm vi:** Chỉ xử lý blocker do Codex Architecture Audit phát hiện — KHÔNG thêm tính năng mới.

---

## 0. Ràng buộc đã tuân thủ

| Ràng buộc | Trạng thái |
|---|---|
| Không sửa Finance Engine RC1 | ✅ (xem §7 — đã revert reformat lỡ) |
| Không sửa Database Schema | ✅ 0 thay đổi |
| Không sửa Business Logic RC1 | ✅ |
| Không thêm Maika / Lisa / Hermes | ✅ |
| Không thêm Memory Layer / Redis / Persistence | ✅ |
| Giữ AI Harness, LiteLLM, OpenRouter, Ollama, Provider Manager, Circuit Breaker, Telemetry, Token Accounting | ✅ |
| Không commit / push / tag / release | ✅ |
| Desktop & Mobile dùng chung AI Gateway | ✅ |

---

## 1. EPIC 1 — AI Chat API (`POST /ai/chat`)

**Blocker:** Frontend gọi `POST /ai/chat` nhưng backend chưa có endpoint (chỉ tồn tại trong tài liệu).

**Đã sửa:**
- Thêm `POST /ai/chat` trong `ai.controller.ts`, route **đúng chuỗi** `Controller → AIGatewayService → AIRouter → ProviderManager → LiteLLM/OpenRouter/Ollama` (không bypass Gateway).
- `ChatRequestDto` + `class-validator`: validate `messages` (nested), `options` (maxTokens/temperature/topP có giới hạn), và **provider override** qua `@IsIn(['litellm','openrouter','ollama'])`.
- `userId`/`clubId` lấy từ JWT principal (`@CurrentUser`) — body không thể giả mạo định danh club.
- Telemetry + Token Accounting + Retry + Circuit Breaker đã có sẵn trong Gateway, áp dụng tự động.
- Timeout: per-request qua `AbortController` (provider) + `RetryPolicy.withTimeout` (Gateway).

**Files:** `ai.controller.ts`, `dto/chat-request.dto.ts` (mới).

---

## 2. EPIC 2 — Frontend API

**Blocker:** `useAIGateway.ts` import `@/lib/api-client` — alias `@` không tồn tại trong dự án và file `api-client` cũng không có (chỉ có `lib/api.ts`).

**Đã sửa:**
- Đổi import sang `../lib/api` (default axios instance) — đồng nhất với toàn bộ frontend.
- Bỏ alias sai; build sạch (`tsc -b` + `vite build` PASS).
- Căn chỉnh `providerOverride` lên top-level cho khớp `ChatRequestDto` backend (trước đây lồng trong `options` → bị `whitelist` loại bỏ).
- `useAIGateway` là **hook dùng chung Desktop + Mobile** (single entry point) — không có hook riêng cho từng nền tảng.

**Files:** `frontend/src/hooks/useAIGateway.ts`.

---

## 3. EPIC 3 — Finance Isolation

**Blocker:** `ai.service.ts` tự tính `totalContributed`, `totalExpenses`, `balance` (SUM/subtract) — vi phạm nguyên tắc AI không được tính toán tài chính.

**Đã sửa:**
- Xoá toàn bộ `reduce()`/`-` tính tài chính trong `getClubSummary`.
- Thêm `getFinanceSummary(fundPeriodId, clubId)` → gọi **Finance Engine RC1** qua `FundPeriodsService.summary()` (đã wrap `FinancialCalculatorService.calculate()` — nguồn sự thật duy nhất, gồm cả carry-forward).
- Thêm `FinanceSummaryDTO` (read-only) mô tả shape AI đọc — không duplicate business logic.
- `FundPeriodsModule` export `FundPeriodsService`; `AiModule` import `FundPeriodsModule`.

**Luồng:** `GET Finance Summary (RC1) → AI đọc kết quả → phân tích → trả lời`. AI **không** tính lại.

**Files:** `ai.service.ts`, `dto/finance-summary.dto.ts` (mới), `ai.module.ts`, `fund-periods/fund-periods.module.ts` (chỉ thêm `exports`).

---

## 4. EPIC 4 — Retry Policy

**Blocker:** Retry cũ chỉ phân biệt timeout; chưa phân loại lỗi nên có thể retry cả lỗi vĩnh viễn (4xx).

**Đã sửa** — thêm `AIProviderError` (typed: `statusCode`, `kind`) + `isRetryableError()`:

| Loại lỗi | Hành vi |
|---|---|
| 400, 401, 403, 404, 409, 422 (+ mọi 4xx khác) | **KHÔNG retry** |
| Client timeout (`kind=TIMEOUT`) | **KHÔNG retry** |
| 429, 500, 502, 503, 504 | **RETRY** |
| Network/Connection Reset (`kind=NETWORK`) | **RETRY** |

- Backoff: exponential + cap (`maxDelayMs`) + **jitter** (equal jitter, bật/tắt qua `AI_RETRY_JITTER`).
- Max retry: `AI_MAX_RETRIES`.
- Providers ném `AIProviderError` đã sanitize (chỉ status, không kèm body).

**Files:** `harness/errors/ai-provider.error.ts` (mới), `retry-policy.service.ts`, 3 providers, `ai-gateway.service.ts`, `ai-config.service.ts`.

---

## 5. EPIC 5 — Configuration Center

**Blocker:** `priority`, `baseUrl`, `defaultModel`, `contextWindow` còn hardcode.

**Đã sửa:**
- Tất cả chuyển sang `ConfigService` (đọc `.env` / `.env.production`):
  `*_PRIORITY`, `*_BASE_URL` (OpenRouter trước đây hardcode URL → nay env), `*_CONTEXT_WINDOW`, `*_DEFAULT_MODEL`.
- **Fail fast:** `AIConfigService.validateConfig()` — ở `NODE_ENV=production`, provider được bật mà thiếu `baseUrl`/`apiKey` → throw khi boot. Ở dev/test chỉ cảnh báo (giữ default localhost để app vẫn chạy).
- `.env.example` cập nhật đầy đủ các biến mới.

**Files:** `ai-config.service.ts`, `.env.example`.

---

## 6. EPIC 6 — Document Synchronization

- `Sprint1_Implementation_Report.md`, `Sprint1_Test_Report.md`, `Sprint1_Architecture_Validation.md`: thêm **Sync Note** đính chính các điểm tài liệu vượt trước code (POST /ai/chat, api-client, finance recompute, số liệu test). Deviation **D-03** đánh dấu RESOLVED.
- Tạo mới: `Sprint1.1_Implementation_Report.md`, `Sprint1.1_Test_Report.md`, và tài liệu này.
- Chỉ ghi nhận nội dung đã thực sự triển khai.

---

## 7. Security

- Không log: prompt, response, API key, Authorization, JWT, token, secret.
- Provider lỗi → drain body nhưng **không surface**; chỉ giữ HTTP status. Message công khai dạng `"AI provider unavailable"` / `"rate limited"` / `"timed out"`.
- Gateway log chỉ `errorType` đã phân loại; Router log chỉ `provider + kind`.

---

## 8. Sự cố quy trình đã xử lý (minh bạch)

Khi chạy `npm run lint` (script dự án có cờ `--fix`), Prettier đã **tự động reformat 47 file ngoài phạm vi**, gồm cả Finance Engine RC1. Các file này **sạch tại thời điểm bắt đầu phiên** (chỉ là reformat whitespace, không đổi logic). → Đã **revert toàn bộ 47 file về HEAD** sau khi xác nhận với chủ dự án; chỉ giữ lại thay đổi trong phạm vi AI Harness + docs. Sau revert: build + 240 test vẫn PASS.

> Lưu ý vận hành: lần sau nên lint phạm vi hẹp (`eslint src/ai`) thay vì `npm run lint` toàn repo để tránh `--fix` lan ra file RC1.

---

## 9. Acceptance Checklist

| Hạng mục | Kết quả |
|---|---|
| `POST /ai/chat` hoạt động | ✅ |
| Frontend build PASS | ✅ (`tsc -b` + `vite build`) |
| Không còn `api-client.ts` / alias sai | ✅ |
| AI không tự tính tài chính | ✅ |
| Chỉ đọc Finance Engine RC1 | ✅ |
| Retry Policy đúng (no-retry 4xx / retry 429+5xx+network, jitter) | ✅ |
| Config đọc hoàn toàn từ `.env` (+ fail fast) | ✅ |
| Docs khớp code | ✅ |
| Desktop & Mobile dùng chung AI Gateway | ✅ |
| 0 TypeScript Error | ✅ (`nest build` clean) |
| Lint | ✅ AI source 0 lỗi · ⚠️ repo có nợ lint sẵn (xem Test Report §Lint) |
| Tests PASS | ✅ 240/240 backend |
| Docker config | ✅ `docker compose config` hợp lệ |

---

*PickleFund V2.1 Sprint 1.1 — Codex Blocker Resolution v1.0.0*
*DỪNG sau báo cáo — chờ Codex Epic Audit trước Sprint 2.*
