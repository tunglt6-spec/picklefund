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


---

# PHỤ LỤC — DIFF ĐẦY ĐỦ 4 COMMIT TIER 1 (inline, phòng khi Codex không có quyền git)

> Diff verbatim từ `git show`. Nếu Codex CÓ quyền git, ưu tiên `git show <hash>` để có màu/ngữ cảnh; phần này là bản dự phòng đầy đủ, 0 placeholder.

## 181fda9b — fix(v2.2): rà soát toàn hệ thống — vá leo quyền, sửa công thức tài chính, hardening

````diff
diff --git a/backend/src/auth/auth.controller.ts b/backend/src/auth/auth.controller.ts
index dd7e67fe..f2afebcd 100644
--- a/backend/src/auth/auth.controller.ts
+++ b/backend/src/auth/auth.controller.ts
@@ -1,9 +1,17 @@
-import { Controller, Post, Get, Body, Patch, Req, HttpCode } from '@nestjs/common';
+import {
+  Controller,
+  Post,
+  Get,
+  Body,
+  Patch,
+  Req,
+  HttpCode,
+} from '@nestjs/common';
 import { type Request } from 'express';
 import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
 import { SkipThrottle, Throttle } from '@nestjs/throttler';
 import { AuthService } from './auth.service';
-import { CurrentUser, Public} from '../common/decorators';
+import { CurrentUser, Public } from '../common/decorators';
 import { ok } from '../common/response';
 import {
   LoginDto,
@@ -61,6 +69,7 @@ export class AuthController {
   }
 
   @ApiBearerAuth()
+  @Throttle({ short: { ttl: 60000, limit: 5 } })
   @Patch('change-password')
   async changePassword(
     @CurrentUser() user: any,
diff --git a/backend/src/expenses/expenses.service.ts b/backend/src/expenses/expenses.service.ts
index a90ad894..00f8adc3 100644
--- a/backend/src/expenses/expenses.service.ts
+++ b/backend/src/expenses/expenses.service.ts
@@ -200,6 +200,8 @@ export class ExpensesService {
               ...(fundPeriodId ? { fundPeriodId } : {}),
               fundSource: 'COMMON',
               allocationRule: rule,
+              // Nhất quán với Mini Fund: chỉ tính chi đã duyệt/đã chi vào tổng quỹ.
+              status: { in: ['approved', 'paid'] },
             },
             _sum: { amount: true },
             _count: true,
diff --git a/backend/src/financial/financial-calculator.service.ts b/backend/src/financial/financial-calculator.service.ts
index 8f8ecb5c..7d2b7c2e 100644
--- a/backend/src/financial/financial-calculator.service.ts
+++ b/backend/src/financial/financial-calculator.service.ts
@@ -108,9 +108,16 @@ export class FinancialCalculatorService {
       }),
       // Common Fund expenses phân loại theo allocationRule (canonical, KHÔNG dùng
       // AttendanceSession.courtFee — session.courtFee chỉ là reference).
+      // status filter approved/paid: nhất quán với Mini Fund + workflow duyệt chi trên UI
+      // (Expenses.tsx có approve/reject) — chi pending/rejected KHÔNG được tính vào quỹ.
       this.prisma.livingExpense.groupBy({
         by: ['allocationRule'],
-        where: { fundPeriodId, clubId, fundSource: 'COMMON' },
+        where: {
+          fundPeriodId,
+          clubId,
+          fundSource: 'COMMON',
+          status: { in: ['approved', 'paid'] },
+        },
         _sum: { amount: true },
       }),
       this.prisma.livingExpense.aggregate({
diff --git a/backend/src/fund-periods/fund-periods.service.ts b/backend/src/fund-periods/fund-periods.service.ts
index a71ae142..c11877e1 100644
--- a/backend/src/fund-periods/fund-periods.service.ts
+++ b/backend/src/fund-periods/fund-periods.service.ts
@@ -167,37 +167,16 @@ export class FundPeriodsService {
       select: { id: true, name: true },
     });
 
+    // carryForward = SỐ DƯ CUỐI kỳ trước (clubAssets.balance của kỳ đó — đã bao gồm
+    // carryForward của chính kỳ đó). Gọi ĐỆ QUY summary() của kỳ trước để chuỗi carryForward
+    // cộng dồn đúng qua nhiều kỳ liên tiếp (kỳ N-2 không bị bỏ sót khi tính kỳ N).
+    // Trước đây tính trực tiếp "prevIncome - prevExpense" chỉ của RIÊNG kỳ liền trước (không đệ quy)
+    // → mất số dư các kỳ xa hơn N-1; đồng thời fallback prevTotalLiving>0?prevTotalLiving:prevTotalCourt
+    // không khớp canonical (financial-calculator dùng tổng EQUAL+PRESENT_ONLY/ATTENDANCE+FUND_ONLY).
     let carryForwardBalance = 0;
     if (previousPeriod) {
-      const [prevIncome, prevLiving, prevCourt] = await Promise.all([
-        this.prisma.fundContribution.aggregate({
-          where: {
-            fundPeriodId: previousPeriod.id,
-            clubId,
-            fundSource: 'COMMON',
-            isConfirmed: true,
-          },
-          _sum: { amount: true },
-        }),
-        this.prisma.livingExpense.aggregate({
-          where: {
-            fundPeriodId: previousPeriod.id,
-            clubId,
-            fundSource: 'COMMON',
-          },
-          _sum: { amount: true },
-        }),
-        this.prisma.attendanceSession.aggregate({
-          where: { fundPeriodId: previousPeriod.id, clubId },
-          _sum: { courtFee: true },
-        }),
-      ]);
-      const prevTotalIncome = Number(prevIncome._sum.amount ?? 0);
-      const prevTotalLiving = Number(prevLiving._sum.amount ?? 0);
-      const prevTotalCourt = Number(prevCourt._sum.courtFee ?? 0);
-      const prevTotalExpense =
-        prevTotalLiving > 0 ? prevTotalLiving : prevTotalCourt;
-      carryForwardBalance = prevTotalIncome - prevTotalExpense;
+      const prevSummary = await this.summary(previousPeriod.id, clubId);
+      carryForwardBalance = prevSummary.clubAssets.balance;
     }
 
     const result = await this.calculator.calculate(id, clubId, {
diff --git a/backend/src/hermes/hermes.controller.ts b/backend/src/hermes/hermes.controller.ts
index 790534a6..72274d32 100644
--- a/backend/src/hermes/hermes.controller.ts
+++ b/backend/src/hermes/hermes.controller.ts
@@ -9,8 +9,9 @@ import {
   BadRequestException,
 } from '@nestjs/common';
 import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
+import { Throttle } from '@nestjs/throttler';
 import { HermesService } from './hermes.service';
-import { CurrentUser, Roles} from '../common/decorators';
+import { CurrentUser, Roles } from '../common/decorators';
 import { ok } from '../common/response';
 import type { HermesEvent } from './hermes.types';
 
@@ -64,6 +65,7 @@ export class HermesController {
   }
 
   // Test email delivery for current user
+  @Throttle({ short: { ttl: 60000, limit: 3 } })
   @Post('test-email')
   async testEmail(@CurrentUser() user: { userId: string }) {
     const result = await this.svc.testEmail(user.userId);
@@ -92,12 +94,23 @@ export class HermesController {
       enabled?: boolean;
     },
   ) {
-    const { quietHoursStart: qs, quietHoursEnd: qe, maxDailyPush: mp, maxDailyEmail: me, maxDailyTelegram: mt } = body;
-    if (qs !== undefined && (qs < 0 || qs > 23)) throw new BadRequestException('quietHoursStart phải từ 0–23');
-    if (qe !== undefined && (qe < 0 || qe > 23)) throw new BadRequestException('quietHoursEnd phải từ 0–23');
-    if (mp !== undefined && (mp < 0 || mp > 100)) throw new BadRequestException('maxDailyPush phải từ 0–100');
-    if (me !== undefined && (me < 0 || me > 100)) throw new BadRequestException('maxDailyEmail phải từ 0–100');
-    if (mt !== undefined && (mt < 0 || mt > 100)) throw new BadRequestException('maxDailyTelegram phải từ 0–100');
+    const {
+      quietHoursStart: qs,
+      quietHoursEnd: qe,
+      maxDailyPush: mp,
+      maxDailyEmail: me,
+      maxDailyTelegram: mt,
+    } = body;
+    if (qs !== undefined && (qs < 0 || qs > 23))
+      throw new BadRequestException('quietHoursStart phải từ 0–23');
+    if (qe !== undefined && (qe < 0 || qe > 23))
+      throw new BadRequestException('quietHoursEnd phải từ 0–23');
+    if (mp !== undefined && (mp < 0 || mp > 100))
+      throw new BadRequestException('maxDailyPush phải từ 0–100');
+    if (me !== undefined && (me < 0 || me > 100))
+      throw new BadRequestException('maxDailyEmail phải từ 0–100');
+    if (mt !== undefined && (mt < 0 || mt > 100))
+      throw new BadRequestException('maxDailyTelegram phải từ 0–100');
     return ok(
       await this.svc.updatePreferences(user.userId, body),
       'Đã cập nhật cài đặt thông báo',
diff --git a/backend/src/member-portal/member-portal.service.ts b/backend/src/member-portal/member-portal.service.ts
index 7f851e6f..843f6b57 100644
--- a/backend/src/member-portal/member-portal.service.ts
+++ b/backend/src/member-portal/member-portal.service.ts
@@ -1,5 +1,6 @@
 import {
   Injectable,
+  BadRequestException,
   ForbiddenException,
   NotFoundException,
 } from '@nestjs/common';
@@ -223,9 +224,7 @@ export class MemberPortalService {
     register: boolean,
   ) {
     if (!memberId)
-      throw new ForbiddenException(
-        'Tài khoản chưa liên kết hồ sơ thành viên.',
-      );
+      throw new ForbiddenException('Tài khoản chưa liên kết hồ sơ thành viên.');
     await this.assertSession(sessionId, clubId);
     if (register) {
       await this.prisma.sessionRegistration.upsert({
@@ -247,12 +246,16 @@ export class MemberPortalService {
   }
 
   /** Member tự check-in PRESENT vào buổi chơi (self-scope, idempotent). */
-  async selfCheckin(memberId: string | null, clubId: string, sessionId: string) {
+  async selfCheckin(
+    memberId: string | null,
+    clubId: string,
+    sessionId: string,
+  ) {
     if (!memberId)
-      throw new ForbiddenException(
-        'Tài khoản chưa liên kết hồ sơ thành viên.',
-      );
-    await this.assertSession(sessionId, clubId);
+      throw new ForbiddenException('Tài khoản chưa liên kết hồ sơ thành viên.');
+    const session = await this.assertSession(sessionId, clubId);
+    if (session.status === 'cancelled')
+      throw new BadRequestException('Buổi chơi đã bị hủy, không thể check-in.');
     await this.prisma.attendanceRecord.upsert({
       where: {
         attendanceSessionId_memberId: {
diff --git a/backend/src/minigame/minigame.service.ts b/backend/src/minigame/minigame.service.ts
index dd08efa2..24e8b4b4 100644
--- a/backend/src/minigame/minigame.service.ts
+++ b/backend/src/minigame/minigame.service.ts
@@ -135,6 +135,18 @@ export class MinigameService {
     dto: { name: string; player1Id: string; player2Id?: string },
   ) {
     await this.assertOwnership(id, clubId);
+    const playerIds = [
+      dto.player1Id,
+      ...(dto.player2Id ? [dto.player2Id] : []),
+    ];
+    const participants = await this.prisma.minigameParticipant.findMany({
+      where: { minigameId: id, memberId: { in: playerIds } },
+      select: { memberId: true },
+    });
+    if (participants.length !== playerIds.length)
+      throw new BadRequestException(
+        'Cầu thủ phải là thành viên tham gia giải đấu này',
+      );
     return this.prisma.minigameTeam.create({
       data: {
         minigameId: id,
diff --git a/backend/src/users/users.controller.ts b/backend/src/users/users.controller.ts
index e4116d6f..a51ce72a 100644
--- a/backend/src/users/users.controller.ts
+++ b/backend/src/users/users.controller.ts
@@ -96,6 +96,10 @@ export class UsersController {
     if (user.role !== 'SUPER_ADMIN') {
       const target = await this.service.findOne(id);
       if (target.clubId !== user.clubId) throw new ForbiddenException();
+      if (body.role === 'SUPER_ADMIN')
+        throw new ForbiddenException(
+          'CLUB_ADMIN không thể nâng quyền tài khoản lên SUPER_ADMIN',
+        );
     }
     const updated = await this.service.update(id, body);
     void this.audit.log({
diff --git a/frontend/src/App.tsx b/frontend/src/App.tsx
index e840553d..bf67cc8d 100644
--- a/frontend/src/App.tsx
+++ b/frontend/src/App.tsx
@@ -135,7 +135,6 @@ export default function App() {
             {/* Super Admin */}
             <Route path="/super/dashboard" element={<SuperDashboard />} />
             <Route path="/super/clubs" element={<SuperClubs />} />
-            <Route path="/onboarding" element={<Onboarding />} />
             <Route path="/super/clubs/:id" element={<SuperClubDetail />} />
             <Route path="/super/users" element={<SuperUsers />} />
             <Route path="/super/audit-logs" element={<AuditLogs />} />
@@ -163,6 +162,10 @@ export default function App() {
             <Route path="/treasurer/ledger" element={<TreasurerLedger />} />
             <Route path="/treasurer/reminders" element={<TreasurerReminders />} />
 
+            </Route>
+            {/* Onboarding tạo CLB mới — chỉ SUPER_ADMIN (nút vào chỉ hiện ở SuperClubs cho SUPER_ADMIN) */}
+            <Route element={<RoleRoute allow={['SUPER_ADMIN']} />}>
+            <Route path="/onboarding" element={<Onboarding />} />
             </Route>
             {/* Màn dùng chung admin + member (member: read-only / self-scope / theo ủy quyền minigame) */}
             <Route element={<RoleRoute allow={['SUPER_ADMIN', 'CLUB_ADMIN', 'MEMBER_VIEW']} />}>
diff --git a/frontend/src/components/layout/BottomNav.tsx b/frontend/src/components/layout/BottomNav.tsx
index e154c3f9..e1aba747 100644
--- a/frontend/src/components/layout/BottomNav.tsx
+++ b/frontend/src/components/layout/BottomNav.tsx
@@ -97,30 +97,27 @@ export function BottomNav() {
                   {/* Active pill */}
                   {isActive && (
                     <span
-                      className="absolute top-1 left-1/2 -translate-x-1/2 h-8 w-14 rounded-full"
-                      style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(6,182,212,0.12))' }}
+                      className="absolute top-1 left-1/2 -translate-x-1/2 h-8 w-14 rounded-full [background:var(--pf-primary-soft)]"
                     />
                   )}
 
                   {/* Icon */}
                   <span className={`relative z-10 transition-all duration-150 ${
-                    isActive ? 'scale-105' : ''
-                  }`} style={{ color: isActive ? '#6D5DFB' : '#94A3B8' }}>
+                    isActive ? 'scale-105 [color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]'
+                  }`}>
                     {item.icon}
                   </span>
 
                   {/* Label */}
                   <span
-                    className="text-[11px] font-[600] leading-none"
-                    style={{ color: isActive ? '#6D5DFB' : '#94A3B8' }}
+                    className={`text-[11px] font-[600] leading-none ${isActive ? '[color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]'}`}
                   >
                     {item.label}
                   </span>
 
                   {/* Active dot */}
                   {isActive && (
-                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
-                      style={{ background: '#6D5DFB' }} />
+                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full [background:var(--pf-primary)]" />
                   )}
                 </>
               )}
diff --git a/frontend/src/pages/Login.tsx b/frontend/src/pages/Login.tsx
index a4117ab6..974d5831 100644
--- a/frontend/src/pages/Login.tsx
+++ b/frontend/src/pages/Login.tsx
@@ -36,11 +36,12 @@ const routeByRole: Record<Role, string> = {
   CLUB_TREASURER: '/treasurer/dashboard', MEMBER_VIEW: '/member/dashboard',
 }
 
+// Khớp với số liệu ở Landing.tsx (trang public) — tránh 2 con số marketing khác nhau
+// gây thiếu nhất quán khi khách xem cả Landing lẫn Login.
 const stats = [
-  { value: '500+',   label: 'CLB sử dụng' },
-  { value: '10K+',   label: 'Thành viên' },
-  { value: '1M+',    label: 'Giao dịch' },
-  { value: '99.9%',  label: 'Uptime' },
+  { value: '30+',    label: 'CLB sử dụng' },
+  { value: '1.000+', label: 'Thành viên' },
+  { value: '98%',    label: 'Hài lòng' },
 ]
 
 const features = [
diff --git a/frontend/src/pages/admin/Debts.tsx b/frontend/src/pages/admin/Debts.tsx
index 9bb4a315..17fd00af 100644
--- a/frontend/src/pages/admin/Debts.tsx
+++ b/frontend/src/pages/admin/Debts.tsx
@@ -1,12 +1,16 @@
 /**
  * Debts (19) — Công nợ cá nhân: màn gộp riêng tổng hợp thành viên còn nợ quỹ
- * kỳ đang mở. Read-only từ clubDataStore (không backend mới); cùng cách suy ra
- * "chưa đóng" như TreasurerReminders (không có contribution COMMON đã xác nhận).
+ * kỳ đang mở. Trạng thái (chưa đóng/chờ xác nhận/đã đóng) suy từ contributions
+ * trong clubDataStore như TreasurerReminders; SỐ TIỀN còn nợ lấy từ
+ * GET /fund-periods/:id/summary (financial-calculator canonical — chia đều
+ * chi phí sân + chia theo tỉ lệ tham dự sinh hoạt) để khớp với Reports/FundPeriods,
+ * KHÔNG dùng flat contributionAmount (sai khi CLB có chi sinh hoạt phân bổ theo buổi).
  * Dùng shared kit V2.2 (PageShell/PageHeader/MetricCard/DataTable/MobileCardList/
  * StatusBadge/EmptyState) — token màu, không hardcode brand.
  */
-import { useMemo, useState } from 'react'
+import { useEffect, useMemo, useState } from 'react'
 import { Users, AlertCircle, Clock, Wallet } from 'lucide-react'
+import api from '../../lib/api'
 import { useClubDataStore } from '../../store/clubDataStore'
 import { useAuthStore } from '../../store/authStore'
 import { formatVND } from '../../lib/utils'
@@ -15,6 +19,10 @@ import {
   StatusBadge, EmptyState, ResponsiveTabs, type Column, type TabItem, type StatusTone,
 } from '../../components/shared'
 
+function isLocalToken(token?: string | null) {
+  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
+}
+
 type DebtStatus = 'unpaid' | 'pending' | 'paid'
 interface DebtRow {
   id: string
@@ -32,6 +40,7 @@ const STATUS_META: Record<DebtStatus, { label: string; tone: StatusTone }> = {
 
 export function Debts() {
   const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
+  const accessToken = useAuthStore((s) => s.accessToken)
   const data = useClubDataStore((s) => s.getClubData(clubId))
   const { members, contributions, fundPeriods } = data
 
@@ -41,6 +50,20 @@ export function Debts() {
   )
   const amount = activePeriod?.contributionAmount ?? 0
 
+  // Số nợ thật/thành viên (courtFee chia đều + livingFee theo tỉ lệ tham dự - đã đóng),
+  // canonical từ financial-calculator qua fund-periods summary — khớp Reports/FundPeriods.
+  const [memberBalances, setMemberBalances] = useState<Record<string, number>>({})
+  useEffect(() => {
+    if (!activePeriod?.id || isLocalToken(accessToken)) { setMemberBalances({}); return }
+    let cancelled = false
+    api.get(`/fund-periods/${activePeriod.id}/summary`).then((res) => {
+      if (cancelled) return
+      const list = (res.data?.data?.members ?? []) as { memberId: string; balance: number }[]
+      setMemberBalances(Object.fromEntries(list.map((m) => [m.memberId, m.balance])))
+    }).catch(() => { if (!cancelled) setMemberBalances({}) })
+    return () => { cancelled = true }
+  }, [activePeriod?.id, accessToken])
+
   const rows = useMemo<DebtRow[]>(() => {
     const commonContribs = contributions.filter((c) => (c.fundSource ?? 'COMMON') === 'COMMON')
     return members
@@ -50,19 +73,23 @@ export function Debts() {
           (c) => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id),
         )
         const status: DebtStatus = !contrib ? 'unpaid' : contrib.isConfirmed ? 'paid' : 'pending'
+        // Ưu tiên số dư thật (balance < 0 = còn nợ) từ backend; fallback mức đóng chuẩn
+        // khi chưa có dữ liệu backend (demo/local token hoặc đang tải).
+        const realBalance = memberBalances[m.id]
+        const owed = realBalance !== undefined ? Math.max(0, -realBalance) : amount
         return {
           id: m.id,
           name: m.fullName,
           phone: m.phone,
           status,
-          amount: status === 'paid' ? 0 : amount,
+          amount: status === 'paid' ? 0 : owed,
         }
       })
       .sort((a, b) => {
         const order: Record<DebtStatus, number> = { unpaid: 0, pending: 1, paid: 2 }
         return order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'vi')
       })
-  }, [members, contributions, activePeriod, amount])
+  }, [members, contributions, activePeriod, amount, memberBalances])
 
   const stats = useMemo(() => {
     const unpaid = rows.filter((r) => r.status === 'unpaid')
diff --git a/frontend/src/pages/admin/LisaChat.tsx b/frontend/src/pages/admin/LisaChat.tsx
index aa7b9427..b0940284 100644
--- a/frontend/src/pages/admin/LisaChat.tsx
+++ b/frontend/src/pages/admin/LisaChat.tsx
@@ -1,5 +1,6 @@
 import { useState, useRef, useEffect, useCallback } from 'react'
 import { Send, Bot, User, RefreshCw } from 'lucide-react'
+import toast from 'react-hot-toast'
 import { PageHeader } from '../../components/layout/PageHeader'
 import { useAuthStore } from '../../store/authStore'
 import { useIsMobile } from '../../hooks/useIsMobile'
@@ -60,6 +61,9 @@ export function LisaChat() {
         time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
       }])
     } catch {
+      // Phân biệt lỗi kết nối với "chưa có brief thật" — người dùng cần biết Lisa
+      // đang hiển thị lời chào mặc định vì API lỗi, không phải vì không có dữ liệu.
+      toast.error('Không tải được tóm tắt từ Lisa — đang hiển thị lời chào mặc định.')
       setMessages([{
         id: 'welcome',
         role: 'lisa',
diff --git a/frontend/src/pages/super/SuperClubs.tsx b/frontend/src/pages/super/SuperClubs.tsx
index 2afbffde..ac74125b 100644
--- a/frontend/src/pages/super/SuperClubs.tsx
+++ b/frontend/src/pages/super/SuperClubs.tsx
@@ -79,6 +79,13 @@ export function SuperClubs() {
   const [deleteClub, setDeleteClub] = useState<Club | null>(null)
   const [deleting, setDeleting] = useState(false)
 
+  // Confirm dialog cho thao tác nhạy cảm ảnh hưởng toàn CLB (khóa/mở khóa, đổi gói) —
+  // trước đây gọi API ngay khi click, không có xác nhận (khác handleDelete đã có modal).
+  const [pendingAction, setPendingAction] = useState<
+    { club: Club; kind: 'status'; nextPlan?: undefined } | { club: Club; kind: 'plan'; nextPlan: ServicePlan } | null
+  >(null)
+  const [confirmingAction, setConfirmingAction] = useState(false)
+
   // Roles modal
   const [rolesClub, setRolesClub] = useState<Club | null>(null)
   const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
@@ -121,6 +128,18 @@ export function SuperClubs() {
     } catch { toast.error('Đổi gói thất bại') }
   }
 
+  const confirmPendingAction = async () => {
+    if (!pendingAction) return
+    setConfirmingAction(true)
+    try {
+      if (pendingAction.kind === 'status') await toggleStatus(pendingAction.club)
+      else await changePlan(pendingAction.club, pendingAction.nextPlan)
+    } finally {
+      setConfirmingAction(false)
+      setPendingAction(null)
+    }
+  }
+
   const handleCreate = async (e: React.FormEvent) => {
     e.preventDefault()
     if (isSaving) return
@@ -306,6 +325,39 @@ export function SuperClubs() {
     </Modal>
   )
 
+  const actionConfirmModal = (
+    <Modal
+      open={!!pendingAction}
+      onClose={() => setPendingAction(null)}
+      title={pendingAction?.kind === 'status' ? 'Xác nhận đổi trạng thái CLB' : 'Xác nhận đổi gói dịch vụ'}
+      size="sm"
+    >
+      <div className="space-y-4">
+        <p className="text-sm text-gray-600">
+          {pendingAction?.kind === 'status' ? (
+            <>
+              Bạn có chắc muốn {pendingAction.club.status === 'active' ? 'khóa' : 'mở khóa'} CLB{' '}
+              <span className="font-semibold text-gray-900">{pendingAction.club.name}</span>?
+              {pendingAction.club.status === 'active' && ' Toàn bộ thành viên CLB sẽ không thể đăng nhập cho tới khi mở khóa lại.'}
+            </>
+          ) : pendingAction?.kind === 'plan' ? (
+            <>
+              Bạn có chắc muốn đổi gói CLB{' '}
+              <span className="font-semibold text-gray-900">{pendingAction.club.name}</span>{' '}
+              sang <span className="font-semibold text-gray-900">{PLAN_LABEL[pendingAction.nextPlan]}</span>?
+            </>
+          ) : null}
+        </p>
+        <div className="flex justify-end gap-2 pt-2">
+          <Button variant="secondary" type="button" onClick={() => setPendingAction(null)} disabled={confirmingAction}>Hủy</Button>
+          <Button onClick={confirmPendingAction} disabled={confirmingAction}>
+            {confirmingAction ? 'Đang xử lý...' : 'Xác nhận'}
+          </Button>
+        </div>
+      </div>
+    </Modal>
+  )
+
   const rolesModal = (
     <Modal open={!!rolesClub} onClose={() => setRolesClub(null)} title={`Phân quyền: ${rolesClub?.name ?? ''}`} size="lg">
       <div className="space-y-3">
@@ -394,7 +446,7 @@ export function SuperClubs() {
               <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                 <div className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{club._count?.members ?? 0}</span> TV</div>
                 <div className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{club._count?.fundPeriods ?? 0}</span> kỳ</div>
-                <PlanSelect club={club} onClick={e => e.stopPropagation()} onChange={(p) => changePlan(club, p)} />
+                <PlanSelect club={club} onClick={e => e.stopPropagation()} onChange={(p) => setPendingAction({ club, kind: 'plan', nextPlan: p })} />
                 <div className="flex-1" />
                 <button onClick={e => { e.stopPropagation(); openEdit(club) }} className="p-2 rounded-lg [color:var(--pf-primary)] [background:var(--pf-primary-soft)]">
                   <Pencil size={14} />
@@ -403,7 +455,7 @@ export function SuperClubs() {
                   <ShieldCheck size={14} />
                 </button>
                 <button
-                  onClick={e => { e.stopPropagation(); toggleStatus(club) }}
+                  onClick={e => { e.stopPropagation(); setPendingAction({ club, kind: 'status' }) }}
                   className={`p-2 rounded-lg ${club.status === 'active' ? 'text-orange-500 bg-orange-50' : 'text-green-600 bg-green-50'}`}
                 >
                   {club.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
@@ -419,6 +471,7 @@ export function SuperClubs() {
         {editModal}
         {deleteModal}
         {rolesModal}
+        {actionConfirmModal}
       </div>
     )
   }
@@ -472,7 +525,7 @@ export function SuperClubs() {
                   <td className="px-4 py-3 text-center font-semibold text-gray-900">{club._count?.members}</td>
                   <td className="px-4 py-3 text-center font-semibold text-gray-900">{club._count?.fundPeriods}</td>
                   <td className="px-4 py-3 text-center">
-                    <PlanSelect club={club} onChange={(p) => changePlan(club, p)} />
+                    <PlanSelect club={club} onChange={(p) => setPendingAction({ club, kind: 'plan', nextPlan: p })} />
                   </td>
                   <td className="px-4 py-3 text-center">
                     <Badge variant={club.status === 'active' ? 'green' : 'orange'}>
@@ -491,7 +544,7 @@ export function SuperClubs() {
                         <ShieldCheck size={15} />
                       </button>
                       <button
-                        onClick={() => toggleStatus(club)}
+                        onClick={() => setPendingAction({ club, kind: 'status' })}
                         className={club.status === 'active' ? 'text-orange-500 hover:text-orange-700 p-1.5 rounded hover:bg-orange-50' : 'text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50'}
                         title={club.status === 'active' ? 'Khóa CLB' : 'Mở khóa'}
                       >
@@ -513,6 +566,7 @@ export function SuperClubs() {
       {editModal}
       {deleteModal}
       {rolesModal}
+      {actionConfirmModal}
     </PageShell>
   )
 }

````

## 009cdc98 — feat(member-portal): mở read-only dữ liệu CLB + self RSVP/check-in + ủy quyền minigame

````diff
diff --git a/backend/src/clubs/clubs.controller.ts b/backend/src/clubs/clubs.controller.ts
index 37c4bf85..0abb821c 100644
--- a/backend/src/clubs/clubs.controller.ts
+++ b/backend/src/clubs/clubs.controller.ts
@@ -17,6 +17,8 @@ import {
   IsEnum,
   IsEmail,
   IsNotEmpty,
+  IsArray,
+  ArrayMaxSize,
   MaxLength,
   MinLength,
   Matches,
@@ -85,6 +87,11 @@ class SetPlanDto {
   @IsEnum(['STARTER', 'PRO', 'CLUB_PLUS']) plan!: ServicePlan;
   @IsOptional() @IsString() planExpiresAt?: string;
 }
+
+/** Danh sách memberId được ủy quyền quản lý minigame (lưu Club.settings). */
+class SetMinigameDelegatesDto {
+  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) memberIds!: string[];
+}
 import { AuditLogsService } from '../audit-logs/audit-logs.service';
 import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
 import { ok, paginated } from '../common/response';
@@ -146,6 +153,29 @@ export class ClubsController {
     return ok(branding, 'Đã cập nhật thương hiệu');
   }
 
+  // ── Ủy quyền minigame (clubId LẤY TỪ JWT — tenant-scoped) ──
+  /** Mọi role đã đăng nhập trong CLB đọc được (member cần biết mình có quyền). */
+  @Get('me/minigame-delegates')
+  async getMinigameDelegates(@CurrentUser() user: JwtUser) {
+    if (!user.clubId)
+      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
+    return ok(await this.clubs.getMinigameDelegates(user.clubId));
+  }
+
+  @Patch('me/minigame-delegates')
+  @Roles('CLUB_ADMIN')
+  async setMinigameDelegates(
+    @CurrentUser() user: JwtUser,
+    @Body() body: SetMinigameDelegatesDto,
+  ) {
+    if (!user.clubId)
+      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
+    return ok(
+      await this.clubs.setMinigameDelegates(user.clubId, body.memberIds),
+      'Đã cập nhật ủy quyền minigame',
+    );
+  }
+
   @Get(':id')
   async findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
     if (user.role !== 'SUPER_ADMIN' && user.clubId !== id)
diff --git a/backend/src/clubs/clubs.service.ts b/backend/src/clubs/clubs.service.ts
index a20621f1..f4d68fad 100644
--- a/backend/src/clubs/clubs.service.ts
+++ b/backend/src/clubs/clubs.service.ts
@@ -224,6 +224,49 @@ export class ClubsService {
     });
   }
 
+  /** Danh sách memberId được ủy quyền quản lý minigame (lưu trong Club.settings JSON — additive, không migration). */
+  async getMinigameDelegates(clubId: string): Promise<string[]> {
+    const club = await this.prisma.club.findUnique({
+      where: { id: clubId },
+      select: { settings: true },
+    });
+    if (!club) throw new NotFoundException('CLB không tồn tại');
+    const settings = club.settings as Record<string, unknown> | null;
+    return (settings?.minigameDelegateMemberIds as string[]) ?? [];
+  }
+
+  /** CLUB_ADMIN cập nhật danh sách ủy quyền minigame (validate member thuộc CLB). */
+  async setMinigameDelegates(
+    clubId: string,
+    memberIds: string[],
+  ): Promise<string[]> {
+    const unique = [...new Set(memberIds)];
+    if (unique.length > 0) {
+      const found = await this.prisma.member.findMany({
+        where: { id: { in: unique }, clubId, isDeleted: false },
+        select: { id: true },
+      });
+      if (found.length !== unique.length)
+        throw new BadRequestException('Một số thành viên không thuộc CLB này');
+    }
+    const current = await this.prisma.club.findUnique({
+      where: { id: clubId },
+      select: { settings: true },
+    });
+    if (!current) throw new NotFoundException('CLB không tồn tại');
+    const existing = (current.settings as Record<string, unknown> | null) ?? {};
+    await this.prisma.club.update({
+      where: { id: clubId },
+      data: {
+        settings: {
+          ...existing,
+          minigameDelegateMemberIds: unique,
+        } as Prisma.InputJsonValue,
+      },
+    });
+    return unique;
+  }
+
   async stats() {
     const [total, active, suspended, totalMembers, totalPeriods] =
       await Promise.all([
diff --git a/backend/src/common/guards/member-scope.guard.spec.ts b/backend/src/common/guards/member-scope.guard.spec.ts
index c700e264..80e14257 100644
--- a/backend/src/common/guards/member-scope.guard.spec.ts
+++ b/backend/src/common/guards/member-scope.guard.spec.ts
@@ -2,10 +2,14 @@ import { ForbiddenException } from '@nestjs/common';
 import type { ExecutionContext } from '@nestjs/common';
 import { MemberScopeGuard } from './member-scope.guard';
 
-function ctxFor(user: unknown, path: string): ExecutionContext {
+function ctxFor(
+  user: unknown,
+  path: string,
+  method = 'GET',
+): ExecutionContext {
   return {
     switchToHttp: () => ({
-      getRequest: () => ({ user, path }),
+      getRequest: () => ({ user, path, method }),
     }),
   } as unknown as ExecutionContext;
 }
@@ -46,19 +50,56 @@ describe('MemberScopeGuard', () => {
     });
   });
 
-  describe('MEMBER_VIEW — chặn route quản trị (403)', () => {
+  describe('MEMBER_VIEW — portal read-only (GET) toàn CLB', () => {
     const member = { role: 'MEMBER_VIEW' };
     it.each([
-      '/api/members',
-      '/api/members/mem-B',
-      '/api/fund-periods',
       '/api/attendance',
+      '/api/attendance/sessions',
+      '/api/fund-periods',
+      '/api/fund-periods/x/summary',
       '/api/contributions',
       '/api/expenses',
-      '/api/minigames',
+      '/api/members',
+      '/api/clubs/me',
+      '/api/clubs/me/minigame-delegates',
+    ])('cho phép GET %s', (path) => {
+      expect(guard.canActivate(ctxFor(member, path, 'GET'))).toBe(true);
+    });
+
+    it('chặn mutation trên route GET-only (POST /attendance → 403)', () => {
+      expect(() =>
+        guard.canActivate(ctxFor(member, '/api/attendance', 'POST')),
+      ).toThrow(ForbiddenException);
+    });
+
+    it.each(['/api/members', '/api/fund-periods', '/api/expenses'])(
+      'chặn POST %s',
+      (path) => {
+        expect(() =>
+          guard.canActivate(ctxFor(member, path, 'POST')),
+        ).toThrow(ForbiddenException);
+      },
+    );
+  });
+
+  describe('MEMBER_VIEW — minigame mọi method (siết ở MinigameDelegateGuard)', () => {
+    const member = { role: 'MEMBER_VIEW' };
+    it.each([
+      ['GET', '/api/minigames'],
+      ['POST', '/api/minigames'],
+      ['POST', '/api/minigames/mg-1/start'],
+    ])('cho phép %s %s', (method, path) => {
+      expect(guard.canActivate(ctxFor(member, path, method))).toBe(true);
+    });
+  });
+
+  describe('MEMBER_VIEW — chặn route quản trị (403)', () => {
+    const member = { role: 'MEMBER_VIEW' };
+    it.each([
       '/api/reports/summary',
       '/api/users',
       '/api/clubs',
+      '/api/clubs/abc-123',
       '/api/personal-receipts', // danh sách toàn CLB — không phải /mine
     ])('chặn %s', (path) => {
       expect(() => guard.canActivate(ctxFor(member, path))).toThrow(
@@ -71,5 +112,11 @@ describe('MemberScopeGuard', () => {
         guard.canActivate(ctxFor(member, '/api/member-accounts')),
       ).toThrow(ForbiddenException);
     });
+
+    it('không lách được tiền tố GET-only (/members-export)', () => {
+      expect(() =>
+        guard.canActivate(ctxFor(member, '/api/members-export')),
+      ).toThrow(ForbiddenException);
+    });
   });
 });
diff --git a/backend/src/common/guards/member-scope.guard.ts b/backend/src/common/guards/member-scope.guard.ts
index 6c698201..53d013fa 100644
--- a/backend/src/common/guards/member-scope.guard.ts
+++ b/backend/src/common/guards/member-scope.guard.ts
@@ -6,12 +6,16 @@ import {
 } from '@nestjs/common';
 
 /**
- * MemberScopeGuard (AUTH-IMPL-01) — enforce read-only self-scope cho MEMBER_VIEW ở tầng backend.
+ * MemberScopeGuard (AUTH-IMPL-01, mở rộng portal member) — giới hạn phạm vi cho MEMBER_VIEW.
  *
- * MEMBER_VIEW chỉ được truy cập nhóm route "của chính mình" (member portal, auth self-service,
- * phiếu thu cá nhân, thông báo cá nhân, trợ lý Lisa). MỌI route quản trị (members, fund-periods,
- * attendance, contributions, expenses, minigames, reports, users, clubs, ...) bị chặn 403 —
- * kể cả khi handler không khai báo @Roles. Guard này KHÔNG ảnh hưởng các role khác
+ * MEMBER_VIEW được:
+ * - Truy cập nhóm route "của chính mình" mọi method (member portal, auth self-service,
+ *   phiếu thu cá nhân, thông báo cá nhân, trợ lý Lisa).
+ * - ĐỌC (GET-only) dữ liệu toàn CLB phục vụ portal: lịch chơi / đăng ký / check-in /
+ *   công nợ / tài chính / danh sách thành viên / thông tin CLB.
+ * - Minigame mọi method — mutation do MinigameDelegateGuard siết (chỉ member được ủy quyền).
+ * MỌI route quản trị khác (reports, users, clubs quản trị, ...) hoặc mutation ngoài allowlist
+ * bị chặn 403 — kể cả khi handler không khai báo @Roles. Guard này KHÔNG ảnh hưởng role khác
  * (SUPER_ADMIN / CLUB_ADMIN / CLUB_TREASURER đi qua bình thường).
  *
  * Bảo mật không tin client: phạm vi dữ liệu thực tế vẫn do các service suy ra từ JWT
@@ -30,11 +34,25 @@ export class MemberScopeGuard implements CanActivate {
   /** Route chính xác được phép (self-scope; không lộ thông tin member khác). */
   private static readonly ALLOW_EXACT = ['/personal-receipts/mine'];
 
+  /** Tiền tố route member được đọc (GET-only) — mở rộng portal: lịch/đăng ký/check-in/công nợ/tài chính/minigame. */
+  private static readonly ALLOW_GET_PREFIXES = [
+    '/attendance',
+    '/fund-periods',
+    '/contributions',
+    '/expenses',
+    '/members',
+    '/clubs/me',
+  ];
+
+  /** Minigame: cho qua mọi method — mutation do MinigameDelegateGuard siết (chỉ member được ủy quyền). */
+  private static readonly ALLOW_ALL_METHOD_PREFIXES = ['/minigames'];
+
   canActivate(ctx: ExecutionContext): boolean {
     const req = ctx.switchToHttp().getRequest<{
       user?: { role?: string };
       path?: string;
       url?: string;
+      method?: string;
     }>();
     const user = req.user;
 
@@ -42,11 +60,19 @@ export class MemberScopeGuard implements CanActivate {
     if (!user || user.role !== 'MEMBER_VIEW') return true;
 
     const path = this.normalize(req.path ?? req.url ?? '');
+    const method = (req.method ?? 'GET').toUpperCase();
     const allowed =
       MemberScopeGuard.ALLOW_EXACT.includes(path) ||
       MemberScopeGuard.ALLOW_PREFIXES.some(
         (p) => path === p || path.startsWith(p + '/'),
-      );
+      ) ||
+      MemberScopeGuard.ALLOW_ALL_METHOD_PREFIXES.some(
+        (p) => path === p || path.startsWith(p + '/'),
+      ) ||
+      (method === 'GET' &&
+        MemberScopeGuard.ALLOW_GET_PREFIXES.some(
+          (p) => path === p || path.startsWith(p + '/'),
+        ));
 
     if (!allowed) {
       throw new ForbiddenException(
diff --git a/backend/src/member-portal/member-portal.controller.ts b/backend/src/member-portal/member-portal.controller.ts
index 54700b65..35d05935 100644
--- a/backend/src/member-portal/member-portal.controller.ts
+++ b/backend/src/member-portal/member-portal.controller.ts
@@ -1,5 +1,6 @@
-import { Controller, Get } from '@nestjs/common';
+import { Body, Controller, Get, Param, Put } from '@nestjs/common';
 import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
+import { IsBoolean } from 'class-validator';
 import { MemberPortalService } from './member-portal.service';
 import { CurrentUser, Roles } from '../common/decorators';
 import { ok } from '../common/response';
@@ -12,6 +13,11 @@ interface RequestUser {
   role: string;
 }
 
+/** Body đăng ký / hủy đăng ký buổi chơi (self-scope). */
+class SelfRegistrationDto {
+  @IsBoolean() register!: boolean;
+}
+
 /**
  * Member self-view (AUTH-IMPL-01) — READ-ONLY, chỉ MEMBER_VIEW.
  * Phạm vi dữ liệu lấy từ JWT (memberId/clubId/userId), KHÔNG nhận memberId/clubId từ body/query.
@@ -58,6 +64,36 @@ export class MemberPortalController {
     return ok(await this.svc.getBankInfo(user.memberId, user.clubId));
   }
 
+  /** Member tự đăng ký / hủy đăng ký 1 buổi chơi (idempotent). */
+  @Put('me/sessions/:sessionId/registration')
+  async selfRegister(
+    @Param('sessionId') sessionId: string,
+    @CurrentUser() user: RequestUser,
+    @Body() body: SelfRegistrationDto,
+  ) {
+    return ok(
+      await this.svc.selfRegister(
+        user.memberId,
+        user.clubId,
+        sessionId,
+        body.register,
+      ),
+      body.register ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký',
+    );
+  }
+
+  /** Member tự check-in PRESENT vào buổi chơi (idempotent). */
+  @Put('me/sessions/:sessionId/checkin')
+  async selfCheckin(
+    @Param('sessionId') sessionId: string,
+    @CurrentUser() user: RequestUser,
+  ) {
+    return ok(
+      await this.svc.selfCheckin(user.memberId, user.clubId, sessionId),
+      'Đã check-in',
+    );
+  }
+
   @Get('me/notifications')
   async notifications(@CurrentUser() user: RequestUser) {
     return ok(await this.svc.getNotifications(user.userId, user.clubId));
diff --git a/backend/src/member-portal/member-portal.service.spec.ts b/backend/src/member-portal/member-portal.service.spec.ts
index c11b0980..9f04008c 100644
--- a/backend/src/member-portal/member-portal.service.spec.ts
+++ b/backend/src/member-portal/member-portal.service.spec.ts
@@ -6,7 +6,15 @@ import { FinancialCalculatorService } from '../financial/financial-calculator.se
 
 const prisma = {
   member: { findFirst: jest.fn() },
-  attendanceSession: { findMany: jest.fn().mockResolvedValue([]) },
+  attendanceSession: {
+    findMany: jest.fn().mockResolvedValue([]),
+    findFirst: jest.fn(),
+  },
+  sessionRegistration: {
+    upsert: jest.fn().mockResolvedValue({}),
+    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
+  },
+  attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
   fundPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
   fundContribution: {
     findFirst: jest.fn().mockResolvedValue(null),
@@ -31,6 +39,7 @@ describe('MemberPortalService', () => {
   beforeEach(async () => {
     jest.clearAllMocks();
     prisma.attendanceSession.findMany.mockResolvedValue([]);
+    prisma.attendanceSession.findFirst.mockResolvedValue(null);
     prisma.fundPeriod.findFirst.mockResolvedValue(null);
     prisma.fundContribution.findFirst.mockResolvedValue(null);
     prisma.fundContribution.findMany.mockResolvedValue([]);
@@ -231,4 +240,88 @@ describe('MemberPortalService', () => {
       );
     });
   });
+
+  describe('selfRegister', () => {
+    const SESSION = { id: 's1', clubId: 'club-1' };
+
+    it('memberId null → Forbidden', async () => {
+      await expect(
+        service.selfRegister(null, 'club-1', 's1', true),
+      ).rejects.toThrow(ForbiddenException);
+    });
+
+    it('session không thuộc club → NotFound (scope clubId)', async () => {
+      prisma.attendanceSession.findFirst.mockResolvedValue(null);
+      await expect(
+        service.selfRegister('mem-A', 'club-1', 's-other', true),
+      ).rejects.toThrow(NotFoundException);
+      expect(prisma.attendanceSession.findFirst).toHaveBeenCalledWith({
+        where: { id: 's-other', clubId: 'club-1' },
+      });
+    });
+
+    it('register=true → upsert theo unique attendanceSessionId_memberId (idempotent)', async () => {
+      prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
+      const r = await service.selfRegister('mem-A', 'club-1', 's1', true);
+      expect(prisma.sessionRegistration.upsert).toHaveBeenCalledWith({
+        where: {
+          attendanceSessionId_memberId: {
+            attendanceSessionId: 's1',
+            memberId: 'mem-A',
+          },
+        },
+        create: { clubId: 'club-1', attendanceSessionId: 's1', memberId: 'mem-A' },
+        update: {},
+      });
+      expect(r).toEqual({ sessionId: 's1', registered: true });
+    });
+
+    it('register=false → deleteMany scope club+session+member', async () => {
+      prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
+      const r = await service.selfRegister('mem-A', 'club-1', 's1', false);
+      expect(prisma.sessionRegistration.deleteMany).toHaveBeenCalledWith({
+        where: { clubId: 'club-1', attendanceSessionId: 's1', memberId: 'mem-A' },
+      });
+      expect(r).toEqual({ sessionId: 's1', registered: false });
+    });
+  });
+
+  describe('selfCheckin', () => {
+    it('memberId null → Forbidden', async () => {
+      await expect(service.selfCheckin(null, 'club-1', 's1')).rejects.toThrow(
+        ForbiddenException,
+      );
+    });
+
+    it('session không tồn tại trong club → NotFound', async () => {
+      prisma.attendanceSession.findFirst.mockResolvedValue(null);
+      await expect(
+        service.selfCheckin('mem-A', 'club-1', 's1'),
+      ).rejects.toThrow(NotFoundException);
+    });
+
+    it('upsert PRESENT idempotent theo unique attendanceSessionId_memberId', async () => {
+      prisma.attendanceSession.findFirst.mockResolvedValue({
+        id: 's1',
+        clubId: 'club-1',
+      });
+      const r = await service.selfCheckin('mem-A', 'club-1', 's1');
+      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith({
+        where: {
+          attendanceSessionId_memberId: {
+            attendanceSessionId: 's1',
+            memberId: 'mem-A',
+          },
+        },
+        create: {
+          attendanceSessionId: 's1',
+          memberId: 'mem-A',
+          clubId: 'club-1',
+          status: 'PRESENT',
+        },
+        update: { status: 'PRESENT' },
+      });
+      expect(r).toEqual({ sessionId: 's1', checkedIn: true });
+    });
+  });
 });
diff --git a/backend/src/member-portal/member-portal.service.ts b/backend/src/member-portal/member-portal.service.ts
index 532fa484..7f851e6f 100644
--- a/backend/src/member-portal/member-portal.service.ts
+++ b/backend/src/member-portal/member-portal.service.ts
@@ -206,6 +206,71 @@ export class MemberPortalService {
     }));
   }
 
+  /** Bảo đảm buổi chơi thuộc đúng club (chống truy cập chéo). */
+  private async assertSession(sessionId: string, clubId: string) {
+    const session = await this.prisma.attendanceSession.findFirst({
+      where: { id: sessionId, clubId },
+    });
+    if (!session) throw new NotFoundException('Không tìm thấy buổi chơi.');
+    return session;
+  }
+
+  /** Member tự đăng ký / hủy đăng ký 1 buổi chơi (self-scope, idempotent). */
+  async selfRegister(
+    memberId: string | null,
+    clubId: string,
+    sessionId: string,
+    register: boolean,
+  ) {
+    if (!memberId)
+      throw new ForbiddenException(
+        'Tài khoản chưa liên kết hồ sơ thành viên.',
+      );
+    await this.assertSession(sessionId, clubId);
+    if (register) {
+      await this.prisma.sessionRegistration.upsert({
+        where: {
+          attendanceSessionId_memberId: {
+            attendanceSessionId: sessionId,
+            memberId,
+          },
+        },
+        create: { clubId, attendanceSessionId: sessionId, memberId },
+        update: {},
+      });
+    } else {
+      await this.prisma.sessionRegistration.deleteMany({
+        where: { clubId, attendanceSessionId: sessionId, memberId },
+      });
+    }
+    return { sessionId, registered: register };
+  }
+
+  /** Member tự check-in PRESENT vào buổi chơi (self-scope, idempotent). */
+  async selfCheckin(memberId: string | null, clubId: string, sessionId: string) {
+    if (!memberId)
+      throw new ForbiddenException(
+        'Tài khoản chưa liên kết hồ sơ thành viên.',
+      );
+    await this.assertSession(sessionId, clubId);
+    await this.prisma.attendanceRecord.upsert({
+      where: {
+        attendanceSessionId_memberId: {
+          attendanceSessionId: sessionId,
+          memberId,
+        },
+      },
+      create: {
+        attendanceSessionId: sessionId,
+        memberId,
+        clubId,
+        status: 'PRESENT',
+      },
+      update: { status: 'PRESENT' },
+    });
+    return { sessionId, checkedIn: true };
+  }
+
   async getNotifications(userId: string, clubId: string) {
     return this.prisma.notification.findMany({
       where: { userId, clubId },
diff --git a/backend/src/minigame/minigame-delegate.guard.spec.ts b/backend/src/minigame/minigame-delegate.guard.spec.ts
new file mode 100644
index 00000000..1800df24
--- /dev/null
+++ b/backend/src/minigame/minigame-delegate.guard.spec.ts
@@ -0,0 +1,69 @@
+import { ForbiddenException } from '@nestjs/common';
+import type { ExecutionContext } from '@nestjs/common';
+import { MinigameDelegateGuard } from './minigame-delegate.guard';
+import type { PrismaService } from '../prisma/prisma.service';
+
+function ctxFor(user: unknown, method: string): ExecutionContext {
+  return {
+    switchToHttp: () => ({
+      getRequest: () => ({ user, method, path: '/api/minigames' }),
+    }),
+  } as unknown as ExecutionContext;
+}
+
+describe('MinigameDelegateGuard', () => {
+  const prisma = {
+    club: { findUnique: jest.fn() },
+  };
+  const guard = new MinigameDelegateGuard(prisma as unknown as PrismaService);
+
+  beforeEach(() => {
+    jest.clearAllMocks();
+    prisma.club.findUnique.mockResolvedValue({
+      settings: { minigameDelegateMemberIds: ['mem-A'] },
+    });
+  });
+
+  it('GET luôn cho qua (kể cả MEMBER_VIEW chưa ủy quyền)', async () => {
+    const user = { role: 'MEMBER_VIEW', memberId: 'mem-X', clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'GET'))).resolves.toBe(true);
+    expect(prisma.club.findUnique).not.toHaveBeenCalled();
+  });
+
+  it('CLUB_ADMIN POST cho qua (role khác do RolesGuard xử lý)', async () => {
+    const user = { role: 'CLUB_ADMIN', memberId: null, clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'POST'))).resolves.toBe(true);
+    expect(prisma.club.findUnique).not.toHaveBeenCalled();
+  });
+
+  it('MEMBER_VIEW POST KHÔNG nằm trong delegates → Forbidden', async () => {
+    const user = { role: 'MEMBER_VIEW', memberId: 'mem-X', clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
+      ForbiddenException,
+    );
+  });
+
+  it('MEMBER_VIEW POST nằm trong delegates → cho qua', async () => {
+    const user = { role: 'MEMBER_VIEW', memberId: 'mem-A', clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'POST'))).resolves.toBe(true);
+    expect(prisma.club.findUnique).toHaveBeenCalledWith({
+      where: { id: 'club-1' },
+      select: { settings: true },
+    });
+  });
+
+  it('MEMBER_VIEW chưa liên kết member (memberId null) → Forbidden', async () => {
+    const user = { role: 'MEMBER_VIEW', memberId: null, clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
+      ForbiddenException,
+    );
+  });
+
+  it('CLB chưa cấu hình delegates (settings null) → Forbidden', async () => {
+    prisma.club.findUnique.mockResolvedValue({ settings: null });
+    const user = { role: 'MEMBER_VIEW', memberId: 'mem-A', clubId: 'club-1' };
+    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
+      ForbiddenException,
+    );
+  });
+});
diff --git a/backend/src/minigame/minigame-delegate.guard.ts b/backend/src/minigame/minigame-delegate.guard.ts
new file mode 100644
index 00000000..d6e84da8
--- /dev/null
+++ b/backend/src/minigame/minigame-delegate.guard.ts
@@ -0,0 +1,40 @@
+import {
+  CanActivate,
+  ExecutionContext,
+  ForbiddenException,
+  Injectable,
+} from '@nestjs/common';
+import { PrismaService } from '../prisma/prisma.service';
+
+/**
+ * Siết mutation minigame cho MEMBER_VIEW: chỉ member nằm trong danh sách ủy quyền
+ * (Club.settings.minigameDelegateMemberIds) mới được tạo/quản lý giải.
+ * GET luôn cho qua; role khác (CLUB_ADMIN...) do RolesGuard xử lý.
+ */
+@Injectable()
+export class MinigameDelegateGuard implements CanActivate {
+  constructor(private prisma: PrismaService) {}
+
+  async canActivate(ctx: ExecutionContext): Promise<boolean> {
+    const req = ctx.switchToHttp().getRequest<{
+      user?: { role?: string; memberId?: string | null; clubId?: string };
+      method?: string;
+    }>();
+    const user = req.user;
+    const method = (req.method ?? 'GET').toUpperCase();
+    if (method === 'GET') return true;
+    if (!user || user.role !== 'MEMBER_VIEW') return true; // role khác do RolesGuard
+    if (!user.memberId || !user.clubId)
+      throw new ForbiddenException('Bạn chưa được ủy quyền quản lý minigame.');
+    const club = await this.prisma.club.findUnique({
+      where: { id: user.clubId },
+      select: { settings: true },
+    });
+    const delegates =
+      ((club?.settings as Record<string, unknown> | null)
+        ?.minigameDelegateMemberIds as string[] | undefined) ?? [];
+    if (!delegates.includes(user.memberId))
+      throw new ForbiddenException('Bạn chưa được ủy quyền quản lý minigame.');
+    return true;
+  }
+}
diff --git a/backend/src/minigame/minigame.controller.ts b/backend/src/minigame/minigame.controller.ts
index 0007fe42..7d2f9512 100644
--- a/backend/src/minigame/minigame.controller.ts
+++ b/backend/src/minigame/minigame.controller.ts
@@ -6,6 +6,7 @@ import {
   Delete,
   Param,
   Body,
+  UseGuards,
 } from '@nestjs/common';
 import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
 import {
@@ -22,6 +23,7 @@ import {
 } from 'class-validator';
 import { Type } from 'class-transformer';
 import { MinigameService } from './minigame.service';
+import { MinigameDelegateGuard } from './minigame-delegate.guard';
 import { CurrentUser, Roles } from '../common/decorators';
 import { ok } from '../common/response';
 import { MinigameFormat } from '@prisma/client';
@@ -30,6 +32,8 @@ import { MinigameFormat } from '@prisma/client';
 interface RequestUser {
   clubId: string;
   userId: string;
+  memberId: string | null;
+  role: string;
 }
 
 class CreateMinigameDto {
@@ -81,6 +85,7 @@ class UpdateMatchScoreDto {
 @ApiTags('Minigame')
 @ApiBearerAuth()
 @Controller('minigames')
+@UseGuards(MinigameDelegateGuard)
 export class MinigameController {
   constructor(private svc: MinigameService) {}
 
@@ -95,7 +100,7 @@ export class MinigameController {
   }
 
   @Post()
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async create(
     @CurrentUser() user: RequestUser,
     @Body() body: CreateMinigameDto,
@@ -109,7 +114,7 @@ export class MinigameController {
   }
 
   @Post(':id/participants')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async addParticipants(
     @Param('id') id: string,
     @CurrentUser() user: RequestUser,
@@ -126,7 +131,7 @@ export class MinigameController {
   }
 
   @Post(':id/generate-teams')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async generateTeams(
     @Param('id') id: string,
     @CurrentUser() user: RequestUser,
@@ -135,7 +140,7 @@ export class MinigameController {
   }
 
   @Post(':id/generate-schedule')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async generateSchedule(
     @Param('id') id: string,
     @CurrentUser() user: RequestUser,
@@ -144,7 +149,7 @@ export class MinigameController {
   }
 
   @Post(':id/teams')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async createTeam(
     @Param('id') id: string,
     @CurrentUser() user: RequestUser,
@@ -154,7 +159,7 @@ export class MinigameController {
   }
 
   @Delete(':id/teams/:teamId')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async deleteTeam(
     @Param('id') id: string,
     @Param('teamId') teamId: string,
@@ -164,7 +169,7 @@ export class MinigameController {
   }
 
   @Delete(':id/schedule')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async clearSchedule(
     @Param('id') id: string,
     @CurrentUser() user: RequestUser,
@@ -176,13 +181,13 @@ export class MinigameController {
   }
 
   @Post(':id/start')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async start(@Param('id') id: string, @CurrentUser() user: RequestUser) {
     return ok(await this.svc.startMinigame(id, user.clubId));
   }
 
   @Patch('matches/:matchId/score')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async score(
     @Param('matchId') matchId: string,
     @CurrentUser() user: RequestUser,
@@ -199,13 +204,13 @@ export class MinigameController {
   }
 
   @Post(':id/end')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async end(@Param('id') id: string, @CurrentUser() user: RequestUser) {
     return ok(await this.svc.endMinigame(id, user.clubId));
   }
 
   @Post(':id/cancel')
-  @Roles('CLUB_ADMIN')
+  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
   async cancel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
     return ok(await this.svc.cancel(id, user.clubId));
   }
diff --git a/backend/src/minigame/minigame.module.ts b/backend/src/minigame/minigame.module.ts
index 320104f4..913a72a2 100644
--- a/backend/src/minigame/minigame.module.ts
+++ b/backend/src/minigame/minigame.module.ts
@@ -1,12 +1,13 @@
 import { Module } from '@nestjs/common';
 import { MinigameService } from './minigame.service';
 import { MinigameController } from './minigame.controller';
+import { MinigameDelegateGuard } from './minigame-delegate.guard';
 import { PrismaModule } from '../prisma/prisma.module';
 import { WorkflowsModule } from '../workflows/workflows.module';
 
 @Module({
   imports: [PrismaModule, WorkflowsModule],
   controllers: [MinigameController],
-  providers: [MinigameService],
+  providers: [MinigameService, MinigameDelegateGuard],
 })
 export class MinigameModule {}

````

## 376aa217 — fix(v2.2): đồng bộ công thức tài chính AI + siết multi-tenant FK (self-audit)

````diff
diff --git a/backend/src/attendance/attendance.service.ts b/backend/src/attendance/attendance.service.ts
index 3e9d095f..9c6e30f4 100644
--- a/backend/src/attendance/attendance.service.ts
+++ b/backend/src/attendance/attendance.service.ts
@@ -181,8 +181,8 @@ export class AttendanceService {
     }
     // Fallback 2: match by date range of the fund period (sessions linked to wrong/other period)
     if (fundPeriodId && sessions.length === 0) {
-      const period = await this.prisma.fundPeriod.findUnique({
-        where: { id: fundPeriodId },
+      const period = await this.prisma.fundPeriod.findFirst({
+        where: { id: fundPeriodId, clubId },
         select: { startDate: true, endDate: true },
       });
       if (period) {
diff --git a/backend/src/contributions/contributions.service.spec.ts b/backend/src/contributions/contributions.service.spec.ts
index ca103316..8af473d2 100644
--- a/backend/src/contributions/contributions.service.spec.ts
+++ b/backend/src/contributions/contributions.service.spec.ts
@@ -18,7 +18,8 @@ const mockPrisma = {
     groupBy: jest.fn(),
   },
   fundPeriod: { findFirst: jest.fn() },
-  member: { findMany: jest.fn() },
+  member: { findMany: jest.fn(), findFirst: jest.fn() },
+  minigame: { findFirst: jest.fn() },
 };
 
 const mockEvents = { publish: jest.fn() };
@@ -76,6 +77,9 @@ describe('ContributionsService', () => {
 
   describe('create', () => {
     it('should create COMMON contribution with valid data', async () => {
+      // FK ownership validation: member + fundPeriod thuộc club
+      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
       mockPrisma.fundContribution.create.mockResolvedValue(baseContrib);
 
       const result = await service.create('club-1', 'user-1', {
@@ -119,6 +123,21 @@ describe('ContributionsService', () => {
         }),
       ).rejects.toThrow(BadRequestException);
     });
+
+    it('should reject cross-club fundPeriod FK (multi-tenant isolation)', async () => {
+      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null); // kỳ quỹ CLB khác
+      await expect(
+        service.create('club-1', 'user-1', {
+          fundSource: 'COMMON',
+          memberId: 'mem-1',
+          fundPeriodId: 'period-of-other-club',
+          amount: 100000,
+          paidAt: '2026-03-01',
+        }),
+      ).rejects.toThrow(BadRequestException);
+      expect(mockPrisma.fundContribution.create).not.toHaveBeenCalled();
+    });
   });
 
   describe('delete', () => {
diff --git a/backend/src/contributions/contributions.service.ts b/backend/src/contributions/contributions.service.ts
index 9efbc373..e33e7367 100644
--- a/backend/src/contributions/contributions.service.ts
+++ b/backend/src/contributions/contributions.service.ts
@@ -57,6 +57,37 @@ export class ContributionsService {
     return c;
   }
 
+  /**
+   * Chống nhiễm chéo tenant: FK từ body (memberId/fundPeriodId/relatedMinigameId)
+   * BẮT BUỘC thuộc cùng clubId người gọi trước khi gán. (Nhất quán attendance.create / importBulk.)
+   */
+  private async assertFkOwnership(
+    clubId: string,
+    dto: Partial<CreateContributionDto>,
+  ) {
+    if (dto.memberId) {
+      const m = await this.prisma.member.findFirst({
+        where: { id: dto.memberId, clubId },
+        select: { id: true },
+      });
+      if (!m) throw new BadRequestException('Thành viên không thuộc CLB này');
+    }
+    if (dto.fundPeriodId) {
+      const p = await this.prisma.fundPeriod.findFirst({
+        where: { id: dto.fundPeriodId, clubId },
+        select: { id: true },
+      });
+      if (!p) throw new BadRequestException('Kỳ quỹ không thuộc CLB này');
+    }
+    if (dto.relatedMinigameId) {
+      const g = await this.prisma.minigame.findFirst({
+        where: { id: dto.relatedMinigameId, clubId },
+        select: { id: true },
+      });
+      if (!g) throw new BadRequestException('Giải đấu không thuộc CLB này');
+    }
+  }
+
   async create(clubId: string, userId: string, dto: CreateContributionDto) {
     const fundSource: FundSource = dto.fundSource ?? 'COMMON';
 
@@ -76,6 +107,8 @@ export class ContributionsService {
         throw new BadRequestException('miniIncomeType bắt buộc cho Quỹ Mini');
     }
 
+    await this.assertFkOwnership(clubId, dto);
+
     return this.prisma.fundContribution.create({
       data: {
         clubId,
@@ -111,6 +144,7 @@ export class ContributionsService {
     ) {
       throw new BadRequestException('Số tiền phải lớn hơn 0');
     }
+    await this.assertFkOwnership(clubId, dto);
     return this.prisma.fundContribution.update({
       where: { id, clubId },
       data: {
diff --git a/backend/src/expenses/expenses.service.spec.ts b/backend/src/expenses/expenses.service.spec.ts
index 20866297..4f16f345 100644
--- a/backend/src/expenses/expenses.service.spec.ts
+++ b/backend/src/expenses/expenses.service.spec.ts
@@ -16,6 +16,11 @@ const mockPrisma = {
     aggregate: jest.fn(),
     groupBy: jest.fn(),
   },
+  // FK ownership validation (assertFkOwnership)
+  fundPeriod: { findFirst: jest.fn() },
+  attendanceSession: { findFirst: jest.fn() },
+  expenseCategory: { findFirst: jest.fn() },
+  minigame: { findFirst: jest.fn() },
 };
 
 const baseExpense = {
@@ -55,6 +60,11 @@ describe('ExpensesService', () => {
       ],
     }).compile();
     service = module.get<ExpensesService>(ExpensesService);
+    // Mặc định FK thuộc club (assertFkOwnership PASS); test cross-tenant override null.
+    mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
+    mockPrisma.attendanceSession.findFirst.mockResolvedValue({ id: 'sess-1' });
+    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
+    mockPrisma.minigame.findFirst.mockResolvedValue({ id: 'mg-1' });
   });
 
   /* ── findOne ── */
@@ -131,6 +141,17 @@ describe('ExpensesService', () => {
       ).rejects.toBeInstanceOf(BadRequestException);
     });
 
+    it('rejects cross-club fundPeriod FK (multi-tenant isolation)', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null); // kỳ quỹ CLB khác
+      await expect(
+        service.create('club-1', 'user-1', {
+          ...validDto,
+          fundPeriodId: 'period-of-other-club',
+        }),
+      ).rejects.toBeInstanceOf(BadRequestException);
+      expect(mockPrisma.livingExpense.create).not.toHaveBeenCalled();
+    });
+
     it('throws BadRequestException for MINI without miniExpenseType', async () => {
       await expect(
         service.create('club-1', 'user-1', {
diff --git a/backend/src/expenses/expenses.service.ts b/backend/src/expenses/expenses.service.ts
index 00f8adc3..77b11f41 100644
--- a/backend/src/expenses/expenses.service.ts
+++ b/backend/src/expenses/expenses.service.ts
@@ -60,6 +60,41 @@ export class ExpensesService {
     return e;
   }
 
+  /**
+   * Chống nhiễm chéo tenant: FK từ body (fundPeriodId/attendanceSessionId/categoryId/relatedMinigameId)
+   * BẮT BUỘC thuộc cùng clubId người gọi trước khi gán.
+   */
+  private async assertFkOwnership(clubId: string, dto: Partial<CreateExpenseDto>) {
+    if (dto.fundPeriodId) {
+      const p = await this.prisma.fundPeriod.findFirst({
+        where: { id: dto.fundPeriodId, clubId },
+        select: { id: true },
+      });
+      if (!p) throw new BadRequestException('Kỳ quỹ không thuộc CLB này');
+    }
+    if (dto.attendanceSessionId) {
+      const s = await this.prisma.attendanceSession.findFirst({
+        where: { id: dto.attendanceSessionId, clubId },
+        select: { id: true },
+      });
+      if (!s) throw new BadRequestException('Buổi chơi không thuộc CLB này');
+    }
+    if (dto.categoryId) {
+      const c = await this.prisma.expenseCategory.findFirst({
+        where: { id: dto.categoryId, clubId },
+        select: { id: true },
+      });
+      if (!c) throw new BadRequestException('Danh mục không thuộc CLB này');
+    }
+    if (dto.relatedMinigameId) {
+      const g = await this.prisma.minigame.findFirst({
+        where: { id: dto.relatedMinigameId, clubId },
+        select: { id: true },
+      });
+      if (!g) throw new BadRequestException('Giải đấu không thuộc CLB này');
+    }
+  }
+
   async create(clubId: string, userId: string, dto: CreateExpenseDto) {
     const fundSource: FundSource = dto.fundSource ?? 'COMMON';
 
@@ -79,6 +114,8 @@ export class ExpensesService {
         throw new BadRequestException('miniExpenseType bắt buộc cho Quỹ Mini');
     }
 
+    await this.assertFkOwnership(clubId, dto);
+
     const expense = await this.prisma.livingExpense.create({
       data: {
         clubId,
@@ -130,6 +167,7 @@ export class ExpensesService {
       throw new BadRequestException('Số tiền phải lớn hơn 0');
     }
     const fundSource = dto.fundSource ?? existing.fundSource;
+    await this.assertFkOwnership(clubId, dto);
     return this.prisma.livingExpense.update({
       where: { id, clubId },
       data: {
diff --git a/backend/src/financial/financial-calculator.service.ts b/backend/src/financial/financial-calculator.service.ts
index 7d2b7c2e..5a67685b 100644
--- a/backend/src/financial/financial-calculator.service.ts
+++ b/backend/src/financial/financial-calculator.service.ts
@@ -170,7 +170,7 @@ export class FinancialCalculatorService {
     const [attendanceCounts, paidAmounts] = await Promise.all([
       this.prisma.attendanceRecord.groupBy({
         by: ['memberId'],
-        where: { status: 'PRESENT', attendanceSession: { fundPeriodId } },
+        where: { status: 'PRESENT', clubId, attendanceSession: { fundPeriodId } },
         _count: { id: true },
       }),
       this.prisma.fundContribution.groupBy({
diff --git a/backend/src/lisa/lisa.service.ts b/backend/src/lisa/lisa.service.ts
index 39e3a702..4fe11998 100644
--- a/backend/src/lisa/lisa.service.ts
+++ b/backend/src/lisa/lisa.service.ts
@@ -238,7 +238,12 @@ export class LisaService {
     let clubTotalExpenses = 0;
     try {
       const expenses = await this.prisma.livingExpense.findMany({
-        where: { clubId: member.clubId },
+        // Chỉ chi Common Fund đã duyệt — không trộn quỹ MINI, không tính khoản pending/rejected
+        where: {
+          clubId: member.clubId,
+          fundSource: 'COMMON',
+          status: { in: ['approved', 'paid'] },
+        },
         select: { amount: true },
       });
       clubTotalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
diff --git a/backend/src/maika/maika.service.ts b/backend/src/maika/maika.service.ts
index fabc3728..4af508fd 100644
--- a/backend/src/maika/maika.service.ts
+++ b/backend/src/maika/maika.service.ts
@@ -49,7 +49,8 @@ export class MaikaService {
           select: { amount: true, fundSource: true },
         }),
         this.prisma.livingExpense.findMany({
-          where: { clubId },
+          // status approved/paid — nhất quán FinancialCalculatorService (chi pending/rejected KHÔNG tính vào quỹ)
+          where: { clubId, status: { in: ['approved', 'paid'] } },
           select: { amount: true, fundSource: true },
         }),
         this.prisma.attendanceSession.findMany({
diff --git a/backend/src/personal-receipts/personal-receipts.service.ts b/backend/src/personal-receipts/personal-receipts.service.ts
index 15e2764f..ea327dbe 100644
--- a/backend/src/personal-receipts/personal-receipts.service.ts
+++ b/backend/src/personal-receipts/personal-receipts.service.ts
@@ -1,4 +1,4 @@
-import { Injectable } from '@nestjs/common';
+import { Injectable, NotFoundException } from '@nestjs/common';
 import { PrismaService } from '../prisma/prisma.service';
 import { FinancialCalculatorService } from '../financial/financial-calculator.service';
 import { Decimal } from '@prisma/client/runtime/library';
@@ -35,6 +35,12 @@ export class PersonalReceiptsService {
 
   // Compute and snapshot all member receipts for a fund period
   async generateForPeriod(fundPeriodId: string, clubId: string) {
+    // Chống nhiễm chéo tenant: kỳ quỹ BẮT BUỘC thuộc clubId người gọi (calculate() nhận id từ URL param).
+    const period = await this.prisma.fundPeriod.findFirst({
+      where: { id: fundPeriodId, clubId },
+      select: { id: true },
+    });
+    if (!period) throw new NotFoundException('Kỳ quỹ không thuộc CLB này');
     const summary = await this.calculator.calculate(fundPeriodId, clubId);
 
     const receipts = await Promise.all(

````

## 2b582acf — feat(fund-periods): FUND-IMPL-01 — sao chép thành viên từ kỳ quỹ trước

````diff
diff --git a/backend/prisma/migrations/20260707150300_add_fund_period_members/migration.sql b/backend/prisma/migrations/20260707150300_add_fund_period_members/migration.sql
new file mode 100644
index 00000000..a089c9c9
--- /dev/null
+++ b/backend/prisma/migrations/20260707150300_add_fund_period_members/migration.sql
@@ -0,0 +1,27 @@
+-- FUND-IMPL-01: Roster thành viên "được kỳ vọng đóng" của 1 kỳ quỹ (chủ yếu Quỹ Phụ/
+-- giải đấu — không phải mọi thành viên CLB đều tham gia). TÁCH BIỆT fund_contributions
+-- (log giao dịch thật) — dùng cho tính năng "Sao chép thành viên từ kỳ quỹ trước".
+-- Additive, non-destructive.
+CREATE TABLE "fund_period_members" (
+    "id" TEXT NOT NULL,
+    "club_id" TEXT NOT NULL,
+    "fund_period_id" TEXT NOT NULL,
+    "member_id" TEXT NOT NULL,
+    "expected_amount" DECIMAL(15,2) NOT NULL,
+    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
+    "updated_at" TIMESTAMP(3) NOT NULL,
+
+    CONSTRAINT "fund_period_members_pkey" PRIMARY KEY ("id")
+);
+
+CREATE UNIQUE INDEX "fund_period_members_fund_period_id_member_id_key"
+  ON "fund_period_members"("fund_period_id", "member_id");
+CREATE INDEX "fund_period_members_club_id_fund_period_id_idx"
+  ON "fund_period_members"("club_id", "fund_period_id");
+
+ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_club_id_fkey"
+  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
+ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_fund_period_id_fkey"
+  FOREIGN KEY ("fund_period_id") REFERENCES "fund_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
+ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_member_id_fkey"
+  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
diff --git a/backend/prisma/schema.prisma b/backend/prisma/schema.prisma
index e08090c6..10291bc4 100644
--- a/backend/prisma/schema.prisma
+++ b/backend/prisma/schema.prisma
@@ -42,6 +42,7 @@ model Club {
   workflowRuns      WorkflowRun[]
   notificationJobs  NotificationJob[]
   sessionRegistrations SessionRegistration[]
+  fundPeriodMembers FundPeriodMember[]
 
   @@map("clubs")
 }
@@ -130,6 +131,7 @@ model Member {
   teamsAsPlayer2    MinigameTeam[]     @relation("TeamPlayer2")
   payments          Payment[]
   sessionRegistrations SessionRegistration[]
+  fundPeriodMemberships FundPeriodMember[]
 
   @@index([clubId, isDeleted])
   @@map("members")
@@ -166,11 +168,35 @@ model FundPeriod {
   attendanceSessions AttendanceSession[]
   expenses           LivingExpense[]
   personalReceipts   PersonalReceipt[]
+  periodMembers      FundPeriodMember[]
 
   @@index([clubId])
   @@map("fund_periods")
 }
 
+/// Roster thành viên "được kỳ vọng đóng" của 1 kỳ quỹ (chủ yếu Quỹ Phụ/giải đấu —
+/// không phải mọi thành viên CLB đều tham gia mỗi giải). TÁCH BIỆT FundContribution
+/// (log giao dịch thực tế) — roster tồn tại kể cả khi chưa có giao dịch nào, dùng để
+/// biết "ai thuộc kỳ này + mức đóng kỳ vọng"; trạng thái đã đóng/chưa đóng luôn SUY RA
+/// từ FundContribution (không lưu paidAmount/status ở đây để tránh dữ liệu trùng/lệch).
+model FundPeriodMember {
+  id             String   @id @default(uuid())
+  clubId         String   @map("club_id")
+  fundPeriodId   String   @map("fund_period_id")
+  memberId       String   @map("member_id")
+  expectedAmount Decimal  @map("expected_amount") @db.Decimal(15, 2)
+  createdAt      DateTime @default(now()) @map("created_at")
+  updatedAt      DateTime @updatedAt @map("updated_at")
+
+  club       Club       @relation(fields: [clubId], references: [id])
+  fundPeriod FundPeriod @relation(fields: [fundPeriodId], references: [id], onDelete: Cascade)
+  member     Member     @relation(fields: [memberId], references: [id])
+
+  @@unique([fundPeriodId, memberId])
+  @@index([clubId, fundPeriodId])
+  @@map("fund_period_members")
+}
+
 enum FundPeriodStatus {
   draft
   active
diff --git a/backend/src/fund-periods/fund-periods.controller.ts b/backend/src/fund-periods/fund-periods.controller.ts
index 3a72a929..be02aa94 100644
--- a/backend/src/fund-periods/fund-periods.controller.ts
+++ b/backend/src/fund-periods/fund-periods.controller.ts
@@ -7,11 +7,12 @@ import {
   Delete,
   Body,
   Param,
+  Query,
 } from '@nestjs/common';
 import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
 import { SkipThrottle } from '@nestjs/throttler';
 import { FundPeriodsService } from './fund-periods.service';
-import { CurrentUser, Roles} from '../common/decorators';
+import { CurrentUser, Roles } from '../common/decorators';
 import { ok } from '../common/response';
 import {
   CreateFundPeriodDto,
@@ -34,9 +35,18 @@ export class FundPeriodsController {
   @Post()
   @Roles('CLUB_ADMIN')
   async create(@CurrentUser() user: any, @Body() body: CreateFundPeriodDto) {
+    const created = await this.service.create(user.clubId, user.userId, body);
+    const message = created.copiedMembersCount
+      ? `Tạo kỳ quỹ thành công. Đã sao chép ${created.copiedMembersCount} thành viên từ kỳ quỹ trước.`
+      : 'Tạo kỳ quỹ thành công.';
+    return ok(created, message);
+  }
+
+  // FUND-IMPL-01: đặt TRƯỚC ':id' để tránh NestJS match nhầm 'previous' thành :id.
+  @Get('previous')
+  async previous(@CurrentUser() user: any, @Query('type') type?: string) {
     return ok(
-      await this.service.create(user.clubId, user.userId, body),
-      'Tạo kỳ quỹ thành công',
+      await this.service.previousPeriodInfo(user.clubId, type ?? 'chung'),
     );
   }
 
diff --git a/backend/src/fund-periods/fund-periods.dto.ts b/backend/src/fund-periods/fund-periods.dto.ts
index 26c025b1..cfee1123 100644
--- a/backend/src/fund-periods/fund-periods.dto.ts
+++ b/backend/src/fund-periods/fund-periods.dto.ts
@@ -5,6 +5,7 @@ import {
   IsPositive,
   IsDateString,
   IsInt,
+  IsBoolean,
   Min,
 } from 'class-validator';
 import { Type } from 'class-transformer';
@@ -37,6 +38,13 @@ export class CreateFundPeriodDto {
   @IsOptional()
   @IsString()
   type?: string;
+
+  // FUND-IMPL-01: sao chép roster thành viên từ kỳ quỹ gần nhất cùng loại (chủ yếu
+  // dùng cho Quỹ Phụ/giải đấu) sang kỳ mới. Default false — giữ nguyên behavior cũ.
+  @IsOptional()
+  @IsBoolean()
+  @Type(() => Boolean)
+  copyMembersFromPreviousPeriod?: boolean;
 }
 
 export class UpdateFundPeriodStatusDto {
diff --git a/backend/src/fund-periods/fund-periods.service.spec.ts b/backend/src/fund-periods/fund-periods.service.spec.ts
index 5a8678f3..461e5803 100644
--- a/backend/src/fund-periods/fund-periods.service.spec.ts
+++ b/backend/src/fund-periods/fund-periods.service.spec.ts
@@ -36,6 +36,11 @@ const mockPrisma = {
   personalReceipt: {
     upsert: jest.fn(),
   },
+  fundPeriodMember: {
+    findMany: jest.fn(),
+    createMany: jest.fn(),
+    count: jest.fn(),
+  },
   $transaction: jest.fn().mockResolvedValue([]),
 };
 
@@ -137,6 +142,174 @@ describe('FundPeriodsService', () => {
         BadRequestException,
       );
     });
+
+    it('should not open a transaction when copyMembersFromPreviousPeriod is false/omitted', async () => {
+      mockPrisma.fundPeriod.create.mockResolvedValue({ ...basePeriod });
+      const result = await service.create('club-1', 'user-1', validDto);
+      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
+      expect(result.copiedMembersCount).toBe(0);
+    });
+  });
+
+  describe('create — FUND-IMPL-01 copy members from previous period', () => {
+    const gameDto = {
+      name: 'Giải Hè 2026',
+      startDate: '2026-07-01',
+      endDate: '2026-07-31',
+      contributionAmount: 200000,
+      type: 'game',
+      copyMembersFromPreviousPeriod: true,
+    };
+    const newPeriod = {
+      ...basePeriod,
+      id: 'period-new',
+      type: 'game',
+      contributionAmount: new Decimal(200000),
+      startDate: new Date('2026-07-01'),
+      endDate: new Date('2026-07-31'),
+    };
+    const prevPeriod = {
+      ...basePeriod,
+      id: 'period-prev',
+      type: 'game',
+      startDate: new Date('2026-04-01'),
+      endDate: new Date('2026-04-30'),
+    };
+
+    beforeEach(() => {
+      mockPrisma.$transaction.mockImplementation(
+        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) =>
+          cb(mockPrisma),
+      );
+      mockPrisma.fundPeriod.create.mockResolvedValue(newPeriod);
+    });
+
+    it('copies active members roster from nearest previous period of same type', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
+      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
+        { memberId: 'mem-1' },
+        { memberId: 'mem-2' },
+      ]);
+      mockPrisma.member.findMany.mockResolvedValue([
+        { id: 'mem-1' },
+        { id: 'mem-2' },
+      ]);
+      mockPrisma.fundPeriodMember.createMany.mockResolvedValue({ count: 2 });
+
+      const result = await service.create('club-1', 'user-1', gameDto);
+
+      expect(mockPrisma.fundPeriod.findFirst).toHaveBeenCalledWith(
+        expect.objectContaining({
+          where: expect.objectContaining({ clubId: 'club-1', type: 'game' }),
+        }),
+      );
+      expect(mockPrisma.fundPeriodMember.createMany).toHaveBeenCalledWith({
+        data: [
+          {
+            clubId: 'club-1',
+            fundPeriodId: 'period-new',
+            memberId: 'mem-1',
+            expectedAmount: newPeriod.contributionAmount,
+          },
+          {
+            clubId: 'club-1',
+            fundPeriodId: 'period-new',
+            memberId: 'mem-2',
+            expectedAmount: newPeriod.contributionAmount,
+          },
+        ],
+        skipDuplicates: true,
+      });
+      expect(result.copiedMembersCount).toBe(2);
+    });
+
+    it('excludes members that are no longer active (inactive/left)', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
+      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
+        { memberId: 'mem-1' },
+        { memberId: 'mem-2' },
+      ]);
+      // Chỉ mem-1 còn active — member.findMany filter status:'active' đã loại mem-2.
+      mockPrisma.member.findMany.mockResolvedValue([{ id: 'mem-1' }]);
+      mockPrisma.fundPeriodMember.createMany.mockResolvedValue({ count: 1 });
+
+      const result = await service.create('club-1', 'user-1', gameDto);
+
+      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
+        expect.objectContaining({
+          where: expect.objectContaining({
+            status: 'active',
+            isDeleted: false,
+          }),
+        }),
+      );
+      expect(result.copiedMembersCount).toBe(1);
+    });
+
+    it('creates the period without members when there is no previous period', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
+
+      const result = await service.create('club-1', 'user-1', gameDto);
+
+      expect(mockPrisma.fundPeriodMember.findMany).not.toHaveBeenCalled();
+      expect(mockPrisma.fundPeriodMember.createMany).not.toHaveBeenCalled();
+      expect(result.copiedMembersCount).toBe(0);
+    });
+
+    it('creates the period without members when previous period has an empty roster', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
+      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([]);
+
+      const result = await service.create('club-1', 'user-1', gameDto);
+
+      expect(mockPrisma.member.findMany).not.toHaveBeenCalled();
+      expect(mockPrisma.fundPeriodMember.createMany).not.toHaveBeenCalled();
+      expect(result.copiedMembersCount).toBe(0);
+    });
+
+    it('rolls back (rejects) the whole transaction when the copy step fails', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
+      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
+        { memberId: 'mem-1' },
+      ]);
+      mockPrisma.member.findMany.mockResolvedValue([{ id: 'mem-1' }]);
+      mockPrisma.fundPeriodMember.createMany.mockRejectedValue(
+        new Error('DB_FAIL_COPY'),
+      );
+
+      await expect(service.create('club-1', 'user-1', gameDto)).rejects.toThrow(
+        'DB_FAIL_COPY',
+      );
+    });
+  });
+
+  describe('previousPeriodInfo', () => {
+    it('returns null when club has no period of the given type', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
+      const result = await service.previousPeriodInfo('club-1', 'game');
+      expect(result).toBeNull();
+      expect(mockPrisma.fundPeriodMember.count).not.toHaveBeenCalled();
+    });
+
+    it('returns period info with member count when found', async () => {
+      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
+        id: 'period-prev',
+        name: 'Giải Xuân 2026',
+        startDate: new Date('2026-01-01'),
+        endDate: new Date('2026-03-31'),
+      });
+      mockPrisma.fundPeriodMember.count.mockResolvedValue(13);
+
+      const result = await service.previousPeriodInfo('club-1', 'game');
+
+      expect(result).toEqual({
+        id: 'period-prev',
+        name: 'Giải Xuân 2026',
+        startDate: new Date('2026-01-01'),
+        endDate: new Date('2026-03-31'),
+        memberCount: 13,
+      });
+    });
   });
 
   describe('summary', () => {
diff --git a/backend/src/fund-periods/fund-periods.service.ts b/backend/src/fund-periods/fund-periods.service.ts
index c11877e1..fd73c028 100644
--- a/backend/src/fund-periods/fund-periods.service.ts
+++ b/backend/src/fund-periods/fund-periods.service.ts
@@ -75,27 +75,118 @@ export class FundPeriodsService {
       totalSessions?: number;
       notes?: string;
       type?: string;
+      copyMembersFromPreviousPeriod?: boolean;
     },
   ) {
     if (new Date(dto.endDate) <= new Date(dto.startDate)) {
       throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
     }
-    const { type, ...safeDto } = dto;
-    return this.prisma.fundPeriod.create({
-      data: {
-        ...safeDto,
-        clubId,
-        createdById: userId,
-        type: type ?? 'chung',
-        startDate: new Date(dto.startDate),
-        endDate: new Date(dto.endDate),
-        contributionAmount: new Decimal(dto.contributionAmount),
-        totalSessions: dto.totalSessions ?? 0,
-        status: new Date(dto.startDate) > new Date() ? 'draft' : 'active',
-      },
+    const { type, copyMembersFromPreviousPeriod, ...safeDto } = dto;
+    const periodType = type ?? 'chung';
+    const data = {
+      ...safeDto,
+      clubId,
+      createdById: userId,
+      type: periodType,
+      startDate: new Date(dto.startDate),
+      endDate: new Date(dto.endDate),
+      contributionAmount: new Decimal(dto.contributionAmount),
+      totalSessions: dto.totalSessions ?? 0,
+      status: (new Date(dto.startDate) > new Date()
+        ? 'draft'
+        : 'active') as FundPeriodStatus,
+    };
+
+    if (!copyMembersFromPreviousPeriod) {
+      const created = await this.prisma.fundPeriod.create({ data });
+      return { ...created, copiedMembersCount: 0 };
+    }
+
+    // FUND-IMPL-01: tạo kỳ quỹ + copy roster thành viên từ kỳ gần nhất CÙNG LOẠI
+    // trong 1 transaction — copy lỗi phải rollback luôn kỳ quỹ mới (không partial data).
+    return this.prisma.$transaction(async (tx) => {
+      const created = await tx.fundPeriod.create({ data });
+
+      const previousPeriod = await tx.fundPeriod.findFirst({
+        where: {
+          clubId,
+          type: periodType,
+          id: { not: created.id },
+          OR: [
+            { startDate: { lt: created.startDate } },
+            { endDate: { lt: created.endDate } },
+          ],
+        },
+        orderBy: [
+          { endDate: 'desc' },
+          { startDate: 'desc' },
+          { createdAt: 'desc' },
+        ],
+      });
+      if (!previousPeriod) return { ...created, copiedMembersCount: 0 };
+
+      // Roster của kỳ trước (KHÔNG phải toàn bộ member CLB) — quỹ phụ/giải đấu
+      // thường không phải ai cũng tham gia.
+      const previousRoster = await tx.fundPeriodMember.findMany({
+        where: { fundPeriodId: previousPeriod.id },
+        select: { memberId: true },
+      });
+      if (previousRoster.length === 0)
+        return { ...created, copiedMembersCount: 0 };
+
+      // §8: không copy member đã inactive/rời CLB — chỉ giữ member đang active.
+      const activeMembers = await tx.member.findMany({
+        where: {
+          clubId,
+          isDeleted: false,
+          status: 'active',
+          id: { in: previousRoster.map((r) => r.memberId) },
+        },
+        select: { id: true },
+      });
+      if (activeMembers.length === 0)
+        return { ...created, copiedMembersCount: 0 };
+
+      // Reset theo kỳ mới: expectedAmount = mức đóng/người kỳ mới; KHÔNG copy
+      // paidAmount/payment history/confirmed cũ (chỉ tạo roster, không tạo contribution).
+      const { count } = await tx.fundPeriodMember.createMany({
+        data: activeMembers.map((m) => ({
+          clubId,
+          fundPeriodId: created.id,
+          memberId: m.id,
+          expectedAmount: created.contributionAmount,
+        })),
+        skipDuplicates: true,
+      });
+
+      return { ...created, copiedMembersCount: count };
     });
   }
 
+  /** FUND-IMPL-01: thông tin kỳ quỹ gần nhất CÙNG LOẠI để hiển thị preview copy-member
+   * trong modal tạo kỳ quỹ mới (trước khi kỳ mới tồn tại). */
+  async previousPeriodInfo(clubId: string, type: string) {
+    const previousPeriod = await this.prisma.fundPeriod.findFirst({
+      where: { clubId, type },
+      orderBy: [
+        { endDate: 'desc' },
+        { startDate: 'desc' },
+        { createdAt: 'desc' },
+      ],
+    });
+    if (!previousPeriod) return null;
+    const memberCount = await this.prisma.fundPeriodMember.count({
+      where: { fundPeriodId: previousPeriod.id },
+    });
+    return {
+      id: previousPeriod.id,
+      name: previousPeriod.name,
+      startDate: previousPeriod.startDate,
+      endDate: previousPeriod.endDate,
+      memberCount,
+    };
+  }
+
   async update(id: string, clubId: string, dto: any) {
     const fp = await this.findOne(id, clubId);
     if (fp.status === 'finalized')
diff --git a/frontend/src/pages/admin/FundPeriods.tsx b/frontend/src/pages/admin/FundPeriods.tsx
index e69ee605..d2e03be1 100644
--- a/frontend/src/pages/admin/FundPeriods.tsx
+++ b/frontend/src/pages/admin/FundPeriods.tsx
@@ -30,7 +30,9 @@ const DONUT_COLORS = ['#6D5DFB', '#7c3aed']
 
 const emptyForm = {
   name: '', startDate: '', endDate: '',
-  contributionAmount: 1000000, totalSessions: 13, notes: ''
+  contributionAmount: 1000000, totalSessions: 13, notes: '',
+  // FUND-IMPL-01: chỉ dùng cho modal Tạo Quỹ Phụ (create, không áp dụng khi sửa).
+  copyMembersFromPreviousPeriod: false,
 }
 
 type FormData = typeof emptyForm
@@ -43,9 +45,18 @@ function periodToForm(p: FundPeriod): FormData {
     contributionAmount: p.contributionAmount,
     totalSessions: p.totalSessions,
     notes: p.notes ?? '',
+    copyMembersFromPreviousPeriod: false,
   }
 }
 
+interface PreviousPeriodInfo {
+  id: string
+  name: string
+  startDate: string
+  endDate: string
+  memberCount: number
+}
+
 type Tab = 'list' | 'history' | 'highlights'
 
 export function FundPeriods() {
@@ -67,6 +78,32 @@ export function FundPeriods() {
   const [editingGame, setEditingGame] = useState<FundPeriod | null>(null)
   const [viewPeriod, setViewPeriod] = useState<FundPeriod | null>(null)
 
+  // FUND-IMPL-01: thông tin kỳ Quỹ Phụ gần nhất để hiển thị block "sao chép thành viên"
+  // trong modal Tạo Quỹ Phụ. undefined = đang tải, null = không có kỳ trước / lỗi tải.
+  const [prevGamePeriod, setPrevGamePeriod] = useState<PreviousPeriodInfo | null | undefined>(undefined)
+  const [prevGamePeriodError, setPrevGamePeriodError] = useState(false)
+
+  useEffect(() => {
+    if (!showCreateGame || editingGame) return
+    let cancelled = false
+    setPrevGamePeriod(undefined)
+    setPrevGamePeriodError(false)
+    api.get('/fund-periods/previous', { params: { type: 'game' } }).then(res => {
+      if (cancelled) return
+      const info = res.data?.data as PreviousPeriodInfo | null
+      setPrevGamePeriod(info)
+      // Đề xuất mặc định bật nếu có kỳ trước hợp lệ VÀ có thành viên để copy.
+      if (info && info.memberCount > 0) {
+        setFormGame(f => ({ ...f, copyMembersFromPreviousPeriod: true }))
+      }
+    }).catch(() => {
+      if (cancelled) return
+      setPrevGamePeriod(null)
+      setPrevGamePeriodError(true)
+    })
+    return () => { cancelled = true }
+  }, [showCreateGame, editingGame])
+
   const openEdit = (p: FundPeriod) => {
     const form = periodToForm(p)
     if ((p.type ?? 'chung') === 'chung') {
@@ -326,8 +363,11 @@ export function FundPeriods() {
     }
     setIsSaving(true)
     try {
-      const payload = { ...form, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions) }
+      // copyMembersFromPreviousPeriod chỉ áp dụng khi TẠO MỚI — PUT (sửa) không có field
+      // này ở backend (UpdateFundPeriodDto), tách riêng để tránh gửi field lạ.
+      const { copyMembersFromPreviousPeriod, ...formRest } = form
       if (editing) {
+        const payload = { ...formRest, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions) }
         const res = await api.put(`/fund-periods/${editing.id}`, payload)
         const d = res.data?.data
         const updated: FundPeriod = { ...editing, ...payload, ...(d ?? {}), contributionAmount: Number((d ?? payload).contributionAmount) }
@@ -335,12 +375,13 @@ export function FundPeriods() {
         onClose()
         toast.success(`Đã cập nhật kỳ quỹ "${form.name}"`)
       } else {
+        const payload = { ...formRest, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions), copyMembersFromPreviousPeriod }
         const res = await api.post('/fund-periods', payload)
         const d = res.data?.data
         const newPeriod: FundPeriod = { ...d, contributionAmount: Number(d.contributionAmount), createdBy: d.createdById ?? user?.id ?? '' }
         setPeriods(prev => [newPeriod, ...prev])
         onClose()
-        toast.success(`Tạo kỳ quỹ "${form.name}" thành công!`)
+        toast.success(res.data?.message ?? `Tạo kỳ quỹ "${form.name}" thành công!`)
       }
     } catch (err: any) {
       toast.error(err?.response?.data?.message ?? (editing ? 'Cập nhật kỳ quỹ thất bại' : 'Tạo kỳ quỹ thất bại'))
@@ -711,6 +752,9 @@ export function FundPeriods() {
           onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null) })}
           editing={!!editingGame}
           isSaving={isSaving}
+          showCopyMembers
+          prevPeriodInfo={prevGamePeriod}
+          prevPeriodError={prevGamePeriodError}
         />
       </div>
     )
@@ -1133,6 +1177,9 @@ export function FundPeriods() {
         editing={!!editingGame}
         isSaving={isSaving}
         onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null); setFormGame({ ...emptyForm }) })}
+        showCopyMembers
+        prevPeriodInfo={prevGamePeriod}
+        prevPeriodError={prevGamePeriodError}
       />
 
       {/* View period detail modal */}
@@ -1807,11 +1854,15 @@ function FundDetailCard({ title, icon, period, color, memberCount, contributions
   )
 }
 
-function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSubmit, editing, isSaving }: {
+function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSubmit, editing, isSaving, showCopyMembers, prevPeriodInfo, prevPeriodError }: {
   open: boolean; onClose: () => void; title: string; subtitle: string
   formId: string; form: FormData
   setForm: (f: FormData) => void; onSubmit: (e: React.FormEvent) => void
   editing?: boolean; isSaving?: boolean
+  // FUND-IMPL-01 — chỉ modal Tạo Quỹ Phụ (create) truyền các prop này.
+  showCopyMembers?: boolean
+  prevPeriodInfo?: PreviousPeriodInfo | null
+  prevPeriodError?: boolean
 }) {
   return (
     <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size="lg"
@@ -1848,6 +1899,63 @@ function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSu
               onChange={e => setForm({ ...form, totalSessions: Number(e.target.value) })} className="input-base" />
           </div>
         </div>
+
+        {showCopyMembers && !editing && (
+          <div className="rounded-[16px] border p-3.5 [border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)]">
+            <label className="flex items-start gap-2.5 cursor-pointer select-none">
+              <input
+                type="checkbox"
+                className="mt-0.5 h-4 w-4 rounded shrink-0"
+                style={{ accentColor: 'var(--pf-primary)' }}
+                checked={form.copyMembersFromPreviousPeriod}
+                disabled={prevPeriodError || prevPeriodInfo === null || prevPeriodInfo === undefined}
+                onChange={e => setForm({ ...form, copyMembersFromPreviousPeriod: e.target.checked })}
+              />
+              <span className="flex items-center gap-2 flex-wrap text-[13px] font-medium text-slate-700">
+                Sao chép thành viên từ kỳ quỹ trước
+                <Badge variant="green">Đề xuất</Badge>
+              </span>
+            </label>
+
+            {prevPeriodInfo === undefined && !prevPeriodError && (
+              <p className="mt-2 text-xs text-slate-400">Đang tải thông tin kỳ quỹ trước...</p>
+            )}
+
+            {prevPeriodError && (
+              <p className="mt-2 text-xs text-amber-600">
+                Không tải được thông tin kỳ quỹ trước. Bạn vẫn có thể tạo kỳ quỹ không sao chép.
+              </p>
+            )}
+
+            {!prevPeriodError && prevPeriodInfo === null && (
+              <p className="mt-2 text-xs text-slate-500">Chưa có kỳ quỹ trước để sao chép thành viên.</p>
+            )}
+
+            {!prevPeriodError && prevPeriodInfo && prevPeriodInfo.memberCount === 0 && (
+              <p className="mt-2 text-xs text-slate-500">Kỳ quỹ trước chưa có thành viên để sao chép.</p>
+            )}
+
+            {!prevPeriodError && prevPeriodInfo && prevPeriodInfo.memberCount > 0 && form.copyMembersFromPreviousPeriod && (
+              <div className="mt-2.5 space-y-2.5">
+                <p className="text-xs text-slate-600">
+                  Hệ thống sẽ sao chép danh sách thành viên từ kỳ quỹ gần nhất của Quỹ Phụ này.
+                </p>
+                <div className="rounded-[12px] border p-3 [background:var(--pf-surface)] [border-color:var(--pf-primary-soft)] space-y-1">
+                  <p className="text-[11px] font-[600] uppercase tracking-wide [color:var(--pf-color-muted)]">Kỳ quỹ gần nhất</p>
+                  <p className="text-sm font-semibold text-slate-800">{prevPeriodInfo.name}</p>
+                  <p className="text-xs text-slate-500">Thời gian: {formatDate(prevPeriodInfo.startDate)} - {formatDate(prevPeriodInfo.endDate)}</p>
+                  <p className="text-xs text-slate-500">Số lượng thành viên: {prevPeriodInfo.memberCount} thành viên</p>
+                </div>
+                <p className="text-[11px] leading-relaxed text-slate-500">
+                  Danh sách thành viên sẽ được sao chép sang kỳ quỹ mới.<br />
+                  Mức đóng/người sẽ áp dụng theo giá trị bạn nhập ở trên.<br />
+                  Trạng thái mặc định: Chưa đóng (0 đ).
+                </p>
+              </div>
+            )}
+          </div>
+        )}
+
         <div>
           <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
           <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}

````
