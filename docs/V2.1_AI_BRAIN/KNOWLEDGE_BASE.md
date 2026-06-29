# PickleFund V2.1 — Enterprise Knowledge Base
## AI Brain Program

> Append-only. KHÔNG xoá lịch sử. Mỗi sprint append một block bên dưới.

---

## Program Overview

| Mục | Giá trị |
|---|---|
| Program | PickleFund V2.1 — AI Brain |
| Nền tảng | Backend NestJS + Prisma · Frontend React · Mobile (shared API) |
| Nguồn sự thật tài chính | **Finance Engine RC1** (duy nhất) |
| Nguyên tắc AI | AI chỉ ĐỌC Finance Summary RC1; không tính lại tài chính |

---

## Sprint 1 — AI Harness Foundation

| Hạng mục | Trạng thái |
|---|---|
| Sprint 1 Status | **COMPLETED** |
| AI Harness | **COMPLETED** |
| LiteLLM Integration | **DONE** |
| OpenRouter Integration | **DONE** |
| Ollama Integration | **DONE** |
| Retry Policy | **DONE** (classify 4xx no-retry / 429+5xx+network retry · backoff + jitter) |
| Circuit Breaker | **DONE** (CLOSED/OPEN/HALF_OPEN, per-provider) |
| Telemetry | **DONE** (no PII, no prompt/response) |
| Token Accounting | **DONE** (Club · User · Session · Provider · Model) |
| AI Gateway | **DONE** (shared Desktop + Mobile, single entry `POST /ai/chat`) |
| Finance Isolation | **VERIFIED** (AI đọc `FundPeriodsService.summary` RC1) |
| Desktop/Mobile Shared Gateway | **VERIFIED** (`useAIGateway` dùng chung) |

### Release Metadata

| Mục | Giá trị |
|---|---|
| Sprint 1 Release Tag | `v2.1-sprint1` |
| Sprint 1 Audited Commit SHA | `9ca071bf30b80eddbe635c7d4fff6b37734f670f` (Codex Final Audit PASS) |
| Sprint 1 Release Commit | `release(v2.1): Sprint 1 AI Harness Foundation completed` |
| Sprint 1 Release Date | 2026-06-29 |
| Branch | `main` |

### Test / Build Snapshot tại release

| Gate | Kết quả |
|---|---|
| Backend `nest build` | PASS (0 lỗi) |
| Backend tests | PASS — 25 suites / 240 tests |
| AI tests | PASS — 8 suites / 65 tests |
| Frontend `tsc -b` + `vite build` | PASS |
| ESLint AI source (non-test) | 0 lỗi |
| `docker compose config` | hợp lệ |

### Architecture Decisions (Sprint 1)

| ID | Quyết định | Lý do |
|---|---|---|
| AD-S1-01 | Circuit Breaker + Token Accounting in-memory | Single-instance Sprint 1; Redis/persistence là Sprint 3+ |
| AD-S1-02 | AI không tính tài chính, chỉ GET Finance Summary RC1 | Một nguồn sự thật duy nhất; tránh lệch số liệu |
| AD-S1-03 | Một AI Gateway + một hook dùng chung Desktop/Mobile | Đảm bảo parity, không feature-gap |
| AD-S1-04 | Provider qua native `fetch` + `AbortController` | Không thêm dependency; timeout per-request |
| AD-S1-05 | Lỗi provider → `AIProviderError` đã sanitize | Không lộ prompt/response/key vào log hay API |
| AD-S1-06 | Config 100% từ `.env` + fail-fast (production) | Không hardcode; sai cấu hình fail sớm khi boot |

### Lessons Learned (Sprint 1)

1. **`npm run lint` có cờ `--fix`** → reformat toàn repo, lan sang Finance Engine RC1. Phải lint phạm vi hẹp (`eslint src/ai`). Sự cố reformat 47 file đã được revert trong Sprint 1.1.
2. **Tài liệu vượt trước code** (POST /ai/chat, api-client alias) gây blocker audit → tài liệu phải khớp code thực tế; đã đồng bộ trong Sprint 1.1.
3. **ESLint `recommendedTypeChecked`** áp cả file test → repo có nợ lint pre-existing; cần một đợt dọn lint riêng (ngoài phạm vi AI).
4. **Token Accounting** ban đầu lưu `model` nhưng chưa expose → bổ sung `getByModel` + `GET /ai/tokens/model/:model` (Sprint 1.1 last blocker).

---

## Enterprise Governance v1.0 (Milestone Close)

| Mục | Giá trị |
|---|---|
| Enterprise Governance | **v1.0** |
| Status | **LOCKED** |
| Codex Governance Audit | **PASS** |
| Enterprise Development Handbook | **APPROVED** |
| Governance Milestone | **CLOSED** |
| Date | 2026-06-29 |
| HEAD SHA | `f2bbae107b088417bae4f8f0eab876e44c4f2a1d` |

- Handbook: `ENTERPRISE_DEVELOPMENT_HANDBOOK.md` (v1.0.0) + review package `HANDBOOK_REVIEW/01..09` + report.
- Lock Certificate `HANDBOOK_REVIEW/09_HANDBOOK_LOCK_CERTIFICATE.md` → `LOCKED` sau Codex PASS.
- Close report: `GOVERNANCE_CLOSE_REPORT.md`.
- Sprint 2 Implementation: **NOT STARTED** (Memory Architecture đã LOCKED, chờ mở triển khai).

---

*Append block cho Sprint 2 trở đi bên dưới dòng này khi sprint đó đóng.*

---

## Sprint 2 — Epic 2.1 Memory Core Foundation

**Status:** APPROVED
**Codex Re-Audit:** PASS

**Scope Completed:**
- Memory Core
- Memory API
- Memory Manager
- Repository Abstraction
- In-memory Repository
- Deep Immutability
- SESSION Ownership
- Config Consistency
- Tests
- Documentation

**Release Metadata:**
- Epic 2.1 Commit: `ca7285f73a1ea33d4c4983b6f49cba48dada0e28` (`feat(memory): complete Sprint 2 Epic 2.1 memory core foundation`)
- Date: 2026-06-29 · Branch: `main`
- Tests: backend 28 suites / 297 · memory 3 suites / 57 · coverage memory ≥90% cả 4 metric

**Known Notes:**
- In-memory repository is volatile default.
- Persistent Vector Store remains deferred to Epic 2.4.
- Conversation/User/Club Memory are not implemented yet.

---

## Sprint 2 — Epic 2.2 Conversation Memory + User Memory

**Status:** APPROVED
**Codex Delta Audit:** PASS

**Completed:**
- Conversation Memory
- User Memory
- Context Builder
- Context Window Manager
- JWT Tenant Isolation
- Composite Tenant Key (`${clubId}:${userId}`)
- Deep Immutability
- Documentation
- Tests

**Release Metadata:**
- Epic 2.2 Commit: `f7990dae8d59c7b0996b46221b15992e49f3900e` (`feat(memory): complete Sprint 2 Epic 2.2 conversation and user memory`)
- Date: 2026-06-29 · Branch: `main`
- Tests: backend 36 suites / 348 · Epic 2.2 8 suites / 51 · coverage stmts/lines/funcs 100% (branch capped bởi DTO decorators)

**Known Notes:**
- Behavior Memory chưa đưa vào Context Builder.
- Club Memory chưa triển khai.
- Semantic Search chưa triển khai.
- Vector Store deferred.
