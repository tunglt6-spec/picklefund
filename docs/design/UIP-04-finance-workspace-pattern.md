# UIP-04 — Finance Workspace Pattern

> **Design Pattern Document** cho nhóm chức năng **tài chính** của PickleFund — chuẩn hóa thiết kế trước khi triển khai **UI-04 (Finance Workspace Implementation)**. **KHÔNG** phải Constitution mới, **KHÔNG** thay thế [UDP-01](UDP-01-unified-product-design-constitution.md) / [DASH-01](DASH-01-enterprise-dashboard-pattern.md) / các Amendment. Kế thừa [UDP-01](UDP-01-unified-product-design-constitution.md) (Design SoT) + [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Workspace State DoD) + [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) (Design Pattern First Rule) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) (Foundation Freeze) + [DASH-01](DASH-01-enterprise-dashboard-pattern.md) (Workspace layout reference); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). UI-02 Dashboard 4.0 là **Golden Reference**; UIP-03 là **Workspace pattern precedent**.

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

---

## 1. Trạng thái

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Pattern Document
- **Scope:** Finance Workspace
- **Implementation:** Not Started
- **UI-04:** 🟢 READY TO START (chưa mở implementation)

> - UIP-04 **đã Accepted** (Codex PASS).
> - UI-04 **chưa triển khai** — READY TO START, mở ở increment riêng (theo Amendment #02).
> - Đây **chỉ** là pattern document (docs-only), không phải code.
> - **Finance logic KHÔNG được thay đổi** trong UIP/UI.

## 2. Mục tiêu

Chuẩn hóa **Finance Workspace** thành màn hình quản trị tài chính enterprise gồm:

- Fund Summary
- Common Fund / Quỹ Chính
- Mini Fund / Quỹ Phụ
- Income Management
- Expense Management
- Transaction History
- Fund Period Context
- Approval Status (nếu hiện có)
- Export/Report actions (nếu hiện có)
- Loading / Empty / Error states
- Desktop/Mobile Feature Parity

## 3. Quan hệ với Design Baseline

Tham chiếu (không định nghĩa lại):

- **[UDP-01](UDP-01-unified-product-design-constitution.md)** — Design Source of Truth (tokens + rules).
- **[Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md)** — Loading / Empty / Error DoD.
- **[Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md)** — Design Pattern First Rule.
- **[DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md)** — Frozen Foundation.
- **[DASH-01](DASH-01-enterprise-dashboard-pattern.md)** — Dashboard/Workspace layout reference.
- **UI-02 — Dashboard 4.0** — Golden Reference.
- **[UIP-03](UIP-03-member-workspace-pattern.md)** — Workspace pattern precedent.

**Không** định nghĩa lại: Design Tokens · Shared Components · Governance Rules · Dashboard Constitution.

## 4. Finance Business Invariants

UI-04 **KHÔNG được** thay đổi:

- Finance Engine
- Fund calculation
- Reports calculation
- Personal receipt calculation
- Attendance-based contribution logic
- Common Fund / Mini Fund separation
- Fund period filtering
- Expense approval logic (nếu có)
- Transaction source logic
- API contract
- Database schema

**Bất biến quan trọng:**

- **Tổng tài sản CLB = Quỹ Chính + số dư chuyển kỳ, KHÔNG cộng Quỹ Phụ** (logic hiện tại tách quỹ).
- **Quỹ Phụ là quỹ độc lập**, không trộn vào tài sản CLB.
- Báo cáo/PDF/phiếu thu phải dùng **backend summary hiện có** (như hiện tại).
- UI chỉ **render dữ liệu hiện có**, không tự tính lại công thức finance nếu đã có backend/store selector.
- **Không hard-code số liệu tài chính.**

## 5. Workspace Layout

**Desktop:**

- `PageShell` → `PageHeader` → KPI Row → Fund Tabs / Segment → `FilterBar` → Finance `DataTable` → Right Detail Panel/Drawer → Transaction Timeline → Export/Report Actions → Loading/Empty/Error states.

**Mobile:**

- MobileHeader → Drawer navigation (full menu — Feature Parity) → KPI compact cards → Fund tabs scroll ngang → Filter Bottom Sheet → Transaction cards → Finance Detail Bottom Sheet → Sticky primary action (nếu backend hỗ trợ).

## 6. PageHeader Pattern

- **Title:** "Tài chính"
- **Subtitle:** "Quản lý quỹ, thu chi, công nợ và giao dịch tài chính của CLB."
- **Header actions:** Thu quỹ · Thêm chi phí · Xuất báo cáo · Export Excel/PDF (nếu chức năng hiện có).

> **Không** hiển thị action không có backend hỗ trợ.

## 7. KPI Row Pattern

KPI bắt buộc (map `MetricCard`):

- Quỹ Chính
- Quỹ Phụ
- Tổng thu kỳ này
- Tổng chi kỳ này
- Công nợ / Chưa đóng quỹ (nếu dữ liệu có)
- Số dư chuyển kỳ (nếu dữ liệu có)

> Thiếu dữ liệu → "Chưa có dữ liệu", **không bịa số**. KPI âm → tone `danger` + **text/indicator** (không chỉ màu).

## 8. Fund Segmentation Pattern

Phân tách rõ (map `ResponsiveTabs`):

- Tất cả · Quỹ Chính · Quỹ Phụ · Kỳ quỹ hiện tại · Kỳ trước (nếu có).

- **Mobile:** tabs/segmented control **scroll ngang**.

> **Không** làm UI khiến người dùng hiểu Quỹ Chính và Quỹ Phụ bị **cộng chung sai**.

## 9. Income Management Pattern

Thu quỹ gồm: Người nộp · Kỳ quỹ · Nguồn quỹ · Số tiền · Phương thức · Ngày thu · Trạng thái · Ghi chú · Actions (nếu có).

- **Không** tạo flow thu tiền mới nếu backend chưa hỗ trợ.
- Nếu có **QR**: QR panel chỉ hiển thị thông tin thanh toán; **không** xác nhận thanh toán tự động nếu backend chưa hỗ trợ.

## 10. Expense Management Pattern

Chi phí gồm: Tên khoản chi · Danh mục · Nguồn quỹ · Số tiền · Ngày chi · Người tạo · Trạng thái duyệt (nếu có) · Chứng từ (nếu có) · Actions (nếu backend hỗ trợ).

- **Không** sửa approval logic.
- **Không** hiển thị "đã duyệt" nếu data không có.

## 11. Transaction History Pattern

**Desktop** — `DataTable` columns: Loại giao dịch · Nguồn quỹ · Thành viên / đối tượng · Nội dung · Số tiền · Phương thức · Ngày · Trạng thái · Actions.

**Mobile** — Transaction card: icon income/expense · title · amount · fund source badge · date · status · tap mở detail.

## 12. Detail Drawer Pattern

- **Desktop:** right drawer / side panel.
- **Mobile:** bottom sheet.

Nội dung: thông tin giao dịch · nguồn quỹ · kỳ quỹ · trạng thái · lịch sử cập nhật (nếu có) · actions (theo quyền).

> **Không** expose dữ liệu nhạy cảm không cần thiết.

## 13. Filter/Search Pattern

`FilterBar` gồm: Search nội dung/thành viên · Loại giao dịch · Nguồn quỹ · Kỳ quỹ · Trạng thái · Khoảng ngày · Số tiền min/max (nếu hiện có) · Reset filter.

- **Mobile:** Filter Bottom Sheet.
- **Filter no-result:** `EmptyState` + CTA reset filter.

## 14. Charts / Analytics Pattern

Nếu hiện có data (bọc trong `ChartCard`): Thu/chi theo kỳ · Cơ cấu chi phí · Tỷ lệ Quỹ Chính/Quỹ Phụ · Công nợ · Xu hướng số dư.

- Chưa có → **không** hard-code chart giả; dùng `EmptyState` / "Chưa có dữ liệu".
- Chart colors: dùng token/data-viz constants hợp lệ; **không** dùng màu semantic hard-code trong UI.

## 15. Approval / Risk Pattern

Nếu màn có approval:

- Status pending/approved/rejected rõ ràng.
- **Không** auto-approve · **không** tự execute action tài chính · **không** hiển thị AI đã quyết định nếu chưa có backend approval.

> **Finance write là vùng nhạy cảm:** mọi action ghi dữ liệu phải theo backend hiện có; **không** tạo AI execution; **không** tạo workflow tự động.

## 16. AI Finance Insight Pattern

Nếu có Maika/Lisa insight (tone `ai`, read-only):

- Chỉ recommendation · anomaly/warning (nếu có) · suggested action.
- **Không** execute · **không** tự tạo thu/chi · **không** tự gửi nhắc nợ · **không** tự duyệt chi phí.

Pattern:

```
AI Insight
  → Recommendation
  → Suggested Action
  → Human Review / Not Executed
```

## 17. Loading / Empty / Error States (Amendment #01 — bắt buộc)

- **Loading:** shared `LoadingState`; initial load; refresh/sync (nếu có).
- **Empty:** no transaction · no income · no expense · filter no-result · no chart data (shared `EmptyState`).
- **Error:** icon · title · description · retry; retry dùng **API hiện có**; **không** tạo endpoint mới.

> Thiếu state → UI-04 **không được** ghi `READY FOR CODEX UI AUDIT`.

## 18. Desktop Pattern

Desktop phải có: KPI Row đầy đủ · Tabs/segments quỹ · FilterBar · DataTable · Right drawer · Chart/analytics area (nếu có) · Export actions (nếu hiện có). **Không overflow ngang.**

## 19. Mobile Pattern

Mobile phải có: KPI compact · Fund tabs scroll ngang · Filter bottom sheet · Transaction cards · Detail bottom sheet · Sticky primary action. **Không** table ngang · **không** mất export/report nếu desktop có · **không** mất thu/chi action nếu desktop có.

## 20. Accessibility

- Icon-only button có `aria-label`.
- Amount có dấu +/− và text.
- Status có text (không chỉ màu).
- Table có header · drawer/bottom sheet có title.
- Focus visible · touch target ≥ 40px.
- Chart có title/description.
- Error có retry rõ ràng.

## 21. Shared Component Mapping

| Pattern | Component |
|---|---|
| Container | `PageShell` |
| Header | `PageHeader` |
| KPI | `MetricCard` |
| Fund tabs | `ResponsiveTabs` |
| Filter/Search | `FilterBar` |
| Bảng giao dịch (desktop) | `DataTable` |
| Danh sách giao dịch (mobile) | `MobileCardList` |
| Trạng thái | `StatusBadge` |
| Nút hành động | `ActionButton` |
| Rỗng | `EmptyState` |
| Đang tải | `LoadingState` |
| Chart | `ChartCard` |

> Nếu UI-04 cần component mới → **chỉ** tạo finance-specific; **không** trùng shared component; dùng `--pf-*` token.

## 22. Business Logic Boundaries

UI-04 **không được** đổi:

- Finance API contract
- Transaction API contract
- Fund period API contract
- Reports API contract
- Personal receipt API contract
- Finance calculation logic
- Fund separation logic
- Approval logic
- Permission logic
- Database schema

> UI chỉ **render dữ liệu hiện có**.

## 23. UI-04 Scope Preview

Sau khi UIP-04 Codex PASS, UI-04 **được phép**:

- Rewrite màn Finance Workspace.
- Nâng cấp Desktop UI.
- Nâng cấp Mobile UI.
- Reuse shared components.
- Cập nhật `PROJECT_STATUS`.

UI-04 **không được**:

- Sửa backend.
- Thêm API mới.
- Sửa DB.
- Đổi công thức tài chính.
- Đổi logic quỹ.
- Mở UI-05.

## 24. Decision

**Đề xuất:** UIP-04 chọn **Finance Workspace Pattern** làm chuẩn cho UI-04.

UI-04 **chỉ** được mở sau:

- UIP-04 Codex PASS
- Commit
- Tag
- Push

---

> 🧾 UIP-04 v1.0 — Finance Workspace Pattern (✅ Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-04 triển khai ở increment riêng (🟢 READY TO START, theo Amendment #02), sau khi UIP-04 PASS. UIP-04 chỉ phụ trách design cho nhóm chức năng tài chính; tokens/components theo UDP-01/DESIGN-01, Workspace State theo Amendment #01, governance theo GOV-01. **Finance logic bất biến — UI không đổi công thức.**
