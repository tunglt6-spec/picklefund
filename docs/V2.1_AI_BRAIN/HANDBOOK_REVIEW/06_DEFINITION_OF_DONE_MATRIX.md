# 06 — Definition of Done Matrix
## PickleFund V2.1 — Enterprise Governance Audit Prep

> DoD theo từng cấp. ✅ = bắt buộc · — = không áp dụng.

---

## DoD Matrix

| Checklist | Epic | Sprint | Milestone | RC | Production |
|---|---|---|---|---|---|
| Build PASS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Test PASS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Desktop parity | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile parity | ✅ | ✅ | ✅ | ✅ | ✅ |
| Codex Audit PASS | — | ✅ | ✅ | ✅ | ✅ |
| Finance Isolation verified | ✅ | ✅ | ✅ | ✅ | ✅ |
| Memory rules giữ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Knowledge Base updated | — | ✅ | ✅ | ✅ | ✅ |
| Release (tag/push) | — | ✅ | ✅ | ✅ | ✅ |
| Security review | — | ✅ | ✅ | ✅ | ✅ |
| Rollback plan | — | — | ✅ | ✅ | ✅ |

## DoD Rules

| Rule ID | Quy tắc |
|---|---|
| DOD-01 | Không đóng cấp nào nếu Build/Test chưa PASS |
| DOD-02 | Sprint trở lên bắt buộc Codex Audit PASS |
| DOD-03 | Finance Isolation verified ở MỌI cấp |
| DOD-04 | RC/Production phải có rollback plan |
| DOD-05 | KB cập nhật trước khi đóng sprint/milestone |

## Cross References
- Handbook §7 · Release Gate `03` · Checklist `01`
