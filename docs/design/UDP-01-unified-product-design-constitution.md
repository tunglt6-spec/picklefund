# UDP-01 — Unified Product Design Constitution

> **Single Source of Truth cho thiết kế (Design Source of Truth)** của PickleFund & các sản phẩm AI. Mọi màn hình/triển khai UI **chỉ tham chiếu** UDP-01 — không định nghĩa lại Design Rules ở nơi khác. Bổ trợ cho [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md) (Project Governance); GOV-01 vẫn là nguồn quản trị tối cao.

**Phiên bản:** v1.0 · **Status:** Accepted (Design Baseline) · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

---

## 1. Mục tiêu & phạm vi

UDP-01 quy định **ngôn ngữ thiết kế thống nhất**: sáng · sạch · hiện đại · thương mại · nhiều khoảng trắng · card trắng · sidebar chuyên nghiệp · icon mềm · **xanh PickleFund chủ đạo** · accent theo module. Áp dụng cho 14 màn hình (Tổng quan, Thành viên, Kỳ Quỹ, Thu Quỹ, Chi Phí, Điểm danh, Sân & Lịch, Minigame, Báo Cáo, Lisa AI, Thông báo, TK Thành viên, Gói dịch vụ, Cài đặt) và mọi màn hình tương lai.

> UDP-01 **không** thay đổi backend/logic/finance/execution. Chỉ là chuẩn UI/UX.

## 2. Design Tokens (nguồn: `frontend/src/index.css`, namespace `--pf-*`)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--pf-bg` | `#F7F9FC` | nền app |
| `--pf-surface` | `#FFFFFF` | card |
| `--pf-border` | `#E8EDF3` | viền nhẹ |
| `--pf-text` / `--pf-text-muted` | `#0F172A` / `#64748B` | chữ |
| `--pf-green` / `-hover` / `-soft` | `#059669` / `#047857` / `#ECFDF5` | **brand primary** |
| `--pf-accent-blue/violet/amber/rose/teal` (+ `-soft`) | theo module | accent phụ |
| `--pf-radius / -lg / -xl` | `16 / 20 / 24px` | bo góc |
| `--pf-shadow / -hover` | soft | đổ bóng |

**Semantic Color Tokens** (shared components **bắt buộc** dùng cho màu nền/chữ/border/focus chính):

| Token | Dùng cho |
|---|---|
| `--pf-color-primary` / `--pf-color-primary-soft` | hành động chính / nền mềm primary |
| `--pf-color-success` / `--pf-color-success-soft` | trạng thái thành công |
| `--pf-color-warning` / `--pf-color-warning-soft` | cảnh báo |
| `--pf-color-danger` / `--pf-color-danger-soft` | lỗi / âm |
| `--pf-color-info` / `--pf-color-info-soft` | thông tin |
| `--pf-color-ai` / `--pf-color-ai-soft` | tín hiệu AI (Maika/Lisa) |
| `--pf-color-muted` / `--pf-color-muted-soft` | chữ phụ / nền neutral |
| `--pf-text-on-primary` | chữ trên nền primary/green |
| `--pf-border-soft` | viền rất nhẹ (row divider) |
| `--pf-focus-ring` | ring/box-shadow khi focus |

> Tokens là **bất biến tham chiếu** — component dùng `var(--pf-*)`, **không hard-code mã màu** và **không dùng Tailwind color utilities cho màu semantic** (giữ Tailwind cho layout/spacing/flex/grid). Màu nền/chữ/border/focus chính trong shared components phải map qua semantic tokens ở trên.

## 3. Accent theo module

Green (Tổng quan/brand) · Blue (Thành viên/TK) · Violet (Minigame/Lisa) · Amber (Chi phí/cảnh báo) · Rose (công nợ/âm) · Teal (Báo cáo/Sân lịch). Helper: `accentVars(accent)` trong `components/shared/tokens.ts`.

## 4. Layout

