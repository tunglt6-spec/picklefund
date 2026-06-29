# ARCHITECTURE LOCK CERTIFICATE
## PickleFund V2.1 — Milestone M1: Official Architecture Lock

---

```
╔══════════════════════════════════════════════════════════════════╗
║          PICKLEFUND V2.1 AI BRAIN FOUNDATION                     ║
║              ARCHITECTURE LOCK CERTIFICATE                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Architecture Version    AI Brain v1.0                           ║
║  Status                  LOCKED ✅                               ║
║  Issue Date              2026-06-29                              ║
║  Valid Through           2026-08-15 (V2.1 Release)               ║
║                                                                  ║
║  Finance Source of Truth Finance Engine RC1 (IMMUTABLE)          ║
║  AI Brain Components     APPROVED                                ║
║  Desktop                 PASS                                    ║
║  Mobile                  PASS                                    ║
║  Architecture Ready      YES                                     ║
║  Sprint 1 Ready          YES                                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

**Số chứng chỉ:** PKLF-V21-M1-ALC-20260629
**Phiên bản:** 1.0.0
**Ngày phát hành:** 2026-06-29
**Có hiệu lực đến:** 2026-08-15 (V2.1 Release Date)
**Phát hành bởi:** Architecture Review Committee (ARC)
**Tình trạng:** LOCKED ✅

---

## Lịch sử sửa đổi

| Phiên bản | Ngày | Tác giả | Mô tả |
|---|---|---|---|
| 1.0.0 | 2026-06-29 | ARC | Phát hành chứng chỉ sau M1 review |

---

## Mục lục

1. [Tóm tắt Chứng chỉ](#1-tóm-tắt-chứng-chỉ)
2. [Phạm vi Architecture Lock](#2-phạm-vi-architecture-lock)
3. [Xác nhận Finance Source of Truth](#3-xác-nhận-finance-source-of-truth)
4. [Approved Architecture Components](#4-approved-architecture-components)
5. [Desktop & Mobile Verification](#5-desktop--mobile-verification)
6. [Review Results Summary](#6-review-results-summary)
7. [Architecture Constraints](#7-architecture-constraints)
8. [Điều kiện để duy trì Lock](#8-điều-kiện-để-duy-trì-lock)
9. [Quy trình thay đổi sau Lock](#9-quy-trình-thay-đổi-sau-lock)
10. [Chữ ký & Phê duyệt](#10-chữ-ký--phê-duyệt)

---

## 1. Tóm tắt Chứng chỉ

Chứng chỉ này xác nhận rằng **PickleFund V2.1 AI Brain Foundation Architecture** đã trải qua quá trình review đầy đủ theo **Milestone M1 — Architecture Lock** và đã đáp ứng tất cả các tiêu chí bắt buộc.

Architecture V2.1 AI Brain được chính thức **LOCKED** kể từ ngày 2026-06-29.

### Kết quả Review Tổng hợp

| Review | Result | Score |
|---|---|---|
| Architecture Review | ✅ PASS | 91.5/100 |
| Finance Isolation Review | ✅ PASS | Full Isolation Confirmed |
| AI Governance Review | ✅ PASS | 91.5/100 |
| Desktop/Mobile Consistency | ✅ PASS | No Feature Gaps |
| Architecture Decision Log | ✅ PASS | 38 ADRs, 0 Conflicts |
| Risk Assessment | ✅ PASS | 0 Critical Risks |
| Implementation Readiness | ✅ READY | Sprint 1 Ready |

**Tổng kết: TẤT CẢ PASS — ARCHITECTURE LOCKED** ✅

---

## 2. Phạm vi Architecture Lock

### Documents được Lock

| Tài liệu | Phiên bản | Status |
|---|---|---|
| `01_PROJECT_CHARTER.md` | 1.0.0 | 🔒 LOCKED |
| `02_AI_ARCHITECTURE_SPECIFICATION.md` | 1.0.0 | 🔒 LOCKED |
| `03_AI_HARNESS_DESIGN.md` | 1.0.0 | 🔒 LOCKED |
| `04_TOOL_REGISTRY_SPECIFICATION.md` | 1.0.0 | 🔒 LOCKED |
| `05_PROMPT_ENGINE_SPECIFICATION.md` | 1.0.0 | 🔒 LOCKED |
| `06_MEMORY_LAYER_SPECIFICATION.md` | 1.0.0 | 🔒 LOCKED |
| `INDEX.md` | 1.0.0 | 🔒 LOCKED |

### Components trong Scope

| Component | Lock Status |
|---|---|
| AI Harness (LiteLLM Gateway) | 🔒 LOCKED |
| Tool Registry (8 groups) | 🔒 LOCKED |
| Prompt Engine (MAIKA v1) | 🔒 LOCKED |
| Memory Layer (5 types) | 🔒 LOCKED |
| AI Governance Model | 🔒 LOCKED |
| Finance Isolation Boundary | 🔒 LOCKED |

### KHÔNG trong Scope Lock (bất biến trước V2.1)

| Component | Status |
|---|---|
| Finance Engine RC1 | 🔒 IMMUTABLE (from RC1) |
| Database Schema RC1 | 🔒 IMMUTABLE (from RC1) |
| API Contract RC1 | 🔒 IMMUTABLE (from RC1) |
| Desktop UI RC1 | 🔒 IMMUTABLE (from RC1) |
| Mobile UI RC1 | 🔒 IMMUTABLE (from RC1) |

---

## 3. Xác nhận Finance Source of Truth

```
╔══════════════════════════════════════════════════════════════════╗
║              FINANCE SOURCE OF TRUTH DECLARATION                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Finance Engine RC1 là SOURCE OF TRUTH DUY NHẤT                 ║
║  cho mọi dữ liệu tài chính trong PickleFund V2.1                 ║
║                                                                  ║
║  Công thức nghiệp vụ bất biến:                                   ║
║  Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ                 ║
║                    (Quỹ Phụ KHÔNG cộng vào)                      ║
║                                                                  ║
║  AI Brain V2.1:                                                  ║
║  ✅ CHỈ ĐỌC từ Finance Engine qua Tool Registry                  ║
║  ❌ KHÔNG tự tính bất kỳ chỉ số tài chính nào                    ║
║  ❌ KHÔNG WRITE vào Finance Engine                               ║
║  ❌ KHÔNG lưu calculated finance values trong Memory             ║
║                                                                  ║
║  Xác nhận bởi: Finance Isolation Report (M1)                     ║
║  Kết quả: PASS — Full Isolation Confirmed                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 4. Approved Architecture Components

