# CODEX AUDIT PROMPT — PickleFund V2.2 (self-audited commits)

> Dán toàn bộ khối dưới cho Codex. Codex chạy TRONG repo `tunglt6-spec/picklefund` nhánh `main` (có quyền `git`), tự lấy diff bằng `git show <hash>`. Nếu Codex không có repo, yêu cầu người giao dán diff kèm.

---

## VAI TRÒ & BỐI CẢNH

Bạn là **senior code auditor độc lập**. Dự án **PickleFund** — SaaS quản lý quỹ CLB Pickleball (multi-tenant). Stack: **NestJS + Prisma + PostgreSQL** (backend), **React 19 + Vite + Zustand** (frontend). Deploy Docker qua GitHub Actions → VPS, health-check + auto-rollback.

Loạt commit dưới đây do **Claude Code tự-implement + tự-audit + deploy** trong giai đoạn Codex hết token. Tất cả ĐÃ deploy prod (health 200) và **build/test PASS (backend 89 suites / 851 tests, frontend tsc+build sạch)**. Nhiệm vụ của bạn: **soi lại độc lập** để tìm lỗi mà self-audit có thể bỏ sót, TẬP TRUNG vào correctness/security/finance/multi-tenant/regression — KHÔNG chỉ style.

## BẤT BIẾN KIẾN TRÚC (dùng làm chuẩn đối chiếu)

1. **Multi-tenant**: mọi query Prisma phải scope `clubId`; `clubId`/`userId`/`memberId` LẤY TỪ JWT, KHÔNG nhận từ body/query. FK từ body (memberId, fundPeriodId, sessionId, categoryId, minigameId...) phải validate thuộc `clubId` người gọi.
2. **Finance canonical** = `FinancialCalculatorService`: income chỉ `isConfirmed:true`; chi Common Fund lọc `status in ['approved','paid']`; **Common Fund vs Mini Fund (fundSource) KHÔNG được trộn**; court=EQUAL/memberCount, living=PRESENT_ONLY|ATTENDANCE theo tỉ lệ tham dự; KHÔNG double-count. Reports/Dashboard/PDF/Personal-Receipt phải khớp calculator.
3. **Permission**: `RolesGuard` (@Roles) + `TenantGuard` + `MemberScopeGuard` (chặn MEMBER_VIEW ngoài allowlist) + `MinigameDelegateGuard`. MEMBER_VIEW chỉ đọc (GET) dữ liệu CLB + self-scope + minigame theo ủy quyền.
4. **AI**: mọi hành động AI (Maika/Hermes/Mít Đặc) BẮT BUỘC qua approval (`WAITING_APPROVAL` → duyệt bởi người) trước khi execute; có audit log; KHÔNG tự thực thi mutation nghiệp vụ.
5. **Migration KHÔNG destructive** (không DROP/DELETE/TRUNCATE dữ liệu). Không hardcode secret. Không commit `.env`.

## DIMENSIONS PHẢI KIỂM (mỗi commit)
`[SECURITY]` leo quyền/bypass auth/cross-tenant · `[FINANCE]` sai công thức/trộn quỹ/double-count · `[TENANT]` thiếu clubId scope · `[LOGIC]` sai nghiệp vụ/edge case/race · `[REGRESSION]` phá hành vi cũ · `[MIGRATION]` mất dữ liệu · `[SCOPE]` vượt phạm vi/thêm công nghệ ngoài scope.

---

## COMMIT CẦN AUDIT — theo mức ưu tiên

### 🔴 TIER 1 — CRITICAL (security / finance / tenant / DB) — audit KỸ NHẤT

