# DESIGN-02 — Product Design Baseline v2.1 Freeze

> **Đề xuất Product Design Baseline Freeze** — DESIGN-02 là tài liệu **đề xuất** đóng băng Product Design Baseline v2.1. **KHÔNG** phải Constitution mới, **KHÔNG** phải Amendment mới. **Phụ thuộc UI-07 đã được giải quyết:** UI-07 Increment 1 ✅ CLOSED, Increment 2 ✅ CLOSED → **UI-07 overall ✅ CLOSED**. **Freeze và Maintenance Mode CHỈ có hiệu lực sau khi:** (1) DESIGN-02 Codex **Final Audit** PASS; (2) DESIGN-02 Commit/Tag/Push hoàn tất. Khi hiệu lực, mọi thay đổi UI tương lai phải qua **RFC → UIP → Codex Audit → PASS → Implementation → Audit → Release**. Tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md); tham chiếu [UDP-01](UDP-01-unified-product-design-constitution.md) / [VDS-01](VDS-01-visual-design-system-v2.1.md) / [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md).
>
> ⚠️ **DESIGN-02 CHƯA có hiệu lực** — chưa phải baseline freeze chính thức, **không** được dùng làm Maintenance Mode gate cho tới khi được Closing (sau UI-07 Increment 2 Closing + DESIGN-02 Codex PASS + Commit/Tag/Push).

**Phiên bản:** v2.1 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

---

## 1. Status

- **Type:** Product Design Baseline Freeze (không phải Constitution/Amendment)
- **Version:** v2.1
- **Status:** ✅ **Final Codex Audit PASS / CLOSED**
- **State:** ✅ **EFFECTIVE** — Product Design Baseline v2.1 **FROZEN** · Design Program v2.1 **COMPLETE** · **Maintenance Mode ACTIVE**

> DESIGN-02 freeze baseline hiện có; không định nghĩa lại rule/tokens/components/visual.
> - **DESIGN-02 ĐÃ có hiệu lực** (Final Codex Audit PASS + Commit/Tag/Push — Option B, không rewrite lịch sử).
> - Product Design Baseline v2.1 chính thức **FROZEN**; Design Program v2.1 **COMPLETE**.
> - **Maintenance Mode ACTIVE:** mọi thay đổi UI phải qua RFC → UIP → Codex Audit → PASS → Implementation → Audit → Release.
> - Mốc premature trước (commit `3eb6b59b` + tag `v2.1-design02-product-design-baseline-freeze`) giữ nguyên như **historical milestone**; Final Closing dùng tag mới `v2.1-design02-product-design-baseline-freeze-final`.

## 2. Freeze Scope — Constitution & Amendments

Đóng băng (frozen, chỉ tham chiếu — không sửa rải rác):

- **[UDP-01](UDP-01-unified-product-design-constitution.md)** — Unified Product Design Constitution (Design Source of Truth) ✅
- **[UDP-01 Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md)** — Workspace State DoD (Loading/Empty/Error) ✅
- **[UDP-01 Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md)** — Design Pattern First Rule ✅
- **[VDS-01](VDS-01-visual-design-system-v2.1.md)** — Visual Design System v2.1 (Visual Constitution) ✅

## 3. Freeze Patterns — UIP-x

Đóng băng các Design Pattern Document:

- **[UIP-03](UIP-03-member-workspace-pattern.md)** — Member Workspace Pattern ✅
- **[UIP-04](UIP-04-finance-workspace-pattern.md)** — Finance Workspace Pattern ✅
- **[UIP-05](UIP-05-reports-center-pattern.md)** — Reports Center Pattern ✅
- **[UIP-06](UIP-06-tournament-center-pattern.md)** — Tournament Center Pattern ✅
- **[UIP-07](UIP-07-ai-workspace-pattern.md)** — AI Workspace Pattern ✅

(Nền tảng: [DASH-01](DASH-01-enterprise-dashboard-pattern.md) — Enterprise Dashboard Pattern; [UIP-03..07] kế thừa.)

## 4. Freeze Enterprise UI — UI-x

Phạm vi freeze các màn enterprise (freeze thực sự có hiệu lực sau khi DESIGN-02 Closing):

- **UI-02** — Dashboard 4.0 (Golden Reference) — ✅ **CLOSED**
- **UI-03** — Member Management Workspace — ✅ **CLOSED**
- **UI-04** — Finance Workspace — ✅ **CLOSED**
- **UI-05** — Reports Center — ✅ **CLOSED**
- **UI-06** — Tournament Center — ✅ **CLOSED**
- **UI-07** — AI Workspace:
  - Increment 1 (read-only) — ✅ **CLOSED** (tag `v2.1-ui07-ai-workspace-readonly`)
  - Increment 2 (Human Approval) — ✅ **CLOSED** (tag `v2.1-ui07-ai-workspace`)
  - **UI-07 overall: ✅ CLOSED.**

