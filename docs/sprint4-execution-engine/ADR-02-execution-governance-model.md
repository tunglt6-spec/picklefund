# ADR-02 — Execution Governance Model

> **Sprint 4 — Architecture Decision Record.** Xác định triết lý, giới hạn và mô hình quản trị Execution của PickleFund AI. Là **điều kiện bắt buộc** trước khi được phép mở **Epic 4.1 — Execution Ticket Framework**. Đây **chỉ là tài liệu quyết định** — không triển khai execution.

**Phiên bản:** 1.0 (accepted) · **Ngày:** 2026-06-30 · **Nhánh:** `main` · **Liên quan:** [ADR-01](ADR-01-execution-engine-architecture.md)

---

## 1. Trạng thái

**Status: Accepted · Codex Audit: PASS · Architecture Decision: Approved.** (Đã Accepted; **chưa** Implemented.)

> ⚠️ Việc tài liệu được chấp nhận (Accepted) **không làm thay đổi trạng thái Execution Readiness** và **không cho phép execution**. **Execution Readiness = NOT READY**; Sprint 4 implementation **không** Full Approved (xem §9 và §19).

## 2. Bối cảnh

- **Sprint 3** đã hoàn thành AI Governance Layer (Epic 3.1–3.5 PASS): Understand → Organization Intelligence → Workflow Planning → Action Proposal → Human Approval — tất cả **READ-ONLY**.
- **ADR-01** đã thiết kế kiến trúc Execution Engine (pipeline, ticket, audit, rollback, kill switch…).
- **ADR-02** cần quyết định **mô hình quản trị** Execution trước khi viết code Epic 4.1.
- Execution là vùng **rủi ro cao nhất** — cần định nghĩa rõ cấp độ, quyền, phê duyệt, giới hạn và điều kiện sẵn sàng.

## 3. Mục tiêu (ADR-02 phải trả lời)

Maika được execute ở mức nào · action nào được phép/bị cấm trong tương lai · Human Approval đã đủ chưa · approval hết hạn thế nào · ticket có dùng lại không · kill switch hoạt động ra sao · retry/rollback thế nào · audit log bất biến ra sao · connector nào được tham gia · Finance Action có được execute không · **khi nào Execution Readiness mới chuyển NOT READY → READY**.

## 4. Execution Maturity Level

| Level | Tên | Mô tả |
|---|---|---|
| **Level 0** | Read Only | Chỉ đọc. |
| **Level 1** | Proposal | Đề xuất action (Epic 3.4). |
| **Level 2** | Dry Run | Mô phỏng, không thực thi (hiện tại). |
| **Level 3** | Human Approved Execute | Thực thi sau khi con người duyệt — **giới hạn rất hẹp**. |
| **Level 4** | Autonomous Execute | Tự động thực thi — **BỊ CẤM**. |

- **Hiện tại: Level 2.**
- **Mục tiêu Sprint 4 (nếu được mở):** chỉ **xem xét** tiến tới **Level 3** với allowlist rất hẹp.
- **Level 4 (Autonomous Execution) BỊ CẤM** — không được mở.

## 5. Action Allowlist / Denylist

### A. Có thể xem xét trong Sprint 4 (controlled execution, non-destructive, non-finance)
- refresh dashboard cache
- generate report
- export PDF
- create read-only snapshot
- reindex vector
- sync non-finance cache
- create execution audit record
- mark internal execution ticket state

### B. BỊ CẤM trong Sprint 4
- delete member · delete receipt · delete expense
- update finance · create finance transaction · transfer money
- send email · send telegram · create notification
- external workflow automation
- change user role · change permission
- delete club data · bulk destructive operation

### C. Cần ADR riêng
- finance write · payment
- email/telegram sending · notification sending
- external connector execution · automation platform execution
- member deletion · role/permission change

## 6. Human Approval Model

- Mọi execution **phải có Human Approval**. **Không auto approval.**
- **Không approve-and-execute trong cùng một request.**
- Approval tạo **trước**, execution ticket tạo **sau**.
- Approval phải có **snapshot bất biến**; có **thời hạn**; có thể **revoke**.

**Thời hạn approval đề xuất:**

| Risk | Thời hạn |
|---|---|
| Low | 30 phút |
| Medium | 15 phút |
| High | 5 phút |
| **Critical** | **Không cho execute trong Sprint 4** |

## 7. Second Confirmation Model

Một số action cần **xác nhận lần hai** ngay trước execution. Áp dụng cho:
- medium risk trở lên
- action có connector
- action ảnh hưởng nhiều bản ghi
- action khó rollback

## 8. Execution Ticket Rule

- Mỗi approval chỉ sinh **tối đa một execution ticket active**.
- Ticket **one-time use**, có **expiration**, **không replay**.
- Ticket phải có **idempotencyKey**.
- Ticket gắn với **clubId, requestedBy, approvedBy**.
- **Không đổi actionType** sau khi tạo ticket.

