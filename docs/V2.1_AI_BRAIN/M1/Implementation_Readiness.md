# IMPLEMENTATION READINESS
## PickleFund V2.1 — Milestone M1: Sprint 1 Implementation Readiness Assessment

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Reviewer:** Implementation Readiness Team
**Trạng thái:** READY ✅

---

## Lịch sử sửa đổi

| Phiên bản | Ngày | Tác giả | Mô tả |
|---|---|---|---|
| 1.0.0 | 2026-06-29 | IR Team | Đánh giá lần đầu trước Sprint 1 |

---

## Mục lục

1. [Tóm tắt Readiness](#1-tóm-tắt-readiness)
2. [AI Harness Readiness](#2-ai-harness-readiness)
3. [Memory Layer Readiness](#3-memory-layer-readiness)
4. [Prompt Engine Readiness](#4-prompt-engine-readiness)
5. [Tool Registry Readiness](#5-tool-registry-readiness)
6. [Testing Readiness](#6-testing-readiness)
7. [DevOps Readiness](#7-devops-readiness)
8. [Security Readiness](#8-security-readiness)
9. [Pre-Sprint Checklist](#9-pre-sprint-checklist)
10. [Sprint 1 Prerequisites](#10-sprint-1-prerequisites)
11. [Implementation Constraints](#11-implementation-constraints)
12. [Kết luận](#12-kết-luận)

---

## 1. Tóm tắt Readiness

| Component | Architecture Spec | Implementation Ready |
|---|---|---|
| AI Harness (LiteLLM) | ✅ doc-03 | ✅ |
| Memory Layer | ✅ doc-06 | ✅ |
| Prompt Engine | ✅ doc-05 | ✅ |
| Tool Registry | ✅ doc-04 | ✅ |
| Testing Strategy | ⚠️ Cần bổ sung | ⚠️ Partial |
| DevOps / Docker | ✅ doc-02 | ✅ |
| Security Controls | ✅ doc-02, doc-05 | ✅ |
| **Overall** | | ✅ **READY** |

---

## 2. AI Harness Readiness

### 2.1 Architecture Completeness

| Aspect | Status | Source |
|---|---|---|
| LiteLLM config schema | ✅ Complete | doc-03 §2.2 |
| Model catalog (5 providers) | ✅ Complete | doc-03 §3.1 |
| Routing rules (8 rules) | ✅ Complete | doc-03 §4.1 |
| Failover chain | ✅ Complete | doc-03 §5.1 |
| Retry policy per error type | ✅ Complete | doc-03 §5.2 |
| Circuit breaker states + config | ✅ Complete | doc-03 §6 |
| Rate limiting tiers | ✅ Complete | doc-03 §9.2 |
| SSE streaming format | ✅ Complete | doc-03 §10.2 |
| Cost tracking schema | ✅ Complete | doc-03 §6.2 |
| Token log schema | ✅ Complete | doc-03 §7.1 |
| Module structure | ✅ Complete | doc-03 §12.1 |
| ENV variables | ✅ Complete | doc-03 §13.1 |
| Feature flags | ✅ Complete | doc-03 §13.2 |

### 2.2 Implementation Prerequisites

| Prerequisite | Status |
|---|---|
| LiteLLM Docker image available | ✅ `ghcr.io/berriai/litellm` |
| Anthropic API key | ⚠️ Cần setup trong `.env` |
| Redis 7 available (RC1 infra) | ✅ Đã có từ RC1 |
| PostgreSQL 16 available (RC1 infra) | ✅ Đã có từ RC1 |
| Docker Compose base (RC1) | ✅ Đã có từ RC1 |

### 2.3 Sprint 1 AI Harness Tasks

| Task | Effort | Priority |
|---|---|---|
| LiteLLM Docker service + config | 1 day | P0 |
| NestJS AI Harness module skeleton | 1 day | P0 |
| RoutingEngine + RoutingRules | 1 day | P0 |
| LiteLLMClient HTTP wrapper | 1 day | P0 |
| CircuitBreaker (Redis-backed) | 2 days | P0 |
| RateLimiter (sliding window Redis) | 1 day | P0 |
| CostTracker (async, PG write) | 1 day | P1 |
| TokenLogger | 0.5 day | P1 |
| SSE Streaming handler | 1 day | P1 |
| ENV config + feature flags | 0.5 day | P0 |
| **Total** | **~10 days** | |

---

## 3. Memory Layer Readiness

### 3.1 Architecture Completeness

| Aspect | Status | Source |
|---|---|---|
| 5 Memory types defined | ✅ Complete | doc-06 §2 |
| ConversationMemory schema | ✅ Complete | doc-06 §3.2 |
| ClubMemory schema | ✅ Complete | doc-06 §4.2 |
| MemberMemory schema | ✅ Complete | doc-06 §5.2 |
| BusinessMemory schema | ✅ Complete | doc-06 §6.2 |
| TemporaryMemory schema | ✅ Complete | doc-06 §7.2 |
| LongTermMemory schema | ✅ Complete | doc-06 §8.2 |
| Redis key patterns | ✅ Complete | doc-06 §3.3, §14 |
| PostgreSQL table definitions | ✅ Complete | doc-06 §14.2 |
| Retention & expiration policy | ✅ Complete | doc-06 §9 |
| Encryption spec | ✅ Complete | doc-06 §11 |
| GDPR compliance design | ✅ Complete | doc-06 §12 |
| PII masking rules | ✅ Complete | doc-06 §10.3 |

### 3.2 Implementation Prerequisites

| Prerequisite | Status |
|---|---|
| Redis TTL support | ✅ Built-in Redis |
| PostgreSQL pgcrypto extension | ⚠️ Cần enable trong migration |
| Database migration system (TypeORM/Prisma) | ✅ Đã có từ RC1 |
| Application encryption key | ⚠️ Cần thêm vào ENV |

### 3.3 Sprint 2 Memory Tasks (Planned)

Memory Layer là Sprint 2 deliverable. Sprint 1 chỉ cần Conversation Memory (cho AI chat).

| Sprint | Component | Effort |
|---|---|---|
| Sprint 1 | ConversationMemory (Redis) | 2 days |
| Sprint 2 | ClubMemory + MemberMemory | 3 days |
| Sprint 2 | BusinessMemory | 2 days |
| Sprint 2 | TemporaryMemory | 1 day |
| Sprint 3 | LongTermMemory | 2 days |

---

## 4. Prompt Engine Readiness

### 4.1 Architecture Completeness

| Aspect | Status | Source |
|---|---|---|
| MAIKA persona v1 template | ✅ Complete | doc-05 §2.2 |
| Persona variants (4 types) | ✅ Complete | doc-05 §2.3 |
| Prompt assembly order | ✅ Complete | doc-05 §3.2 |
| Token budget strategy | ✅ Complete | doc-05 §3.3 |
| Business context schema | ✅ Complete | doc-05 §5.1 |
| Safety rules (input + output) | ✅ Complete | doc-05 §9 |
| Template catalog (7 templates) | ✅ Complete | doc-05 §10.1 |
| Prompt lifecycle | ✅ Complete | doc-05 §11 |
| Cache strategy | ✅ Complete | doc-05 §12 |
| Version schema | ✅ Complete | doc-05 §13.2 |
| A/B testing flow | ✅ Complete | doc-05 §13.3 |
| Rollback procedure | ✅ Complete | doc-05 §13.4 |

### 4.2 Sprint 1 Prompt Engine Tasks

| Task | Effort | Priority |
|---|---|---|
| PromptBuilder skeleton | 1 day | P0 |
| MAIKA persona v1 template | 0.5 day | P0 |
| BusinessContextInjector | 1 day | P0 |
| Safety filter (input sanitization) | 1 day | P0 |
| Prompt version storage (PG) | 1 day | P1 |
| Cache system prompt (Redis) | 0.5 day | P1 |
| tmpl-chat-v1 template | 0.5 day | P0 |
| tmpl-finance-query-v1 template | 0.5 day | P0 |
| **Total** | **~6 days** | |

---

## 5. Tool Registry Readiness

### 5.1 Architecture Completeness

| Aspect | Status | Source |
|---|---|---|
| ToolDefinition schema | ✅ Complete | doc-04 §3 |
| attendance.* group (6 tools) | ✅ Complete | doc-04 §4 |
| finance.* group (7 tools — READ only) | ✅ Complete | doc-04 §5 |
| funds.* group (8 tools) | ✅ Complete | doc-04 §6 |
| members.* group (7 tools) | ✅ Complete | doc-04 §7 |
| reports.* group (5 tools) | ✅ Complete | doc-04 §8 |
| contracts.* group | ✅ Complete | doc-04 §9 |
| notifications.* group | ✅ Complete | doc-04 §10 |
| settings.* group | ✅ Complete | doc-04 §11 |
| Permission Matrix | ✅ Complete | doc-04 §12 |
| Audit Log schema | ✅ Complete | doc-04 §13 |
| Tool Execution Flow | ✅ Complete | doc-04 §14 |
| Error codes | ✅ Complete | doc-04 §15 |

### 5.2 Sprint 1 Tool Registry Tasks (finance.* + members.*)

| Task | Effort | Priority |
|---|---|---|
| Tool Registry core (lookup, execute, audit) | 2 days | P0 |
| Permission checker middleware | 1 day | P0 |
| Human Confirmation Manager | 1 day | P0 |
| finance.getSummary | 0.5 day | P0 |
| finance.getClubAssets | 0.5 day | P0 |
| finance.getMemberBalance | 0.5 day | P0 |
| members.list | 0.5 day | P0 |
| members.getStats | 0.5 day | P1 |
| Audit Logger | 1 day | P0 |
| Input Validator (JSON Schema) | 1 day | P0 |
| **Total Sprint 1** | **~8.5 days** | |

---

## 6. Testing Readiness

### 6.1 Current State

Testing strategy cho AI layer **chưa được định nghĩa đầy đủ** trong Phase 0 docs. Đây là Improvement Item IMP-03.

### 6.2 Proposed Testing Strategy (Sprint 1 Addition)

| Layer | Test Type | Tool | Coverage Target |
|---|---|---|---|
| Tool Registry | Unit tests | Jest | 90%+ |
| Permission Checker | Unit tests | Jest | 100% |
| Prompt Engine | Unit tests | Jest | 80%+ |
| AI Harness routing | Unit tests | Jest | 85%+ |
| Circuit Breaker | Unit tests (state machine) | Jest | 90%+ |
| Tool Registry + API | Integration tests | Jest + Supertest | Critical paths |
| Failover flow | Integration tests | Jest + mock LLM | All failover chains |
| Finance isolation | Contract tests | Jest | 100% finance.* |
| Permission denied | Integration tests | Jest | All role combinations |

### 6.3 Test Fixtures Required

| Fixture | Description |
|---|---|
| Mock LiteLLM proxy | Respond with preset responses for unit tests |
| Mock Finance Engine responses | Return known finance data for tool registry tests |
| Test JWT tokens per role | member, treasurer, admin, system |
| Mock conversation history | Various lengths for memory tests |

### 6.4 Sprint 1 Testing Tasks

| Task | Effort |
|---|---|
| Test strategy doc (ADR-V21-12) | 0.5 day |
| Tool Registry unit tests | 2 days |
| Permission checker tests | 1 day |
| Mock LiteLLM setup | 1 day |
| Finance isolation contract tests | 1 day |
| **Total** | **5.5 days** |

---

## 7. DevOps Readiness

### 7.1 Infrastructure

| Component | Status | Action |
|---|---|---|
| Docker Compose (RC1 base) | ✅ Sẵn sàng | Thêm `litellm-proxy` service |
| PostgreSQL 16 | ✅ Sẵn sàng | Thêm AI tables qua migration |
| Redis 7 | ✅ Sẵn sàng | Thêm key namespaces |
| Nginx | ✅ Sẵn sàng | Thêm route `/ai/*` |
| GitHub Actions CI | ✅ Sẵn sàng | Thêm AI service tests |

### 7.2 New Services cho V2.1

| Service | Image | Port | Config cần |
|---|---|---|---|
| `litellm-proxy` | `ghcr.io/berriai/litellm` | 4001 (internal) | `litellm_config.yaml` |
| `ai-service` | Custom NestJS | 5000 (internal) | ENV vars |

### 7.3 Environment Variables cần thêm

| Variable | Sprint | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sprint 1 | Có |
| `LITELLM_BASE_URL` | Sprint 1 | Có |
| `LITELLM_MASTER_KEY` | Sprint 1 | Có |
| `LITELLM_DATABASE_URL` | Sprint 1 | Có |
| `AI_ENCRYPTION_KEY` | Sprint 1 | Có |
| `OPENAI_API_KEY` | Sprint 1 | Không (fallback) |
| `GEMINI_API_KEY` | Sprint 2 | Không (fallback) |
| `OPENROUTER_API_KEY` | Sprint 3 | Không (optional) |

### 7.4 Database Migrations

Sprint 1 cần migrations:
1. `CREATE TABLE ai_conversation_archive`
2. `CREATE TABLE ai_token_log`
3. `CREATE TABLE ai_audit_log`
4. `CREATE TABLE ai_prompt_version`
5. `ENABLE EXTENSION pgcrypto`

---

## 8. Security Readiness

### 8.1 Security Controls Status

| Control | Designed | Ready to Implement |
|---|---|---|
| Tool Registry Permission Gate | ✅ | ✅ |
| Human Confirmation Flow | ✅ | ✅ |
| Input Sanitization | ✅ | ✅ |
| Prompt Injection Detection | ✅ | ✅ |
| PII Masking | ✅ | ✅ |
| Column Encryption | ✅ | ⚠️ Cần pgcrypto |
| Redis TLS | ✅ | ⚠️ Cần Redis TLS config |
| Audit Logging | ✅ | ✅ |
| JWT Validation | ✅ | ✅ (RC1 auth) |
| Rate Limiting | ✅ | ✅ |

### 8.2 Security Sprint 1 Actions

| Action | Priority |
|---|---|
| Ensure AI Service không expose port ra host | P0 |
| LiteLLM API key trong Docker secrets/ENV | P0 |
| Redis TLS enable | P1 |
| pgcrypto extension enable | P0 |
| API key rotation plan | P1 |

---

## 9. Pre-Sprint Checklist

### Must Complete Before Sprint 1 (2026-07-02)

| # | Item | Owner | Status |
|---|---|---|---|
| PRE-01 | Architecture Lock Certificate issued | ARC | ⏳ Pending M1 completion |
| PRE-02 | Anthropic API key provisioned | DevOps | ⏳ |
| PRE-03 | LiteLLM config file template created | Backend | ⏳ |
| PRE-04 | `.env.example` updated với AI vars | Backend | ⏳ |
| PRE-05 | Docker Compose updated với `litellm-proxy` service | DevOps | ⏳ |
| PRE-06 | NestJS AI module skeleton created | Backend | ⏳ |
| PRE-07 | pgcrypto extension enabled on dev DB | DevOps | ⏳ |
| PRE-08 | Sprint 1 tasks created trong task tracker | PM | ⏳ |

---

## 10. Sprint 1 Prerequisites

### Technical Dependencies

| Dependency | Version | Available |
|---|---|---|
| Node.js | 20+ | ✅ (RC1) |
| NestJS | 10+ | ✅ (RC1) |
| TypeScript | 5+ | ✅ (RC1) |
| Redis | 7+ | ✅ (RC1) |
| PostgreSQL | 16+ | ✅ (RC1) |
| Docker | 24+ | ✅ (RC1) |
| LiteLLM | latest | ⏳ Pull image |
| Jest | 29+ | ✅ (RC1) |

### Knowledge Prerequisites

| Topic | Documentation |
|---|---|
| LiteLLM configuration | doc-03 §2.2 |
| Tool Registry schema | doc-04 §3 |
| MAIKA persona template | doc-05 §2.2 |
| Memory Redis patterns | doc-06 §3.3 |
| Finance API endpoints | `release/v2.0.0-rc1-enterprise/API_HANDBOOK.md` |

---

## 11. Implementation Constraints

Nhắc lại các ràng buộc bất biến trong suốt implementation:

| # | Constraint | Tác động |
|---|---|---|
| IC-01 | Finance Engine RC1 không thay đổi | AI service chỉ READ thông qua API |
| IC-02 | Database schema RC1 final | AI tables là tables mới, không modify RC1 tables |
| IC-03 | API contract RC1 không thay đổi | AI service consume RC1 API, không extend |
| IC-04 | Desktop UI RC1 không thay đổi | AI chat là widget mới, không modify existing UI |
| IC-05 | Mobile UI RC1 không thay đổi | AI mobile là additions, không modify existing |
| IC-06 | Pipeline không thay đổi | AI service deploy qua thêm Docker service |
| IC-07 | AI không gọi trực tiếp DB | Mọi data access qua Tool Registry |
| IC-08 | finance.* chỉ READ | Không implement finance WRITE tools |

---

## 12. Kết luận

| Hạng mục | Readiness | Ghi chú |
|---|---|---|
| AI Harness | ✅ READY | Architecture complete, 10 dev-days Sprint 1 |
| Memory Layer (Sprint 1 portion) | ✅ READY | Conversation Memory cho Sprint 1 |
| Prompt Engine | ✅ READY | 6 dev-days Sprint 1 |
| Tool Registry (finance.* + members.*) | ✅ READY | 8.5 dev-days Sprint 1 |
| Testing | ⚠️ PARTIAL | Cần thêm test strategy doc |
| DevOps | ✅ READY | RC1 infra sẵn sàng, thêm 2 services |
| Security | ✅ READY | Controls designed, pgcrypto cần enable |
| **Overall Sprint 1 Readiness** | ✅ **READY** | |

**Sprint 1 có thể bắt đầu ngày 2026-07-02 sau khi Architecture Lock Certificate được phát hành.**

---

*PickleFund V2.1 Milestone M1 — Implementation Readiness v1.0.0*
