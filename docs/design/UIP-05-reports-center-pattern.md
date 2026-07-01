# UIP-05 — Reports Center Pattern

> **Design Pattern Document** cho nhóm chức năng **báo cáo** của PickleFund — chuẩn hóa thiết kế trước khi triển khai **UI-05 (Reports Center Implementation)**. **KHÔNG** phải Constitution mới, **KHÔNG** thay thế [UDP-01](UDP-01-unified-product-design-constitution.md) / [VDS-01](VDS-01-visual-design-system-v2.1.md) / [DASH-01](DASH-01-enterprise-dashboard-pattern.md) / các Amendment. Kế thừa UDP-01 (Design SoT) + [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Workspace State DoD) + [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) (Design Pattern First) + [VDS-01](VDS-01-visual-design-system-v2.1.md) (Visual Quality Gate) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) + [DASH-01](DASH-01-enterprise-dashboard-pattern.md); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). UI-02 = Golden Reference; UIP-03/UIP-04 = precedent.

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

> 🎨 **Design Skill Bootstrap (Reality Filter):** Các Taste Skills (design-taste-frontend-v1 · high-end-visual-design · stitch-design-taste · redesign-existing-projects · minimalist-ui) **được áp dụng như nguyên tắc thiết kế tham chiếu theo [VDS-01](VDS-01-visual-design-system-v2.1.md)** — **không claim đã nạp skill** nếu môi trường Claude Code không hỗ trợ. Ưu tiên chất lượng visual theo VDS-01.

---

## 1. Trạng thái

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Pattern Document
- **Scope:** Reports Center
- **Implementation:** Not Started
- **UI-05:** 🟢 READY TO START (chưa mở implementation)

