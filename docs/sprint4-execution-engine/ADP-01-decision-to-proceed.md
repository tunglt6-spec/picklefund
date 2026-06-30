# ADP-01 — Decision to Proceed for Sprint 4 Implementation

> **Architecture Decision to Proceed (ADP).** Đây **KHÔNG** phải ADR, **KHÔNG** phải tài liệu kỹ thuật. Đây là **quyết định quản trị của Chủ dự án** sau khi ADR-01 PASS + ADR-02 PASS, nhằm quyết định: **có cho phép mở Epic 4.1 hay không.**

**Ngày:** 2026-06-30 · **Nhánh:** `main` · **Liên quan:** [ADR-01](ADR-01-execution-engine-architecture.md) · [ADR-02](ADR-02-execution-governance-model.md)

---

## 1. Decision Status

**APPROVED FOR LIMITED IMPLEMENTATION.**

> ⚠️ Đây **KHÔNG** phải approval cho Execution Engine. Đây **chỉ** là approval được phép **bắt đầu Epic 4.1**.

## 2. Bối cảnh

- Sprint 2 ✅ CLOSED / Architecture Frozen.
- Sprint 3 ✅ CLOSED / Architecture Frozen.
- **ADR-01** ✅ PASS (Execution Engine Architecture).
- **ADR-02** ✅ PASS (Execution Governance Model).
- Project Governance Rules đầy đủ; Architecture Frozen.

## 3. Decision

- ✅ **Cho phép mở Epic 4.1 — Execution Ticket Framework.**
- ⛔ **Không** cho phép mở **Epic 4.2+** (chờ Epic 4.1 PASS + quyết định riêng).

## 4. Execution Scope (Epic 4.1)

Epic 4.1 **chỉ** được phép xây:

- **Execution Ticket** (model + vòng đời).
- **Execution State** (state machine).
- **Execution Validation** (kiểm tra điều kiện, read-only).
- **Execution Metadata**.

> **Không execute** — Epic 4.1 chỉ tạo khung ticket, không thực thi bất kỳ action nào.

## 5. Những gì bị cấm

Epic 4.1 **KHÔNG** được: API Write · DB Write · Workflow · Automation · Email · Telegram · Notification · Finance · Connector · Job Queue · Scheduler · **Execute**.

## 6. Success Criteria

Epic 4.1 phải đạt:

| Tiêu chí | Mức |
|---|---|
| Execution Ticket | 100% |
| Execution Metadata | 100% |
| Execution Validation | 100% |
| Read Only | 100% |
| No Execute | 100% |
| No Write | 100% |

## 7. Exit Criteria (để sang Epic 4.2)

Muốn mở Epic 4.2 phải: **Epic 4.1 PASS · Codex PASS · Commit · Tag · Push · PROJECT_STATUS cập nhật.**

## 8. Risk Acceptance

Owner chỉ chấp nhận **Low / Medium**. **Không** chấp nhận **High / Critical**.

## 9. Execution Readiness

> **Execution Readiness VẪN = NOT READY.** Epic 4.1 **không** thay đổi trạng thái này.

## 10. Sprint 4

**Sprint 4 implementation được phép bắt đầu DUY NHẤT Epic 4.1.** Mọi Epic khác (4.2 → 4.6) vẫn BLOCKED.

## 11. Tác động PROJECT_STATUS

- Sprint 4: ADR-01 ✅ PASS · ADR-02 ✅ PASS · **ADP-01 ✅ APPROVED**.
- Epic 4.1: **READY TO START**.
- Execution Readiness: **NOT READY**.
- Sprint 4 implementation: **PARTIALLY APPROVED** (chỉ Epic 4.1).

---

> 🧾 ADP-01 là quyết định quản trị. Việc mở Epic 4.1 thực tế (viết code) chỉ bắt đầu khi có chỉ thị triển khai Epic 4.1 cụ thể. Maika vẫn chưa được phép execute.
