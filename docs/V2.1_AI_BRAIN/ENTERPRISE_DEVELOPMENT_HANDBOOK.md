# PickleFund V2.1 — Enterprise Development Handbook

---

**Phiên bản:** 1.0.0
**Ngày:** 2026-06-29
**Phạm vi:** Chuẩn governance & lifecycle cho chương trình AI Brain (V2.1).
**Governance Version:** 1.0
**Trạng thái review:** CODEX ENTERPRISE GOVERNANCE AUDIT = PASS · **Handbook = LOCKED / APPROVED** (2026-06-29)

> Tài liệu này tổng hợp các quy tắc đã áp dụng thực tế qua Phase 0 → M1 → Sprint 1 → Sprint 1.1 → Sprint 1 Release → Sprint 2 Architecture Package. Nó KHÔNG thay thế các tài liệu kỹ thuật chi tiết (`01`–`06`, Sprint1*, Sprint2/*) mà liên kết tới chúng.

---

## 1. Governance

### 1.1 Development Governance
- Code do **Claude Code** triển khai theo scope sprint đã chốt; mọi thay đổi ngoài scope phải dừng và xin xác nhận.
- Mỗi đơn vị công việc đi qua: thiết kế → triển khai → checkpoint commit → **Codex Audit** → release.
- Không commit/push/tag khi chưa được chỉ thị rõ ràng.

### 1.2 Architecture Governance
- Kiến trúc được chốt bằng **Lock Certificate** trước khi triển khai (vd `Sprint2/MEMORY_ARCHITECTURE_LOCK.md`).
- Thay đổi kiến trúc phải qua ADR (mục 8) và review.

### 1.3 Release Governance
- Release tuân theo **Release Gate** (mục 9): Architecture → Claude → Audit → Checkpoint → Release → KB → Milestone → Sprint Close.
- Release commit + annotated tag + push chỉ sau khi Codex audit PASS.

### 1.4 Knowledge Governance
- `KNOWLEDGE_BASE.md` là **append-only**; không xoá lịch sử.
- Mỗi sprint đóng phải append block trạng thái + lessons learned + ADR + release metadata.

## 2. Source of Truth

| Domain | Source of Truth | Quy tắc |
|---|---|---|
| Finance | **Finance Engine RC1** | AI chỉ ĐỌC summary; không `SUM()`/`balance =`/tính lại |
| Memory | **Memory Layer** (Sprint 2 design) | Không lưu số liệu tài chính; đọc RC1 on-demand |
| AI Harness | **AIGatewayService** | Mọi request AI đi qua Gateway, không bypass |
| Configuration | **`.env` / ConfigService** | Không hardcode; fail-fast khi thiếu (production) |

## 3. Desktop / Mobile Consistency
- Một AI Gateway, một API, một response model, một hook dùng chung.
- UI có thể khác về trình bày; **API/UX flow/permission/finance/memory phải đồng nhất**.
- Cấm: feature-gap, endpoint riêng, response model lệch giữa hai nền tảng.

## 4. Development Lifecycle

```
Architecture (Lock) → Claude Code (implement) → Codex Audit
   → Checkpoint Commit → Release (tag/push) → Knowledge Base → Milestone → Sprint Close
```

| Bước | Trách nhiệm | Bằng chứng |
|---|---|---|
| Architecture | Thiết kế + Lock Certificate | `*_LOCK.md` |
| Claude Code | Triển khai trong scope | diff + tests |
| Codex Audit | Review độc lập | audit result |
| Checkpoint | Commit snapshot để audit | `checkpoint(...)` commit |
| Release | Commit + tag + push | `release(...)` + tag |
| Knowledge Base | Append KB | `KNOWLEDGE_BASE.md` |
| Sprint Close | Close report | `SPRINT*_CLOSE_REPORT.md` |

## 5. Security
- Không log: prompt, response, API key, Authorization, JWT, token, secret, PII.
- Lỗi provider được sanitize (chỉ status/kind, không body).
- Scope dữ liệu theo JWT principal; không tin body spoof.

## 6. Risk Management
- Duy trì Risk Register (xem `HANDBOOK_REVIEW/07_ENTERPRISE_RISK_REGISTER.md`).
- Mỗi risk có Impact/Likelihood/Mitigation/Owner/Review Frequency/Status.

## 7. Definition of Done (tổng quát)
Build PASS · Test PASS · Desktop/Mobile parity · Codex Audit PASS · Finance Isolation verified · Memory rules giữ · KB updated · Release gate thoả.

## 8. Architecture Decision Records (ADR)
- ADR ghi tại tài liệu kiến trúc tương ứng (vd AD-S1-*, AD-S2-*).
- Mỗi ADR: ID · Quyết định · Lý do. Thay đổi ADR phải qua review + cập nhật Lock.

## 9. Release Gate
- Không bước nào được bỏ qua. Chi tiết ma trận tại `HANDBOOK_REVIEW/03_RELEASE_GATE_MATRIX.md`.

## 10. Cross References
- Charter `01_PROJECT_CHARTER.md` · Architecture `02_AI_ARCHITECTURE_SPECIFICATION.md` · Harness `03_AI_HARNESS_DESIGN.md` · Prompt `05_PROMPT_ENGINE_SPECIFICATION.md` · Memory `06_MEMORY_LAYER_SPECIFICATION.md`
- Sprint 1: `Sprint1_*`, `Sprint1.1_*`, `SPRINT1_CLOSE_REPORT.md` · KB `KNOWLEDGE_BASE.md`
- Sprint 2 design: `Sprint2/01..08`, `MEMORY_ARCHITECTURE_LOCK.md`

---

*PickleFund V2.1 — Enterprise Development Handbook v1.0.0 (chờ Codex Governance Audit)*
