# 03 — Architecture Invariants
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial invariants (most critical baseline doc) |

---

## Purpose
Định nghĩa các **bất biến kiến trúc** — KHÔNG được thay đổi nếu không qua Architecture Review (`08_CHANGE_CONTROL_POLICY.md`).

## Scope
Áp dụng cho toàn AI Brain và mọi Agent/Sprint tương lai.

## Invariants

| ID | Rule | Rationale | Impact nếu vi phạm | Change Process |
|---|---|---|---|---|
| INV-01 | Finance Engine RC1 là Source of Truth tài chính DUY NHẤT | Tránh lệch số liệu | Sai tài chính, mất tin cậy | Architecture Review |
| INV-02 | AI KHÔNG tự tính tài chính (no SUM/balance/contribution/expense/carryForward) | Cách ly tài chính | Số liệu sai lệch | Architecture Review |
| INV-03 | Desktop & Mobile luôn dùng CHUNG AI Gateway + Memory API | Parity, không feature-gap | Phân nhánh nền tảng | Architecture Review |
| INV-04 | Memory Object luôn IMMUTABLE (deep freeze; update tạo object mới) | An toàn dữ liệu | Mutate ngầm, bug khó tả | Architecture Review |
| INV-05 | Index luôn là DERIVED view (rebuild từ Memory Object) | SoT rõ ràng | Mất dữ liệu nếu index hỏng | Architecture Review |
| INV-06 | Retrieval DETERMINISTIC (no LLM ranking ở baseline) | Tái lập, kiểm thử | Kết quả không ổn định | Architecture Review |
| INV-07 | Club isolation bắt buộc (scope clubId) | Multi-tenant | Rò rỉ cross-club | Architecture Review |
| INV-08 | User isolation bắt buộc (userId / clubId:userId) | Bảo mật cá nhân | Rò rỉ cross-user | Architecture Review |
| INV-09 | Agent KHÔNG bypass Memory API | Kiểm soát truy cập | Bỏ qua isolation/audit | Architecture Review |
| INV-10 | Agent KHÔNG truy cập DB trực tiếp | Tách tầng | Phá ranh giới, khó audit | Architecture Review |
| INV-11 | Mọi AI request qua AI Gateway (no bypass) | Telemetry/retry/CB | Mất quan sát/kiểm soát | Architecture Review |
| INV-12 | Config từ ConfigService/.env (no hardcode) | Vận hành an toàn | Sai cấu hình ngầm | Architecture Review |

## Cross References
`08_CHANGE_CONTROL_POLICY.md` · `04_SOURCE_OF_TRUTH_BASELINE.md` · `../ENTERPRISE_DEVELOPMENT_HANDBOOK.md`.

## Risks
- R: vi phạm invariant qua "hotfix nhanh" → bắt buộc Change Control, không ngoại lệ.

## References
ADR baseline (`07`), M2 certification, Handbook governance.
