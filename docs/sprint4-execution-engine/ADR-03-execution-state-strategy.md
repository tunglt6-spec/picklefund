# ADR-03 — Execution State Strategy

> **Sprint 4 — Architecture Decision Record.** Quyết định chiến lược quản lý trạng thái Execution **trước khi** mở Epic 4.2 — Execution State Machine. Đây là tài liệu kiến trúc, **KHÔNG** phải implementation.

**Ngày:** 2026-07-01 · **Nhánh:** `main` · **Liên quan:** [ADR-01](ADR-01-execution-engine-architecture.md) · [ADR-02](ADR-02-execution-governance-model.md) · [ADP-01](ADP-01-decision-to-proceed.md) · Governance: [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md)

---

## 1. Trạng thái

**Status: Accepted · Codex Audit: PASS · Architecture Decision: Approved.**

- ADR-03 đã **Accepted** (tài liệu kiến trúc); **chưa** Implemented.
- **Epic 4.2 vẫn BLOCKED** — chưa mở (chờ quyết định triển khai riêng).
- **Execution Readiness vẫn NOT READY.**

## 2. Bối cảnh

- **Epic 4.1** đã tạo Execution Ticket Framework (ticket/state/guard/validator/builder/repo in-memory volatile) — PASS / CLOSED.
- **Epic 4.2** dự kiến xử lý state machine / lifecycle.
- Cần quyết định **trước**: pure state machine hay event-driven.
- Cần tách rõ **ticket state**, **execution lifecycle** và **execution engine**.

## 3. Quyết định đề xuất

- Giai đoạn Epic 4.2 **chỉ dùng Pure State Machine**.
- **Không** event-driven · queue · worker · scheduler · persistence DB · execution.
- Chỉ **validate transition** và **lifecycle rules**.

## 4. State Machine Strategy

| Hướng | Đặc điểm | Kết luận |
|---|---|---|
| **A. Pure State Machine** | predicate thuần · dễ test · không side-effect · không execute | ✅ **Phù hợp Epic 4.2** |
| **B. Event-driven State Machine** | cần event bus / queue / persistence · rủi ro cao hơn | ⛔ **Deferred** sang Epic/Sprint sau |

> **Kết luận:** Epic 4.2 **chỉ** được dùng **Pure State Machine**.

## 5. State Model đề xuất

`DRAFT · VALIDATED · READY · LOCKED · CANCELLED · EXPIRED · EXECUTING_PLACEHOLDER · SUCCEEDED_PLACEHOLDER · FAILED_PLACEHOLDER · ROLLBACK_REQUIRED_PLACEHOLDER · ROLLED_BACK_PLACEHOLDER`.

> ⚠️ Các state EXECUTING/SUCCEEDED/FAILED/ROLLBACK chỉ là **placeholder** — **không có execution thật**.

## 6. Transition Rules

**Hợp lệ:**
- DRAFT → VALIDATED
- VALIDATED → READY
- READY → LOCKED · READY → CANCELLED · READY → EXPIRED
- LOCKED → CANCELLED · LOCKED → EXPIRED

**Placeholder-only (không execute):**
- LOCKED → EXECUTING_PLACEHOLDER
- EXECUTING_PLACEHOLDER → SUCCEEDED_PLACEHOLDER
- EXECUTING_PLACEHOLDER → FAILED_PLACEHOLDER
- FAILED_PLACEHOLDER → ROLLBACK_REQUIRED_PLACEHOLDER
- ROLLBACK_REQUIRED_PLACEHOLDER → ROLLED_BACK_PLACEHOLDER

**Không hợp lệ:** DRAFT → READY · READY → DRAFT · FAILED → READY · SUCCEEDED → READY · CANCELLED → READY · EXPIRED → READY · mọi terminal state quay ngược.

## 7. Terminal States

- **Terminal:** CANCELLED · EXPIRED · SUCCEEDED_PLACEHOLDER · ROLLED_BACK_PLACEHOLDER.
- **Semi-terminal:** FAILED_PLACEHOLDER · ROLLBACK_REQUIRED_PLACEHOLDER.

> Terminal **không** được chuyển tiếp nếu không có ADR mới.

## 8. Retry Boundary

Epic 4.2: **chỉ thiết kế** retry boundary — **không retry thật**, không scheduler, không job queue.

Retry chỉ được xem xét **sau**: idempotency engine · audit log engine · kill switch · persistence strategy.

## 9. Rollback Boundary

Epic 4.2: **chỉ định nghĩa** rollback state — **không rollback thật**.

Phân loại rollback: reversible · compensating · manual recovery · forbidden rollback.

> ⚠️ **Finance rollback: AI KHÔNG được tự rollback finance.**

## 10. Idempotency Lifecycle

Mỗi ticket có `idempotencyKey`. Lifecycle: `created → reserved → consumed → expired → revoked`.

Epic 4.2: **chỉ validate lifecycle** — **chưa** persist idempotency, **chưa** distributed lock.

## 11. State Persistence Strategy

> Epic 4.2 **không persistence DB.**

Persistence chỉ xem xét ở Epic sau (vd Epic 4.3 hoặc ADR riêng), khi có: audit log · idempotency engine · transaction boundary · migration review.

## 12. Relation: Execution Ticket vs Execution Engine

| | Vai trò |
|---|---|
| **Execution Ticket** | Mô tả ý định được phép chuẩn bị · giữ snapshot · giữ state · **không execute**. |
| **Execution Engine** | Thực thi hành động thật · **chưa tồn tại** · **chưa được mở** · cần ADR/ADP/Epic riêng. |

## 13. Safety Invariants

`executionAllowed=false` cho tới khi có quyết định mới · no auto-transition · no execute · no write · no connector · no scheduler · no worker · no finance · no notification.

## 14. Governance

ADR-03 tuân thủ **GOV-01**; **không** định nghĩa lại Governance Rules — chỉ tham chiếu: **Rule 12** (Delivery Pipeline) · **Rule 13** (Execution Readiness) · **Rule 15** (Execution Gate) · **Rule 17** (Governance Source of Truth).

## 15. Consequences

- **Lợi ích:** dễ test · ít rủi ro · không side-effect · phù hợp incremental delivery.
- **Trade-off:** chưa có execution thật · chưa async orchestration · chưa persistence.

## 16. Decision

- ADR-03 chọn **Pure State Machine** cho Epic 4.2.
- Epic 4.2 **chỉ được mở sau:** ADR-03 Codex PASS · ADP hoặc quyết định triển khai riêng (nếu cần) · Commit/Tag/Push ADR-03.
- **Execution Readiness vẫn NOT READY.**

---

> 🧾 ADR-03 là tài liệu thiết kế. Hiện thực hóa state machine chỉ thực hiện ở Epic 4.2 sau khi ADR-03 PASS và Epic được mở. Execution Engine vẫn chưa tồn tại.