**`181fda9b` — rà soát toàn hệ: vá leo quyền + công thức tài chính + hardening**
`git show 181fda9b`. Kiểm:
- `users/users.controller.ts` PUT `/users/:id`: xác nhận `update()` giờ CHẶN CLUB_ADMIN tự set `role=SUPER_ADMIN` (leo quyền) — logic chặn phải KHỚP `create()`. Có field nào khác cho leo quyền không?
- `fund-periods/fund-periods.service.ts` carryForwardBalance: đổi sang ĐỆ QUY qua `summary().balance` của kỳ trước. Verify: base case khi KHÔNG có kỳ trước (không vô hạn), đúng khi CLB ≥3 kỳ, KHÔNG double-count carryForward, đã bỏ fallback cũ không khớp calculator.
- `expenses/expenses.service.ts`: lọc `status approved/paid` cho chi COMMON — nhất quán calculator, không ảnh hưởng MINI.
- `minigame/minigame.service.ts` createTeam: player1Id/player2Id phải là participant CỦA ĐÚNG minigame (chặn cross-club/ghép sai giải).
- `member-portal/member-portal.service.ts` selfCheckin: chặn check-in session đã `cancelled`.
- `auth/auth.controller.ts` + `hermes/hermes.controller.ts`: `@Throttle` — giới hạn hợp lý, không hở.

**`009cdc98` — member portal backend (BỀ MẶT BẢO MẬT — soi gắt nhất)**
`git show 009cdc98`. Kiểm:
- `common/guards/member-scope.guard.ts`: allowlist mới (`ALLOW_GET_PREFIXES`, `ALLOW_ALL_METHOD_PREFIXES`). **Có bypass được không?** — thử prefix giả (`/members-export`, `/fund-periods-x`), path có query string, trailing slash, `/api` prefix, case. Xác nhận CHỈ GET cho dữ liệu CLB; `/minigames` mọi method nhưng mutation bị `MinigameDelegateGuard` chặn.
- `member-portal.service.ts` self RSVP/checkin: memberId CHỈ từ JWT; session thuộc clubId; idempotent; không thao tác hộ member khác.
- `minigame/minigame-delegate.guard.ts`: MEMBER_VIEW không nằm trong `Club.settings.minigameDelegateMemberIds` bị chặn MỌI mutation; GET pass; role khác không ảnh hưởng. Có race/nhầm khi settings null/không phải mảng?
- `clubs/clubs.controller.ts` + `clubs.service.ts`: PATCH delegates yêu cầu CLUB_ADMIN; validate member thuộc club; route tĩnh `me/...` đặt trước `:id`.

**`376aa217` — đồng bộ công thức tài chính AI + siết multi-tenant FK**
`git show 376aa217`. Kiểm:
- `maika/maika.service.ts` + `lisa/lisa.service.ts`: filter `status approved/paid` (+ `fundSource=COMMON` cho lisa) KHỚP calculator; số hiển thị AI/trợ lý = báo cáo chốt sổ.
- `contributions/contributions.service.ts` + `expenses/expenses.service.ts`: `assertFkOwnership` — xác nhận validate ĐỦ mọi FK (memberId/fundPeriodId/relatedMinigameId · fundPeriodId/attendanceSessionId/categoryId/relatedMinigameId) và gọi ở CẢ create VÀ update.
- `personal-receipts/personal-receipts.service.ts` generateForPeriod: validate kỳ quỹ thuộc clubId trước khi tính/ghi.
- `financial/financial-calculator.service.ts`: `attendanceRecord.groupBy` có `clubId` (chặn đếm chéo CLB).

**`2b582acf` — FUND-IMPL-01: model FundPeriodMember + copy thành viên kỳ trước**
`git show 2b582acf`. Kiểm:
- `prisma/schema.prisma` + `migrations/.../migration.sql`: **[MIGRATION]** chỉ CREATE TABLE/index/FK — KHÔNG DROP/DELETE. unique(fundPeriodId, memberId); cascade theo fundPeriodId.
- `fund-periods.service.ts` create() transaction: rollback nếu copy lỗi; tìm kỳ trước CÙNG `type` + `clubId`; lấy roster từ `FundPeriodMember` (không phải toàn bộ Member); `expectedAmount` = mức đóng KỲ MỚI; **KHÔNG tạo FundContribution nào** (roster ≠ đã đóng); ưu tiên kỳ gần nhất đúng.
- `GET /fund-periods/previous` đặt TRƯỚC route `:id` (tránh match nhầm).

