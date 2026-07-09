# CODEX AUDIT — Hermes v2.0 "AI Operations Center" (7 commit)

> Prompt tự chứa 1 khối. Toàn bộ diff của 7 commit được nhúng nguyên văn ở cuối (mục §6).
> KHÔNG cần truy cập repo — audit trực tiếp trên diff dưới đây.

## 1. NHIỆM VỤ

Bạn là kiểm toán viên mã nguồn độc lập. Hãy audit đợt thay đổi "Hermes v2.0 — AI Operations Center"
của PickleFund (NestJS + Prisma/PostgreSQL backend; React + Vite + Tailwind + zustand frontend).
Đợt này gồm **7 commit** (range `474b3ec2..f7e106dd`), triển khai theo **phân pha có checkpoint**:

- **Pha 1** `40c91c8c` — Đổi nhãn "AI Manager" → "AI Operations Center" + badge "Hermes · AI COO";
  thêm hub điều hướng 11 khu vực trong `AiManagerDashboard`; sửa `Sidebar`. **UI-only, route giữ nguyên.**
- **Pha 2** `be2886a1` — Trang `SchedulerPage` (`/admin/ai-scheduler`) nối endpoint SẴN CÓ
  `/workflows/runtime/status|history|run-now` + `/workflows/rules`. **FE-only.**
- **Pha 3** `00f63391` — Trang `AlertCenterPage` (`/admin/ai-alerts`) gom `/ai/maika/operational-alerts`
  + `/ai/maika/organization-intelligence` + `/workflows/runs?status=FAILED` + `/ai/actions?status=FAILED`. **FE-only.**
- **Pha 4** `f388c2b9` — **Endpoint read-only MỚI** `GET /ai/maika/data-quality`
  (`DataQualityService` + `DataQualityController`, đăng ký trong `AiModule`) + trang `DataMonitorPage`
  (`/admin/ai-data-monitor`). +2 unit test.
- **Pha 5** `1539cc70` — Trang `KpiMonitorPage` (`/admin/ai-kpi`) nối `/maika/health-score` + `/maika/snapshot`
  + `/ai/actions/summary` + `/workflows/runs`. **FE-only.**
- **Pha 6** `d56a5e13` — **Endpoint MỚI** `GET /audit-logs/club` (clubId ép từ JWT) + trang `AuditLogViewer`
  (`/admin/ai-audit-logs`). Endpoint gốc `GET /audit-logs` (SUPER_ADMIN) giữ nguyên.
- **Pha 7** `f7e106dd` — Thêm giá trị enum `AiActionStatus.EXPIRED` (migration `ADD VALUE IF NOT EXISTS`);
  `AiActionsService.expireStale()` tự hết hạn đề xuất chờ duyệt quá TTL (env `AI_ACTION_APPROVAL_TTL_HOURS`,
  mặc định 168h), gọi lazy đầu `list()`/`summary()`, bọc try/catch; FE thêm badge EXPIRED. +1 unit test.

## 2. RÀNG BUỘC THIẾT KẾ (phải kiểm tra tuân thủ)

1. **Backward-compat tuyệt đối**: KHÔNG đổi/xoá route, field, enum value cũ. Mọi thay đổi phải additive.
   (Enum `EXPIRED` chỉ THÊM; `PENDING_APPROVAL/APPROVED/REJECTED/...` giữ nguyên.)
2. **Multi-tenant isolation**: mọi truy vấn scope theo `clubId` LẤY TỪ JWT; client KHÔNG được override
   clubId qua query/body. Đặc biệt soi `GET /audit-logs/club` và `GET /ai/maika/data-quality`.
3. **Finance Isolation (RC1)**: AI KHÔNG tự tính số liệu tài chính — chỉ ĐỌC từ Finance Engine.
   KPI Monitor chỉ hiển thị số đã có, không suy luận.
4. **Không bịa dữ liệu (Reality Filter)**: khi nguồn lỗi/không có, UI phải hiển thị trạng thái trung thực
   ("—" / ErrorState / EmptyState), KHÔNG dựng số giả.
5. **Không thực thi ngầm**: mọi hành động vẫn qua AI Action Center (approval). Các trang mới chỉ read-only
   (ngoại lệ: `expireStale` chuyển PENDING_APPROVAL→EXPIRED, và `run-now` scheduler — đều là thao tác
   hợp lệ đã có chủ đích).

## 3. TRỌNG TÂM AUDIT (xếp theo mức nghiêm trọng cần soi)

- **[SECURITY/TENANT]** `audit-logs.controller.ts::findForClub` — có chắc chắn ép `clubId = user.clubId`
  và KHÔNG nhận `clubId` từ query? Có rò rỉ log CLB khác không? `DataQualityController` + `DataQualityService`
  có scope đúng clubId không? Có endpoint nào thiếu `@Roles`/guard không?
- **[LOGIC/CORRECTNESS]** `DataQualityService.analyze` — đếm trùng SĐT/tên, thiếu liên hệ, số kỳ Quỹ Chính
  active có đúng không? Có off-by-one, nhầm active vs isDeleted, hay hiểu sai enum (`MemberStatus.active`,
  `FundPeriodStatus.active`, `type='chung'`)? `expireStale` cutoff/TTL có đúng, có race/double-count không?
- **[REACT/FE]** Các trang mới: `Promise.allSettled` xử lý partial-failure đúng chưa? `useEffect` deps,
  optional chaining tránh crash khi field thiếu, ép kiểu `any` có che giấu lỗi runtime không? Điều hướng hub
  (active/soon/here) có dead-link không?
- **[PERF]** `expireStale` gọi trên MỌI `list()`/`summary()` (mutate-on-read) — có tạo write thừa/N+1 không?
- **[MIGRATION]** `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'EXPIRED'` — an toàn với `prisma migrate deploy`
  chạy lúc container start trên PostgreSQL không? Có rủi ro transaction không?
- **[BACKWARD-COMPAT]** Có chỗ nào vô tình đổi hành vi endpoint/enum cũ không?

## 4. GIẢ ĐỊNH MÔI TRƯỜNG (đúng thực tế, không coi là lỗi)

- `PrismaModule` là `@Global` → inject `PrismaService` không cần import.
- `RolesGuard` + `MemberScopeGuard` áp toàn cục; `@Roles(...)` + `@CurrentUser()` hoạt động như các controller khác.
- Envelope response: `ok(data)` → `{ success, data, message }`. FE đọc `res.data?.data ?? res.data`.
- Endpoint được nhắc tới nhưng KHÔNG có trong diff (vd `/workflows/*`, `/ai/actions/*`, `/maika/*`) là ĐÃ TỒN TẠI
  từ trước — chỉ audit CÁCH GỌI, không coi "thiếu định nghĩa" là lỗi.
- Shared-kit (`PageShell/PageHeader/MetricCard/StatusBadge/EmptyState/LoadingState/ErrorState/ActionButton`)
  đã tồn tại; props dùng trong diff giả định đúng chữ ký.

## 5. ĐỊNH DẠNG KẾT QUẢ (bắt buộc)

Trả về danh sách finding xếp theo mức nghiêm trọng, mỗi finding gồm:

```
[SEVERITY: CRITICAL|HIGH|MEDIUM|LOW] <file>:<dòng>
Vấn đề: <mô tả ngắn>
Kịch bản lỗi: <input/điều kiện cụ thể → hậu quả>
Đề xuất sửa: <cách sửa>
```

Sau đó **verdict theo từng commit** (PASS / CẦN SỬA) + 1 dòng tổng kết. Nếu KHÔNG có lỗi CRITICAL/HIGH,
nói rõ "GA-ready" hay không. Ưu tiên phát hiện đúng, tránh nhiễu (không báo style/format nếu không ảnh hưởng
đúng-sai hay an toàn).

## 6. DIFF ĐẦY ĐỦ (7 commit, `git diff 474b3ec2..f7e106dd`)

