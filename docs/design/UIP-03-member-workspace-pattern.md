# UIP-03 — Member Workspace Pattern

> **Design Pattern Document** cho module **Thành viên** — chuẩn hóa thiết kế trước khi triển khai **UI-03 (Member Management Enterprise Workspace)**. **KHÔNG** phải Constitution mới, **KHÔNG** thay thế [UDP-01](UDP-01-unified-product-design-constitution.md) hay [DASH-01](DASH-01-enterprise-dashboard-pattern.md). Kế thừa [UDP-01](UDP-01-unified-product-design-constitution.md) (Design SoT) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) (Foundation Freeze) + [DASH-01](DASH-01-enterprise-dashboard-pattern.md) (Workspace layout reference); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). UI-02 Dashboard 4.0 là **Golden Reference**.

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

---

## 1. Trạng thái

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Pattern Document
- **Scope:** Member Management Workspace
- **Implementation:** Not Started
- **UI-03:** 🟢 READY TO START (chưa mở implementation)

> - UIP-03 **đã Accepted** (Codex PASS).
> - UI-03 **chưa triển khai** — READY TO START, mở ở increment riêng.
> - Đây **chỉ** là pattern document (docs-only), không phải code.

## 2. Mục tiêu

Chuẩn hóa màn hình **Thành viên** thành **Enterprise Workspace** gồm:

- KPI Row
- Filter/Search
- Desktop DataTable
- Mobile Member Cards
- Member Detail Drawer
- Quick Actions
- Bulk Actions
- Import/Export
- AI Insight (nếu có)
- Empty / Loading / Error states
- Responsive rules

## 3. Quan hệ với Design Baseline

Tham chiếu (không định nghĩa lại):

- **[UDP-01](UDP-01-unified-product-design-constitution.md)** — Design Source of Truth (tokens + rules).
- **[DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md)** — Frozen Foundation (tokens + shared components).
- **[DASH-01](DASH-01-enterprise-dashboard-pattern.md)** — Dashboard/Workspace layout reference.
- **UI-02 — Dashboard 4.0** — Golden Reference (triển khai mẫu đã Codex PASS / CLOSED).

**Không** định nghĩa lại: Design Tokens · Shared Components · Governance Rules · Dashboard Constitution. UIP-03 chỉ **tổ hợp** chúng thành pattern cho module Thành viên.

## 4. Workspace Layout

**Desktop:**

- `PageShell`
- `PageHeader`
- KPI Row
- `FilterBar`
- `DataTable`
- Right Detail Panel hoặc Drawer
- Bulk Action Bar
- Empty / Loading / Error states

**Mobile:**

- MobileHeader
- Drawer navigation (cùng menu Sidebar — Feature Parity)
- KPI compact cards
- Filter Drawer
- `MobileCardList`
- Member Detail Bottom Sheet
- Sticky Quick Action

## 5. PageHeader Pattern

- **Tiêu đề:** "Thành viên"
- **Subtitle:** "Quản lý hồ sơ, trạng thái, tài khoản và hoạt động thành viên trong CLB."
- **Header actions:**
  - Thêm thành viên
  - Tạo tài khoản
  - Xuất danh sách
  - Import (nếu chức năng hiện có)

> **Không** hiển thị action không có backend hỗ trợ.

## 6. KPI Row Pattern

KPI bắt buộc (map `MetricCard`):

- Tổng thành viên
- Đang hoạt động
- Tạm ngưng
- Đã rời CLB
- AI Rating trung bình (nếu dữ liệu có)

> Nếu **chưa có** AI Rating thật → hiển thị Empty / Not available; **không** hard-code số liệu giả.

## 7. Filter/Search Pattern

`FilterBar` gồm:

- Search theo tên / số điện thoại / email (nếu dữ liệu có)
- Trạng thái
- Nhóm
- Kỳ quỹ
- AI Rating (nếu có)
- Sort
- Reset filter

- **Desktop:** filter hàng ngang trên bảng.
- **Mobile:** Filter Drawer / Bottom Sheet.

## 8. Desktop Table Pattern

`DataTable` columns đề xuất:

- Avatar / Tên
- Nhóm
- Trạng thái
- Kỳ quỹ hiện tại
- AI Rating
- Số buổi tham gia
- Tình trạng đóng quỹ
- Lần hoạt động gần nhất
- Actions

Actions (map `ActionButton`, permission-aware):

- Xem chi tiết
- Chỉnh sửa
- Tạo / reset tài khoản (nếu có quyền)
- Tạm ngưng / kích hoạt (nếu backend hỗ trợ)

> **Không** tạo action giả nếu backend chưa hỗ trợ.

## 9. Mobile Card Pattern

`MobileCardList` hiển thị:

- Avatar
- Tên
- `StatusBadge`
- Số buổi tham gia
- Tình trạng đóng quỹ
- Quick actions
- Tap để mở Detail Bottom Sheet

