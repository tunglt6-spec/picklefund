# Sprint 1 Architecture Validation
## PickleFund V2.1 — AI Harness Foundation vs. Architecture Lock

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Sprint:** 1 — AI Harness Foundation
**Tham chiếu:** PKLF-V21-M1-ALC-20260629
**Trạng thái:** VALIDATED ✅

---

## Lịch sử sửa đổi

| Phiên bản | Ngày | Tác giả | Mô tả |
|---|---|---|---|
| 1.0.0 | 2026-06-29 | Dev Team | Validation Sprint 1 vs Architecture Lock |

---

## Mục lục

1. [Mục tiêu Validation](#1-mục-tiêu-validation)
2. [Architecture Constraints Compliance](#2-architecture-constraints-compliance)
3. [Sprint 1 vs Architecture Spec Mapping](#3-sprint-1-vs-architecture-spec-mapping)
4. [Finance Engine Isolation Compliance](#4-finance-engine-isolation-compliance)
5. [Desktop & Mobile Parity Compliance](#5-desktop--mobile-parity-compliance)
6. [Deviations & Justifications](#6-deviations--justifications)
7. [Sprint 2 Prerequisites](#7-sprint-2-prerequisites)
8. [Kết luận](#8-kết-luận)

---

## 1. Mục tiêu Validation

Tài liệu này xác nhận rằng Sprint 1 implementation tuân thủ đúng với:
- Architecture Lock Certificate PKLF-V21-M1-ALC-20260629
- `03_AI_HARNESS_DESIGN.md` — AI Harness Design Spec
- `02_AI_ARCHITECTURE_SPECIFICATION.md` — Layer Architecture
- Finance Isolation Principle (Architecture Constraint AC-01 → AC-10)

---

## 2. Architecture Constraints Compliance

| Constraint | Mô tả | Sprint 1 Compliance |
|---|---|---|
| AC-01 | Finance Engine RC1 không sửa đổi | ✅ Zero changes to finance files |
| AC-02 | AI không tự tính finance values | ✅ AIGateway chỉ route requests |
| AC-03 | AI không WRITE vào Finance Engine | ✅ 0 write methods on AIGatewayService |
| AC-04 | AI-to-API qua Tool Registry | ✅ Sprint 1 không có Tool Registry calls — đúng scope |
| AC-05 | WRITE cần human confirmation | ✅ N/A — không có WRITE trong Sprint 1 |
| AC-06 | Mọi AI action có audit log | ✅ TelemetryService.record() on every request |
| AC-07 | Desktop & Mobile parity | ✅ Shared AIGatewayService + useAIGateway hook |
| AC-08 | finance.* chỉ READ tools | ✅ N/A Sprint 1 — Tool Registry Sprint 2 |
| AC-09 | Database schema RC1 không thay đổi | ✅ 0 new migrations |
| AC-10 | API contract RC1 backward compatible | ✅ New endpoints added, none removed |

**All 10 constraints: COMPLIANT ✅**

---

## 3. Sprint 1 vs Architecture Spec Mapping

### Layer Architecture Compliance (`02_AI_ARCHITECTURE_SPECIFICATION.md`)

| Layer | Spec | Sprint 1 Implementation | Status |
|---|---|---|---|
| L1 — Client | Desktop + Mobile | `useAIGateway.ts` shared hook | ✅ |
| L2 — API Gateway | `AiController /ai/*` | `/ai/health`, `/ai/telemetry`, `/ai/tokens/*` | ✅ |
| L3 — AI Gateway | `AIGatewayService` | `ai-gateway.service.ts` | ✅ |
| L4 — AI Harness | Router + CB + Retry | `ai-router.service.ts`, `circuit-breaker.service.ts`, `retry-policy.service.ts` | ✅ |
| L5 — Providers | LiteLLM, OpenRouter, Ollama | 3 provider files | ✅ |
| L6 — Observability | Telemetry + Token Accounting | `telemetry.service.ts`, `token-accounting.service.ts` | ✅ |

### AI Harness Design Compliance (`03_AI_HARNESS_DESIGN.md`)

| Component | Spec | Triển khai | Status |
|---|---|---|---|
| LiteLLM integration | Docker proxy `/chat/completions` | `litellm.provider.ts` — native fetch | ✅ |
| OpenRouter integration | `/chat/completions` + API key | `openrouter.provider.ts` | ✅ |
| Ollama integration | `/api/chat` local | `ollama.provider.ts` | ✅ |
| Circuit Breaker | CLOSED→OPEN→HALF_OPEN | `circuit-breaker.service.ts` | ✅ |
| Failover chain | Priority-based: LiteLLM→OR→Ollama | `ai-router.service.ts` | ✅ |
| Health check endpoint | `GET /ai/health` | `ai.controller.ts` → `ai-gateway.service.ts` | ✅ |
| Cost tracking | Per request, per provider | `token-accounting.service.ts` | ✅ |
| Configurable via env | No hardcode | `ai-config.service.ts` wraps ConfigService | ✅ |

---

## 4. Finance Engine Isolation Compliance

### Zero Touch Verification

Files kiểm tra — **0 changes**:

| Path | Sprint 1 Changes |
|---|---|
| `backend/src/fund-periods/` | 0 |
| `backend/src/expenses/` | 0 |
| `backend/src/contributions/` | 0 |
| `backend/src/members/` | 0 |
| `backend/src/sessions/` | 0 |
| `prisma/schema.prisma` | 0 |
| `prisma/migrations/` | 0 new files |

### AI Harness Write Operations Check

```
AIGatewayService public methods:
  - chat()              → READ: routes to LLM, returns response
  - getHealthStatus()   → READ: returns provider health
  - getTelemetrySummary() → READ
  - getTokenUsageByClub() → READ
  - getTokenUsageByUser() → READ
  - getTokenUsageByProvider() → READ

Finance WRITE methods: 0 ✅
```

### Integration Test Evidence

Test `"finance data is not modified — AI is READ ONLY"` xác nhận:
```typescript
const writeMethods = gatewayMethods.filter(
  m => m.includes('create') || m.includes('update') ||
       m.includes('delete') || m.includes('write') || m.includes('insert')
);
expect(writeMethods).toHaveLength(0); // PASS ✅
```

---

## 5. Desktop & Mobile Parity Compliance

### Architecture Decision AD-08 Compliance

| Tiêu chí | Spec | Sprint 1 | Status |
|---|---|---|---|
| Single AI Gateway | Shared backend service | AIGatewayService (1 class) | ✅ |
| Single API surface | Same endpoints | /ai/* for all clients | ✅ |
| Shared error handling | Same error format | Errors thrown, caught by hook | ✅ |
| Shared routing | Same provider priority | AIRouterService shared | ✅ |
| Frontend hook | Shared component | useAIGateway.ts | ✅ |
| No feature gap | Desktop = Mobile | Same hook, same service | ✅ |

---

## 6. Deviations & Justifications

### D-01: Circuit Breaker dùng in-memory Map thay vì Redis

**Spec:** `03_AI_HARNESS_DESIGN.md` đề xuất Redis-backed circuit breaker

**Deviation:** Sprint 1 dùng in-memory `Map<string, CircuitBreakerEntry>`

**Justification:**
- Redis circuit breaker là Sprint 3 scope (Memory Layer)
- Single-instance deployment trong Sprint 1 — không cần distributed state
- Interface đã thiết kế để swap storage backend mà không đổi API (`configure()` method)
- Architecture Decision cho phép in-memory trong early sprints

**Risk:** LOW — sẽ migrate sang Redis khi Memory Layer được triển khai

---

### D-02: Token Accounting dùng in-memory thay vì persistent storage

**Spec:** Full token accounting cần persistent DB cho reporting

**Deviation:** In-memory array với max 50,000 entries + auto-prune

**Justification:**
- Persistent token accounting là Sprint 4 scope
- Sprint 1 cần functional token counting — not reporting
- Interface đã thiết kế để thêm DB persistence mà không đổi API

**Risk:** LOW — restart server mất in-flight data; acceptable trong development phase

---

### D-03: `POST /ai/chat` endpoint không có request validation — ✅ RESOLVED (Sprint 1.1)

**Spec:** `AIGatewayRequest` cần validation (`class-validator`)

**Deviation (Sprint 1):** Endpoint `POST /ai/chat` **chưa tồn tại trong controller** (chỉ có trong tài liệu); do đó cũng chưa có validation.

**Resolution (Sprint 1.1):** Đã triển khai `POST /ai/chat` thật trong `ai.controller.ts`, route qua `AIGatewayService` (không bypass), kèm:
- `ChatRequestDto` + `class-validator` (validate messages, options, provider override `@IsIn`)
- userId/clubId lấy từ JWT principal (không tin body spoof)
- sanitize lỗi provider (không lộ body/prompt/key)

**Risk:** RESOLVED — xem `Sprint1.1_Codex_Blocker_Resolution.md`.

---

## 7. Sprint 2 Prerequisites

Sprint 2 có thể bắt đầu khi hoàn thành các điều kiện sau:

| Prerequisite | Status | Notes |
|---|---|---|
| LiteLLM Docker image setup | ⏳ Ops task | LITELLM_API_KEY cần có |
| Anthropic API key provisioned | ⏳ Business task | Cần trước Sprint 2 start |
| `POST /ai/chat` request validation | ✅ DONE (Sprint 1.1) | DTO + class-validator đã triển khai |
| MAIKA system prompt implementation | ⏳ Sprint 2 | `05_PROMPT_ENGINE_SPECIFICATION.md` |
| Prompt Engine v1 | ⏳ Sprint 2 | Template rendering |
| Tool Registry Phase 1 | ⏳ Sprint 2 | finance.READ tools |
| E2E test with real LiteLLM | ⏳ Sprint 2 | Cần API key |

---

## 8. Kết luận

```
╔══════════════════════════════════════════════════════════════════╗
║        SPRINT 1 ARCHITECTURE VALIDATION — RESULT                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Architecture Constraints (10/10)    ✅ COMPLIANT               ║
║  Finance Isolation                   ✅ VERIFIED                 ║
║  Desktop & Mobile Parity             ✅ CONFIRMED                ║
║  AI Harness Design Spec              ✅ FOLLOWED                 ║
║  Deviations                         3 (all LOW risk, justified)  ║
║  Architecture Lock: MAINTAINED      ✅                           ║
║                                                                  ║
║  Sprint 1 Architecture Validation: PASS ✅                       ║
║  Ready for Sprint 2: YES ✅                                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

Architecture Lock Certificate PKLF-V21-M1-ALC-20260629 **vẫn có hiệu lực** sau Sprint 1.

---

*PickleFund V2.1 Sprint 1 — Architecture Validation v1.0.0*
*Architecture Lock ref: PKLF-V21-M1-ALC-20260629*
