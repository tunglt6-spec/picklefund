# 01 — Handbook Review Checklist
## PickleFund V2.1 — Enterprise Governance Audit Prep

> Phục vụ Codex review `ENTERPRISE_DEVELOPMENT_HANDBOOK.md`. Mỗi mục: Requirement · Current Status · Expected Result · Review Criteria.

---

## A. Governance

### A.1 Development Governance
- **Requirement:** Code đi qua design → implement → checkpoint → audit → release; không vượt scope.
- **Current Status:** Áp dụng qua Sprint 1 & 1.1 (checkpoint commits + Codex audit).
- **Expected Result:** Mọi thay đổi truy vết được tới scope sprint.
- **Review Criteria:** Có checkpoint commit trước mỗi audit; không thay đổi ngoài scope.

### A.2 Architecture Governance
- **Requirement:** Kiến trúc chốt bằng Lock Certificate trước implement.
- **Current Status:** `Sprint2/MEMORY_ARCHITECTURE_LOCK.md` = LOCKED.
- **Expected Result:** Không code trước khi kiến trúc LOCKED + audit.
- **Review Criteria:** Lock tồn tại; ADR đầy đủ.

### A.3 Release Governance
- **Requirement:** Release theo Release Gate; tag/push chỉ sau audit PASS.
- **Current Status:** `v2.1-sprint1` phát hành sau Codex Final Audit PASS.
- **Expected Result:** Tag annotated + KB cập nhật + close report.
- **Review Criteria:** Tag trỏ commit đã audit; KB/close report tồn tại.

### A.4 Knowledge Governance
- **Requirement:** KB append-only, không xoá lịch sử.
- **Current Status:** `KNOWLEDGE_BASE.md` append-only.
- **Expected Result:** Mỗi sprint append block.
- **Review Criteria:** Không có nội dung bị xoá; có lessons learned + ADR.

## B. Source of Truth

| Mục | Requirement | Current Status | Expected Result | Review Criteria |
|---|---|---|---|---|
| Finance | AI chỉ đọc RC1 | `ai.service.getFinanceSummary` đọc `FundPeriodsService.summary` | 0 phép tính tài chính trong AI | grep không có `SUM/balance =` trong AI |
| Memory | Không lưu tài chính | Sprint 2 design (chưa code) | Memory không chứa số liệu tài chính | Checklist Finance Isolation `08` Sprint2 |
| AI Harness | Mọi request qua Gateway | `POST /ai/chat` → Gateway | Không bypass Gateway | Route đi qua `AIGatewayService` |
| Configuration | Không hardcode + fail-fast | `AIConfigService` env-driven | Thiếu config → fail (prod) | `.env.example` đầy đủ; `validateConfig()` |

## C. Desktop / Mobile

| Mục | Requirement | Current Status | Expected Result | Review Criteria |
|---|---|---|---|---|
| UI | Trình bày có thể khác | Hook chung | Không feature-gap | parity matrix `05` |
| UX | Flow đồng nhất | `useAIGateway` chung | Cùng loading/empty/permission | matrix `05` |
| API | Cùng endpoint | `/ai/*` chung | Không endpoint riêng | matrix `05` |
| Feature parity | Bắt buộc | Verified Sprint 1 | Không lệch tính năng | matrix `05` |

## D. Development Lifecycle

| Bước | Requirement | Current Status | Expected | Review Criteria |
|---|---|---|---|---|
| Architecture | Lock trước code | LOCKED (Sprint2) | — | Lock tồn tại |
| Claude Code | Trong scope | Sprint 1/1.1 | — | diff khớp scope |
| Codex Audit | Review độc lập | PASS Sprint 1.1 | — | audit result |
| Checkpoint | Commit snapshot | `checkpoint(...)` | — | commit tồn tại |
| Release | Tag/push sau audit | `v2.1-sprint1` | — | tag annotated |
| Sprint Close | Close report | `SPRINT1_CLOSE_REPORT.md` | — | report tồn tại |

## E. Security
- **Requirement:** Không log prompt/response/key/JWT/PII; sanitize lỗi provider.
- **Current Status:** Gateway/Router log đã sanitize; `AIProviderError` không kèm body.
- **Expected Result:** 0 rò rỉ nhạy cảm trong log/API.
- **Review Criteria:** Kiểm tra log paths + error mapping.

## F. Risk
- **Requirement:** Risk Register đầy đủ trường + review định kỳ.
- **Current Status:** `07_ENTERPRISE_RISK_REGISTER.md`.
- **Expected Result:** Mỗi risk có mitigation + owner + status.
- **Review Criteria:** Không risk "Open" thiếu mitigation.

## G. ADR
- **Requirement:** Mỗi quyết định kiến trúc có ID/Quyết định/Lý do.
- **Current Status:** AD-S1-* (6) + AD-S2-* (23).
- **Expected Result:** ADR truy vết được.
- **Review Criteria:** ADR khớp code/thiết kế.

## H. Definition of Done
- **Requirement:** DoD theo cấp (Epic/Sprint/Milestone/RC/Prod).
- **Current Status:** `06_DEFINITION_OF_DONE_MATRIX.md`.
- **Expected Result:** Mỗi cấp có checklist rõ.
- **Review Criteria:** DoD đo lường được.

## I. Release Gate
- **Requirement:** Không bỏ bước nào.
- **Current Status:** `03_RELEASE_GATE_MATRIX.md`.
- **Expected Result:** Gate tuần tự, có bằng chứng mỗi bước.
- **Review Criteria:** Mỗi gate có artifact.

## Cross References
- Handbook gốc: `../ENTERPRISE_DEVELOPMENT_HANDBOOK.md`
- `02_GOVERNANCE_MATRIX.md`, `03_RELEASE_GATE_MATRIX.md`, `04_SOURCE_OF_TRUTH_MATRIX.md`, `05`, `06`, `07`, `08`, `09`
