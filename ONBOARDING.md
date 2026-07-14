# Onboarding — PickleFund

Nền tảng quản lý CLB thể thao (pickleball): quỹ, thành viên, điểm danh, minigame,
báo cáo, chấm điểm và trợ lý AI. Tài liệu này giúp người/agent mới nắm nhanh hệ thống.

## Tổng quan kỹ thuật
- **Frontend**: React 19 + Vite 8 + TypeScript + TailwindCSS 4 + Zustand + TanStack Query, PWA (`vite-plugin-pwa`). Version `2.2.0`. Thư mục `frontend/`.
- **Backend**: NestJS 11 + Prisma 6 (PostgreSQL) + socket.io + Bull/Redis + JWT (passport). Thư mục `backend/`.
- **Hạ tầng**: Docker Compose (postgres, redis, backend, frontend, nginx) sau **Cloudflare**. Domain `app.picklefund.uk` (SPA + `/api`), `api.picklefund.uk`.

## Chạy & triển khai
- **Dev local**: xem `frontend/` và `backend/` (mỗi bên có `npm run dev` / `npm run start:dev`).
- **Build kiểm tra**: `cd backend && npm run build`; `cd frontend && npm run build`.
- **Deploy = push lên `main`** → GitHub Actions (`.github/workflows/deploy.yml`) chạy test → build image lên GHCR → SSH vào VPS `docker compose pull` + `up -d`. **VPS chỉ pull image, không build.**
- Theo dõi pipeline: `gh run watch <id> --repo tunglt6-spec/picklefund` (gh CLI đã cài tại `C:\Program Files\GitHub CLI\gh.exe`).

## Phân quyền (RBAC)
- 4 role: `SUPER_ADMIN`, `CLUB_ADMIN`, `CLUB_TREASURER`, `MEMBER_VIEW` ("thành viên"). **Không có hệ thống permission** — thuần role.
- Guard toàn cục: `JwtAuthGuard → TenantGuard → RolesGuard (@Roles) → MemberScopeGuard` (allowlist route cho MEMBER_VIEW).
- Cho member xem thêm màn: sửa `MemberScopeGuard` allowlist + `@Roles` controller + FE (`App.tsx` route group, `Sidebar.tsx`/`BottomNav.tsx`, cờ `isMember`). Read-only ẩn nút CRUD theo `isMember`.

## Trợ lý AI 🤖
**Xem chi tiết: [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md)** — đọc trước khi động vào code AI.

Tóm tắt: có **3 lớp AI tách biệt**:
1. **Lisa & Maika** (đang chạy) — gọi **Google Gemini trực tiếp** qua env `GEMINI_MODEL` / `GEMINI_MODEL_LITE` (mặc định `gemini-3.5-flash` / `gemini-3.1-flash-lite`), fallback OpenRouter → rule-based. Cần `GOOGLE_API_KEY`.
2. **AI Harness `/ai/chat`** (SUPER_ADMIN) — LiteLLM, default `claude-sonnet-4-6` (chưa chắc bật production).
3. **Gateway `maika-lisa-ai-gateway/`** — LiteLLM đa provider + Sonnet 5 A/B, **CHƯA deploy**.

⚠️ Model của nhà cung cấp có vòng đời — **luôn đọc model từ env** để đổi nhanh không build lại. Nhiều tính năng "AI" (health score, anomaly, reminders, Hermes, embedding) thực chất là **rule-based**.

## Lưu ý vận hành hay gặp
- **PWA cache**: khi deploy xong mà client vẫn thấy bản cũ → do service worker/Cloudflare cache. `index.html`/`sw.js`/`registerSW.js`/`manifest` đã set `no-cache` ở `frontend/nginx.conf`; client kẹt cần dọn site data 1 lần.
- **502 production**: kiểm `df -h /` trước (từng do VPS đầy đĩa) rồi mới debug.
- Không commit trực tiếp trên VPS; mọi thay đổi qua `main` + pipeline.

## Tài liệu liên quan
- Kiến trúc AI as-built: `docs/AI_ARCHITECTURE.md`
- Thiết kế AI (lý thuyết V2.1): `docs/V2.1_AI_BRAIN/`
- Tổng quan tài liệu: `docs/README.md`, `docs/PROJECT_STATUS.md`
