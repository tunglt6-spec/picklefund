# 02 — AI Harness Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial AI Harness certification checklist |

---

## Purpose
Chứng nhận AI Harness Foundation (Sprint 1 + Sprint 1.1) sẵn sàng làm nền cho Agent.

## Scope
LiteLLM · OpenRouter · Ollama · AI Gateway · Provider Manager · Model Routing · Retry Policy · Circuit Breaker · Telemetry · Token Accounting · Config Center.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| LiteLLM | Provider tích hợp, health check | `backend/src/ai/harness/providers/litellm.provider.ts` | PENDING |
| OpenRouter | Provider optional, apiKey-gated | `providers/openrouter.provider.ts` | PENDING |
| Ollama | Local fallback | `providers/ollama.provider.ts` | PENDING |
| AI Gateway | Single entry, shared Desktop/Mobile | `harness/ai-gateway.service.ts` + `POST /ai/chat` | PENDING |
| Provider Manager | Registry + enabled/health | `harness/ai-provider-manager.service.ts` | PENDING |
| Model Routing | Priority + failover | `harness/ai-router.service.ts` | PENDING |
| Retry Policy | No-retry 4xx; retry 429/5xx/network; backoff+jitter | `harness/retry-policy.service.ts` + `errors/ai-provider.error.ts` | PENDING |
| Circuit Breaker | CLOSED/OPEN/HALF_OPEN | `harness/circuit-breaker.service.ts` | PENDING |
| Telemetry | No PII/prompt | `harness/telemetry.service.ts` | PENDING |
| Token Accounting | Club/User/Session/Provider/Model | `harness/token-accounting.service.ts` | PENDING |
| Config Center | Env-driven, fail-fast | `harness/ai-config.service.ts` + `.env.example` | PENDING |

## Evidence Placeholder
`[Evidence: build PASS + AI tests 65/65 (Sprint 1.1) — xác nhận lại bởi Codex]`

## Risk Notes
- R: in-memory telemetry/token/CB mất khi restart → deferred persistence (Sprint 3+).

## Cross References
`01_CERTIFICATION_OVERVIEW.md` · `05_SECURITY_CERTIFICATION.md` · Sprint1 reports.