```diff
diff --git a/backend/prisma/migrations/20260709040000_ai_action_expired_status/migration.sql b/backend/prisma/migrations/20260709040000_ai_action_expired_status/migration.sql
new file mode 100644
index 00000000..a43bd716
--- /dev/null
+++ b/backend/prisma/migrations/20260709040000_ai_action_expired_status/migration.sql
@@ -0,0 +1,5 @@
+-- AiAction: thêm trạng thái EXPIRED (đề xuất CHỜ DUYỆT quá hạn TTL tự hết hạn).
+-- ADDITIVE + idempotent: chỉ thêm giá trị enum, KHÔNG đổi/bỏ giá trị cũ (PENDING_APPROVAL
+-- giữ nguyên → backward-compat). Postgres 12+ cho phép ADD VALUE trong transaction khi
+-- giá trị mới không dùng ngay trong cùng transaction (đúng ở đây).
+ALTER TYPE "AiActionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
diff --git a/backend/prisma/schema.prisma b/backend/prisma/schema.prisma
index 53693810..98f11f27 100644
--- a/backend/prisma/schema.prisma
+++ b/backend/prisma/schema.prisma
@@ -751,6 +751,7 @@ enum AiActionStatus {
   EXECUTED
   FAILED
   RETRY_PENDING
+  EXPIRED
 }
 
 model AiAction {
diff --git a/backend/src/ai-actions/ai-actions.service.spec.ts b/backend/src/ai-actions/ai-actions.service.spec.ts
index ee892889..ff22ec0c 100644
--- a/backend/src/ai-actions/ai-actions.service.spec.ts
+++ b/backend/src/ai-actions/ai-actions.service.spec.ts
@@ -98,6 +98,27 @@ describe('AiActionsService', () => {
       );
     });
 
+    it('expireStale: list/summary tự chuyển PENDING_APPROVAL quá hạn → EXPIRED', async () => {
+      await service.list('club-1', {});
+      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
+        expect.objectContaining({
+          where: expect.objectContaining({
+            clubId: 'club-1',
+            status: 'PENDING_APPROVAL',
+            createdAt: expect.objectContaining({ lt: expect.any(Date) }),
+          }),
+          data: { status: 'EXPIRED' },
+        }),
+      );
+      jest.clearAllMocks();
+      prisma.aiAction.groupBy.mockResolvedValue([]);
+      prisma.aiAction.findMany.mockResolvedValue([]);
+      await service.summary('club-1');
+      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
+        expect.objectContaining({ data: { status: 'EXPIRED' } }),
+      );
+    });
+
     it('approve NotFound khi action thuộc club khác (findFirst null)', async () => {
       prisma.aiAction.findFirst.mockResolvedValue(null);
       await expect(service.approve('a1', 'club-1', ACTOR)).rejects.toThrow(
diff --git a/backend/src/ai-actions/ai-actions.service.ts b/backend/src/ai-actions/ai-actions.service.ts
index 0392ff87..598fbcaa 100644
--- a/backend/src/ai-actions/ai-actions.service.ts
+++ b/backend/src/ai-actions/ai-actions.service.ts
@@ -164,8 +164,35 @@ export class AiActionsService {
     });
   }
 
+  /** TTL duyệt (giờ) — env override, mặc định 7 ngày. */
+  private approvalTtlHours(): number {
+    const raw = Number(process.env.AI_ACTION_APPROVAL_TTL_HOURS);
+    return Number.isFinite(raw) && raw > 0 ? raw : 168;
+  }
+
+  /**
+   * Tự hết hạn đề xuất CHỜ DUYỆT quá TTL → EXPIRED. ADDITIVE: không đụng luồng
+   * approve/reject/execute; chỉ chuyển PENDING_APPROVAL cũ. Gọi lazy khi list/summary
+   * để trạng thái luôn cập nhật mà KHÔNG cần bật scheduler. Bọc try/catch — lỗi (vd enum
+   * chưa migrate xong) KHÔNG được chặn việc đọc danh sách.
+   */
+  private async expireStale(clubId: string): Promise<void> {
+    const cutoff = new Date(Date.now() - this.approvalTtlHours() * 3_600_000);
+    try {
+      await this.prisma.aiAction.updateMany({
+        where: { clubId, status: 'PENDING_APPROVAL', createdAt: { lt: cutoff } },
+        data: { status: 'EXPIRED' as never },
+      });
+    } catch (e) {
+      this.logger.warn(
+        `expireStale bỏ qua (không ảnh hưởng đọc): ${e instanceof Error ? e.message : String(e)}`,
+      );
+    }
+  }
+
   async list(clubIdRaw: string | null, f: ListFilters) {
     const clubId = this.requireClub(clubIdRaw);
+    await this.expireStale(clubId);
     const page = Math.max(1, Number(f.page) || 1);
     const limit = Math.min(100, Math.max(1, Number(f.limit) || 20));
     const where: Prisma.AiActionWhereInput = {
@@ -574,6 +601,7 @@ export class AiActionsService {
   /** KPI tổng hợp — CHỈ dữ liệu DB thật; không có dữ liệu → 0/[]. */
   async summary(clubIdRaw: string | null) {
     const clubId = this.requireClub(clubIdRaw);
+    await this.expireStale(clubId);
     const [byStatus, byAi, byRisk] = await Promise.all([
       this.prisma.aiAction.groupBy({
         by: ['status'],
diff --git a/backend/src/ai/ai.module.ts b/backend/src/ai/ai.module.ts
index 72731687..51b6322c 100644
--- a/backend/src/ai/ai.module.ts
+++ b/backend/src/ai/ai.module.ts
@@ -6,6 +6,8 @@ import { AiService } from './ai.service';
 import { AiController } from './ai.controller';
 import { OperationalAlertsService } from './maika/operational-alerts.service';
 import { OperationalAlertsController } from './operational-alerts.controller';
+import { DataQualityService } from './maika/data-quality.service';
+import { DataQualityController } from './data-quality.controller';
 import { AIConfigService } from './harness/ai-config.service';
 import { CircuitBreakerService } from './harness/circuit-breaker.service';
 import { RetryPolicyService } from './harness/retry-policy.service';
@@ -21,6 +23,7 @@ import { AIGatewayService } from './harness/ai-gateway.service';
   providers: [
     AiService,
     OperationalAlertsService,
+    DataQualityService,
     AIConfigService,
     CircuitBreakerService,
     RetryPolicyService,
@@ -30,7 +33,7 @@ import { AIGatewayService } from './harness/ai-gateway.service';
     AIRouterService,
     AIGatewayService,
   ],
-  controllers: [AiController, OperationalAlertsController],
+  controllers: [AiController, OperationalAlertsController, DataQualityController],
   exports: [AIGatewayService, TelemetryService, TokenAccountingService],
 })
 export class AiModule {}
diff --git a/backend/src/ai/data-quality.controller.ts b/backend/src/ai/data-quality.controller.ts
new file mode 100644
index 00000000..386f04e8
--- /dev/null
+++ b/backend/src/ai/data-quality.controller.ts
@@ -0,0 +1,27 @@
+/**
+ * DataQualityController (Data Monitor — Hermes v2 Pha 4). Đặt trong AiModule (giống
+ * OperationalAlertsController) để tránh circular DI. Route 'ai/maika/data-quality',
+ * clubId LẤY TỪ JWT, read-only. Chỉ SUPER_ADMIN / CLUB_ADMIN (RolesGuard toàn cục + AiModule).
+ */
+import { Controller, Get } from '@nestjs/common';
+import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
+import { DataQualityService } from './maika/data-quality.service';
+import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
+import { ok } from '../common/response';
+
+@ApiTags('AI Maika Core')
+@ApiBearerAuth()
+@Controller('ai/maika')
+export class DataQualityController {
+  constructor(private readonly dataQuality: DataQualityService) {}
+
+  @Get('data-quality')
+  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
+  @ApiOperation({
+    summary:
+      'Data Monitor — kiểm tra chất lượng dữ liệu (trùng lặp/thiếu/nhất quán) read-only, scope theo clubId từ JWT.',
+  })
+  async report(@CurrentUser() user: JwtUser) {
+    return ok(await this.dataQuality.analyze(user.clubId ?? ''));
+  }
+}
diff --git a/backend/src/ai/maika/data-quality.service.spec.ts b/backend/src/ai/maika/data-quality.service.spec.ts
new file mode 100644
index 00000000..6781433f
--- /dev/null
+++ b/backend/src/ai/maika/data-quality.service.spec.ts
@@ -0,0 +1,61 @@
+import { Test } from '@nestjs/testing';
+import { DataQualityService } from './data-quality.service';
+import { PrismaService } from '../../prisma/prisma.service';
+
+describe('DataQualityService', () => {
+  const members = [
+    { fullName: 'Nguyễn Văn A', phone: '0900000001', email: 'a@x.vn', status: 'active' },
+    { fullName: 'Nguyễn Văn A', phone: '0900000001', email: null, status: 'active' }, // trùng SĐT + trùng tên
+    { fullName: 'Trần B', phone: null, email: null, status: 'active' }, // thiếu liên hệ
+    { fullName: 'Đã Nghỉ', phone: null, email: null, status: 'left' }, // không tính (không active)
+  ];
+
+  const prisma = {
+    member: { findMany: jest.fn().mockResolvedValue(members) },
+    fundPeriod: { count: jest.fn() },
+    attendanceSession: { count: jest.fn().mockResolvedValue(12) },
+  };
+
+  let svc: DataQualityService;
+
+  beforeEach(async () => {
+    jest.clearAllMocks();
+    prisma.fundPeriod.count
+      .mockResolvedValueOnce(1) // activeChung
+      .mockResolvedValueOnce(30); // totalPeriods
+    const mod = await Test.createTestingModule({
+      providers: [
+        DataQualityService,
+        { provide: PrismaService, useValue: prisma },
+      ],
+    }).compile();
+    svc = mod.get(DataQualityService);
+  });
+
+  it('phát hiện trùng SĐT / trùng tên / thiếu liên hệ, chỉ tính member active', async () => {
+    const r = await svc.analyze('club-1');
+    const byKey = Object.fromEntries(r.checks.map((c) => [c.key, c]));
+
+    expect(byKey.DUP_PHONE.count).toBe(1);
+    expect(byKey.DUP_PHONE.level).toBe('warning');
+    expect(byKey.DUP_NAME.count).toBe(1);
+    expect(byKey.MISSING_CONTACT.count).toBe(1); // chỉ "Trần B" active; "Đã Nghỉ" bị loại
+    expect(byKey.MISSING_CONTACT.items).toContain('Trần B');
+
+    expect(r.totals.members).toBe(4);
+    expect(r.totals.activeMembers).toBe(3);
+    expect(r.totals.sessions).toBe(12);
+  });
+
+  it('kỳ Quỹ Chính đang mở = 1 → ok; >1 → warning', async () => {
+    const r1 = await svc.analyze('club-1');
+    expect(r1.checks.find((c) => c.key === 'ACTIVE_CHUNG')!.level).toBe('ok');
+
+    prisma.fundPeriod.count.mockReset();
+    prisma.fundPeriod.count.mockResolvedValueOnce(2).mockResolvedValueOnce(30);
+    const r2 = await svc.analyze('club-1');
+    const chk = r2.checks.find((c) => c.key === 'ACTIVE_CHUNG')!;
+    expect(chk.level).toBe('warning');
+    expect(chk.count).toBe(2);
+  });
+});
diff --git a/backend/src/ai/maika/data-quality.service.ts b/backend/src/ai/maika/data-quality.service.ts
new file mode 100644
index 00000000..1c13e970
--- /dev/null
+++ b/backend/src/ai/maika/data-quality.service.ts
@@ -0,0 +1,128 @@
+import { Injectable } from '@nestjs/common';
+import { PrismaService } from '../../prisma/prisma.service';
+
+export type DqLevel = 'ok' | 'attention' | 'warning';
+
+export interface DataQualityCheck {
+  key: string;
+  dimension: string;
+  label: string;
+  level: DqLevel;
+  count: number;
+  items: string[];
+}
+
+export interface DataQualityReport {
+  generatedAt: string;
+  totals: {
+    members: number;
+    activeMembers: number;
+    fundPeriods: number;
+    sessions: number;
+  };
+  checks: DataQualityCheck[];
+}
+
+/**
+ * DataQualityService (Data Monitor — Hermes v2 Pha 4). READ-ONLY, scope theo clubId.
+ * Chỉ ĐỌC + tổng hợp các kiểm tra dữ liệu THẬT (trùng lặp/thiếu/nhất quán) từ DB hiện có.
+ * KHÔNG mutate, KHÔNG bịa: check nào không tính được thì không hiển thị. Toàn vẹn tham
+ * chiếu (integrity) đã được khóa ngoại Prisma đảm bảo — không cần quét orphan.
+ */
+@Injectable()
+export class DataQualityService {
+  constructor(private prisma: PrismaService) {}
+
+  async analyze(clubId: string): Promise<DataQualityReport> {
+    const members = await this.prisma.member.findMany({
+      where: { clubId, isDeleted: false },
+      select: { fullName: true, phone: true, email: true, status: true },
+    });
+    const active = members.filter((m) => m.status === 'active');
+
+    // ── Trùng lặp SĐT (active) ──
+    const byPhone = new Map<string, string[]>();
+    for (const m of active) {
+      const p = (m.phone ?? '').trim();
+      if (!p) continue;
+      byPhone.set(p, [...(byPhone.get(p) ?? []), m.fullName]);
+    }
+    const dupPhone = [...byPhone.entries()].filter(([, n]) => n.length > 1);
+
+    // ── Trùng lặp tên (active, không phân biệt hoa/thường) ──
+    const byName = new Map<string, number>();
+    for (const m of active) {
+      const k = m.fullName.trim().toLowerCase();
+      byName.set(k, (byName.get(k) ?? 0) + 1);
+    }
+    const dupName = [...byName.entries()].filter(([, c]) => c > 1);
+
+    // ── Thiếu liên hệ: active thiếu CẢ SĐT lẫn email ──
+    const missingContact = active
+      .filter((m) => !(m.phone ?? '').trim() && !(m.email ?? '').trim())
+      .map((m) => m.fullName);
+
+    // ── Nhất quán: số kỳ Quỹ Chính (type=chung) đang mở — chuẩn là đúng 1 ──
+    const activeChung = await this.prisma.fundPeriod.count({
+      where: { clubId, status: 'active', type: 'chung' },
+    });
+
+    const totalPeriods = await this.prisma.fundPeriod.count({
+      where: { clubId },
+    });
+    const totalSessions = await this.prisma.attendanceSession.count({
+      where: { clubId },
+    });
+
+    const checks: DataQualityCheck[] = [
+      {
+        key: 'DUP_PHONE',
+        dimension: 'Trùng lặp',
+        label: 'Số điện thoại trùng giữa các thành viên',
+        level: dupPhone.length ? 'warning' : 'ok',
+        count: dupPhone.length,
+        items: dupPhone.slice(0, 10).map(([p, names]) => `${p}: ${names.join(', ')}`),
+      },
+      {
+        key: 'DUP_NAME',
+        dimension: 'Trùng lặp',
+        label: 'Tên thành viên trùng nhau',
+        level: dupName.length ? 'attention' : 'ok',
+        count: dupName.length,
+        items: dupName.slice(0, 10).map(([n, c]) => `${n} (×${c})`),
+      },
+      {
+        key: 'MISSING_CONTACT',
+        dimension: 'Thiếu dữ liệu',
+        label: 'Thành viên thiếu cả SĐT lẫn email',
+        level: missingContact.length ? 'attention' : 'ok',
+        count: missingContact.length,
+        items: missingContact.slice(0, 10),
+      },
+      {
+        key: 'ACTIVE_CHUNG',
+        dimension: 'Nhất quán',
+        label: 'Kỳ Quỹ Chính đang mở (chuẩn = 1)',
+        level: activeChung === 1 ? 'ok' : 'warning',
+        count: activeChung,
+        items:
+          activeChung > 1
+            ? [`Có ${activeChung} kỳ Quỹ Chính đang mở — chỉ nên có 1`]
+            : activeChung === 0
+              ? ['Không có kỳ Quỹ Chính nào đang mở']
+              : [],
+      },
+    ];
+
+    return {
+      generatedAt: new Date().toISOString(),
+      totals: {
+        members: members.length,
+        activeMembers: active.length,
+        fundPeriods: totalPeriods,
+        sessions: totalSessions,
+      },
+      checks,
+    };
+  }
+}
diff --git a/backend/src/audit-logs/audit-logs.controller.ts b/backend/src/audit-logs/audit-logs.controller.ts
index f1e717fd..fbdf79c6 100644
--- a/backend/src/audit-logs/audit-logs.controller.ts
+++ b/backend/src/audit-logs/audit-logs.controller.ts
@@ -25,4 +25,27 @@ export class AuditLogsController {
       }),
     );
   }
+
+  /**
+   * Audit log CỦA RIÊNG CLB (AI Operations Center). clubId ÉP TỪ JWT — client KHÔNG
+   * override được (tenant isolation). CLUB_ADMIN chỉ thấy log club mình; SUPER_ADMIN
+   * dùng endpoint gốc `GET /audit-logs` để xem toàn hệ thống.
+   */
+  @Get('club')
+  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
+  async findForClub(
+    @CurrentUser() user: any,
+    @Query('action') action?: string,
+    @Query('search') search?: string,
+    @Query('limit') limit?: string,
+  ) {
+    return ok(
+      await this.svc.findAll({
+        clubId: user.clubId, // FORCE theo JWT — không nhận clubId từ query
+        action: action || undefined,
+        search: search || undefined,
+        limit: limit ? parseInt(limit, 10) : 100,
+      }),
+    );
+  }
 }
diff --git a/frontend/src/App.tsx b/frontend/src/App.tsx
index 27722389..e5b1afc2 100644
--- a/frontend/src/App.tsx
+++ b/frontend/src/App.tsx
@@ -73,6 +73,11 @@ import { ChangePassword } from './pages/ChangePassword'
 import { AiManagerDashboard } from './pages/admin/ai/AiManagerDashboard'
 import { AiApprovalInbox } from './pages/admin/ai/AiApprovalInbox'
 import { MitDacExecutionLog } from './pages/admin/ai/MitDacExecutionLog'
+import { SchedulerPage } from './pages/admin/ai/SchedulerPage'
+import { AlertCenterPage } from './pages/admin/ai/AlertCenterPage'
+import { DataMonitorPage } from './pages/admin/ai/DataMonitorPage'
+import { KpiMonitorPage } from './pages/admin/ai/KpiMonitorPage'
+import { AuditLogViewer } from './pages/admin/ai/AuditLogViewer'
 import { ClubMemoryManager } from './pages/admin/ai/ClubMemoryManager'
 
 // Hermes Workflows (Epic 5) — chỉ SUPER_ADMIN / CLUB_ADMIN
@@ -194,6 +199,11 @@ export default function App() {
             <Route path="/admin/ai-approvals" element={<AiApprovalInbox />} />
             <Route path="/admin/workflows" element={<WorkflowRules />} />
             <Route path="/admin/execution-log" element={<MitDacExecutionLog />} />
+            <Route path="/admin/ai-scheduler" element={<SchedulerPage />} />
+            <Route path="/admin/ai-alerts" element={<AlertCenterPage />} />
+            <Route path="/admin/ai-data-monitor" element={<DataMonitorPage />} />
+            <Route path="/admin/ai-kpi" element={<KpiMonitorPage />} />
+            <Route path="/admin/ai-audit-logs" element={<AuditLogViewer />} />
             </Route>
             {/* Member (MEMBER_VIEW) — chỉ member read-only; staff không rơi vào đây */}
             <Route element={<RoleRoute allow={['MEMBER_VIEW']} />}>
diff --git a/frontend/src/components/layout/Sidebar.tsx b/frontend/src/components/layout/Sidebar.tsx
index d97a714f..b931119e 100644
--- a/frontend/src/components/layout/Sidebar.tsx
+++ b/frontend/src/components/layout/Sidebar.tsx
@@ -27,7 +27,7 @@ const superAdminNav: NavItem[] = [
   { label: 'Quản lý CLB',  icon: <Building2 size={18} />,       to: '/super/clubs' },
   { label: 'Người dùng',   icon: <Users size={18} />,           to: '/super/users' },
   { label: 'Audit Logs',   icon: <ScrollText size={18} />,      to: '/super/audit-logs' },
-  { label: 'AI Manager',   icon: <Bot size={18} />,             to: '/admin/ai-manager' },
+  { label: 'AI Operations Center', icon: <Bot size={18} />,     to: '/admin/ai-manager' },
   { label: 'Workflows',    icon: <Workflow size={18} />,        to: '/admin/workflows' },
   { label: 'Nhật ký AI',   icon: <Cog size={18} />,             to: '/admin/execution-log' },
   { label: 'Cài đặt',     icon: <Settings size={18} />,         to: '/super/settings' },
@@ -51,7 +51,7 @@ const clubAdminBaseNav: NavItem[] = [
   { label: 'Báo Cáo',   icon: <BarChart3 size={18} />,        to: '/reports' },
   { label: 'Chấm điểm', icon: <Award size={18} />,            to: '/scoring' },
   { label: 'Lisa AI',         icon: <Sparkles size={18} />,  to: '/lisa' },
-  { label: 'AI Manager',      icon: <Bot size={18} />,       to: '/admin/ai-manager' },
+  { label: 'AI Operations Center', icon: <Bot size={18} />,  to: '/admin/ai-manager' },
   { label: 'Workflows',       icon: <Workflow size={18} />,  to: '/admin/workflows' },
   { label: 'Nhật ký AI',      icon: <Cog size={18} />,       to: '/admin/execution-log' },
   { label: 'Thông báo',       icon: <Bell size={18} />,      to: '/notifications' },
diff --git a/frontend/src/hooks/useAiManager.ts b/frontend/src/hooks/useAiManager.ts
index bdccbeb4..849c679b 100644
--- a/frontend/src/hooks/useAiManager.ts
+++ b/frontend/src/hooks/useAiManager.ts
@@ -61,6 +61,7 @@ export type AiActionStatus =
   | 'EXECUTED'
   | 'FAILED'
   | 'RETRY_PENDING'
+  | 'EXPIRED'
 
 export interface AiActionListItem {
   id: string
diff --git a/frontend/src/pages/admin/ai/AiApprovalInbox.tsx b/frontend/src/pages/admin/ai/AiApprovalInbox.tsx
index 511104e1..6482b3c4 100644
--- a/frontend/src/pages/admin/ai/AiApprovalInbox.tsx
+++ b/frontend/src/pages/admin/ai/AiApprovalInbox.tsx
@@ -33,6 +33,7 @@ const STATUS_STYLE: Record<string, string> = {
   EXECUTED: 'bg-green-100 text-green-700',
   FAILED: 'bg-red-100 text-red-700',
   RETRY_PENDING: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
+  EXPIRED: 'bg-slate-100 text-slate-500',
 }
 
 function fmtTime(iso: string): string {
diff --git a/frontend/src/pages/admin/ai/AiManagerDashboard.tsx b/frontend/src/pages/admin/ai/AiManagerDashboard.tsx
index e9c8e7b5..4f35505f 100644
--- a/frontend/src/pages/admin/ai/AiManagerDashboard.tsx
+++ b/frontend/src/pages/admin/ai/AiManagerDashboard.tsx
@@ -3,10 +3,43 @@ import { useNavigate } from 'react-router-dom'
 import {
   Bot, ShieldCheck, Activity, AlertTriangle, Inbox, ClipboardList,
   CheckCircle2, XCircle, Clock, Zap, Info, ChevronRight, BookOpen,
+  Workflow, ClipboardCheck, Send, Bell, CalendarClock, Database, Gauge,
+  ScrollText, LayoutGrid,
 } from 'lucide-react'
 import {
   useAiManager, AI_TEAM, type IntelSignal, type SignalLevel,
 } from '../../../hooks/useAiManager'
+import { useAuthStore } from '../../../store/authStore'
+
+/** Các khu vực của AI Operations Center. Trạng thái:
+ *  - 'here'   : chính trang hub này (không điều hướng).
+ *  - 'active' : đã có, nối route thật.
+ *  - 'soon'   : sẽ kích hoạt ở các pha kế tiếp (Scheduler/Alert/Data Monitor/KPI).
+ *  KHÔNG đổi route backend/API — chỉ gom điều hướng UI (additive). */
+interface OpsSection {
+  key: string
+  label: string
+  desc: string
+  icon: React.ReactNode
+  to: string | null
+  status: 'here' | 'active' | 'soon'
+}
+
+function buildSections(isSuper: boolean): OpsSection[] {
+  return [
+    { key: 'hermes', label: 'Hermes (AI COO)', desc: 'Trung tâm điều phối — bạn đang ở đây', icon: <Bot size={18} />, to: null, status: 'here' },
+    { key: 'workflow', label: 'Workflow Studio', desc: 'Luật tự động hoá & lịch chạy', icon: <Workflow size={18} />, to: '/admin/workflows', status: 'active' },
+    { key: 'approval', label: 'Approval Center', desc: 'Hàng đợi duyệt hành động AI', icon: <ClipboardCheck size={18} />, to: '/admin/ai-approvals', status: 'active' },
+    { key: 'dispatch', label: 'AI Dispatch', desc: 'Nhật ký điều phối & thực thi (Mít Đặc)', icon: <Send size={18} />, to: '/admin/execution-log', status: 'active' },
+    { key: 'memory', label: 'Club Memory', desc: 'Kho tri thức của CLB', icon: <BookOpen size={18} />, to: '/admin/ai-manager/club-memory', status: 'active' },
+    { key: 'notif', label: 'Notification Center', desc: 'Hộp thông báo đa kênh', icon: <Bell size={18} />, to: '/notifications', status: 'active' },
+    { key: 'scheduler', label: 'Scheduler', desc: 'Lịch cron & tác vụ định kỳ', icon: <CalendarClock size={18} />, to: '/admin/ai-scheduler', status: 'active' },
+    { key: 'alert', label: 'Alert Center', desc: 'Cảnh báo vận hành & lỗi hệ thống', icon: <AlertTriangle size={18} />, to: '/admin/ai-alerts', status: 'active' },
+    { key: 'monitor', label: 'Data Monitor', desc: 'Chất lượng & toàn vẹn dữ liệu', icon: <Database size={18} />, to: '/admin/ai-data-monitor', status: 'active' },
+    { key: 'kpi', label: 'KPI Monitor', desc: 'Chỉ số vận hành & sức khoẻ', icon: <Gauge size={18} />, to: '/admin/ai-kpi', status: 'active' },
+    { key: 'audit', label: 'Audit Logs', desc: 'Nhật ký kiểm toán', icon: <ScrollText size={18} />, to: isSuper ? '/super/audit-logs' : '/admin/ai-audit-logs', status: 'active' },
+  ]
+}
 
 const ACCENT: Record<string, { dot: string; bg: string; text: string }> = {
   indigo: { dot: '[background:var(--pf-primary)]', bg: '[background:var(--pf-primary-soft)]', text: '[color:var(--pf-primary)]' },
@@ -69,9 +102,12 @@ function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React
 
 export function AiManagerDashboard() {
   const navigate = useNavigate()
+  const role = useAuthStore(s => s.user?.role)
   const { policies, intel, summary, opsSignals, loading, availability } = useAiManager()
   const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'planned'>('all')
 
+  const sections = useMemo(() => buildSections(role === 'SUPER_ADMIN'), [role])
+
   const team = useMemo(() => {
     if (teamFilter === 'active') return AI_TEAM.filter(t => t.implemented)
     if (teamFilter === 'planned') return AI_TEAM.filter(t => !t.implemented)
@@ -121,13 +157,13 @@ export function AiManagerDashboard() {
             </span>
             <div className="min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
-                <h1 className="text-xl font-bold text-slate-900">AI Manager</h1>
+                <h1 className="text-xl font-bold text-slate-900">AI Operations Center</h1>
                 <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                   <span className="h-1.5 w-1.5 rounded-full [background:var(--pf-primary)] animate-pulse" />
-                  Trung tâm điều phối AI
+                  Hermes · AI COO
                 </span>
               </div>
-              <p className="text-sm text-slate-500">Đội ngũ AI · Chính sách duyệt · Tín hiệu vận hành (read-only)</p>
+              <p className="text-sm text-slate-500">Điều phối · Duyệt · Thông báo · Lịch · Cảnh báo · Giám sát (read-only)</p>
             </div>
           </div>
           <div className="flex gap-2 shrink-0 w-full md:w-auto">
@@ -150,6 +186,52 @@ export function AiManagerDashboard() {
       </div>
 
       <div className="px-4 sm:px-6 py-5 space-y-6">
+        {/* Hub điều hướng — gom 11 khu vực của AI Operations Center */}
+        <Card>
+          <PanelTitle icon={<LayoutGrid size={16} />}>Khu Vực Vận Hành</PanelTitle>
+          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
+            {sections.map(s => {
+              const clickable = s.status === 'active' && s.to
+              return (
+                <button
+                  key={s.key}
+                  type="button"
+                  disabled={!clickable}
+                  onClick={() => clickable && navigate(s.to!)}
+                  className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all ${
+                    s.status === 'here'
+                      ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]'
+                      : clickable
+                        ? 'border-slate-100 hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)] cursor-pointer'
+                        : 'border-slate-100 bg-slate-50/60 cursor-default'
+                  }`}
+                >
+                  <div className="flex items-center justify-between">
+                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
+                      s.status === 'soon' ? 'bg-slate-100 text-slate-400' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
+                    }`}>
+                      {s.icon}
+                    </span>
+                    {s.status === 'here' && (
+                      <span className="rounded-full [background:var(--pf-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">Đang xem</span>
+                    )}
+                    {s.status === 'soon' && (
+                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Đang phát triển</span>
+                    )}
+                    {clickable && (
+                      <ChevronRight size={15} className="text-slate-300 transition-colors group-hover:[color:var(--pf-primary)]" />
+                    )}
+                  </div>
+                  <div className="min-w-0">
+                    <p className={`text-sm font-semibold truncate ${s.status === 'soon' ? 'text-slate-500' : 'text-slate-800'}`}>{s.label}</p>
+                    <p className="text-[11px] text-slate-400 leading-snug">{s.desc}</p>
+                  </div>
+                </button>
+              )
+            })}
+          </div>
+        </Card>
+
         {/* Backend status banner — trung thực */}
         <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
           <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
diff --git a/frontend/src/pages/admin/ai/AlertCenterPage.tsx b/frontend/src/pages/admin/ai/AlertCenterPage.tsx
new file mode 100644
index 00000000..54b23e90
--- /dev/null
+++ b/frontend/src/pages/admin/ai/AlertCenterPage.tsx
@@ -0,0 +1,205 @@
+/**
+ * AlertCenterPage — AI Operations Center › Alert Center (Pha 3 Hermes v2).
+ * Gom cảnh báo từ endpoint SẴN CÓ (FE-only, KHÔNG backend mới):
+ *   GET /ai/maika/operational-alerts        — cảnh báo vận hành (quỹ/công nợ/chuyên cần)
+ *   GET /ai/maika/organization-intelligence — attentionSignals + dataQualitySignals
+ *   GET /workflows/runs?status=FAILED        — lỗi workflow
+ *   GET /ai/actions?status=FAILED            — lỗi AI / thực thi (Mít Đặc)
+ * V2.2 Clean Modern SaaS + loading/error/empty state.
+ */
+import { useCallback, useEffect, useState } from 'react'
+import { useNavigate } from 'react-router-dom'
+import {
+  AlertTriangle, ArrowLeft, ShieldAlert, Database, Workflow, Bot, CheckCircle2,
+} from 'lucide-react'
+import api from '../../../lib/api'
+import type { IntelSignal, SignalLevel } from '../../../hooks/useAiManager'
+import {
+  PageShell, PageHeader, MetricCard, StatusBadge, LoadingState, ErrorState,
+  ActionButton, type StatusTone,
+} from '../../../components/shared'
+
+interface FailedRun { id: string; triggerType: string; status: string; startedAt?: string; createdAt?: string }
+interface FailedAction { id: string; title: string; actionType: string; status: string; createdAt: string; errorMessage?: string | null }
+
+const LEVEL_TONE: Record<SignalLevel, StatusTone> = {
+  warning: 'danger', attention: 'warning', info: 'info',
+}
+const LEVEL_LABEL: Record<SignalLevel, string> = {
+  warning: 'Cảnh báo', attention: 'Chú ý', info: 'Thông tin',
+}
+const TRIGGER_LABEL: Record<string, string> = {
+  DEBT_ESCALATION: 'Nhắc đóng quỹ', EVENT_REMINDER: 'Nhắc buổi tập', REPORT_DISPATCH: 'Gửi báo cáo',
+}
+
+function fmt(iso?: string): string {
+  if (!iso) return '—'
+  const d = new Date(iso)
+  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
+}
+
+/** Mức nghiêm trọng để đếm KPI: warning > attention > info. */
+function severityRank(l: SignalLevel): number {
+  return l === 'warning' ? 2 : l === 'attention' ? 1 : 0
+}
+
+export function AlertCenterPage() {
+  const navigate = useNavigate()
+  const [ops, setOps] = useState<IntelSignal[]>([])
+  const [attention, setAttention] = useState<IntelSignal[]>([])
+  const [dataQuality, setDataQuality] = useState<IntelSignal[]>([])
+  const [failedRuns, setFailedRuns] = useState<FailedRun[]>([])
+  const [failedActions, setFailedActions] = useState<FailedAction[]>([])
+  const [loading, setLoading] = useState(true)
+  const [error, setError] = useState(false)
+
+  const load = useCallback(async () => {
+    setLoading(true)
+    setError(false)
+    const [o, i, wr, aa] = await Promise.allSettled([
+      api.get('/ai/maika/operational-alerts'),
+      api.get('/ai/maika/organization-intelligence'),
+      api.get('/workflows/runs?status=FAILED'),
+      api.get('/ai/actions?status=FAILED&limit=50'),
+    ])
+    // Lỗi TẤT CẢ nguồn → coi như không tải được (tránh hiện "an toàn" giả).
+    if ([o, i, wr, aa].every(r => r.status === 'rejected')) {
+      setError(true); setLoading(false); return
+    }
+    const grab = <T,>(r: PromiseSettledResult<any>): T[] =>
+      r.status === 'fulfilled' ? ((r.value.data?.data ?? r.value.data ?? []) as T[]) : []
+    setOps(grab<IntelSignal>(o))
+    const intel = i.status === 'fulfilled' ? (i.value.data?.data ?? null) : null
+    setAttention((intel?.attentionSignals ?? []) as IntelSignal[])
+    setDataQuality((intel?.dataQualitySignals ?? []) as IntelSignal[])
+    setFailedRuns(grab<FailedRun>(wr))
+    setFailedActions(grab<FailedAction>(aa))
+    setLoading(false)
+  }, [])
+
+  useEffect(() => { void load() }, [load])
+
+  const opsAll = [...ops, ...attention]
+  const totalAlerts = opsAll.length + dataQuality.length + failedRuns.length + failedActions.length
+  const highCount = opsAll.filter(s => s.level === 'warning').length + failedRuns.length + failedActions.length
+
+  const SignalList = ({ items }: { items: IntelSignal[] }) => (
+    <div className="space-y-2">
+      {[...items].sort((a, b) => severityRank(b.level) - severityRank(a.level)).map((s, i) => (
+        <div key={`${s.code}-${i}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
+          <div className="min-w-0">
+            <p className="text-sm text-slate-700">{s.message}</p>
+            <p className="text-[10px] text-slate-400 mt-0.5">{s.code}</p>
+          </div>
+          <StatusBadge tone={LEVEL_TONE[s.level]}>{LEVEL_LABEL[s.level]}</StatusBadge>
+        </div>
+      ))}
+    </div>
+  )
+
+  return (
+    <PageShell>
+      <PageHeader
+        title="Alert Center"
+        subtitle="Cảnh báo vận hành, chất lượng dữ liệu & lỗi hệ thống"
+        actions={
+          <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
+            AI Operations Center
+          </ActionButton>
+        }
+      />
+
+      {loading ? (
+        <LoadingState rows={5} />
+      ) : error ? (
+        <ErrorState onRetry={() => void load()} />
+      ) : (
+        <div className="flex flex-col gap-6">
+          {/* KPI */}
+          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
+            <MetricCard label="Tổng cảnh báo" value={totalAlerts} icon={<AlertTriangle size={16} />} />
+            <MetricCard label="Mức cao" value={highCount} icon={<ShieldAlert size={16} />} negative={highCount > 0} />
+            <MetricCard label="Lỗi Workflow" value={failedRuns.length} icon={<Workflow size={16} />} negative={failedRuns.length > 0} />
+            <MetricCard label="Lỗi AI / Thực thi" value={failedActions.length} icon={<Bot size={16} />} negative={failedActions.length > 0} />
+          </div>
+
+          {totalAlerts === 0 && (
+            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
+              <CheckCircle2 size={16} /> Không có cảnh báo — hệ thống đang ổn định.
+            </div>
+          )}
+
+          {/* Cảnh báo vận hành */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
+              <AlertTriangle size={16} className="text-slate-400" /> Cảnh Báo Vận Hành
+            </h3>
+            {opsAll.length === 0 ? (
+              <p className="text-sm text-slate-400">Không có cảnh báo vận hành.</p>
+            ) : <SignalList items={opsAll} />}
+          </section>
+
+          {/* Chất lượng dữ liệu */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
+              <Database size={16} className="text-slate-400" /> Chất Lượng Dữ Liệu
+            </h3>
+            {dataQuality.length === 0 ? (
+              <p className="text-sm text-slate-400">Không có vấn đề chất lượng dữ liệu.</p>
+            ) : <SignalList items={dataQuality} />}
+          </section>
+
+          {/* Lỗi Workflow */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <div className="flex items-center justify-between mb-4">
+              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
+                <Workflow size={16} className="text-slate-400" /> Lỗi Workflow
+              </h3>
+              <button onClick={() => navigate('/admin/workflows')} className="text-xs font-medium [color:var(--pf-primary)] hover:underline">Xem Workflow</button>
+            </div>
+            {failedRuns.length === 0 ? (
+              <p className="text-sm text-slate-400">Không có workflow lỗi.</p>
+            ) : (
+              <div className="divide-y divide-slate-50">
+                {failedRuns.slice(0, 20).map(r => (
+                  <div key={r.id} className="flex items-center justify-between py-2.5">
+                    <div className="min-w-0">
+                      <p className="text-sm text-slate-800 truncate">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
+                      <p className="text-[11px] text-slate-400">{fmt(r.startedAt ?? r.createdAt)}</p>
+                    </div>
+                    <StatusBadge tone="danger">Lỗi</StatusBadge>
+                  </div>
+                ))}
+              </div>
+            )}
+          </section>
+
+          {/* Lỗi AI / Thực thi */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <div className="flex items-center justify-between mb-4">
+              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
+                <Bot size={16} className="text-slate-400" /> Lỗi AI / Thực Thi
+              </h3>
+              <button onClick={() => navigate('/admin/execution-log')} className="text-xs font-medium [color:var(--pf-primary)] hover:underline">Nhật ký thực thi</button>
+            </div>
+            {failedActions.length === 0 ? (
+              <p className="text-sm text-slate-400">Không có hành động AI lỗi.</p>
+            ) : (
+              <div className="divide-y divide-slate-50">
+                {failedActions.slice(0, 20).map(a => (
+                  <div key={a.id} className="flex items-center justify-between py-2.5">
+                    <div className="min-w-0">
+                      <p className="text-sm text-slate-800 truncate">{a.title}</p>
+                      <p className="text-[11px] text-slate-400 truncate">{a.errorMessage ?? a.actionType} · {fmt(a.createdAt)}</p>
+                    </div>
+                    <StatusBadge tone="danger">Thất bại</StatusBadge>
+                  </div>
+                ))}
+              </div>
+            )}
+          </section>
+        </div>
+      )}
+    </PageShell>
+  )
+}
diff --git a/frontend/src/pages/admin/ai/AuditLogViewer.tsx b/frontend/src/pages/admin/ai/AuditLogViewer.tsx
new file mode 100644
index 00000000..cb0387be
--- /dev/null
+++ b/frontend/src/pages/admin/ai/AuditLogViewer.tsx
@@ -0,0 +1,139 @@
+/**
+ * AuditLogViewer — AI Operations Center › Audit Logs (Pha 6 Hermes v2), CLUB_ADMIN.
+ * Nối endpoint MỚI (read-only, tenant-safe): GET /audit-logs/club — clubId ÉP TỪ JWT
+ * ở backend (client không override). Chỉ log của CLB mình. V2.2 shared-kit + trạng thái.
+ */
+import { useCallback, useEffect, useState } from 'react'
+import { useNavigate } from 'react-router-dom'
+import { ScrollText, ArrowLeft, Search } from 'lucide-react'
+import api from '../../../lib/api'
+import {
+  PageShell, PageHeader, StatusBadge, LoadingState, ErrorState, EmptyState,
+  ActionButton, type StatusTone,
+} from '../../../components/shared'
+
+interface AuditLog {
+  id: string
+  createdAt: string
+  user?: { username: string } | null
+  action: string
+  resource: string
+  resourceId?: string | null
+  detail?: string | null
+}
+
+const ACTION_TONE: Record<string, StatusTone> = {
+  CREATE: 'success', UPDATE: 'info', DELETE: 'danger', EXPORT: 'ai', LOCK: 'warning',
+  approve_ai_action: 'success', reject_ai_action: 'danger', execute_ai_action: 'info',
+}
+const ACTION_OPTIONS = ['Tất cả', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOCK']
+
+function fmt(iso: string): string {
+  const d = new Date(iso)
+  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
+}
+
+export function AuditLogViewer() {
+  const navigate = useNavigate()
+  const [logs, setLogs] = useState<AuditLog[]>([])
+  const [search, setSearch] = useState('')
+  const [action, setAction] = useState('Tất cả')
+  const [loading, setLoading] = useState(true)
+  const [error, setError] = useState(false)
+
+  const load = useCallback(async () => {
+    setLoading(true)
+    setError(false)
+    try {
+      const params = new URLSearchParams()
+      if (action !== 'Tất cả') params.set('action', action)
+      if (search.trim()) params.set('search', search.trim())
+      params.set('limit', '200')
+      const res = await api.get(`/audit-logs/club?${params.toString()}`)
+      setLogs((res.data?.data ?? res.data ?? []) as AuditLog[])
+    } catch {
+      setError(true)
+    } finally {
+      setLoading(false)
+    }
+  }, [action, search])
+
+  useEffect(() => { void load() }, [load])
+
+  return (
+    <PageShell>
+      <PageHeader
+        title="Audit Logs"
+        subtitle="Nhật ký kiểm toán — các thao tác trong CLB của bạn"
+        actions={
+          <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
+            AI Operations Center
+          </ActionButton>
+        }
+      />
+
+      <div className="flex flex-col gap-4">
+        {/* Bộ lọc */}
+        <div className="flex flex-col sm:flex-row gap-2">
+          <div className="relative flex-1">
+            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
+            <input
+              value={search}
+              onChange={e => setSearch(e.target.value)}
+              placeholder="Tìm theo người dùng, mô tả, tài nguyên…"
+              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
+            />
+          </div>
+          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto">
+            {ACTION_OPTIONS.map(opt => (
+              <button
+                key={opt}
+                onClick={() => setAction(opt)}
+                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
+                  action === opt ? '[background:var(--pf-primary)] text-white' : 'text-slate-500 hover:text-slate-800'
+                }`}
+              >
+                {opt}
+              </button>
+            ))}
+          </div>
+        </div>
+
+        {loading ? (
+          <LoadingState rows={6} />
+        ) : error ? (
+          <ErrorState onRetry={() => void load()} />
+        ) : logs.length === 0 ? (
+          <EmptyState icon={<ScrollText size={28} />} title="Chưa có nhật ký" description="Các thao tác của CLB sẽ được ghi nhận tại đây." />
+        ) : (
+          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
+            <div className="overflow-x-auto">
+              <table className="w-full text-sm">
+                <thead>
+                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 uppercase">
+                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Thời gian</th>
+                    <th className="text-left px-4 py-3 font-semibold">Người dùng</th>
+                    <th className="text-center px-4 py-3 font-semibold">Hành động</th>
+                    <th className="text-left px-4 py-3 font-semibold">Chi tiết</th>
+                  </tr>
+                </thead>
+                <tbody className="divide-y divide-slate-50">
+                  {logs.map(log => (
+                    <tr key={log.id} className="hover:bg-slate-50/50">
+                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(log.createdAt)}</td>
+                      <td className="px-4 py-2.5 text-xs font-mono text-slate-700">{log.user?.username ?? '—'}</td>
+                      <td className="px-4 py-2.5 text-center">
+                        <StatusBadge tone={ACTION_TONE[log.action] ?? 'neutral'}>{log.action}</StatusBadge>
+                      </td>
+                      <td className="px-4 py-2.5 text-xs text-slate-600">{log.detail ?? log.resource}</td>
+                    </tr>
+                  ))}
+                </tbody>
+              </table>
+            </div>
+          </div>
+        )}
+      </div>
+    </PageShell>
+  )
+}
diff --git a/frontend/src/pages/admin/ai/DataMonitorPage.tsx b/frontend/src/pages/admin/ai/DataMonitorPage.tsx
new file mode 100644
index 00000000..bd579778
--- /dev/null
+++ b/frontend/src/pages/admin/ai/DataMonitorPage.tsx
@@ -0,0 +1,136 @@
+/**
+ * DataMonitorPage — AI Operations Center › Data Monitor (Pha 4 Hermes v2).
+ * Nối endpoint read-only MỚI (additive): GET /ai/maika/data-quality — kiểm tra dữ liệu
+ * THẬT (trùng SĐT/tên, thiếu liên hệ, nhất quán kỳ quỹ), scope theo clubId từ JWT.
+ * V2.2 Clean Modern SaaS + loading/error state.
+ */
+import { useCallback, useEffect, useState } from 'react'
+import { useNavigate } from 'react-router-dom'
+import {
+  Database, ArrowLeft, Users, CalendarDays, CalendarClock, ShieldAlert,
+  CheckCircle2, AlertTriangle, AlertCircle,
+} from 'lucide-react'
+import api from '../../../lib/api'
+import {
+  PageShell, PageHeader, MetricCard, StatusBadge, LoadingState, ErrorState,
+  ActionButton, type StatusTone,
+} from '../../../components/shared'
+
+type DqLevel = 'ok' | 'attention' | 'warning'
+interface DqCheck { key: string; dimension: string; label: string; level: DqLevel; count: number; items: string[] }
+interface DqReport {
+  generatedAt: string
+  totals: { members: number; activeMembers: number; fundPeriods: number; sessions: number }
+  checks: DqCheck[]
+}
+
+const LEVEL_TONE: Record<DqLevel, StatusTone> = { ok: 'success', attention: 'warning', warning: 'danger' }
+const LEVEL_LABEL: Record<DqLevel, string> = { ok: 'Đạt', attention: 'Chú ý', warning: 'Cần xử lý' }
+const LEVEL_ICON: Record<DqLevel, React.ReactNode> = {
+  ok: <CheckCircle2 size={16} className="text-emerald-500" />,
+  attention: <AlertCircle size={16} className="text-amber-500" />,
+  warning: <AlertTriangle size={16} className="text-red-500" />,
+}
+
+export function DataMonitorPage() {
+  const navigate = useNavigate()
+  const [report, setReport] = useState<DqReport | null>(null)
+  const [loading, setLoading] = useState(true)
+  const [error, setError] = useState(false)
+
+  const load = useCallback(async () => {
+    setLoading(true)
+    setError(false)
+    try {
+      const res = await api.get('/ai/maika/data-quality')
+      setReport((res.data?.data ?? res.data ?? null) as DqReport)
+    } catch {
+      setError(true)
+    } finally {
+      setLoading(false)
+    }
+  }, [])
+
+  useEffect(() => { void load() }, [load])
+
+  const issues = report?.checks.filter(c => c.level !== 'ok') ?? []
+
+  return (
+    <PageShell>
+      <PageHeader
+        title="Data Monitor"
+        subtitle="Giám sát chất lượng & toàn vẹn dữ liệu CLB"
+        actions={
+          <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
+            AI Operations Center
+          </ActionButton>
+        }
+      />
+
+      {loading ? (
+        <LoadingState rows={5} />
+      ) : error || !report ? (
+        <ErrorState onRetry={() => void load()} />
+      ) : (
+        <div className="flex flex-col gap-6">
+          {/* Tổng quan */}
+          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
+            <MetricCard label="Thành viên hoạt động" value={report.totals.activeMembers} icon={<Users size={16} />} sub={`${report.totals.members} tổng`} />
+            <MetricCard label="Kỳ quỹ" value={report.totals.fundPeriods} icon={<CalendarClock size={16} />} />
+            <MetricCard label="Buổi sinh hoạt" value={report.totals.sessions} icon={<CalendarDays size={16} />} />
+            <MetricCard label="Kiểm tra cần xử lý" value={issues.length} icon={<ShieldAlert size={16} />} negative={issues.length > 0} sub={`${report.checks.length} kiểm tra`} />
+          </div>
+
+          {issues.length === 0 && (
+            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
+              <CheckCircle2 size={16} /> Dữ liệu sạch — tất cả kiểm tra đều đạt.
+            </div>
+          )}
+
+          {/* Danh sách kiểm tra */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <div className="flex items-center justify-between mb-4">
+              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
+                <Database size={16} className="text-slate-400" /> Kiểm Tra Chất Lượng Dữ Liệu
+              </h3>
+              <span className="text-[11px] text-slate-400">
+                {new Date(report.generatedAt).toLocaleString('vi-VN', { hour12: false })}
+              </span>
+            </div>
+            <div className="space-y-3">
+              {report.checks.map(c => (
+                <div key={c.key} className="rounded-xl border border-slate-100 p-3.5">
+                  <div className="flex items-center justify-between gap-3">
+                    <div className="flex items-center gap-2.5 min-w-0">
+                      {LEVEL_ICON[c.level]}
+                      <div className="min-w-0">
+                        <p className="text-sm font-medium text-slate-800">{c.label}</p>
+                        <p className="text-[11px] text-slate-400">{c.dimension} · {c.count} mục</p>
+                      </div>
+                    </div>
+                    <StatusBadge tone={LEVEL_TONE[c.level]}>{LEVEL_LABEL[c.level]}</StatusBadge>
+                  </div>
+                  {c.items.length > 0 && (
+                    <ul className="mt-2.5 space-y-1 border-t border-slate-50 pt-2.5">
+                      {c.items.map((it, i) => (
+                        <li key={i} className="text-[12px] text-slate-500 flex items-start gap-1.5">
+                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
+                          <span className="min-w-0">{it}</span>
+                        </li>
+                      ))}
+                    </ul>
+                  )}
+                </div>
+              ))}
+            </div>
+          </section>
+
+          <p className="text-[11px] text-slate-400 px-1">
+            Toàn vẹn tham chiếu (khóa ngoại) được cơ sở dữ liệu đảm bảo. Các kiểm tra ở đây là read-only,
+            không thay đổi dữ liệu — hãy sửa trực tiếp ở màn Thành viên / Kỳ Quỹ khi cần.
+          </p>
+        </div>
+      )}
+    </PageShell>
+  )
+}
diff --git a/frontend/src/pages/admin/ai/KpiMonitorPage.tsx b/frontend/src/pages/admin/ai/KpiMonitorPage.tsx
new file mode 100644
index 00000000..72ace38c
--- /dev/null
+++ b/frontend/src/pages/admin/ai/KpiMonitorPage.tsx
@@ -0,0 +1,174 @@
+/**
+ * KpiMonitorPage — AI Operations Center › KPI Monitor (Pha 5 Hermes v2).
+ * FE-only, nối endpoint SẴN CÓ (allSettled → graceful từng nguồn):
+ *   GET /maika/health-score       — điểm sức khỏe CLB + breakdown
+ *   GET /maika/snapshot           — thành viên & tài chính
+ *   GET /ai/actions/summary       — KPI AI (duyệt/thực thi/lỗi)
+ *   GET /workflows/runs           — KPI workflow (đếm theo trạng thái)
+ * KHÔNG bịa: chỉ render field có thật; nguồn lỗi → hiển thị "—".
+ */
+import { useCallback, useEffect, useState } from 'react'
+import { useNavigate } from 'react-router-dom'
+import {
+  Gauge, ArrowLeft, Users, Wallet, Workflow, Bot, HeartPulse, TrendingUp,
+} from 'lucide-react'
+import api from '../../../lib/api'
+import type { AiActionSummary } from '../../../hooks/useAiManager'
+import {
+  PageShell, PageHeader, MetricCard, LoadingState, ErrorState, ActionButton,
+} from '../../../components/shared'
+
+interface HealthScore {
+  score: number
+  label?: string
+  breakdown?: Record<string, number>
+}
+interface Snapshot {
+  clubName?: string
+  totalMembers?: number
+  activeMembers?: number
+  unpaidCount?: number
+  totalAssets?: number
+  commonIncome?: number
+  commonExpense?: number
+}
+interface WfRun { status: string }
+
+const vnd = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')}đ` : '—')
+const num = (n?: number) => (typeof n === 'number' ? n : '—')
+
+const BREAKDOWN_LABEL: Record<string, string> = {
+  financial: 'Tài chính', engagement: 'Gắn kết', activity: 'Hoạt động (chuyên cần)',
+  goal: 'Mục tiêu', issue: 'Vấn đề',
+}
+
+export function KpiMonitorPage() {
+  const navigate = useNavigate()
+  const [health, setHealth] = useState<HealthScore | null>(null)
+  const [snap, setSnap] = useState<Snapshot | null>(null)
+  const [aiSummary, setAiSummary] = useState<AiActionSummary | null>(null)
+  const [runs, setRuns] = useState<WfRun[]>([])
+  const [loading, setLoading] = useState(true)
+  const [error, setError] = useState(false)
+
+  const load = useCallback(async () => {
+    setLoading(true)
+    setError(false)
+    const [h, s, a, w] = await Promise.allSettled([
+      api.get('/maika/health-score'),
+      api.get('/maika/snapshot'),
+      api.get('/ai/actions/summary'),
+      api.get('/workflows/runs'),
+    ])
+    if ([h, s, a, w].every(r => r.status === 'rejected')) {
+      setError(true); setLoading(false); return
+    }
+    const val = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (r.value.data?.data ?? r.value.data ?? null) : null
+    setHealth(val(h))
+    setSnap(val(s))
+    setAiSummary(val(a))
+    setRuns((val(w) as WfRun[]) ?? [])
+    setLoading(false)
+  }, [])
+
+  useEffect(() => { void load() }, [load])
+
+  const wfDone = runs.filter(r => r.status === 'COMPLETED').length
+  const wfFailed = runs.filter(r => r.status === 'FAILED').length
+  const wfWaiting = runs.filter(r => r.status === 'WAITING_APPROVAL').length
+
+  const breakdown = health?.breakdown ?? {}
+  const healthTone = (health?.score ?? 0) >= 75 ? 'emerald' : (health?.score ?? 0) >= 50 ? 'amber' : 'red'
+
+  return (
+    <PageShell>
+      <PageHeader
+        title="KPI Monitor"
+        subtitle="Chỉ số vận hành & sức khỏe CLB"
+        actions={
+          <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
+            AI Operations Center
+          </ActionButton>
+        }
+      />
+
+      {loading ? (
+        <LoadingState rows={5} />
+      ) : error ? (
+        <ErrorState onRetry={() => void load()} />
+      ) : (
+        <div className="flex flex-col gap-6">
+          {/* Health score */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
+              <HeartPulse size={16} className="text-slate-400" /> Sức Khỏe CLB
+            </h3>
+            {!health ? (
+              <p className="text-sm text-slate-400">Không tải được điểm sức khỏe.</p>
+            ) : (
+              <div className="flex flex-col md:flex-row md:items-center gap-6">
+                <div className="flex items-center gap-4 shrink-0">
+                  <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl ${
+                    healthTone === 'emerald' ? 'bg-emerald-50' : healthTone === 'amber' ? 'bg-amber-50' : 'bg-red-50'
+                  }`}>
+                    <span className={`text-3xl font-bold ${
+                      healthTone === 'emerald' ? 'text-emerald-600' : healthTone === 'amber' ? 'text-amber-600' : 'text-red-600'
+                    }`}>{health.score}</span>
+                    <span className="text-[10px] text-slate-400">/100</span>
+                  </div>
+                  <div>
+                    <p className="text-sm font-semibold text-slate-800">{health.label ?? '—'}</p>
+                    <p className="text-[11px] text-slate-400">Điểm tổng hợp</p>
+                  </div>
+                </div>
+                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
+                  {Object.entries(breakdown).map(([k, v]) => (
+                    <div key={k} className="rounded-xl border border-slate-100 px-3 py-2">
+                      <p className="text-[11px] text-slate-400">{BREAKDOWN_LABEL[k] ?? k}</p>
+                      <p className="text-lg font-bold text-slate-800">{v}</p>
+                    </div>
+                  ))}
+                </div>
+              </div>
+            )}
+          </section>
+
+          {/* Member KPI */}
+          <section>
+            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={13} /> Thành viên</p>
+            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
+              <MetricCard label="Đang hoạt động" value={num(snap?.activeMembers)} icon={<Users size={16} />} sub={`${num(snap?.totalMembers)} tổng`} />
+              <MetricCard label="Chưa đóng quỹ (kỳ mở)" value={num(snap?.unpaidCount)} icon={<Users size={16} />} negative={(snap?.unpaidCount ?? 0) > 0} />
+              <MetricCard label="Tỷ lệ hoạt động" value={snap?.totalMembers ? `${Math.round((snap.activeMembers ?? 0) / snap.totalMembers * 100)}%` : '—'} icon={<TrendingUp size={16} />} />
+            </div>
+          </section>
+
+          {/* Finance KPI */}
+          <section>
+            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Wallet size={13} /> Tài chính</p>
+            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
+              <MetricCard label="Tổng tài sản" value={vnd(snap?.totalAssets)} icon={<Wallet size={16} />} negative={(snap?.totalAssets ?? 0) < 0} />
+              <MetricCard label="Thu (Quỹ Chính)" value={vnd(snap?.commonIncome)} icon={<TrendingUp size={16} />} />
+              <MetricCard label="Chi (Quỹ Chính)" value={vnd(snap?.commonExpense)} icon={<Wallet size={16} />} />
+            </div>
+          </section>
+
+          {/* Workflow + AI KPI */}
+          <section>
+            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Workflow size={13} /> Workflow & AI</p>
+            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
+              <MetricCard label="Workflow hoàn tất" value={wfDone} icon={<Workflow size={16} />} sub={`${runs.length} lượt chạy`} />
+              <MetricCard label="Workflow lỗi" value={wfFailed} icon={<Workflow size={16} />} negative={wfFailed > 0} sub={`${wfWaiting} chờ duyệt`} />
+              <MetricCard label="AI chờ duyệt" value={num(aiSummary?.pendingApprovals)} icon={<Bot size={16} />} sub={`${num(aiSummary?.executedToday)} thực thi hôm nay`} />
+              <MetricCard label="AI thất bại" value={num(aiSummary?.failedActions)} icon={<Bot size={16} />} negative={(aiSummary?.failedActions ?? 0) > 0} />
+            </div>
+          </section>
+
+          <p className="text-[11px] text-slate-400 px-1 flex items-center gap-1.5">
+            <Gauge size={12} /> Số liệu tài chính đọc từ Finance Engine (nguồn tài chính duy nhất) — read-only, không tự tính.
+          </p>
+        </div>
+      )}
+    </PageShell>
+  )
+}
diff --git a/frontend/src/pages/admin/ai/SchedulerPage.tsx b/frontend/src/pages/admin/ai/SchedulerPage.tsx
new file mode 100644
index 00000000..0c7a264d
--- /dev/null
+++ b/frontend/src/pages/admin/ai/SchedulerPage.tsx
@@ -0,0 +1,254 @@
+/**
+ * SchedulerPage — AI Operations Center › Scheduler (Pha 2 Hermes v2).
+ * Read-only + run-now, NỐI endpoint sẵn có (KHÔNG backend mới):
+ *   GET  /workflows/runtime/status   — trạng thái timer + tick gần nhất
+ *   GET  /workflows/rules            — lọc scheduleType != MANUAL = lịch định kỳ
+ *   GET  /workflows/runtime/history  — run do scheduler dispatch (SCHED:*)
+ *   POST /workflows/runtime/run-now  — chạy thủ công các rule định kỳ (idempotent theo kỳ)
+ * Cron hệ thống (Maika/Lisa @Cron) hiển thị tĩnh (không có endpoint — lịch cố định).
+ * V2.2 Clean Modern SaaS + loading/error/empty state.
+ */
+import { useCallback, useEffect, useState } from 'react'
+import { useNavigate } from 'react-router-dom'
+import { CalendarClock, Power, Repeat, Clock, Play, Bot, Sparkles, ArrowLeft } from 'lucide-react'
+import toast from 'react-hot-toast'
+import api from '../../../lib/api'
+import {
+  PageShell, PageHeader, MetricCard, StatusBadge, EmptyState, LoadingState, ErrorState,
+  ActionButton, type StatusTone,
+} from '../../../components/shared'
+
+interface SchedulerStatus {
+  enabled: boolean
+  intervalMs: number
+  supportedScheduleTypes: string[]
+  lastTick: { tickedAt: string; groups: number; dispatched: number; skippedDuplicate: number; failedGroups: number } | null
+}
+interface WorkflowRule {
+  id: string
+  name: string
+  triggerType: string
+  scheduleType: string
+  enabled: boolean
+  priority?: number
+}
+interface SchedRun {
+  id: string
+  triggerType: string
+  status: string
+  idempotencyKey?: string
+  startedAt?: string
+  createdAt?: string
+}
+
+const SCHEDULE_LABEL: Record<string, string> = {
+  DAILY: 'Hàng ngày', WEEKLY: 'Hàng tuần', MONTHLY: 'Hàng tháng', MANUAL: 'Thủ công',
+}
+const TRIGGER_LABEL: Record<string, string> = {
+  DEBT_ESCALATION: 'Nhắc đóng quỹ',
+  EVENT_REMINDER: 'Nhắc buổi tập',
+  REPORT_DISPATCH: 'Gửi báo cáo kỳ quỹ',
+  ATTENDANCE_COMPLETED: 'Điểm danh hoàn tất',
+  CONTRIBUTION_CONFIRMED: 'Xác nhận đóng quỹ',
+  EXPENSE_RECORDED: 'Ghi nhận chi phí',
+  FUND_PERIOD_CLOSED: 'Chốt kỳ quỹ',
+  MINIGAME_COMPLETED: 'Kết thúc minigame',
+}
+const RUN_TONE: Record<string, StatusTone> = {
+  COMPLETED: 'success', FAILED: 'danger', WAITING_APPROVAL: 'warning',
+  RUNNING: 'info', PENDING: 'neutral',
+}
+
+// Cron hệ thống cố định (@Cron trong MaikaScheduler/LisaScheduler — không cấu hình runtime).
+const SYSTEM_CRONS = [
+  { agent: 'Maika', icon: 'maika', label: 'Bản tin sáng (Daily Brief)', when: 'Mỗi ngày · 08:00' },
+  { agent: 'Maika', icon: 'maika', label: 'Báo cáo tuần', when: 'Chủ nhật · 09:00' },
+  { agent: 'Maika', icon: 'maika', label: 'Quét bất thường (Anomaly)', when: 'Mỗi 6 giờ' },
+  { agent: 'Lisa', icon: 'lisa', label: 'Nhắc nhở thông minh', when: 'Mỗi ngày · 09:00' },
+]
+
+function fmt(iso?: string): string {
+  if (!iso) return '—'
+  const d = new Date(iso)
+  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
+}
+
+export function SchedulerPage() {
+  const navigate = useNavigate()
+  const [status, setStatus] = useState<SchedulerStatus | null>(null)
+  const [rules, setRules] = useState<WorkflowRule[]>([])
+  const [runs, setRuns] = useState<SchedRun[]>([])
+  const [loading, setLoading] = useState(true)
+  const [error, setError] = useState(false)
+  const [running, setRunning] = useState(false)
+
+  const load = useCallback(async () => {
+    setLoading(true)
+    setError(false)
+    try {
+      const [st, rl, hi] = await Promise.all([
+        api.get('/workflows/runtime/status'),
+        api.get('/workflows/rules'),
+        api.get('/workflows/runtime/history'),
+      ])
+      setStatus(st.data?.data ?? st.data ?? null)
+      setRules(((rl.data?.data ?? rl.data ?? []) as WorkflowRule[]))
+      setRuns(((hi.data?.data ?? hi.data ?? []) as SchedRun[]))
+    } catch {
+      setError(true)
+    } finally {
+      setLoading(false)
+    }
+  }, [])
+
+  useEffect(() => { void load() }, [load])
+
+  const scheduled = rules.filter(r => r.scheduleType && r.scheduleType !== 'MANUAL')
+
+  const handleRunNow = async () => {
+    setRunning(true)
+    try {
+      const res = await api.post('/workflows/runtime/run-now')
+      const d = res.data?.data ?? res.data
+      toast.success(`Đã chạy: ${d?.groups ?? 0} nhóm · ${d?.failed ?? 0} lỗi`)
+      await load()
+    } catch (e: any) {
+      toast.error(e?.response?.data?.message ?? 'Chạy scheduler thất bại')
+    } finally {
+      setRunning(false)
+    }
+  }
+
+  const lt = status?.lastTick
+  return (
+    <PageShell>
+      <PageHeader
+        title="Scheduler"
+        subtitle="Lịch cron & tác vụ định kỳ của Hermes AI COO"
+        actions={
+          <div className="flex items-center gap-2">
+            <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
+              AI Operations Center
+            </ActionButton>
+            {scheduled.length > 0 && (
+              <ActionButton icon={<Play size={15} />} onClick={handleRunNow} disabled={running}>
+                {running ? 'Đang chạy…' : 'Chạy định kỳ ngay'}
+              </ActionButton>
+            )}
+          </div>
+        }
+      />
+
+      {loading ? (
+        <LoadingState rows={5} />
+      ) : error ? (
+        <ErrorState onRetry={() => void load()} />
+      ) : (
+        <div className="flex flex-col gap-6">
+          {/* Trạng thái runtime */}
+          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
+            <MetricCard
+              label="Trạng thái timer"
+              value={status?.enabled ? 'BẬT' : 'TẮT'}
+              icon={<Power size={16} />}
+              sub={status?.enabled ? 'Tự động chạy định kỳ' : 'Chỉ chạy thủ công (run-now)'}
+            />
+            <MetricCard
+              label="Chu kỳ tick"
+              value={status ? `${Math.round((status.intervalMs ?? 0) / 1000)}s` : '—'}
+              icon={<Repeat size={16} />}
+            />
+            <MetricCard
+              label="Tick gần nhất"
+              value={lt ? fmt(lt.tickedAt) : '—'}
+              icon={<Clock size={16} />}
+              sub={lt ? `${lt.dispatched} dispatch · ${lt.skippedDuplicate} trùng · ${lt.failedGroups} lỗi` : 'Chưa có tick'}
+            />
+            <MetricCard
+              label="Lịch định kỳ đang bật"
+              value={scheduled.filter(r => r.enabled).length}
+              icon={<CalendarClock size={16} />}
+              sub={`${scheduled.length} rule định kỳ`}
+            />
+          </div>
+
+          {/* Lịch định kỳ (workflow rules) */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
+              <CalendarClock size={16} className="text-slate-400" /> Lịch Định Kỳ (Workflow)
+            </h3>
+            {scheduled.length === 0 ? (
+              <EmptyState
+                title="Chưa có lịch định kỳ"
+                description="Tạo workflow rule với chu kỳ Hàng ngày/tuần/tháng ở Workflow Studio để scheduler tự chạy."
+                action={<ActionButton onClick={() => navigate('/admin/workflows')}>Tới Workflow Studio</ActionButton>}
+              />
+            ) : (
+              <div className="divide-y divide-slate-50">
+                {scheduled.map(r => (
+                  <div key={r.id} className="flex items-center justify-between py-3">
+                    <div className="min-w-0">
+                      <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
+                      <p className="text-[11px] text-slate-400">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
+                    </div>
+                    <div className="flex items-center gap-2 shrink-0">
+                      <span className="rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)] px-2.5 py-0.5 text-[11px] font-medium">
+                        {SCHEDULE_LABEL[r.scheduleType] ?? r.scheduleType}
+                      </span>
+                      <StatusBadge tone={r.enabled ? 'success' : 'neutral'}>
+                        {r.enabled ? 'Đang bật' : 'Tắt'}
+                      </StatusBadge>
+                    </div>
+                  </div>
+                ))}
+              </div>
+            )}
+          </section>
+
+          {/* Cron hệ thống (cố định) */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-2">
+              <Clock size={16} className="text-slate-400" /> Cron Hệ Thống (cố định)
+            </h3>
+            <p className="text-[11px] text-slate-400 mb-4">Lịch tự động của Maika/Lisa — cố định theo hệ thống, không cấu hình tại đây.</p>
+            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
+              {SYSTEM_CRONS.map((c, i) => (
+                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
+                  <span className="flex h-9 w-9 items-center justify-center rounded-lg [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
+                    {c.icon === 'lisa' ? <Sparkles size={16} /> : <Bot size={16} />}
+                  </span>
+                  <div className="min-w-0">
+                    <p className="text-sm font-medium text-slate-800 truncate">{c.label}</p>
+                    <p className="text-[11px] text-slate-400">{c.agent} · {c.when}</p>
+                  </div>
+                </div>
+              ))}
+            </div>
+          </section>
+
+          {/* Lịch sử scheduler dispatch */}
+          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
+            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
+              <Repeat size={16} className="text-slate-400" /> Lịch Sử Chạy Định Kỳ
+            </h3>
+            {runs.length === 0 ? (
+              <p className="text-sm text-slate-400">Chưa có lượt chạy định kỳ nào.</p>
+            ) : (
+              <div className="divide-y divide-slate-50">
+                {runs.slice(0, 30).map(r => (
+                  <div key={r.id} className="flex items-center justify-between py-2.5">
+                    <div className="min-w-0">
+                      <p className="text-sm text-slate-800 truncate">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
+                      <p className="text-[11px] text-slate-400 truncate">{fmt(r.startedAt ?? r.createdAt)}</p>
+                    </div>
+                    <StatusBadge tone={RUN_TONE[r.status] ?? 'neutral'}>{r.status}</StatusBadge>
+                  </div>
+                ))}
+              </div>
+            )}
+          </section>
+        </div>
+      )}
+    </PageShell>
+  )
+}
```
