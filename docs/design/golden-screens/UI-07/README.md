# Golden Screenshot Baseline — UI-07 AI Workspace (Increment 1, read-only)

> Golden Screenshot Baseline cho màn **AI Workspace** ([AIWorkspace.tsx](../../../../frontend/src/pages/admin/AIWorkspace.tsx)). Increment 1 = read-only. Dùng làm chuẩn so sánh hồi quy visual cho các increment sau.

**Increment:** UI-07 Increment 1 — AI Workspace Read-only · **Codex Audit:** PASS · **Ngày:** 2026-07-01

## Baseline viewports

| File | Viewport | Nội dung kỳ vọng |
|---|---|---|
| `desktop-1440.png` | 1440 × 900 | Sidebar + PageHeader "AI Workspace" + governance badge "Read-only · Human approval" + 7 AI Tabs + 6 KPI official (AI Requests / Successful Responses / Pending Approval / Knowledge Sources / Connected Tools / Health Status) + Insight + Approval Queue (read-only) |
| `mobile-390.png` | 390 × 844 | Drawer/hamburger + AI tabs scroll ngang + KPI 2-cột + insight/empty cards + Tool Status cards |

## Verification đã thực hiện (Increment 1)

- ✅ Desktop 1440: 7 tabs, 6 KPI, governance badge, sidebar, không overflow — chụp xác nhận trực quan.
- ✅ Mobile 320 / 390: tabs scroll ngang, cards, không overflow.
- ✅ Tab "Trạng thái công cụ": 6 công cụ + Memory (LiteLLM/OpenRouter/Ollama/Telegram/Email/Backend API) render read-only.
- ✅ **AI Safety:** 0 nút Execute/Run/Approve/Dispatch/Duyệt/Từ chối/Thực thi.
- ✅ Console: không lỗi runtime.
- ✅ Local session → KPI official "Chưa có dữ liệu (backend)" (không fake).

## Trạng thái capture

> ⚠️ **PENDING real capture.** Môi trường Claude Code chụp preview để **verify trực quan** (đã làm), nhưng **không có công cụ ghi file nhị phân (.png)** vào repo từ output screenshot. Do đó `desktop-1440.png` / `mobile-390.png` **chưa lưu ảnh thật**.
>
> - **Không fake ảnh** (theo Working Rule).
> - Ảnh golden thật thêm khi có công cụ persist (thủ công / CI capture).
> - README này giữ chỗ + đặc tả baseline để đối chiếu.

## Ghi chú routing

Increment 1 tạo `AIWorkspace.tsx` (read-only). Wiring route để lộ diện trong app là việc của increment sau (Increment 1 giữ routing bất biến theo yêu cầu). Preview verify được thực hiện qua route tạm rồi revert (App.tsx net-zero).
