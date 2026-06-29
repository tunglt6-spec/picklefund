# 07 — Enterprise Risk Register
## PickleFund V2.1 — Enterprise Governance Audit Prep

> Impact/Likelihood: Low/Medium/High. Review Frequency theo mức rủi ro.

---

## Risk Register

| Risk ID | Category | Impact | Likelihood | Mitigation | Owner | Review Frequency | Status |
|---|---|---|---|---|---|---|---|
| RISK-01 | Finance Isolation | High | Low | AI chỉ đọc RC1; cấm tính lại (SOT-02) | Finance Engine RC1 | Mỗi sprint | Open (mitigated) |
| RISK-02 | Memory leak tài chính | High | Low | Memory không lưu số liệu; on-demand RC1 | Memory Layer | Mỗi sprint | Open (design) |
| RISK-03 | Security: lộ prompt/key/PII | High | Low | Sanitize log + error; scope JWT | AI Harness | Mỗi sprint | Open (mitigated) |
| RISK-04 | Vendor lock-in (vector store) | Medium | Medium | `IVectorStore` abstraction | Memory Layer | Mỗi milestone | Open (design) |
| RISK-05 | Lint debt repo-wide | Low | High | Lint phạm vi hẹp; đợt dọn riêng | Claude Code | Mỗi sprint | Open |
| RISK-06 | `--fix` reformat file RC1 | Medium | Medium | Không chạy `npm run lint` toàn repo | Claude Code | Mỗi sprint | Mitigated |
| RISK-07 | Doc vượt trước code | Medium | Medium | Đồng bộ doc=code trước audit | Claude Code | Mỗi sprint | Mitigated |
| RISK-08 | Desktop/Mobile drift | High | Low | Hook/API/response dùng chung | AI Harness | Mỗi sprint | Open (mitigated) |
| RISK-09 | In-memory mất dữ liệu (telemetry/token/CB) | Low | Medium | Persistence Sprint 3 | AI Harness | Mỗi milestone | Accepted |
| RISK-10 | Embedding cost/latency (Sprint 2) | Medium | Medium | Cache + topK/minScore | Memory Layer | Mỗi sprint | Open (design) |

## Risk Rules

| Rule ID | Quy tắc |
|---|---|
| RR-01 | Risk High Impact phải có mitigation trước khi release |
| RR-02 | Không risk "Open" thiếu owner |
| RR-03 | Review register mỗi sprint/milestone theo tần suất |

## Cross References
- Handbook §6 · DoD `06` · Sprint2 Plan §3 Risks
