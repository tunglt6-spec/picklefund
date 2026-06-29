# 02 — Governance Matrix
## PickleFund V2.1 — Enterprise Governance Audit Prep

> RACI-style cho từng area. "Approver" cho release/architecture là **Codex** (qua audit) + chủ dự án.

---

## Governance Matrix

| Area | Owner | Reviewer | Approver | Source |
|---|---|---|---|---|
| Claude Code (implementation) | Claude Code | Codex | Chủ dự án | scope sprint |
| Codex (audit) | Codex | Chủ dự án | Chủ dự án | audit instructions `08` |
| Finance Engine | Finance Engine RC1 | Codex | Chủ dự án | `FinancialCalculatorService` (RC1) |
| Memory Layer | Memory Layer (design) | Codex | Chủ dự án | `Sprint2/*` |
| AI Harness | AI Gateway | Codex | Chủ dự án | `backend/src/ai/harness/*` |
| Prompt Engine | Prompt Engine spec | Codex | Chủ dự án | `05_PROMPT_ENGINE_SPECIFICATION.md` |
| Release | Claude Code | Codex | Chủ dự án | Release Gate `03` |
| Knowledge Base | Claude Code | Codex | Chủ dự án | `KNOWLEDGE_BASE.md` |

## Governance Rules

| Rule ID | Quy tắc |
|---|---|
| GOV-01 | Không commit/push/tag khi chưa có chỉ thị rõ ràng |
| GOV-02 | Mọi release phải qua Codex audit PASS |
| GOV-03 | Kiến trúc phải LOCKED trước khi implement |
| GOV-04 | KB append-only, không xoá lịch sử |
| GOV-05 | Finance Engine RC1 là source of truth tài chính duy nhất |
| GOV-06 | Một AI Gateway / API / hook dùng chung Desktop+Mobile |
| GOV-07 | Config từ `.env`, không hardcode, fail-fast (prod) |
| GOV-08 | Không log secret/PII/prompt/response |
| GOV-09 | Mỗi quyết định kiến trúc có ADR |
| GOV-10 | Thay đổi ngoài scope → dừng + xin xác nhận |

## Cross References
- Handbook §1 Governance · Release Gate `03` · Source of Truth `04`
