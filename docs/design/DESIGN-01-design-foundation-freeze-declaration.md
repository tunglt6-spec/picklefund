# DESIGN-01 — Design Foundation Freeze Declaration

> Tuyên bố **đóng băng nền tảng thiết kế** UDP-01 sau khi Codex PASS. Bổ trợ [UDP-01](UDP-01-unified-product-design-constitution.md) (Design Source of Truth) và [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md) (Governance SoT). DESIGN-01 không định nghĩa lại Design Rules — chỉ tuyên bố freeze.

**Phiên bản:** v1.0 · **Status:** Accepted / Official · **Ngày:** 2026-07-01

---

## 1. Tuyên bố

- **UDP-01 Foundation đã Codex PASS.**
- **Design Tokens** (`--pf-*`) — **đóng băng (Frozen)**.
- **Semantic Color Tokens** (`--pf-color-*`, `--pf-text-on-primary`, `--pf-border-soft`, `--pf-focus-ring`) — **đóng băng**.
- **Shared Components** (`frontend/src/components/shared/**`) — **đóng băng**.
- **Component Library Foundation** (PageShell/PageHeader/MetricCard/ChartCard/DataTable/FilterBar/StatusBadge/ActionButton/EmptyState/LoadingState/MobileCardList/ResponsiveTabs + `accentVars`) — **đóng băng**.

## 2. Ràng buộc bắt buộc (từ thời điểm freeze)

- **Mọi UI mới phải dùng UDP-01 Foundation** (tokens + shared components).
- **Không tạo component trùng lặp** với thư viện Foundation.
- **Không hard-code màu** — chỉ `var(--pf-*)`.
- **Không bypass shared components** cho card/table/filter/badge/button/state.
- **Mọi thay đổi Foundation** (token/component) **phải đi qua một Design Increment mới** (UDP update vd UDP-01 v1.1 / DESIGN-02) + Codex Audit — không sửa rải rác.

## 3. Increment tiếp theo

- **UI-02 — Dashboard 4.0** là increment thiết kế tiếp theo.
- UI-02 **chưa triển khai** trong commit này; sẽ mở ở increment riêng (gated → Codex Audit).
- UI-02 và mọi màn hình sau **kế thừa** UDP-01 Foundation đã freeze.

## 4. Phạm vi không đổi

DESIGN-01 chỉ là tuyên bố thiết kế. **Không** đụng backend/API/Finance/Execution/Database/logic nghiệp vụ. Execution Program (Sprint 4) **không đổi**: Epic 4.2 vẫn BLOCKED · Execution Readiness vẫn NOT READY.

---

> 🧾 DESIGN-01 v1.0 — Design Foundation Frozen. Thay đổi nền tảng thiết kế phải qua Design Increment mới + Codex Audit (tham chiếu GOV-01 Rule 14 Architecture Freeze, Rule 12 Delivery Pipeline).
