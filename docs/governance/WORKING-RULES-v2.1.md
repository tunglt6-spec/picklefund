# Working Rules v2.1 — Increment / Freeze Governance Rules

> **Working Rules bổ sung cho quy trình vận hành** (operational). **KHÔNG** phải Constitution mới, **KHÔNG** phải Amendment mới, **KHÔNG** định nghĩa lại Governance Rules. Bổ trợ [GOV-01](GOV-01-project-governance-baseline-v2.1.md) (Single Source of Truth) — chỉ tham chiếu, không thay thế. Áp dụng cho Design Program (UDP-01/VDS-01/UIP/UI) và mọi increment gated.

**Phiên bản:** v2.1 · **Ngày:** 2026-07-01 · **State:** ✅ Accepted / Codex PASS / CLOSED

---

## Rule 1 — Increment Closure Rule

Mọi increment phải hoàn thành đủ chuỗi trước khi mở baseline/freeze kế tiếp:

```
Implementation → Codex Audit → PASS → Commit → Tag → Push → CLOSED → Working Tree Clean
```

- Không mở increment/freeze kế tiếp khi increment hiện tại chưa **CLOSED** + **Working Tree Clean**.

## Rule 2 — Clean Working Tree Rule

Trước mọi Codex Audit:

- `staged` = NONE ngoài scope.
- `modified` = NONE ngoài scope.
- Untracked generated artifacts phải được **loại khỏi package** (không stage).
- **Không trộn** docs/code của increment khác vào working tree đang audit.

**Cho phép bỏ qua (không stage/commit):**

- `backend/coverage/**`
- `.claude/settings.local.json`
- generated artifacts (không stage)

## Rule 3 — Freeze Dependency Rule

**Không** mở hoặc Closing một Freeze khi còn increment phụ thuộc chưa đóng.

> Ví dụ: **UI-07 Increment 2 phải CLOSED trước DESIGN-02 Closing.** DESIGN-02 (Product Design Baseline Freeze) không được Closing khi UI-07 overall chưa CLOSED.

## Rule 4 — Documentation Lifecycle Rule

Mỗi closing phải **đồng bộ** các tài liệu lifecycle liên quan:

- `docs/README.md`
- `docs/PROJECT_STATUS.md`
- `docs/technical-baseline-v2.0/06-roadmap-next.md` (Roadmap)
- `UDP-01` Rollout (nếu có lifecycle liên quan)
- Golden Screens (nếu thuộc UI)

> Không để nguồn nào stale (vd rollout ghi BLOCKED trong khi đã CLOSED). Grep xác nhận trước khi báo "READY FOR CODEX AUDIT".

## Rule 5 — Transaction Boundary Rule

Một package (commit) chỉ chứa **một transaction** (một increment/một mục đích).

> Ví dụ: **UI-07 Increment 2 package** chỉ gồm: `AIWorkspace.tsx` · `PROJECT_STATUS.md` · Golden README. **Không trộn** DESIGN-02 / docs freeze / increment khác vào cùng package.

## Rule 6 — Audit Scope Isolation

- Một **Codex Audit** chỉ audit **một transaction**.
- Nếu working tree có file **ngoài scope** → **FAIL vì Scope Isolation** (không đánh giá sai implementation).
- Report phải **liệt kê rõ**: **in-scope** · **out-of-scope** · **generated artifacts**.

## Rule 7 — Lifecycle Synchronization Matrix

Trước mọi **Commit** phải đồng bộ (matrix):

| Nguồn | Đồng bộ khi |
|---|---|
| `README.md` | Mọi closing / thay đổi lifecycle |
| `PROJECT_STATUS.md` | Mọi closing / thay đổi trạng thái |
| Roadmap (`06-roadmap-next.md`) | Mọi closing Design/Execution |
| `UDP-01` Rollout | Khi liên quan lifecycle UIP/UI |
| Pattern/UI hiện hành (UIP-x / UI-x file · Golden Screens) | Khi thuộc increment đó |

> Nếu **chưa đồng bộ** đủ các nguồn liên quan → **không commit**.

---

## Pre-Codex Audit Checklist

- [ ] Build PASS · Lint PASS · Shared Lint PASS (nếu là code increment)
- [ ] Working tree sạch ngoài scope (Rule 2)
- [ ] Chỉ một transaction trong package (Rule 5 / Rule 6)
- [ ] Đã liệt kê in-scope / out-of-scope / generated artifacts
- [ ] Increment phụ thuộc đã CLOSED nếu là Freeze (Rule 3)
- [ ] Loading / Empty / Error (nếu UI — Amendment #01)
- [ ] Source of Truth / AI Safety / Execution Boundary tuân thủ
- [ ] Chưa đạt → **không** ghi "READY FOR CODEX AUDIT"

## Pre-Commit Checklist

- [ ] Codex Audit đã PASS
- [ ] Lifecycle Synchronization Matrix (Rule 7) đã đồng bộ
- [ ] `git add` đúng scope (không `backend/coverage/**` · `.claude/settings.local.json` · artifacts)
- [ ] Không trộn transaction khác (Rule 5)
- [ ] Commit message đúng loại/scope
- [ ] Fast-forward (0 behind origin) trước push

## Transaction Boundary Checklist

- [ ] Package = một increment/một mục đích
- [ ] Danh sách file commit khớp scope đã audit
- [ ] Không có file increment khác lẫn trong `git add`
- [ ] Generated artifacts đứng ngoài commit
- [ ] Tag/commit message phản ánh đúng transaction

---

## Quan hệ với GOV-01 & Design Baseline

- **Governance Source of Truth:** [GOV-01](GOV-01-project-governance-baseline-v2.1.md) — Working Rules v2.1 chỉ **bổ trợ vận hành**, không định nghĩa lại rule quản trị.
- **Design/Visual SoT:** UDP-01 / VDS-01 — không đổi.
- Working Rules v2.1 **không** thay đổi Execution Program (UNCHANGED), Epic 4.2 (BLOCKED), Execution Readiness (NOT READY).

## Out of Scope

Working Rules v2.1 **KHÔNG**: tạo Constitution/Amendment mới · định nghĩa lại Governance/Design/Visual Rules · mở Execution/Epic 4.2/AI Execution · thay đổi API/DB/frontend/backend.

---

> 🧾 Working Rules v2.1 (✅ Accepted / Codex PASS / CLOSED) — 7 rule: Increment Closure · Clean Working Tree · Freeze Dependency · Documentation Lifecycle · Transaction Boundary · Audit Scope Isolation · Lifecycle Synchronization Matrix — kèm Pre-Codex Audit / Pre-Commit / Transaction Boundary Checklist. Bổ trợ GOV-01; sau Codex PASS + Commit/Tag/Push trở thành working rule chính thức cho quy trình increment/freeze.