> **Không** dùng table ngang (scroll ngang) trên mobile.

## 10. Member Detail Drawer Pattern

- **Desktop:** right drawer hoặc side panel.
- **Mobile:** bottom sheet.

Nội dung:

- Thông tin cá nhân
- Trạng thái thành viên
- Kỳ quỹ hiện tại
- Lịch sử điểm danh
- Lịch sử đóng quỹ
- Tài khoản app (nếu có)
- Ghi chú
- Actions (theo quyền)

## 11. Bulk Actions Pattern

**Desktop:**

- Chọn nhiều thành viên
- Export
- Tạo tài khoản hàng loạt (nếu có)
- Gửi nhắc đóng quỹ (nếu có backend)
- Đổi trạng thái (nếu backend hỗ trợ)

**Mobile:**

- Không bắt buộc bulk action phức tạp.
- Nếu có → đưa vào bottom action sheet.

> **Không** tạo bulk action vượt quá khả năng backend.

## 12. AI Insight Pattern

Nếu có Maika / Lisa insight:

- Chỉ hiển thị recommendation / **read-only**.
- **Không** hiển thị như đã execute.
- **Không** gửi thông báo thật.
- **Không** tự tạo tài khoản.
- **Không** tự đổi trạng thái.

Pattern:

```
AI Insight
  → Recommendation
  → Suggested Action
  → Human Approval / Not Executed (nếu liên quan action)
```

Dùng tone `ai` (`--pf-color-ai`) — đồng bộ Maika governance (read-only).

## 13. Status & Badge Pattern

Dùng `StatusBadge` (kèm text, không chỉ màu):

- active
- paused
- left
- unpaid
- paid
- incomplete profile
- app account active
- app account inactive

> Trạng thái phải có **text/label**, không truyền tin chỉ bằng màu.

## 14. Empty / Loading / Error States

- **Loading:** skeleton table / card (`LoadingState`).
- **Empty:** chưa có thành viên + CTA "Thêm thành viên" (`EmptyState`).
- **Error:** lỗi tải dữ liệu + retry action.
- **Mobile:** state hiển thị full-width card.

## 15. Responsive Rules

Breakpoints: **320 · 360 · 375 · 390 · 414 · 768 · 1024 · 1280 · 1440**.

Yêu cầu:

- Không overflow ngang.
- Không mất search / filter.
- Không mất action chính.
- Mobile có đủ chức năng desktop (Feature Parity — [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md) Rule 11).
- Table desktop → card mobile.

## 16. Accessibility

- Icon-only button có `aria-label`.
- Table có header.
- Drawer / bottom sheet có title.
- Status có text.
- Focus visible (`--pf-focus-ring`).
- Touch target ≥ 40px.
- Không chỉ dùng màu để thể hiện trạng thái.

## 17. Shared Component Mapping

Map pattern sang component đã frozen (DESIGN-01):

| Pattern | Component |
|---|---|
| Container | `PageShell` |
| Header | `PageHeader` |
| KPI | `MetricCard` |
| Filter/Search | `FilterBar` |
| Bảng desktop | `DataTable` |
| Danh sách mobile | `MobileCardList` |
| Trạng thái | `StatusBadge` |
| Nút hành động | `ActionButton` |
| Rỗng | `EmptyState` |
| Đang tải | `LoadingState` |
| Tab (nếu cần) | `ResponsiveTabs` |
| Analytics nhỏ (nếu có) | `ChartCard` |

> Nếu UI-03 cần component mới → **chỉ** tạo member-specific component; **không** trùng lặp shared component.

## 18. Business Logic Boundaries

UI-03 **không được** đổi:

- Member API contract
- Fund / Finance logic
- Attendance logic
- Account creation logic
- Permission logic
- Backend role
- Database schema

> UI chỉ **render dữ liệu hiện có** — không đổi nghiệp vụ.

## 19. UI-03 Scope Preview

Sau khi UIP-03 Codex PASS, UI-03 **được phép**:

- Rewrite màn Thành viên.
- Nâng cấp Desktop UI.
- Nâng cấp Mobile UI.
- Reuse shared components.
- Cập nhật `PROJECT_STATUS`.

UI-03 **không được**:

- Sửa backend.
- Thêm API mới.
- Sửa DB.
- Đổi logic thành viên.
- Mở UI-04.

## 20. Decision

**Đề xuất:** UIP-03 chọn **Member Workspace Pattern** làm chuẩn cho UI-03.

UI-03 **chỉ** được mở sau:

- UIP-03 Codex PASS
- Commit
- Tag
- Push

---

> 🧾 UIP-03 v1.0 — Member Workspace Pattern (✅ Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-03 triển khai ở increment riêng (🟢 READY TO START), sau khi UIP-03 PASS. UIP-03 chỉ phụ trách design cho module Thành viên; tokens/components theo UDP-01/DESIGN-01, governance theo GOV-01.