## 9. Execution Readiness Definition

Điều kiện **tối thiểu** để chuyển Execution Readiness **NOT READY → READY**:

- ADR-01 PASS
- ADR-02 PASS
- Epic 4.1 Execution Ticket Framework PASS
- Epic 4.2 Audit Log Engine PASS
- Epic 4.3 Idempotency Engine PASS
- Epic 4.4 Permission/Safety Re-check PASS
- Epic 4.5 Kill Switch PASS
- Epic 4.6 Connector Boundary PASS (nếu có connector)
- Sprint 4 Governance Audit PASS
- **Không còn Critical/High finding**
- PROJECT_STATUS và Technical Baseline **đồng bộ**

> ⚠️ Thiếu **bất kỳ** điều kiện nào → **Execution Readiness = NOT READY**.

## 10. Kill Switch Governance

Bốn cấp: **Global · Club-level · Action-type · Connector-level**.

Khi kill switch **bật**: block execution; **vẫn cho phép** read-only · dry-run · audit review.

## 11. Retry / Rollback Governance

**Retry:** chỉ action idempotent · giới hạn số lần · exponential backoff · **không retry finance write** · **không retry destructive action**.

**Rollback (phân loại):** reversible · irreversible · compensating action · manual recovery.

> ⚠️ **AI không được tự rollback finance.**

## 12. Audit Log Immutability

Audit log (tương lai) phải: **append-only · không cho sửa** · timestamp · actor · clubId · approval snapshot · permission/safety decision · before/after reference (nếu phù hợp) · execution result · error (nếu fail).

> Có thể **đề xuất** hash/chaining để chống giả mạo — nhưng **chưa implement** trong ADR này.

## 13. Connector Governance

Connector: Email · Telegram · Notification · External API · Make/n8n/Zapier · Payment · File export · Report export.

Mỗi connector phải có: **permission · rate limit · retry rule · timeout · failure handling · audit · kill switch**.

> Connector execution **không được mở chung chung**. Mỗi connector nguy hiểm cần **Epic/ADR riêng**.

## 14. Finance Execution Policy

**Finance write BỊ CẤM trong Sprint 4 (mặc định).** AI **không** được: tạo phiếu thu · tạo phiếu chi · sửa contribution · sửa expense · sửa receipt · quyết toán · chuyển tiền · tự approve tài chính.

Finance execution trong tương lai **cần**: ADR riêng · multi-approval · immutable audit · manual confirmation · rollback/compensating strategy · **Finance Engine ownership** · Codex audit riêng.

> **Finance Engine vẫn là Source of Truth.**

## 15. PII / Data Safety Policy

- **Không** raw PII trong ticket/audit/log/connector payload.
- Payload gửi connector phải **sanitize**.
- **Không** log raw email/phone/CCCD/bank.
- **Không** lưu raw objective nếu chứa PII — chỉ lưu **reference hoặc redacted form**.

## 16. Emergency Stop

Phải **stop ngay** khi: permission mismatch · cross-club risk · repeated failure · connector timeout bất thường · sensitive data leak · finance risk · audit log failure · idempotency conflict · kill switch enabled.

## 17. Sprint 4 Scope đề xuất (chưa triển khai)

| Epic | Nội dung |
|---|---|
| Epic 4.1 | Execution Ticket Framework |
| Epic 4.2 | Audit Log Engine |
| Epic 4.3 | Idempotency Engine |
| Epic 4.4 | Permission & Safety Re-check |
| Epic 4.5 | Kill Switch Engine |
| Epic 4.6 | Controlled Execution Pilot (allowlist rất hẹp, nếu đủ điều kiện) |
| Sprint 4 Final Governance Audit | Gate cuối |

> Chỉ là **đề xuất thứ tự** — chưa Epic nào được mở.

## 18. Non-goals

ADR-02 **KHÔNG** triển khai: Execution Engine · API write · DB write · connector execution · finance execution · notification/email/telegram sending · automation · scheduler · job queue · background worker · payment · autonomous agent.

## 19. Quyết định đề xuất

- PickleFund chỉ **xem xét** tiến từ **Level 2 → Level 3**.
- **Level 4 (Autonomous Execution) BỊ CẤM.**
- Sprint 4 nếu mở **chỉ** triển khai Execution Framework theo **allowlist rất hẹp**.
- **Finance execution bị cấm mặc định.**
- Connector execution cần **ADR/Epic riêng**.
- **Execution Readiness vẫn NOT READY sau ADR-02.**
- **Epic 4.1 chỉ được mở sau Codex Audit PASS và quyết định triển khai riêng.**

---

> 🧾 ADR-02 là tài liệu quản trị. Mọi hiện thực hóa **chỉ** được thực hiện ở các Epic Sprint 4 sau khi ADR-02 PASS và Epic tương ứng được mở. **Maika vẫn chưa được phép execute.**
