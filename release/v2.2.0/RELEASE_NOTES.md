# PickleFund v2.2.0 — Release Notes (GA / Commercial)

**Phiên bản:** v2.2.0
**Loại:** General Availability (thương mại)
**Base:** v2.1.0
**Prod:** backend `https://api.picklefund.uk` · frontend `https://app.picklefund.uk`

---

## Điểm nổi bật

### UI/UX — Clean Modern SaaS
- Toàn app tokenize `--pf-*` (primary tím **#6D5DFB**, secondary xanh #22C55E, accent cam #F97316); light theme; card bo góc 16–20px; shadow nhẹ.
- Shared-kit đồng nhất (PageShell/PageHeader/MetricCard/DataTable/MobileCardList/StatusBadge/Empty·Loading·ErrorState...).
- Responsive desktop/mobile; bảng cuộn ngang trên mobile; touch target ≥44px.

### Member Portal mở rộng (MEMBER_VIEW)
- 8 màn dùng chung: Công nợ, Lịch sinh hoạt, Đăng ký buổi, Check-in nhanh, Hoạt động tuần, Minigame, Lịch sử thi đấu, Dashboard tài chính.
- Self-scope: member tự RSVP/check-in **chỉ cho chính mình** (validate `assertMember` — chống token stale).
- Ủy quyền minigame: admin cho phép member cụ thể quản lý giải (`Club.settings.minigameDelegateMemberIds` + `MinigameDelegateGuard`).

### Tài chính (Finance Engine canonical)
- `FinancialCalculatorService` — nguồn công thức duy nhất: income `isConfirmed`, chi `approved/paid`, **Common vs Mini tách biệt, không double-count**.
- Reports / Dashboard / PDF / Personal-Receipt đồng bộ số liệu.
- Kỳ quỹ: model `FundPeriodMember` + sao chép thành viên từ kỳ trước (cả Quỹ Chính & Quỹ Phụ, desktop + mobile).
- Xuất PDF/Excel + tạo phiếu thu trên mobile.

### Bảo mật & Multi-tenant
- Vá leo quyền (CLUB_ADMIN không thể tự nâng SUPER_ADMIN).
- `MemberScopeGuard` (GET read-only dữ liệu CLB) + siết multi-tenant FK (contributions/expenses/personal-receipts/attendance/calculator).
- **JWT secret production đã rotate** (secret lộ trong history đã vô hiệu).
- Rate-limit các endpoint nhạy cảm (changePassword, testEmail).

### AI (Maika / Lisa / Hermes / Mít Đặc)
- Mọi hành động AI qua approval (WAITING_APPROVAL → duyệt bởi người) + audit log; không tự thực thi mutation.
- AI token metering nối vào Billing (card AI usage có dữ liệu thật).
- Không circular DI (bootstrap smoke-test).

### SaaS
- Gói dịch vụ hợp nhất về `Club.plan` (STARTER / PRO / CLUB_PLUS) + enforce giới hạn thành viên; đổi gói qua `PATCH /clubs/:id/plan` (audit log + confirm).

---

## Kiểm định chất lượng
- Backend: **89 suites / 855 tests PASS**, tsc 0 lỗi.
- Frontend: tsc 0 lỗi, build PASS.
- **Codex audit độc lập Tier 1–4**: toàn bộ commit self-audit đã kiểm định; 2 lỗi phát hiện (`009cdc98` stale memberId, `3c75bf91` không clear được field khi sửa) đã fix + re-verify.
- CI/CD: GitHub Actions → VPS docker compose, health-check + auto-rollback + backup DB trước deploy. Prod health 200.

## Điều kiện hệ thống (self-hosted)
Docker 24+, Docker Compose v2, PostgreSQL 16, Redis 7. VPS 2 vCPU / 2GB RAM tối thiểu.
Deploy: `docker compose --env-file .env.production -f docker-compose.production.yml up -d` (xem `docs/commercial-release/INSTALLATION_GUIDE.md`).

## Vận hành
- Rotate JWT secret: `docs/ops/ROTATE_JWT_SECRETS.md`.
- Audit prompt Codex: `docs/audit/CODEX_AUDIT_V2.2.md` + `_TIER34.md`.

## Known issues / non-blocking
- Một số hex literal trong chart (recharts) / PDF (jsPDF/html2canvas) — **hợp lệ** (CSS var không dùng được trong các context này), không phải nợ.
- File mồ côi `.env.productio` trên VPS + (đã xử lý) warning `version:` obsolete — mỹ phẩm.
- Codex chưa soi chi tiết loạt reskin cosmetic Tier A/B (đã verify mắt + build sạch).
