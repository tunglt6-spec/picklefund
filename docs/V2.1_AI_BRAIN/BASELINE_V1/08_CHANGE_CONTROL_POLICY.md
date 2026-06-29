# 08 — Change Control Policy
## PickleFund V2.1 — AI Brain Baseline v1.0

**Version:** 1.0.0 · **Status:** APPROVED / LOCKED / OFFICIAL BASELINE · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial change control policy |

---

## Purpose
Định nghĩa quy trình thay đổi sau khi Baseline LOCKED.

## Scope
Áp dụng khi muốn thay đổi: AI Harness · Memory Core · Finance (boundary) · Gateway · Retrieval · Source of Truth · bất kỳ Invariant (`03`).

## Process (bắt buộc, tuần tự)

```
Architecture Review → Codex Approval → Claude Implementation → Codex Audit → Release
```

| Bước | Trách nhiệm | Output |
|---|---|---|
| Architecture Review | Đề xuất + đánh giá tác động invariant | Change proposal + impact |
| Codex Approval | Codex duyệt đề xuất | Approval record |
| Claude Implementation | Code trong scope đã duyệt | diff + tests |
| Codex Audit | Review độc lập | Audit PASS/FAIL |
| Release | Commit + tag + push (Release Gate Handbook) | Release record |

## Quy tắc
- KHÔNG thay đổi vùng baseline/invariant bằng hotfix bỏ qua review.
- Mỗi thay đổi cập nhật: invariant doc (nếu liên quan), ADR, Knowledge Base.

## Cross References
`03_ARCHITECTURE_INVARIANTS.md` · `../ENTERPRISE_DEVELOPMENT_HANDBOOK.md` (Release Gate) · `../HANDBOOK_REVIEW/03_RELEASE_GATE_MATRIX.md`.

## Risks
- R: bỏ qua review vì "gấp" → cấm; mọi thay đổi baseline đều qua process.

## References
Handbook Governance + Release Gate.