> - UIP-05 **đã Accepted** (Codex PASS).
> - UI-05 **chưa triển khai** — READY TO START, mở ở increment riêng (theo Amendment #02).
> - Đây **chỉ** là pattern document (docs-only), không phải code.
> - **Reports logic KHÔNG được thay đổi** trong UIP/UI.

## 2. Mục tiêu

Chuẩn hóa **Reports Center** thành màn hình báo cáo enterprise gồm: Financial Report · Member Report · Attendance Report · Fund Period Report · Common Fund / Mini Fund Report · Personal Receipt access (nếu hiện có) · PDF/Excel Export (nếu hiện có) · Report Filters · Report Preview · Report History (nếu hiện có) · Loading / Empty / Error states · Desktop/Mobile Feature Parity.

## 3. Quan hệ với Design Baseline

Tham chiếu (không định nghĩa lại): [UDP-01](UDP-01-unified-product-design-constitution.md) (Design SoT) · [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Loading/Empty/Error DoD) · [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) (Design Pattern First) · [VDS-01](VDS-01-visual-design-system-v2.1.md) (Visual Quality Gate) · [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) (Frozen Foundation) · [DASH-01](DASH-01-enterprise-dashboard-pattern.md) (layout reference) · UI-02 (Golden Reference) · [UIP-03](UIP-03-member-workspace-pattern.md) · [UIP-04](UIP-04-finance-workspace-pattern.md).

**Không** định nghĩa lại: Design Tokens · Shared Components · Governance Rules · Dashboard Constitution · Visual Constitution.

## 4. Reports Business Invariants

UI-05 **KHÔNG được** thay đổi:

- Reports calculation · Finance calculation · Personal receipt calculation
- Fund summary logic · Attendance summary logic
- Common Fund / Mini Fund separation · Fund period filtering
- PDF generation logic · Excel export logic
- Backend summary source of truth · API contract · Database schema

**Bất biến bắt buộc:**

- Reports/PDF/phiếu thu phải dùng **backend summary hoặc API/selector chính thức hiện có**.
- UI **không tự tính lại** finance/report formulas nếu backend/store đã có summary.
- **Common Fund và Mini Fund phải tách biệt** trong báo cáo.
- **Tổng tài sản CLB không cộng Quỹ Phụ** (rule hiện tại tách quỹ).
- **Personal Receipt không tự tính ở frontend** nếu backend đã có calculator.
- **Không hard-code số liệu báo cáo. Không tạo báo cáo giả.**

## 5. Reports Center Layout

**Desktop:** `PageShell` → `PageHeader` → Report Type Tabs → KPI Summary Row → Report `FilterBar` → Report Preview Area → Report `DataTable` → Chart/Visualization Area (nếu có data) → Export Panel → Right Report Detail Drawer (nếu phù hợp) → Loading/Empty/Error states.

**Mobile:** MobileHeader → Drawer navigation (full menu) → Report type segmented tabs (scroll ngang) → KPI compact cards → Filter bottom sheet → Report preview cards → Report detail bottom sheet → Export actions → Loading/Empty/Error states.

## 6. PageHeader Pattern

- **Title:** "Báo cáo"
- **Subtitle:** "Tổng hợp tài chính, thành viên, điểm danh và hiệu quả hoạt động của CLB."
- **Header actions:** Xuất PDF · Xuất Excel · Tạo báo cáo (nếu backend hỗ trợ) · In báo cáo (nếu chức năng hiện có).

> **Không** hiển thị action không có backend hỗ trợ.

## 7. Report Type Tabs

`ResponsiveTabs`: Tổng quan · Tài chính · Thành viên · Điểm danh · Quỹ Chính · Quỹ Phụ · Phiếu thu cá nhân (nếu hiện có) · Hoạt động / Minigame (nếu hiện có).

- **Mobile:** tabs scroll ngang · không mất tab · **không ép table ngang**.

## 8. KPI Summary Pattern

KPI báo cáo (nếu data có, map `MetricCard`): Tổng thu · Tổng chi · Số dư Quỹ Chính · Số dư Quỹ Phụ · Công nợ · Thành viên hoạt động · Tổng lượt chơi · Chi phí bình quân/lượt (nếu backend summary có).

> Thiếu dữ liệu → "Chưa có dữ liệu", **không tự tính**.

**KPI phải phân biệt rõ:**
- **Official report summary** (từ backend summary/selector chính thức).
- **Filtered preview metric** — phải ghi rõ **"đang lọc"**, **không** phải số liệu báo cáo chính thức.

## 9. Report Filter Pattern

`FilterBar` gồm: Kỳ quỹ · Khoảng ngày · Loại báo cáo · Nguồn quỹ · Thành viên · Trạng thái thanh toán · Nhóm · Reset filter.

- **Mobile:** Filter Bottom Sheet.
- **Filter no-result:** `EmptyState` + reset CTA.

## 10. Financial Report Pattern

Gồm: Tổng thu · Tổng chi · Quỹ Chính · Quỹ Phụ · Số dư chuyển kỳ · Công nợ · Chi phí theo danh mục · Thu theo nguồn · Giao dịch gần đây.

> **Không tự tính lại** nếu backend summary có sẵn. **Không trộn Quỹ Phụ vào tài sản CLB.**

## 11. Member Report Pattern

Gồm: Tổng thành viên · Đang hoạt động · Tạm ngưng · Đã rời CLB · Tình trạng tài khoản · Tình trạng đóng quỹ · Thành viên chưa đóng · Thành viên hoạt động nhiều/ít (nếu data có).

> **Không** tạo ranking giả nếu chưa có dữ liệu.

## 12. Attendance Report Pattern

Gồm: Tổng lượt chơi · Số buổi trong kỳ · Tỷ lệ tham gia · Thành viên tham gia nhiều/ít · Chi phí bình quân/lượt (nếu backend summary có) · Attendance chart (nếu có data).

> **Không tự tính** attendance formula nếu backend/store có summary.

## 13. Personal Receipt Pattern

Nếu có phiếu thu cá nhân:

- Chỉ dùng **backend personal receipt endpoint/calculator hiện có**.
- **Không tự tính frontend.**
- Hiển thị preview **read-only**.
- Export/print (nếu hiện có).
- Empty state nếu chưa có dữ liệu.

## 14. Export / PDF / Print Pattern

Export actions: PDF · Excel · Print.

Bắt buộc:

- **Chỉ gọi hàm/API/export hiện có**; không tạo logic export mới nếu backend chưa hỗ trợ.
- **Không hard-code dữ liệu export.**
- Trạng thái **loading** khi export; **error state** khi export lỗi.

## 15. Report Preview Pattern

- **Desktop:** report summary card · chart area · `DataTable` · export panel.
- **Mobile:** report summary cards · chart cards · data cards · bottom sheet detail.

> **Không table ngang trên mobile.**

## 16. Charts / Visualization Pattern

Nếu data có (bọc trong `ChartCard`): thu/chi theo kỳ · cơ cấu chi phí · công nợ · attendance trend · member activity · fund distribution.

- Chưa có → `EmptyState`, **không chart giả**.
- Chart phải: có title/subtitle · tooltip rõ · data-viz constants/token · không quá nhiều màu.

## 17. AI Reports Insight Pattern

Nếu có Maika/Lisa insight (tone `ai`, read-only): summary · anomaly · recommendation · suggested action · human review · not executed.

> **Không:** tự tạo báo cáo · tự gửi báo cáo · tự sửa số liệu · tự execute notification · tự approve finance.

## 18. Loading / Empty / Error States (Amendment #01 — bắt buộc)

- **Loading:** shared `LoadingState`; initial load; refresh/filter/export (nếu có).
- **Empty:** no report data · no financial data · no member data · no attendance data · **filter no-result** · no chart data.
- **Error:** icon · title · description · retry; retry dùng **API hiện có**; **không** tạo endpoint mới.

> Thiếu state → UI-05 **không được** ghi `READY FOR CODEX UI AUDIT`.

## 19. Desktop Pattern

Phải có: PageHeader · Report Type Tabs · KPI Summary · FilterBar · Preview Area · DataTable · Charts · Export Actions · Detail Drawer (nếu có). **Không overflow ngang.**

## 20. Mobile Pattern

Phải có: KPI compact · Report tabs scroll ngang · Filter bottom sheet · Report preview cards · Chart cards · Data cards · Export actions · Detail bottom sheet (nếu có). **Không** table ngang · **không** mất export/filter/report type.

## 21. Accessibility

- Icon-only button có `aria-label`.
- Tabs có trạng thái active.
- Report section có heading · chart có title/description · table có header.
- Status có text · amount có dấu +/− nếu là tiền.
- Focus visible · touch target ≥ 40px · error có retry rõ ràng.

## 22. Visual Quality Gate — VDS-01

Mọi UI-05 implementation phải đạt: Không giống CRUD template · Visual hierarchy rõ · Spacing đồng đều · Typography đúng cấp · Cards premium · KPI dễ scan · Table dễ đọc · Mobile giống app thật · Loading/Empty/Error đẹp · AI UI không noisy · Finance/Reports UI chính xác · Không hard-code màu · Giữ accessibility.

> **Visual Quality Score phải ≥ 95/100.** Nếu < 95 → redesign tiếp, **không** ghi `READY FOR CODEX UI AUDIT`.

## 23. Visual Score Gate

UI-05 implementation phải tự chấm: Functionality /100 · Architecture /100 · Accessibility /100 · Design Consistency /100 · Visual Quality /100.

> Nếu **Visual Quality < 95** → **không** gửi Codex audit.

## 24. Shared Component Mapping

| Pattern | Component |
|---|---|
| Container | `PageShell` |
| Header | `PageHeader` |
| KPI | `MetricCard` |
| Report tabs | `ResponsiveTabs` |
| Filter/Search | `FilterBar` |
| Bảng báo cáo (desktop) | `DataTable` |
| Danh sách (mobile) | `MobileCardList` |
| Trạng thái | `StatusBadge` |
| Nút hành động | `ActionButton` |
| Rỗng | `EmptyState` |
| Đang tải | `LoadingState` |
| Chart | `ChartCard` |

> Nếu UI-05 cần component mới → **chỉ** tạo reports-specific; **không** trùng shared; dùng `--pf-*` token; phải đạt **VDS-01 visual bar**.

## 25. Business Logic Boundaries

UI-05 **không được** đổi: reports/finance/personal-receipt/attendance/fund-period **API contract** · report/finance/receipt **calculation logic** · fund separation logic · export logic (nếu backend đã có) · permission logic · DB schema.

> UI chỉ **render dữ liệu hiện có**.

## 26. UI-05 Scope Preview

Sau khi UIP-05 Codex PASS, UI-05 **được phép**: rewrite màn Reports Center · nâng cấp Desktop/Mobile UI · reuse shared components · cập nhật `PROJECT_STATUS`.

UI-05 **không được**: sửa backend · thêm API mới · sửa DB · đổi công thức báo cáo · đổi logic finance · **tự tính phiếu thu** · mở UI-06.

## 27. Decision

**Đề xuất:** UIP-05 chọn **Reports Center Pattern** làm chuẩn cho UI-05.

UI-05 **chỉ** được mở sau: UIP-05 Codex PASS · Commit · Tag · Push.

---

> 🧾 UIP-05 v1.0 — Reports Center Pattern (✅ Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-05 triển khai ở increment riêng (🟢 READY TO START, theo Amendment #02), sau khi UIP-05 PASS. Tokens/components theo UDP-01/DESIGN-01, Workspace State theo Amendment #01, Visual Quality theo VDS-01, governance theo GOV-01. **Reports/finance logic bất biến — UI không đổi công thức, không tự tính phiếu thu.**