### 4.1 AI Harness — APPROVED ✅

| Thuộc tính | Giá trị |
|---|---|
| Implementation | LiteLLM Proxy (Docker) |
| Primary model | Claude Sonnet 4.x |
| Failover chain | Claude → GPT-4o → Gemini Flash → Ollama |
| Circuit breaker | Per-provider, Redis-backed |
| Rate limiting | Sliding window, per user/club |
| Streaming | SSE protocol |
| Cost tracking | Async, per club/user |

### 4.2 MAIKA — APPROVED ✅

| Thuộc tính | Giá trị |
|---|---|
| Persona | AI Thủ quỹ Đồng hành |
| Version | v1 (tmpl-chat-v1) |
| Language | Tiếng Việt (default) |
| Finance rules | EXPLICIT — không tự tính |
| Scope | CLB finance, attendance, members |

### 4.3 Memory Layer — APPROVED ✅

| Memory Type | Storage | TTL | Finance Data |
|---|---|---|---|
| Conversation | Redis | 24h | ❌ Không |
| Club | PostgreSQL | 90 ngày | ❌ Không |
| Member | PostgreSQL | 90 ngày | ❌ Không |
| Business | PostgreSQL | 90 ngày | ❌ Không |
| Temporary | Redis | 15 phút | ❌ Không |
| Long-term | PostgreSQL | 1 năm | ❌ Không |

### 4.4 Tool Registry — APPROVED ✅

| Group | Read | Write | Finance Write |
|---|---|---|---|
| finance.* | ✅ | ❌ | ❌ |
| members.* | ✅ | ✅ (confirm) | N/A |
| attendance.* | ✅ | ✅ (confirm) | N/A |
| funds.* | ✅ | ✅ (confirm) | ❌ |
| reports.* | ✅ | ✅ (confirm) | N/A |
| contracts.* | ✅ | ❌ (AI) | N/A |
| notifications.* | ✅ | ✅ (confirm) | N/A |
| settings.* | ✅ | ❌ (AI) | N/A |

### 4.5 Prompt Engine — APPROVED ✅

| Thuộc tính | Giá trị |
|---|---|
| Versioning | Semantic (major.minor.patch) |
| A/B testing | Supported |
| Rollback | < 5 phút |
| Safety filter | Input + Output |
| Finance safety | Explicit rules |
| Prompt caching | System prompt + Tool defs |

---

## 5. Desktop & Mobile Verification

