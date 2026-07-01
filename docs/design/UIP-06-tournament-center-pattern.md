# UIP-06 — Tournament Center Pattern

> **Design Pattern Document** cho nhóm chức năng **Minigame / Tournament / Random Doubles / League Table** của PickleFund — chuẩn hóa thiết kế trước khi triển khai **UI-06 (Tournament Center Implementation)**. **KHÔNG** phải Constitution mới, **KHÔNG** thay thế [UDP-01](UDP-01-unified-product-design-constitution.md) / [VDS-01](VDS-01-visual-design-system-v2.1.md) / [DASH-01](DASH-01-enterprise-dashboard-pattern.md) / các Amendment. Kế thừa UDP-01 (Design SoT) + [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) + [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) + [VDS-01](VDS-01-visual-design-system-v2.1.md) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) + [DASH-01](DASH-01-enterprise-dashboard-pattern.md); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). UI-02 = Golden Reference; UIP-03/04/05 = precedent.

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

> 🎨 **Design Skill Bootstrap (Reality Filter):** Các Taste Skills (design-taste-frontend-v1 · high-end-visual-design · stitch-design-taste · redesign-existing-projects · minimalist-ui) **được áp dụng như nguyên tắc thiết kế tham chiếu theo [VDS-01](VDS-01-visual-design-system-v2.1.md)**. Đây là tài liệu pattern (docs-only, không code) nên không invoke skill code-gen; ưu tiên chất lượng visual theo VDS-01, **không claim đã nạp skill**.

---

## 1. Trạng thái

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Pattern Document
- **Scope:** Tournament Center / Minigame Center
- **Implementation:** Not Started
- **UI-06:** 🟢 READY TO START (chưa mở implementation)

