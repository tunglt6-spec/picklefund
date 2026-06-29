# 08 — Codex Audit Instructions
## PickleFund V2.1 — Enterprise Governance Audit Prep

> Hướng dẫn Codex thực hiện **Enterprise Governance Audit** cho Handbook. CHỈ REVIEW.

---

## Phạm vi audit (10 trục)

| # | Trục | Đối chiếu |
|---|---|---|
| 1 | Governance | Handbook §1 · `02_GOVERNANCE_MATRIX.md` |
| 2 | Architecture | Lock Certificates · `02_AI_ARCHITECTURE_SPECIFICATION.md` |
| 3 | Lifecycle | Handbook §4 · `03_RELEASE_GATE_MATRIX.md` |
| 4 | Release | Release Gate `03` · tag `v2.1-sprint1` |
| 5 | Knowledge Base | `KNOWLEDGE_BASE.md` (append-only) |
| 6 | Desktop/Mobile | `05_DESKTOP_MOBILE_CONSISTENCY_MATRIX.md` |
| 7 | Source of Truth | `04_SOURCE_OF_TRUTH_MATRIX.md` |
| 8 | Security | Handbook §5 |
| 9 | Risk | `07_ENTERPRISE_RISK_REGISTER.md` |
| 10 | Scalability | Abstraction (vector store, provider manager), in-memory→persistence path |

## Quy tắc bắt buộc cho Codex (audit-only)

| Rule ID | Quy tắc |
|---|---|
| AUD-01 | KHÔNG sửa code |
| AUD-02 | KHÔNG build |
| AUD-03 | KHÔNG commit |
| AUD-04 | KHÔNG push |
| AUD-05 | KHÔNG tag/release |
| AUD-06 | CHỈ review + ghi nhận findings |

## Định dạng kết quả mong đợi

- Mỗi trục: PASS / FAIL / OBSERVATION.
- Findings: mức độ (Blocker/Major/Minor) + tham chiếu file/dòng.
- Kết luận tổng: PASS → cho phép đổi Lock Certificate sang LOCKED.

## Cross References
- Tất cả tài liệu `01`–`07`, `09` · Handbook gốc