### 🟠 TIER 2 — HIGH (billing / module graph / destructive)

**`2465f8f` — hợp nhất ServicePlan/PlanTier về Club.plan**
`git show 2465f8f`. Kiểm: `getSubscription` đọc `Club.plan` (bỏ SystemSetting cũ); đã xóa dead code `assertFeature/assertMemberLimit/upgradePlan` — KHÔNG còn caller mồ côi; đổi gói CHỈ qua `PATCH /clubs/:id/plan` (có audit log + @Roles SUPER_ADMIN); scheduler hạ gói hết hạn qua Club.plan; 3 nơi FE (Billing/Settings/SuperClubDetail) nhất quán; enforce giới hạn thành viên còn đúng.

**`4b5103ac` — nối metering token AI (trackAiCall) vào AI Gateway**
`git show 4b5103ac`. Kiểm: **[SCOPE/LOGIC]** AiModule import BillingModule có tạo **circular DI** không (BillingModule→HermesModule→EmailModule — xác nhận leaf)? `trackAiCall` fire-and-forget, CHỈ success-path, có clubId + totalTokens>0, lỗi bị nuốt (không chặn AI); `@Optional()` injection đúng. Chạy `npm test -- --testPathPatterns=app-bootstrap` xác nhận không cycle.

**`5f388ed4` — xóa hẳn giải đấu (DELETE /minigames/:id)**
`git show 5f388ed4`. Kiểm: `remove()` có `assertOwnership(id, clubId)`; hard delete cascade participants/teams/matches ĐÚNG theo schema (không mồ côi FK); @Roles CLUB_ADMIN + MEMBER_VIEW (siết bởi MinigameDelegateGuard); không xóa nhầm cross-club.

### 🟡 TIER 3 — MEDIUM (logic nhỏ / UI có nghiệp vụ) — spot-check
- `cd2a25b3` member portal FE: role-aware chỉ thao tác CHÍNH mình (SessionRegistration/CheckIn/ScheduleCalendar), ẩn action admin; `useApiSync` bỏ skip MEMBER_VIEW đúng.
- `3c75bf91` members email optional: DTO `@Transform ''→undefined`; FE payload bỏ clubId + field rỗng.
- `5e71927c` FinanceDashboard graceful + confirm khóa user (SuperUsers).
- `c02e7c7f` + `790fdb92` copy-member wiring FE Quỹ Chính (desktop + mobile).
- `532e20fd` nút xuất PDF/Excel + phiếu thu mobile.

### ⚪ TIER 4 — LOW (không cần audit trừ khi rảnh)
`86540b7d` (bảng overflow-x-auto + xóa dead code), `b4574e2a` (fix spec test), `0e79befd` (xóa dead mockFundSummary), và loạt reskin cosmetic Tier A/B/Schedule/P1–P3 (chỉ đổi token màu/layout, đã verify mắt).

---

## CÁCH LÀM
1. Với mỗi commit Tier 1–2: `git show <hash>` đọc diff đầy đủ; đối chiếu bất biến kiến trúc + dimensions.
2. Nếu nghi ngờ, đọc thêm file liên quan (`git show <hash>:<path>` hoặc mở file ở HEAD) để hiểu ngữ cảnh — KHÔNG đoán.
3. Không báo lỗi style/lint (đã sạch). Chỉ báo lỗi THẬT có thể gây sai nghiệp vụ/rò rỉ/mất dữ liệu.

## OUTPUT (bắt buộc)
Mỗi phát hiện:
```
[SEVERITY: CRITICAL|HIGH|MEDIUM|LOW] [DIMENSION] <commit> <file:line>
Vấn đề: <1–2 câu, có bằng chứng trích dẫn code>
Kịch bản khai thác/sai: <cụ thể>
Khắc phục đề xuất: <ngắn gọn>
```
Cuối cùng: bảng tổng hợp theo commit (PASS / cần sửa), và **verdict tổng: SẴN SÀNG GA / CẦN SỬA TRƯỚC GA**. Nếu một commit sạch, ghi `PASS` — không bịa lỗi.