> - UIP-06 **đã Accepted** (Codex PASS).
> - UI-06 **chưa triển khai** — READY TO START, mở ở increment riêng (theo Amendment #02).
> - Đây **chỉ** là pattern document (docs-only), không phải code.
> - **Tournament/minigame logic KHÔNG được thay đổi** trong UIP/UI.

## 2. Mục tiêu

Chuẩn hóa **Tournament Center** thành màn hình enterprise cho: Minigame Đánh Đôi Ngẫu Nhiên · Random Doubles · Smart Draw · Group/Pool · Match Schedule · Match Result Entry · Leaderboard/League Table · Player Stats · Team/Pair Rotation · Tournament Control Center · Mini Fund linkage (nếu hiện có) · Loading/Empty/Error states · Desktop/Mobile Feature Parity.

## 3. Quan hệ với Design Baseline

Tham chiếu (không định nghĩa lại): [UDP-01](UDP-01-unified-product-design-constitution.md) · [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Loading/Empty/Error DoD) · [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) (Design Pattern First) · [VDS-01](VDS-01-visual-design-system-v2.1.md) (Visual Quality Gate) · [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) · [DASH-01](DASH-01-enterprise-dashboard-pattern.md) · UI-02 (Golden Reference) · [UIP-03](UIP-03-member-workspace-pattern.md) · [UIP-04](UIP-04-finance-workspace-pattern.md) · [UIP-05](UIP-05-reports-center-pattern.md).

**Không** định nghĩa lại: Design Tokens · Shared Components · Governance Rules · Dashboard Constitution · Visual Constitution.

## 4. Tournament Business Invariants

UI-06 **KHÔNG được** thay đổi:

- Tournament/minigame business logic · Random draw algorithm · Smart draw algorithm
- Scoring rules · League table calculation · Ranking/tiebreak logic
- Match result validation · Player rotation/fairness logic
- Mini Fund logic · Attendance logic · Member logic · API contract · Database schema

**Bất biến bắt buộc:**

- UI chỉ **render dữ liệu hiện có**.
- UI **không tự tính lại** bảng xếp hạng nếu backend/store selector đã có.
- UI **không tự sinh cặp đấu mới** nếu backend chưa hỗ trợ.
- UI **không tự xác nhận kết quả trận**.
- UI **không tự trừ/cộng Mini Fund**.
- UI **không hard-code** kết quả, điểm số hoặc người thắng.
- Thiếu dữ liệu → "Chưa có dữ liệu", **không bịa tournament state**.
- Smart Draw / Random Draw chỉ **gọi flow hiện có** nếu backend/store đã hỗ trợ.
- Chưa có backend action → action phải **ẩn hoặc disabled có lý do**.

## 5. Tournament Center Layout

**Desktop:** `PageShell` → `PageHeader` → Tournament Mode Tabs → KPI Summary Row → Control Panel → Match Schedule/Bracket/Group Board → Leaderboard Table → Player Stats → Match Detail Drawer → Result Entry Panel (nếu backend hỗ trợ) → AI Suggestion/Smart Draw Insight (nếu có) → Loading/Empty/Error states.

**Mobile:** MobileHeader → Drawer navigation (full menu) → tournament mode tabs scroll ngang → KPI compact cards → control actions → match cards → leaderboard cards → player stats cards → match detail bottom sheet → result entry bottom sheet (nếu backend hỗ trợ) → sticky primary action (nếu phù hợp).

## 6. PageHeader Pattern

- **Title:** "Giải đấu" (hoặc "Tournament Center")
- **Subtitle:** "Quản lý minigame, bốc cặp, lịch đấu, kết quả và bảng xếp hạng của CLB."
- **Header actions:** Tạo minigame · Bốc cặp · Nhập kết quả · Xuất bảng xếp hạng · Cấu hình thể thức (nếu chức năng hiện có).

> **Không** hiển thị action không có backend hỗ trợ.

## 7. Tournament Mode Tabs

`ResponsiveTabs`: Tổng quan · Đánh đôi ngẫu nhiên · Lịch đấu · Bảng xếp hạng · Người chơi · Kết quả · Quỹ Game (nếu hiện có) · Cài đặt thể thức (nếu hiện có).

- **Mobile:** tabs scroll ngang · không mất tab · **không ép table ngang**.

## 8. KPI Summary Pattern

KPI (nếu data có, map `MetricCard`): Số người chơi · Số cặp/đội · Số trận · Trận đã hoàn thành · Trận chờ kết quả · Người dẫn đầu · Điểm cao nhất · Quỹ Game (nếu liên kết Mini Fund hiện có).

> Thiếu dữ liệu → "Chưa có dữ liệu"; không tự tính nếu backend/store có summary chính thức.

**KPI phải phân biệt:** **official tournament summary** vs **filtered preview metric** (ghi rõ "đang lọc", không phải số liệu chính thức).

## 9. Control Panel Pattern

Gồm: Chọn kỳ/ngày thi đấu · Chọn thể thức · Chọn danh sách người chơi · Bốc cặp · Tạo vòng đấu · Khóa vòng đấu (nếu có) · Nhập kết quả · Xuất kết quả.

Nguyên tắc: action ghi dữ liệu **chỉ hiển thị nếu backend hỗ trợ** · action nguy hiểm phải có **confirmation** · **không auto-run** · **không AI execute** · chưa hỗ trợ backend → **disabled + helper text**.

## 10. Random Doubles Pattern

Hiển thị: danh sách người chơi · trạng thái tham gia · nhóm/pool (nếu có) · cặp đấu · lịch trận · lịch sử bốc cặp · fairness indicator (nếu data có) · người chờ lượt (nếu có).

> **Không tự tạo cặp đấu ở frontend** nếu backend chưa hỗ trợ.

## 11. Smart Draw Pattern

Nếu có Smart Draw: hiển thị như **recommendation** · giải thích tiêu chí · fairness note · preview cặp đấu · human review · confirm button (nếu backend hỗ trợ).

> **Không:** tự execute · tự ghi DB · tự gửi thông báo · tự trừ quỹ.

Pattern:
```
AI/Smart Suggestion → Preview → Human Review → Confirm via existing backend flow
```

## 12. Match Schedule Pattern

**Desktop** — `DataTable` columns: Vòng · Sân · Thời gian · Cặp/đội A · Cặp/đội B · Trạng thái · Kết quả · Actions.

**Mobile** — Match cards: round · teams · status · score · time/court · action.

> **Không table ngang trên mobile.**

## 13. Match Result Pattern

Nếu nhập kết quả có backend hỗ trợ: score input rõ · validation · confirm · pending/saved/error states · edit (nếu có quyền) · audit note (nếu có).

> **Không** sửa scoring logic. **Không** tự tính ranking nếu backend có selector.

## 14. Leaderboard Pattern

**Desktop** — `DataTable` columns: Hạng · Người chơi · Số trận · Thắng · Thua · Điểm · Hiệu số (nếu có) · Trạng thái · Actions.

**Mobile** — Leaderboard cards: rank badge · player · points · record · movement (nếu có).

> **Không hard-code ranking.**

## 15. Player Stats Pattern

Hiển thị (nếu có data): số trận · thắng/thua · điểm · đối tác thường gặp · tỷ lệ tham gia · fairness/rotation · form gần đây (nếu có).

> **Không** tạo thống kê giả.

## 16. Mini Fund Linkage Pattern

Nếu Tournament liên kết Quỹ Game / Mini Fund:

- Chỉ hiển thị **read-only** hoặc action **backend-supported**.
- **Không tự cộng/trừ tiền** · **không trộn vào Quỹ Chính** · **không tính vào Tổng tài sản CLB** · phải **ghi rõ nguồn quỹ**.
- Thiếu dữ liệu → "Chưa có dữ liệu".

## 17. Charts / Visualization Pattern

Nếu data có (bọc trong `ChartCard`): điểm theo người chơi · tiến độ trận · tỉ lệ thắng · phân bổ trận · fairness/rotation · Mini Fund trend (nếu có).

- Chưa có → `EmptyState`, **không chart giả**.
- Chart phải: có title/subtitle · tooltip rõ · data-viz constants/token · không quá nhiều màu.

## 18. AI / Smart Insight Pattern

Nếu có Maika/Lisa insight (tone `ai`, read-only): recommendation · suggested draw · fairness warning · anomaly detection · human review · not executed.

> **Không:** tự bốc cặp · tự tạo trận · tự ghi kết quả · tự cập nhật bảng xếp hạng · tự gửi thông báo · tự thao tác quỹ.
>
> ⚠️ **Nếu cho phép AI execute tournament action → CRITICAL FAIL trong Codex.**

## 19. Loading / Empty / Error States (Amendment #01 — bắt buộc)

- **Loading:** shared `LoadingState`; initial load; refresh/filter/draw-result (nếu có).
- **Empty:** no tournament · no players · no matches · no leaderboard · no stats · **filter no-result** · no chart data.
- **Error:** icon · title · description · retry; retry dùng **API hiện có**; **không** tạo endpoint mới.

> Thiếu state → UI-06 **không được** ghi `READY FOR CODEX UI AUDIT`.

## 20. Desktop Pattern

Phải có: PageHeader · Mode Tabs · KPI Summary · Control Panel · Schedule/Table · Leaderboard · Stats · Charts · Detail Drawer · Action panel (nếu backend hỗ trợ). **Không overflow ngang.**

## 21. Mobile Pattern

Phải có: KPI compact · mode tabs scroll ngang · control actions · match cards · leaderboard cards · player cards · chart cards · detail bottom sheet · result entry bottom sheet (nếu có). **Không** table ngang · **không** mất action chính/leaderboard/match detail.

## 22. Accessibility

- Icon-only button có `aria-label` · tabs có trạng thái active · tournament section có heading.
- Chart có title/description · table có header · status có text · score có label.
- Focus visible · touch target ≥ 40px · error có retry rõ ràng · form nhập kết quả có label.

## 23. Visual Quality Gate — VDS-01

Mọi UI-06 implementation phải đạt: Không giống CRUD template · Visual hierarchy rõ · Spacing đồng đều · Typography đúng cấp · Cards premium · KPI dễ scan · Table dễ đọc · Tournament cards sinh động nhưng không rối · Mobile giống app thật · Loading/Empty/Error đẹp · AI/Smart Draw không noisy · Mini Fund rõ ràng/chính xác · Không hard-code màu · Giữ accessibility.

> **Visual Quality Score phải ≥ 95/100.** Nếu < 95 → redesign tiếp, **không** ghi `READY FOR CODEX UI AUDIT`.

## 24. Visual Score Gate

UI-06 implementation phải tự chấm: Functionality /100 · Architecture /100 · Accessibility /100 · Design Consistency /100 · Visual Quality /100.

> Nếu **Visual Quality < 95** → **không** gửi Codex audit.

## 25. Shared Component Mapping

| Pattern | Component |
|---|---|
| Container | `PageShell` |
| Header | `PageHeader` |
| KPI | `MetricCard` |
| Mode tabs | `ResponsiveTabs` |
| Filter/Search | `FilterBar` |
| Bảng (desktop) | `DataTable` |
| Danh sách (mobile) | `MobileCardList` |
| Trạng thái | `StatusBadge` |
| Nút hành động | `ActionButton` |
| Rỗng | `EmptyState` |
| Đang tải | `LoadingState` |
| Chart | `ChartCard` |

> Component mới → **chỉ** tournament-specific; **không** trùng shared; dùng `--pf-*` token; đạt **VDS-01 visual bar**.

## 26. Business Logic Boundaries

UI-06 **không được** đổi: tournament/minigame · draw · result · leaderboard · member · attendance · mini fund **API contract** · scoring/ranking logic · random/smart draw logic · mini fund separation logic · permission logic · DB schema.

> UI chỉ **render dữ liệu hiện có** và **gọi flow hiện có** nếu được hỗ trợ.

## 27. UI-06 Scope Preview

Sau khi UIP-06 Codex PASS, UI-06 **được phép**: rewrite màn Tournament/Minigame Center · nâng cấp Desktop/Mobile UI · reuse shared components · cập nhật `PROJECT_STATUS`.

UI-06 **không được**: sửa backend · thêm API mới · sửa DB · đổi thuật toán bốc cặp · đổi luật tính điểm · đổi bảng xếp hạng · thao tác Mini Fund ngoài backend · mở UI-07.

## 28. Decision

**Đề xuất:** UIP-06 chọn **Tournament Center Pattern** làm chuẩn cho UI-06.

UI-06 **chỉ** được mở sau: UIP-06 Codex PASS · Commit · Tag · Push.

---

> 🧾 UIP-06 v1.0 — Tournament Center Pattern (✅ Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-06 triển khai ở increment riêng (🟢 READY TO START, theo Amendment #02), sau khi UIP-06 PASS. Tokens/components theo UDP-01/DESIGN-01, Workspace State theo Amendment #01, Visual Quality theo VDS-01, governance theo GOV-01. **Tournament/minigame/scoring/ranking/draw/Mini Fund logic bất biến — UI không đổi thuật toán, không tự thao tác quỹ, không AI execute.**
