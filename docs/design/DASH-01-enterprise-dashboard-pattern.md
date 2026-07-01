# DASH-01 — Enterprise Dashboard Pattern (Dashboard Constitution)

> **Design Pattern Document** cho toàn bộ Dashboard của hệ sinh thái. **KHÔNG** phải code, **KHÔNG** sửa Dashboard hiện tại — chỉ định nghĩa Pattern. Sau Codex PASS mới triển khai **UI-02 Dashboard 4.0**. Kế thừa [UDP-01](UDP-01-unified-product-design-constitution.md) (Design SoT) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) (Foundation Freeze); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md).

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01

---

## 1. Status

**Accepted · Codex Audit: PASS — Dashboard Constitution.** (Đã Accepted; UI-02 triển khai ở increment riêng.)

## 2. Mục tiêu

Dashboard là **Master Layout**. Mọi Dashboard (PickleFund & sản phẩm tương lai) **reuse Pattern này** — **không** thiết kế Dashboard riêng lẻ. DASH-01 là chuẩn tái sử dụng cho tầng dashboard.

## 3. Dashboard Principles

Enterprise-first · Information hierarchy · Action-first · AI-first · Mobile-first · Responsive-first · Accessibility-first · Performance-first · Consistency-first.

## 4. Layout

**12-column Grid** thích ứng Desktop / Tablet / Mobile. Khung: **Sidebar** (trái, desktop cố định / mobile drawer) · **Header** (title + actions) · **Workspace** (grid nội dung) · **Footer**. Safe spacing theo tokens `--pf-*` (gap/padding); container max-width 1440 (`PageShell`).

## 5. Dashboard Zones (thứ tự thông tin)

Header → Breadcrumb → Page Title → Quick Actions → AI Suggestions → KPI Summary → Charts → Activity Timeline → Recent Transactions → Notifications → AI Workspace → Footer. Mỗi zone là vùng tuỳ chọn (ẩn/hiện theo module) nhưng **thứ tự & vai trò cố định**.

## 6. KPI Pattern (map `MetricCard`)

Card gồm: Title · Value (lớn, tabular-nums) · Delta · Trend · Mini chart (sparkline tuỳ chọn) · Icon badge accent · trạng thái **Loading** (skeleton) · **Empty**. Số âm → màu danger (`--pf-color-danger`).

## 7. Chart Pattern (bọc trong `ChartCard`)

Line · Bar · Area · Donut · Progress · Sparkline. Mọi chart nằm trong `ChartCard` (title/subtitle/actions/body); màu theo accent module; có Empty/Loading state.

## 8. AI Insight Pattern (AI Recommendation Card)

Priority · Confidence · Reasoning · Suggested Action · Expand · History. Dùng tone `ai` (`--pf-color-ai`). **Read-only/đề xuất** — không hiển thị "đã execute" khi backend chỉ read/propose (đồng bộ Maika governance).

## 9. Quick Action Pattern (map `ActionButton`)

Primary (green) · Secondary · Danger · Context · **Permission-aware** (ẩn/disable theo quyền). Icon-only bắt buộc accessible name.

## 10. Dashboard Grid Rules

| Breakpoint | Cột KPI | Cột chart |
|---|---|---|
| Desktop (≥1280) | 4 | 12-col (span 6–8 / 4–6) |
| Tablet (768–1279) | 2 | span 12 hoặc 6 |
| Mobile (<768) | 1 (hoặc 2 KPI nhỏ) | span 12 (stack) |

Card span + gap theo grid; breakpoints: 320 · 375 · 414 · 768 · 1024 · 1280 · 1440.

## 11. Mobile Dashboard Rules

Bottom summary bar · Collapsible KPI (gọn khi cuộn) · Swipe card (carousel KPI/chart) · Sticky primary actions. Bảng → `MobileCardList`; filter → drawer (`FilterBar`).

## 12. Accessibility

Keyboard navigation · Screen reader (aria-label/role) · Contrast đủ · Focus ring (`--pf-focus-ring`) · Touch target ≥ 36px · không truyền tin chỉ bằng màu.

## 13. Performance

Lazy loading (chart/nặng) · Skeleton (`LoadingState`) · Virtualization cho list/table dài · Memoization guideline (tránh re-render KPI/chart không cần).

## 14. Reuse Matrix

| Sản phẩm | Áp dụng DASH-01 |
|---|---|
| PickleFund | ✅ (UI-02 Dashboard 4.0) |
| AI Commerce Platform | ✅ (Planned) |
| AI Organization Platform | ✅ (Planned) |
| Future Products | ✅ (mặc định) |

## 15. Design Source of Truth (hierarchy)

```
DASH-01 (Dashboard Pattern)
   ↓
UDP-01 (Design SoT: tokens + rules)
   ↓
Shared Components
   ↓
Design Tokens (--pf-*)
   ↓
Dashboard (UI-02, …)
```

DASH-01 mô tả **pattern dashboard**; UDP-01 vẫn là Design Source of Truth về tokens/components. DASH-01 không định nghĩa lại tokens/rules — chỉ tổ hợp chúng thành pattern.

## 16. UI-02 Scope

UI-02 **sẽ triển khai** Dashboard theo DASH-01 — **không** triển khai trong tài liệu này. UI-02 chỉ mở sau khi DASH-01 Codex PASS + quyết định triển khai.

---

> 🧾 DASH-01 v1.0 — Dashboard Constitution (Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-02 triển khai ở increment riêng.