```
╔══════════════════════════════════════════════════════════╗
║         DESKTOP & MOBILE PARITY VERIFICATION             ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Desktop AI Features:    PASS ✅                         ║
║  Mobile AI Features:     PASS ✅                         ║
║  Feature Gap (D vs M):   NONE ✅                         ║
║  Shared Components:      CONFIRMED ✅                    ║
║  Shared AI Flow:         CONFIRMED ✅                    ║
║  Responsive (375→1920):  CONFIRMED ✅                    ║
║                                                          ║
║  Differences: ADAPTIVE ONLY (không phải feature gap)     ║
║  - Chat: Panel (Desktop) vs. Bottom Sheet (Mobile)       ║
║  - Alert: Banner (Desktop) vs. Toast (Mobile)            ║
║  - Confirm: Dialog (Desktop) vs. Full-screen (Mobile)    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 6. Review Results Summary

| # | Review Document | Status | Critical Issues |
|---|---|---|---|
| 1 | Architecture Review Report | ✅ PASS (91.5/100) | 0 |
| 2 | Finance Isolation Report | ✅ PASS | 0 |
| 3 | AI Governance Report | ✅ PASS (91.5/100) | 0 |
| 4 | Desktop/Mobile Consistency Report | ✅ PASS | 0 |
| 5 | Architecture Decision Log | ✅ PASS (38 ADRs) | 0 |
| 6 | Risk Assessment | ✅ PASS | 0 Critical |
| 7 | Implementation Readiness | ✅ READY | — |
| **TỔNG** | | ✅ **ALL PASS** | **0** |

---

## 7. Architecture Constraints

Những ràng buộc sau đây có hiệu lực trong suốt V2.1 và không thể thay đổi mà không có Architecture Change Request (ACR):

| # | Constraint | Level |
|---|---|---|
| AC-01 | Finance Engine RC1 không được sửa đổi | IMMUTABLE |
| AC-02 | AI không tự tính bất kỳ giá trị tài chính nào | IMMUTABLE |
| AC-03 | AI không WRITE vào Finance Engine | IMMUTABLE |
| AC-04 | Mọi AI-to-API call phải qua Tool Registry | LOCKED |
| AC-05 | WRITE operations luôn cần human confirmation | LOCKED |
| AC-06 | Mọi AI action phải có audit log | LOCKED |
| AC-07 | Desktop và Mobile phải có AI feature parity | LOCKED |
| AC-08 | finance.* Tool group chỉ có READ tools | LOCKED |
| AC-09 | Database schema RC1 không thay đổi | IMMUTABLE |
| AC-10 | API contract RC1 backward compatible | IMMUTABLE |

---

## 8. Điều kiện để duy trì Lock

Architecture Lock duy trì hiệu lực khi:

| Điều kiện | Kiểm tra |
|---|---|
| Finance Engine RC1 không thay đổi | Zero git diff trên `backend/src/fund-periods/calculators/` |
| Backend tests ≥ 175/175 | CI pipeline pass |
| Không có finance WRITE tool được thêm vào Registry | Code review |
| Mọi AI action đều có audit log | Integration test |
| Mobile feature không tụt hậu Desktop | Sprint review |

---

## 9. Quy trình thay đổi sau Lock

Nếu cần thay đổi Architecture sau khi Lock, phải tuân theo:

### Architecture Change Request (ACR) Process

```
1. Tạo ACR Document với:
   - Lý do thay đổi
   - Ảnh hưởng đến các components
   - Risk assessment
   - Rollback plan

2. Review bởi ARC (ít nhất 2 reviewers)

3. Impact assessment trên Finance Isolation

4. Sign-off từ Product Owner

5. Update version của tài liệu bị ảnh hưởng

6. Update Architecture Lock Certificate
```

### Không cần ACR (implementation details)

- Thêm LLM provider mới vào LiteLLM config
- Thêm prompt template mới (không thay đổi persona)
- Thêm tool vào Tool Registry (không thay đổi finance.* group)
- Cải thiện performance (không thay đổi behavior)

---

## 10. Chữ ký & Phê duyệt

| Vai trò | Tên | Ngày | Chữ ký |
|---|---|---|---|
| Product Owner | tunglt6-spec | 2026-06-29 | [APPROVED] |
| Lead Architect | tunglt6-spec | 2026-06-29 | [APPROVED] |
| Finance Domain Expert | tunglt6-spec | 2026-06-29 | [APPROVED] |
| Security Review | ARC | 2026-06-29 | [APPROVED] |

---

```
╔══════════════════════════════════════════════════════════════════╗
║                    ARCHITECTURE LOCKED                           ║
║                                                                  ║
║  Certificate No: PKLF-V21-M1-ALC-20260629                        ║
║  AI Brain Version: v1.0                                          ║
║  Finance Source of Truth: Finance Engine RC1                     ║
║  Lock Date: 2026-06-29                                           ║
║  Valid Through: 2026-08-15                                       ║
║                                                                  ║
║  SPRINT 1 READY: YES ✅                                          ║
║  Start Date: 2026-07-02                                          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*PickleFund V2.1 Milestone M1 — Architecture Lock Certificate v1.0.0*
*Issued by Architecture Review Committee — 2026-06-29*
