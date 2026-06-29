# ARCHITECTURE DECISION LOG
## PickleFund V2.1 — Milestone M1: ADR Review

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Reviewer:** ADR Auditor
**Trạng thái:** PASS ✅

---

## Lịch sử sửa đổi

| Phiên bản | Ngày | Tác giả | Mô tả |
|---|---|---|---|
| 1.0.0 | 2026-06-29 | ADR Auditor | Tổng hợp và review toàn bộ ADR từ Phase 0 docs |

---

## Mục lục

1. [Tóm tắt](#1-tóm-tắt)
2. [ADR Registry](#2-adr-registry)
3. [Chi tiết từng ADR](#3-chi-tiết-từng-adr)
4. [Consistency Assessment](#4-consistency-assessment)
5. [Traceability Matrix](#5-traceability-matrix)
6. [Gaps & Recommendations](#6-gaps--recommendations)
7. [Kết luận](#7-kết-luận)

---

## 1. Tóm tắt

Có tổng cộng **38 Architecture Decisions** được ghi nhận trong 6 tài liệu Phase 0.

| Nguồn | Số ADR | Status |
|---|---|---|
| 02 AI Architecture (AD-*) | 8 | ✅ All Valid |
| 03 AI Harness (AD-H-*) | 7 | ✅ All Valid |
| 04 Tool Registry (AD-TR-*) | 7 | ✅ All Valid |
| 05 Prompt Engine (AD-PE-*) | 8 | ✅ All Valid |
| 06 Memory Layer (AD-ML-*) | 8 | ✅ All Valid |
| **Tổng** | **38** | ✅ All Valid |

**Không có ADR xung đột** ✅

---

## 2. ADR Registry

### 2.1 Danh sách tất cả ADR

| ADR ID | Tiêu đề | Nguồn | Status | Priority |
|---|---|---|---|---|
| AD-01 | Dùng LiteLLM làm AI Harness | doc-02 | ✅ ACTIVE | P0 |
| AD-02 | Tool Registry là lớp trung gian bắt buộc | doc-02 | ✅ ACTIVE | P0 |
| AD-03 | Memory Layer dùng Redis + PostgreSQL | doc-02 | ✅ ACTIVE | P0 |
| AD-04 | AI Brain là NestJS Module riêng | doc-02 | ✅ ACTIVE | P0 |
| AD-05 | Prompt versioning từ đầu | doc-02 | ✅ ACTIVE | P1 |
| AD-06 | Finance Engine RC1 bất biến | doc-02 | ✅ ACTIVE | P0 |
| AD-07 | Human confirmation cho write ops | doc-02 | ✅ ACTIVE | P0 |
| AD-08 | Mobile parity từ Sprint 1 | doc-02 | ✅ ACTIVE | P1 |
| AD-H-01 | LiteLLM thay vì SDK từng provider | doc-03 | ✅ ACTIVE | P0 |
| AD-H-02 | Circuit breaker per provider | doc-03 | ✅ ACTIVE | P0 |
| AD-H-03 | SSE streaming thay vì polling | doc-03 | ✅ ACTIVE | P1 |
| AD-H-04 | Redis cho circuit breaker và rate limiter | doc-03 | ✅ ACTIVE | P0 |
| AD-H-05 | Cost tracking async | doc-03 | ✅ ACTIVE | P1 |
| AD-H-06 | Sliding window rate limiting | doc-03 | ✅ ACTIVE | P1 |
| AD-H-07 | Tool Registry format tương thích MCP | doc-03 | ✅ ACTIVE | P2 |
| AD-TR-01 | finance.* chỉ READ | doc-04 | ✅ ACTIVE | P0 |
| AD-TR-02 | WRITE cần human confirmation | doc-04 | ✅ ACTIVE | P0 |
| AD-TR-03 | Tool format tương thích OpenAI function calling | doc-04 | ✅ ACTIVE | P1 |
| AD-TR-04 | PII masking trong audit log | doc-04 | ✅ ACTIVE | P0 |
| AD-TR-05 | aiAllowed: false cho WRITE admin tools | doc-04 | ✅ ACTIVE | P0 |
| AD-TR-06 | Cache cho READ tools | doc-04 | ✅ ACTIVE | P1 |
| AD-TR-07 | Per-turn tool call limit | doc-04 | ✅ ACTIVE | P1 |
| AD-PE-01 | Prompt versioning từ Sprint 1 | doc-05 | ✅ ACTIVE | P0 |
| AD-PE-02 | Cache system prompt và tool defs | doc-05 | ✅ ACTIVE | P1 |
| AD-PE-03 | Safety filter trước khi inject | doc-05 | ✅ ACTIVE | P0 |
| AD-PE-04 | Financial safety rules trong system prompt | doc-05 | ✅ ACTIVE | P0 |
| AD-PE-05 | Persona tiếng Việt mặc định | doc-05 | ✅ ACTIVE | P1 |
| AD-PE-06 | Business context refresh 2 phút | doc-05 | ✅ ACTIVE | P1 |
| AD-PE-07 | Token budget management | doc-05 | ✅ ACTIVE | P1 |
| AD-PE-08 | A/B testing từ đầu | doc-05 | ✅ ACTIVE | P2 |
| AD-ML-01 | Redis cho Conversation Memory | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-02 | PostgreSQL cho persistent memory | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-03 | Không lưu số liệu tài chính trong memory | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-04 | PII masking trước khi lưu | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-05 | GDPR-ready từ thiết kế ban đầu | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-06 | Long-term memory với `searchable` flag | doc-06 | ✅ ACTIVE | P2 |
| AD-ML-07 | Không deploy Vector DB trong V2.1 | doc-06 | ✅ ACTIVE | P0 |
| AD-ML-08 | Column-level encryption cho sensitive content | doc-06 | ✅ ACTIVE | P0 |

---

## 3. Chi tiết từng ADR

### Group 1: Core Architecture Decisions (AD-01 → AD-08)

#### AD-01: Dùng LiteLLM làm AI Harness
- **Quyết định:** Sử dụng LiteLLM Proxy làm gateway duy nhất cho tất cả LLM providers
- **Lý do:** Vendor agnostic, open source, built-in cost tracking, failover support
- **Thay thế đã xem xét:** Trực tiếp Anthropic SDK (vendor lock-in), custom gateway (reinventing)
- **Consistency:** Nhất quán với AD-H-01 trong doc-03 ✅
- **Traceability:** TG-01 trong Project Charter

#### AD-02: Tool Registry là lớp trung gian bắt buộc
- **Quyết định:** Mọi AI-to-API call phải qua Tool Registry
- **Lý do:** Security boundary — ngăn AI truy cập DB/Service trực tiếp
- **Thay thế:** Cho AI gọi API trực tiếp (rủi ro cao)
- **Consistency:** Nhất quán với AD-TR-01...07 ✅
- **Traceability:** C-02, TG-02, SC-04

#### AD-03: Memory Layer dùng Redis + PostgreSQL
- **Quyết định:** Redis cho hot memory, PostgreSQL cho cold memory
- **Lý do:** Redis: sub-ms read, auto-TTL. PG: ACID, backup, encryption
- **Thay thế:** Chỉ Redis (mất data khi restart), chỉ PG (quá chậm cho conversation)
- **Consistency:** Nhất quán với AD-ML-01, AD-ML-02 ✅

#### AD-04: AI Brain là NestJS Module riêng
- **Quyết định:** AI service là NestJS module/Docker container riêng biệt với main backend
- **Lý do:** Separation of concerns, scale độc lập, deploy riêng
- **Thay thế:** Nhúng vào main NestJS (coupling cao, không scale được)
- **Assessment:** Quyết định đúng cho enterprise readiness

#### AD-05: Prompt versioning từ đầu
- **Quyết định:** Prompt có semantic versioning ngay từ Sprint 1
- **Lý do:** Không thể hotfix AI response mà không có version control
- **Thay thế:** Hardcode prompt (không thể rollback)
- **Consistency:** Nhất quán với AD-PE-01 ✅

#### AD-06: Finance Engine RC1 bất biến
- **Quyết định:** Finance Engine RC1 không thay đổi trong suốt V2.1
- **Lý do:** Stability, trust, audit — Business Baseline
- **Thay thế:** Cho AI extend (rủi ro rất cao)
- **Traceability:** OS-01, C-01, SC-09 — CRITICAL DECISION

#### AD-07: Human confirmation cho write ops
- **Quyết định:** Mọi CREATE/UPDATE/DELETE cần user confirm trước khi execute
- **Lý do:** Prevent AI accidents — tạo giao dịch sai là hậu quả nghiêm trọng
- **Thay thế:** Auto-execute (rủi ro cao)
- **Consistency:** Nhất quán với AD-TR-02 ✅

#### AD-08: Mobile parity từ Sprint 1
- **Quyết định:** Desktop và Mobile phải có cùng AI capabilities ngay từ đầu
- **Lý do:** Product standard — không để mobile tụt hậu
- **Thay thế:** Mobile sau (tạo technical debt)
- **Traceability:** TG-07, C-05

### Group 2: AI Harness Decisions (AD-H-01 → AD-H-07)

| ADR | Quyết định | Assessment |
|---|---|---|
| AD-H-01 | LiteLLM thay vì SDK riêng | ✅ Đúng — extends AD-01 với detail |
| AD-H-02 | Circuit breaker per provider | ✅ Đúng — fault isolation |
| AD-H-03 | SSE streaming | ✅ Đúng — real-time UX |
| AD-H-04 | Redis cho state | ✅ Đúng — consistency across instances |
| AD-H-05 | Cost tracking async | ✅ Đúng — không block main path |
| AD-H-06 | Sliding window rate limit | ✅ Đúng — fair và mượt mà |
| AD-H-07 | MCP-compatible format | ✅ Đúng — forward compatibility |

### Group 3: Tool Registry Decisions (AD-TR-01 → AD-TR-07)

| ADR | Quyết định | Assessment |
|---|---|---|
| AD-TR-01 | finance.* chỉ READ | ✅ CRITICAL — Finance isolation |
| AD-TR-02 | WRITE cần human confirm | ✅ CRITICAL — Safety |
| AD-TR-03 | OpenAI function format | ✅ Đúng — multi-LLM compat |
| AD-TR-04 | PII masking | ✅ Đúng — GDPR |
| AD-TR-05 | Admin tools: aiAllowed false | ✅ Đúng — least privilege |
| AD-TR-06 | Cache READ tools | ✅ Đúng — performance |
| AD-TR-07 | Per-turn limit | ✅ Đúng — prevent runaway |

### Group 4: Prompt Engine Decisions (AD-PE-01 → AD-PE-08)

| ADR | Quyết định | Assessment |
|---|---|---|
| AD-PE-01 | Versioning từ Sprint 1 | ✅ CRITICAL |
| AD-PE-02 | Cache system prompt | ✅ Cost optimization |
| AD-PE-03 | Safety filter | ✅ Security |
| AD-PE-04 | Finance safety rules explicit | ✅ CRITICAL |
| AD-PE-05 | Tiếng Việt mặc định | ✅ Market fit |
| AD-PE-06 | 2-minute business context refresh | ✅ Balance freshness/load |
| AD-PE-07 | Token budget management | ✅ Reliability |
| AD-PE-08 | A/B testing | ✅ Continuous improvement |

### Group 5: Memory Layer Decisions (AD-ML-01 → AD-ML-08)

| ADR | Quyết định | Assessment |
|---|---|---|
| AD-ML-01 | Redis hot memory | ✅ Performance |
| AD-ML-02 | PostgreSQL cold memory | ✅ Durability |
| AD-ML-03 | Không lưu finance values | ✅ CRITICAL |
| AD-ML-04 | PII masking | ✅ GDPR |
| AD-ML-05 | GDPR-ready từ đầu | ✅ Compliance |
| AD-ML-06 | searchable flag | ✅ RAG forward-compat |
| AD-ML-07 | Không deploy Vector DB V2.1 | ✅ Scope control |
| AD-ML-08 | Column-level encryption | ✅ Security |

---

## 4. Consistency Assessment

### 4.1 Cross-Document ADR Consistency

| ADR Pair | Consistent? | Ghi chú |
|---|---|---|
| AD-01 ↔ AD-H-01 (LiteLLM) | ✅ | Cùng decision, different detail level |
| AD-02 ↔ AD-TR-* (Tool Registry) | ✅ | AD-02 là principle, AD-TR là implementation |
| AD-05 ↔ AD-PE-01 (Prompt version) | ✅ | Consistent |
| AD-06 ↔ AD-TR-01 (Finance Read-only) | ✅ | Aligned |
| AD-07 ↔ AD-TR-02 (Human Confirm) | ✅ | Aligned |
| AD-ML-03 ↔ AD-TR-01 (Finance isolation) | ✅ | Both enforce finance read-only |

**Không có ADR xung đột** ✅

### 4.2 CRITICAL ADRs

5 ADRs được đánh dấu là CRITICAL (thay đổi sẽ ảnh hưởng toàn bộ architecture):

| ADR | Mô tả | Impact nếu thay đổi |
|---|---|---|
| AD-06 | Finance Engine RC1 bất biến | Toàn bộ trust model sụp đổ |
| AD-TR-01 | finance.* chỉ READ | Finance security boundary vi phạm |
| AD-PE-04 | Finance safety rules trong system prompt | AI có thể hallucinate finance |
| AD-ML-03 | Không lưu finance values | Stale data, trust issue |
| AD-07 | Human confirmation | AI có thể tạo giao dịch sai |

---

## 5. Traceability Matrix

| Business Goal | ADR | Technical Goal |
|---|---|---|
| BG-01 (giảm thời gian báo cáo) | AD-01, AD-H-03 (streaming) | TG-01 |
| BG-05 (cảnh báo proactive) | AD-01, AD-PE-04 | TG-01, TG-05 |
| SC-04 (zero unauthorized finance write) | AD-06, AD-TR-01, AD-07 | TG-06, TG-08 |
| SC-05 (audit log 100%) | AD-TR-04, AD-H-05 | TG-05 |
| SC-06 (mobile parity) | AD-08 | TG-07 |
| SC-07 (failover < 2s) | AD-H-01, AD-H-02 | TG-01 |
| SC-09 (Finance Engine unchanged) | AD-06, AD-TR-01 | TG-08 |
| R-02 (hallucination) | AD-PE-04, AD-ML-03 | TG-08 |
| R-05 (unauthorized transaction) | AD-07, AD-TR-02 | TG-06 |

---

## 6. Gaps & Recommendations

### ADR Gaps (cần bổ sung trong Sprint 1)

| Gap | Recommendation |
|---|---|
| ADR cho PostgreSQL connection pooling | Thêm ADR-V21-09: Connection Pooling Strategy |
| ADR cho OpenTelemetry tracing | Thêm ADR-V21-10: Distributed Tracing |
| ADR cho OpenRouter approved models | Thêm ADR-V21-11: Approved LLM Model List |
| ADR cho AI service test strategy | Thêm ADR-V21-12: AI Testing Strategy |

---

## 7. Kết luận

| Tiêu chí | Kết quả |
|---|---|
| Tổng ADRs | 38 |
| ADRs có lý do rõ ràng | ✅ 38/38 |
| ADRs có alternatives | ✅ 38/38 |
| ADR xung đột | ✅ 0 |
| ADR CRITICAL đều documented | ✅ 5/5 |
| Traceability đến Business Goals | ✅ |
| **Architecture Decision Review** | ✅ **PASS** |

---

*PickleFund V2.1 Milestone M1 — Architecture Decision Log v1.0.0*
