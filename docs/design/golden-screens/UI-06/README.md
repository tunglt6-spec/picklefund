# Golden Screenshot Baseline — UI-06 Tournament Center

> Golden Screenshot Baseline (Working Rule từ UI-06 trở đi) cho màn **Tournament Center** (`/minigames`, [MinigameList.tsx](../../../../frontend/src/pages/admin/minigame/MinigameList.tsx)). Dùng làm chuẩn so sánh hồi quy visual cho các increment sau.

**Increment:** UI-06 — Tournament Center Enterprise Implementation · **Codex Audit:** PASS · **Ngày:** 2026-07-01

## Baseline viewports

| File | Viewport | Nội dung kỳ vọng |
|---|---|---|
| `desktop-1440.png` | 1440 × 900 | Sidebar + PageHeader "Giải đấu" + 6 KPI (Số giải đấu / Đang diễn ra / Hoàn thành / Tổng người chơi / Tổng trận / Trận hoàn thành) + Mode Tabs + FilterBar + DataTable danh sách giải (format badge · thời gian · người/bảng/trận · progress · status · actions) |
| `mobile-390.png` | 390 × 844 | Drawer/hamburger (AdminLayout) + KPI 2-cột + Mode tabs scroll ngang + FilterBar + tournament cards + sticky FAB "Tạo minigame" |

## Verification đã thực hiện (UI-06 implementation)

- ✅ Desktop 1440: table fit, sidebar, không overflow ngang — đã chụp xác nhận trực quan.
- ✅ Mobile 320 / 390: card list + FAB, không overflow ngang.
- ✅ Tablet 768: table, không overflow.
- ✅ Console: không lỗi runtime.
- ✅ 4 giải đấu demo render đúng (format badge, progress, status, actions).

## Trạng thái capture

> ⚠️ **PENDING real capture.** Môi trường Claude Code hiện tại có thể **chụp preview để verify trực quan** (đã làm), nhưng **không có công cụ ghi file nhị phân (.png)** vào repo từ output screenshot. Do đó `desktop-1440.png` và `mobile-390.png` **chưa được lưu dưới dạng ảnh thật** trong thư mục này.
>
> - **Không fake ảnh** (theo yêu cầu).
> - Ảnh golden thật sẽ được thêm khi có công cụ persist screenshot (thủ công hoặc CI capture).
> - README này giữ chỗ + đặc tả baseline để đối chiếu.