- **Desktop:** Sidebar trái cố định + Header trên cùng + nội dung trong `PageShell` (max-width 1440, nhiều khoảng trắng).
- **Mobile:** Drawer/hamburger (cùng menu Sidebar) + Bottom Navigation. Header có hamburger.
- **Header (`PageHeader`):** tiêu đề + mô tả ngắn + slot phụ (weather/next match) + chuông + primary action.

## 5. Visual style

Background sáng `--pf-bg` · card trắng radius 16–24 · border `--pf-border` · shadow mềm · **không gradient đậm tràn lan** · **không UI tối màu** · hover nhẹ trên desktop.

## 6. Typography

Inter (body) / Poppins (heading). Heading đậm dễ đọc · KPI number lớn (`text-2xl`+ `tabular-nums`) · table text gọn · mobile font ≥ 13px.

## 7. Card system

`MetricCard`: icon badge accent + label + value lớn + sub/trend; **số âm → màu rose** (`negative`). `ChartCard`: title + subtitle + actions + body. Không nhồi quá nhiều text trong một card.

## 8. Tables

`DataTable` (generic): header nhẹ uppercase · row thoáng · render tuỳ biến (avatar/StatusBadge/actions) · tự cuộn ngang trong container. **Mobile:** chuyển sang `MobileCardList` (cùng dữ liệu — Feature Parity).

## 9. Filter / Search

`FilterBar`: search bo tròn + filters (desktop hàng ngang) + view toggle. **Mobile:** nút "Bộ lọc" mở drawer.

## 10. States

`EmptyState` (icon mềm + title + mô tả + action) · `LoadingState` (skeleton cards/list) · lỗi dùng StatusBadge/thông điệp. Không để màn hình trống vô nghĩa.

## 11. Responsive (bắt buộc verify)

320 · 375 · 414 · 768 · 1024 · 1280 · 1440. **Không** overflow ngang · **không** cắt chữ · **không** mất menu/chức năng.

## 12. Feature Parity Rule (tham chiếu GOV-01 Rule 11)

Desktop có chức năng → Mobile truy cập được (layout có thể khác). Sidebar = Mobile Drawer (cùng menu) · Action = header/floating/drawer · Filter = filter drawer · Table = card list · Export/các module (Lisa AI, TK Thành viên, Gói dịch vụ, Cài đặt) **không được thiếu** trên mobile.

## 13. Accessibility baseline

Tương phản đủ (text trên nền sáng) · target chạm ≥ 36px · `aria-label` cho nút icon · focus ring rõ · không truyền tải thông tin chỉ bằng màu (kèm icon/label).

## 14. Shared Component Library (`frontend/src/components/shared/`)

`PageShell · PageHeader · MetricCard · ChartCard · DataTable · FilterBar · StatusBadge · ActionButton · EmptyState · LoadingState · MobileCardList · ResponsiveTabs` (+ `accentVars`). Đây là **nền tảng reusable** — mọi màn hình dựng từ đây, không copy UI rời rạc.

## 15. Ràng buộc nghiệp vụ (không đổi)

UI **không** đổi công thức tài chính (vd Tổng tài sản CLB = Quỹ Chính + chuyển kỳ, **không** cộng Quỹ Phụ) · không hard-code số liệu làm sai nghiệp vụ · không hiển thị AI "đã execute" khi backend chỉ read/propose.

## 16. Rollout (gated, theo GOV-01)

UI Refresh Program triển khai **theo increment** (mỗi increment = 1 bước gated → Codex Audit → commit/tag):

| Increment | Nội dung | Trạng thái |
|---|---|---|
| **Foundation** | UDP-01 + design tokens + shared components | ✅ **Codex PASS / CLOSED** (freeze: [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md)) |
| **UI-02 — Dashboard 4.0** | Áp dụng UDP-01 cho màn Tổng quan | 🟢 READY TO START (chưa triển khai) |
| Screens nhóm sau… | 14 màn hình áp dụng UDP-01 | ⬜ increment sau |

---

> 🧾 UDP-01 v1.0 — Design Source of Truth. Thay đổi Design Rules phải qua **UDP update** (UDP-01 v1.1/v2.0) + Codex Audit; không sửa rải rác. Tuân thủ GOV-01 (governance) — UDP-01 chỉ phụ trách design.