> Phụ thuộc UI-07 đã giải quyết → DESIGN-02 **sẵn sàng Final Audit**. Freeze chỉ có hiệu lực sau DESIGN-02 Final Codex Audit PASS + Commit/Tag/Push.

## 5. Freeze Shared Design

Đóng băng (theo [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md)): Design Tokens (`--pf-*`) · Semantic Tokens · Shared Components (`PageShell/PageHeader/MetricCard/ChartCard/DataTable/FilterBar/StatusBadge/ActionButton/EmptyState/LoadingState/MobileCardList/ResponsiveTabs`) · Loading · Empty · Error · Responsive rules · Accessibility baseline.

## 6. Freeze Visual Quality

Đóng băng theo [VDS-01](VDS-01-visual-design-system-v2.1.md): Visual Quality Bar · Golden Screens (baseline capture) · **Visual Quality ≥ 95/100** · Desktop/Mobile parity.

## 7. Freeze Governance

Đóng băng nguyên tắc quản trị thiết kế (tham chiếu, không định nghĩa lại):

- **Design Source of Truth** = UDP-01
- **Visual Source of Truth** = VDS-01
- **Governance Source of Truth** = [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md)
- **Document Lifecycle** (Proposed → Codex PASS → Accepted/CLOSED)
- **Scope Isolation** (mỗi increment 1 bước gated)

## 8. Freeze Working Rules

Đóng băng các Working Rule đã áp dụng: **Design Pattern First** (Amendment #02) · **Increment Rule** · **Codex Audit Rule** · **Reality Filter** · **Human Approval Boundary** · **Source of Truth** (backend summary) · **AI Safety** (read-only, no execute) · **Execution Boundary** (Epic 4.2 BLOCKED).

## 9. Design Program Summary (timeline)

```
UDP-01 → Amendment #01 → Amendment #02 → VDS-01
   → UIP-03 → UI-03 → UIP-04 → UI-04 → UIP-05 → UI-05
   → UIP-06 → UI-06 → UIP-07 → UI-07
   → DESIGN-02 (Freeze)
```

Các mốc **đến UI-07 Increment 2** đã **Codex PASS · Commit · Tag · Push** (UI-07 overall ✅ CLOSED). **DESIGN-02** là mốc cuối, hiện **Proposed / Pending Final Codex Audit** — chỉ Closing sau khi DESIGN-02 Final Codex Audit PASS + Commit/Tag/Push. Trước đó **không** kết luận Design Program đã hoàn tất hay Maintenance Mode đã hiệu lực.

## 10. Future Change Policy

**Sau khi DESIGN-02 Closing** (UI-07 Inc.2 Closing + DESIGN-02 Codex PASS + Commit/Tag/Push), **không sửa trực tiếp UI**; mọi thay đổi phải qua pipeline:

```
RFC → UIP → Codex Audit → PASS → Implementation → Audit → Release
```

Khi ấy Design Program **sẽ chuyển** sang **Maintenance Mode**: bug fix nhỏ / a11y / token fix theo Exception Policy (Amendment #02 §11) vẫn cho phép, nhưng thay đổi pattern/visual/tokens phải qua RFC + UIP + Codex Audit. **Trước Closing, Maintenance Mode chưa có hiệu lực.**

## 11. Out of Scope

DESIGN-02 **KHÔNG**: tạo Constitution mới · tạo Amendment mới · mở Execution Program · mở Epic 4.2 · mở AI Execution · thay đổi API · thay đổi DB · thay đổi frontend/backend.

- Execution Program: **UNCHANGED**
- Epic 4.2: **BLOCKED**
- Execution Readiness: **NOT READY**

---

> 🧊 DESIGN-02 v2.1 — Product Design Baseline Freeze (✅ Final Codex Audit PASS / CLOSED · **EFFECTIVE** · Design Program v2.1 COMPLETE / FROZEN / Maintenance Mode ACTIVE). Đóng băng UDP-01/Amendment #01/#02/VDS-01 + UIP-03..07 + UI-02..07 + shared design + visual quality + governance + working rules. Không định nghĩa lại rule. Từ đây mọi thay đổi UI phải qua RFC → UIP → Codex Audit → PASS → Implementation → Audit → Release. Tuân thủ GOV-01. (Option B — historical tag `v2.1-design02-product-design-baseline-freeze` giữ nguyên; Final tag `v2.1-design02-product-design-baseline-freeze-final`.)
