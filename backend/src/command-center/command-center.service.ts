/**
 * CommandCenterService — tổng hợp DỮ LIỆU THẬT toàn hệ thống cho Trung tâm điều hành (Super Admin).
 * Nguyên tắc: chỉ trả số liệu query được từ DB/hệ thống; chỉ số CHƯA có nguồn thật → trả `null`
 * (frontend hiển thị "chưa có dữ liệu"), KHÔNG bịa. Mọi truy vấn có thể lọc theo khoảng thời gian
 * và theo 1 CLB. Truy cập phần tài chính tổng hợp được ghi audit log.
 */
import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CONFIGS } from '../billing/billing.types';
import { MetricsService } from '../metrics/metrics.service';
import { MaikaService } from '../maika/maika.service';
import { buildCommandCenterHtml } from './command-center-html';
import { renderHtmlToPdf } from '../executive-report/render-pdf';

const money = (v: unknown) => `${Number(v ?? 0).toLocaleString('vi-VN')}đ`;
type ReviewSections = Record<'overview' | 'business' | 'operations' | 'finance' | 'ai' | 'infra' | 'alerts' | 'leaderboards' | 'syslog', string>;

type RangeKey = 'today' | '7d' | '30d' | 'quarter' | 'year' | 'custom';

const n = (v: unknown): number => Number(v ?? 0) || 0;

@Injectable()
export class CommandCenterService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
    private maika: MaikaService,
  ) {}

  private resolveRange(range: RangeKey, from?: string, to?: string): { start: Date; end: Date } {
    const end = to ? new Date(to) : new Date();
    if (range === 'custom' && from) return { start: new Date(from), end };
    const start = new Date(end);
    switch (range) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case 'quarter': start.setDate(start.getDate() - 90); break;
      case 'year': start.setDate(start.getDate() - 365); break;
      case '30d':
      default: start.setDate(start.getDate() - 30); break;
    }
    return { start, end };
  }

  /** where theo clubId cho các model có trường clubId (rỗng nếu xem toàn hệ thống). */
  private clubScope(clubId?: string | null) {
    return clubId ? { clubId } : {};
  }

  async overview(opts: { range: RangeKey; clubId?: string | null; from?: string; to?: string }) {
    const { range, clubId, from, to } = opts;
    const { start, end } = this.resolveRange(range, from, to);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 3600 * 1000);
    const soon = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    const scope = this.clubScope(clubId);
    const clubFilter = clubId ? { id: clubId } : { status: { not: 'deleted' as const } };

    // ── Khối 1: CLB / thành viên / người dùng (đếm) ──
    const [
      totalClubs, activeClubs, suspendedClubs, newClubs, expiringSoon, expiredClubs,
      totalMembers, newMembers, activeMembers, activeUsers, logins24h,
    ] = await Promise.all([
      this.prisma.club.count({ where: clubId ? { id: clubId } : { status: { not: 'deleted' } } }),
      this.prisma.club.count({ where: clubId ? { id: clubId, status: 'active' } : { status: 'active' } }),
      this.prisma.club.count({ where: clubId ? { id: clubId, status: 'suspended' } : { status: 'suspended' } }),
      this.prisma.club.count({ where: { ...(clubId ? { id: clubId } : { status: { not: 'deleted' } }), createdAt: { gte: start, lte: end } } }),
      this.prisma.club.count({ where: { ...(clubId ? { id: clubId } : {}), plan: { not: 'STARTER' }, planExpiresAt: { gte: now, lte: soon } } }),
      this.prisma.club.count({ where: { ...(clubId ? { id: clubId } : {}), plan: { not: 'STARTER' }, planExpiresAt: { lt: now } } }),
      this.prisma.member.count({ where: { isDeleted: false, ...scope } }),
      this.prisma.member.count({ where: { isDeleted: false, ...scope, createdAt: { gte: start, lte: end } } }),
      this.prisma.member.count({ where: { isDeleted: false, status: 'active', ...scope } }),
      this.prisma.user.count({ where: { isActive: true, ...(clubId ? { clubId } : {}) } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: last24h }, ...(clubId ? { clubId } : {}) } }),
    ]);

    // ── Khối 2: Gói dịch vụ (Club.plan) + doanh thu thật (PaymentOrder PAID) ──
    const planGroups = await this.prisma.club.groupBy({
      by: ['plan'],
      where: clubFilter,
      _count: { _all: true },
    });
    const planCount = (p: string) => planGroups.find((g) => g.plan === p)?._count._all ?? 0;
    const plans = (['STARTER', 'PRO', 'CLUB_PLUS'] as const).map((tier) => ({
      tier, name: PLAN_CONFIGS[tier].name, count: planCount(tier),
    }));
    const paidSubscribers = planCount('PRO') + planCount('CLUB_PLUS');
    // MRR thật: chỉ tính gói có giá cố định (PRO). Enterprise = "Liên hệ" (giá null) → không quy đổi được.
    const mrr = planCount('PRO') * (PLAN_CONFIGS.PRO.priceMonthly ?? 0);

    const revWindow = (s: Date, e: Date) =>
      this.prisma.paymentOrder.aggregate({ _sum: { amount: true }, where: { status: 'PAID', paidAt: { gte: s, lte: e }, ...scope } });
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [revToday, revMonth, revQuarter, revYear, revRange, upgradesInRange, cancellationsInRange] = await Promise.all([
      revWindow(dayStart, now), revWindow(monthStart, now), revWindow(quarterStart, now), revWindow(yearStart, now), revWindow(start, end),
      this.prisma.paymentOrder.count({ where: { status: 'PAID', paidAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.subscription.count({ where: { cancelledAt: { gte: start, lte: end }, ...scope } }),
    ]);

    // ── Khối 3: Tài chính tổng hợp (thu đã xác nhận / chi approved|paid) ──
    const [incomeAll, expenseAll, incomeRange, expenseRange, pendingExpenses] = await Promise.all([
      this.prisma.fundContribution.aggregate({ _sum: { amount: true }, where: { isConfirmed: true, ...scope } }),
      this.prisma.livingExpense.aggregate({ _sum: { amount: true }, where: { status: { in: ['approved', 'paid'] }, ...scope } }),
      this.prisma.fundContribution.aggregate({ _sum: { amount: true }, where: { isConfirmed: true, paymentDate: { gte: start, lte: end }, ...scope } }),
      this.prisma.livingExpense.aggregate({ _sum: { amount: true }, where: { status: { in: ['approved', 'paid'] }, expenseDate: { gte: start, lte: end }, ...scope } }),
      this.prisma.livingExpense.count({ where: { status: 'pending', ...scope } }),
    ]);
    const totalIncome = n(incomeAll._sum.amount);
    const totalExpense = n(expenseAll._sum.amount);

    // Công nợ / quá hạn / thu đúng hạn (dựa trên FundPeriod.dueDate + roster FundPeriodMember).
    const debtMetrics = await this.buildDebtMetrics(clubId, now);

    // Xu hướng thu/chi 6 tháng gần nhất (theo paymentDate/expenseDate).
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ label: `${s.getMonth() + 1}/${s.getFullYear()}`, start: s, end: e });
    }
    const trendRows = await Promise.all(months.map(async (m) => {
      const [inc, exp, rev] = await Promise.all([
        this.prisma.fundContribution.aggregate({ _sum: { amount: true }, where: { isConfirmed: true, paymentDate: { gte: m.start, lt: m.end }, ...scope } }),
        this.prisma.livingExpense.aggregate({ _sum: { amount: true }, where: { status: { in: ['approved', 'paid'] }, expenseDate: { gte: m.start, lt: m.end }, ...scope } }),
        this.prisma.paymentOrder.aggregate({ _sum: { amount: true }, where: { status: 'PAID', paidAt: { gte: m.start, lt: m.end }, ...scope } }),
      ]);
      return { label: m.label, income: n(inc._sum.amount), expense: n(exp._sum.amount), revenue: n(rev._sum.amount) };
    }));

    // ── Khối 4: Hoạt động nghiệp vụ (trong kỳ) ──
    const [fundPeriods, sessions, registrations, attendancePresent, minigames, matches, reportsExported] = await Promise.all([
      this.prisma.fundPeriod.count({ where: scope }),
      this.prisma.attendanceSession.count({ where: { sessionDate: { gte: start, lte: end }, ...scope } }),
      this.prisma.sessionRegistration.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.attendanceRecord.count({ where: { status: 'PRESENT', createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.minigame.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.minigameMatch.count({ where: { createdAt: { gte: start, lte: end }, ...(clubId ? { minigame: { clubId } } : {}) } }),
      this.prisma.reportExportLog.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
    ]);

    // ── Khối 5: AI Operations (đếm toàn hệ thống trong kỳ) ──
    const [maikaInsights, lisaMessages, aiActionsTotal, aiExecuted, aiFailed, aiRunning, avgAction, wfGroups, notiChannel, notiFailed] = await Promise.all([
      this.prisma.maikaInsight.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.lisaMessage.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiAction.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiAction.count({ where: { status: 'EXECUTED', createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiAction.count({ where: { status: 'FAILED', createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiAction.count({ where: { status: { in: ['EXECUTING', 'APPROVED', 'RETRY_PENDING'] }, createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiAction.aggregate({ _avg: { executionDuration: true }, where: { status: 'EXECUTED', executionDuration: { not: null }, createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.workflowRun.groupBy({ by: ['status'], where: { startedAt: { gte: start, lte: end }, ...scope }, _count: { _all: true } }),
      this.prisma.notification.groupBy({ by: ['channel'], where: { createdAt: { gte: start, lte: end }, ...scope }, _count: { _all: true } }),
      this.prisma.notification.count({ where: { status: 'FAILED', createdAt: { gte: start, lte: end }, ...scope } }),
    ]);
    const wf = (s: string) => wfGroups.find((g) => g.status === s)?._count._all ?? 0;
    const noti = (c: string) => notiChannel.find((g) => g.channel === c)?._count._all ?? 0;
    const notiSent = notiChannel.reduce((a, g) => a + g._count._all, 0);
    const aiRequests = aiActionsTotal + lisaMessages;
    const aiSuccessRate = aiExecuted + aiFailed > 0 ? Math.round((aiExecuted / (aiExecuted + aiFailed)) * 100) : null;

    // Token/chi phí AI thật (AiUsageLog). Chưa có dòng nào trong kỳ → giữ null ("chưa có dữ liệu").
    const [usageAgg, usageCount, usageFallback, providerGroups] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({ _sum: { totalTokens: true, estimatedCostUsd: true }, _avg: { latencyMs: true }, where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiUsageLog.count({ where: { fallback: true, createdAt: { gte: start, lte: end }, ...scope } }),
      this.prisma.aiUsageLog.groupBy({ by: ['provider'], where: { createdAt: { gte: start, lte: end }, ...scope }, _count: { _all: true } }),
    ]);
    const hasUsage = usageCount > 0;
    const aiTokens = hasUsage ? n(usageAgg._sum.totalTokens) : null;
    const aiCostUsd = hasUsage ? Math.round(n(usageAgg._sum.estimatedCostUsd) * 1e6) / 1e6 : null;
    const aiAvgLatency = hasUsage && usageAgg._avg.latencyMs != null ? Math.round(n(usageAgg._avg.latencyMs)) : null;
    const aiFallbacks = hasUsage ? usageFallback : null;
    const aiProviders = hasUsage ? providerGroups.map((g) => g.provider).join(' · ') : null;

    // ── Khối 6: Hạ tầng (Node os/process + ping DB) ──
    const cores = os.cpus().length || 1;
    const load1 = os.loadavg()[0] ?? 0;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    let dbStatus: 'up' | 'down' = 'up';
    let dbLatency: number | null = null;
    const t0 = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - t0;
    } catch {
      dbStatus = 'down';
    }
    // Trạng thái sao lưu DB (BackupService ghi vào SystemSetting `db_backup_last`).
    let backup: { at: string; success: boolean; sizeMb: number | null; error: string | null } | null = null;
    try {
      const bs = await this.prisma.systemSetting.findUnique({ where: { key: 'db_backup_last' } });
      if (bs?.value) {
        const v = JSON.parse(bs.value);
        backup = { at: v.at, success: !!v.success, sizeMb: v.sizeBytes ? Math.round((v.sizeBytes / 1048576) * 10) / 10 : null, error: v.error ?? null };
      }
    } catch { /* giữ null */ }
    const backupEnabled = process.env.BACKUP_ENABLED === '1' || process.env.BACKUP_ENABLED === 'true';

    // Disk (FS của container = đĩa host trên overlay) qua fs.statfs.
    let disk: { usedGb: number; totalGb: number; pct: number } | null = null;
    try {
      const st: any = await fs.promises.statfs('/');
      const total = st.blocks * st.bsize;
      const free = st.bavail * st.bsize;
      const used = total - free;
      if (total > 0) disk = { usedGb: Math.round((used / 1073741824) * 10) / 10, totalGb: Math.round((total / 1073741824) * 10) / 10, pct: Math.round((used / total) * 100) };
    } catch { /* null */ }

    // Storage: dung lượng thư mục uploads (driver local). Không có/không đọc được → null.
    let storage: { usedMb: number } | null = null;
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsDir)) storage = { usedMb: Math.round((this.dirSize(uploadsDir) / 1048576) * 10) / 10 };
    } catch { /* null */ }

    // Queue: app không có message-queue riêng → đo VIỆC ĐANG CHỜ trong hệ thống (thật từ DB).
    const [notiPending, wfPending, aiPending] = await Promise.all([
      this.prisma.notificationJob.count({ where: { status: 'READY', ...scope } }),
      this.prisma.workflowRun.count({ where: { status: { in: ['PENDING', 'RUNNING', 'WAITING_APPROVAL'] }, ...scope } }),
      this.prisma.aiAction.count({ where: { status: { in: ['PENDING_APPROVAL', 'RETRY_PENDING'] }, ...scope } }),
    ]);
    const queue = { pending: notiPending + wfPending + aiPending, notifications: notiPending, workflows: wfPending, aiActions: aiPending };

    // Kết nối DB hiện tại (pg_stat_activity) + phiên đăng nhập còn hiệu lực (RefreshToken).
    let dbConnections: number | null = null;
    try {
      const r: any = await this.prisma.$queryRaw`SELECT count(*)::int AS c FROM pg_stat_activity WHERE datname = current_database()`;
      dbConnections = Array.isArray(r) ? Number(r[0]?.c ?? 0) : null;
    } catch { /* null */ }
    const activeSessions = await this.prisma.refreshToken.count({ where: { revokedAt: null, expiresAt: { gt: now } } });

    const infra = {
      cpu: { load1: Math.round(load1 * 100) / 100, cores, pct: Math.min(100, Math.round((load1 / cores) * 100)) },
      memory: { usedMb: Math.round((totalMem - freeMem) / 1048576), totalMb: Math.round(totalMem / 1048576), pct: Math.round(((totalMem - freeMem) / totalMem) * 100) },
      uptimeSeconds: Math.round(process.uptime()),
      db: { status: dbStatus, latencyMs: dbLatency },
      backup, backupEnabled,
      disk, storage, queue, dbConnections, activeSessions,
      // Telemetry request (MetricsMiddleware, cửa sổ 5 phút): req/phút TB + tỷ lệ lỗi 5xx.
      ...this.metrics.snapshot(),
    };

    // ── Khối 7: Bảng xếp hạng (Top CLB) — bỏ qua nếu đang lọc 1 CLB ──
    const leaderboards = clubId ? null : await this.buildLeaderboards(start, end);

    // ── Khối 8: Cảnh báo điều hành (suy ra từ tín hiệu thật) ──
    const alerts = await this.buildAlerts({ now, soon, dbStatus, wfFailed: wf('FAILED'), notiFailed, suspendedClubs, clubId });

    // ── AIDO Executive Summary (rule-based từ số liệu thật, không bịa) ──
    const summary = this.buildSummary({
      totalClubs, activeClubs, suspendedClubs, totalMembers, logins24h,
      mrr, paidSubscribers, expiringSoon, expiredClubs,
      totalIncome, totalExpense, pendingExpenses,
      aiRequests, aiFailed, wfFailed: wf('FAILED'), notiFailed,
      dbStatus, cpuPct: infra.cpu.pct, memPct: infra.memory.pct,
    });

    // Ghi audit: Super Admin đã xem dữ liệu tài chính tổng hợp toàn nền tảng.
    return {
      generatedAt: now.toISOString(),
      range: { key: range, start: start.toISOString(), end: end.toISOString() },
      clubId: clubId ?? null,
      kpi: {
        totalClubs, activeClubs, suspendedClubs,
        totalMembers, activeUsers, logins24h,
        mrr, revenueInRange: n(revRange._sum.amount), paidSubscribers,
        aiRequests, aiCost: aiCostUsd, uptimeSeconds: infra.uptimeSeconds,
      },
      summary,
      business: {
        revenue: {
          today: n(revToday._sum.amount), month: n(revMonth._sum.amount),
          quarter: n(revQuarter._sum.amount), year: n(revYear._sum.amount),
          mrr, arr: mrr * 12,
        },
        subscription: {
          plans, paidSubscribers, expiringSoon, expired: expiredClubs,
          upgradesInRange, cancellationsInRange,
          trialToPro: null, renewalRate: null, churnRate: null, // chưa lưu lịch sử đủ để tính
        },
      },
      operations: {
        clubs: { total: totalClubs, new: newClubs, active: activeClubs, suspended: suspendedClubs, expiringSoon },
        members: { total: totalMembers, new: newMembers, active: activeMembers, registrations, checkins: attendancePresent, attendance: attendancePresent },
        business: { fundPeriods, sessions, minigames, matches, reportsExported },
      },
      finance: {
        totalIncome, totalExpense, totalBalance: totalIncome - totalExpense,
        incomeInRange: n(incomeRange._sum.amount), expenseInRange: n(expenseRange._sum.amount),
        pendingExpenses,
        debt: debtMetrics.debt, overdueCount: debtMetrics.overdueCount, overdueAmount: debtMetrics.overdueAmount, onTimeRatio: debtMetrics.onTimeRatio,
        trend: trendRows,
      },
      ai: {
        totals: {
          requests: aiRequests, successRate: aiSuccessRate, avgActionMs: avgAction._avg.executionDuration ? Math.round(n(avgAction._avg.executionDuration)) : null,
          errors: aiFailed + wf('FAILED') + notiFailed,
          tokens: aiTokens, cost: aiCostUsd, provider: aiProviders, fallbacks: aiFallbacks, avgLatencyMs: aiAvgLatency,
        },
        agents: {
          maika: { insights: maikaInsights, actions: aiActionsTotal },
          lisa: { messages: lisaMessages },
          hermes: { runs: wf('COMPLETED') + wf('FAILED') + wf('RUNNING') + wf('WAITING_APPROVAL') + wf('PENDING'), completed: wf('COMPLETED'), failed: wf('FAILED'), running: wf('RUNNING'), waiting: wf('WAITING_APPROVAL') },
          mitDac: { executed: aiExecuted, failed: aiFailed, running: aiRunning, avgMs: avgAction._avg.executionDuration ? Math.round(n(avgAction._avg.executionDuration)) : null },
          notification: { sent: notiSent, byChannel: { IN_APP: noti('IN_APP'), EMAIL: noti('EMAIL'), TELEGRAM: noti('TELEGRAM') }, failed: notiFailed },
        },
      },
      infra,
      alerts,
      leaderboards,
    };
  }

  /** Maika viết đánh giá điều hành cho 9 mục (1 lần gọi LLM → JSON; fallback rule-based). */
  async aiReview(opts: { range: RangeKey; clubId?: string | null; from?: string; to?: string }): Promise<{ generatedAt: string; sections: ReviewSections; byAi: boolean; data: any }> {
    const data = await this.overview(opts);
    const fallback = this.ruleBasedReview(data);
    const digest = this.buildDigest(data);
    const prompt =
      `Bạn là Maika — trợ lý phân tích điều hành của PickleFund. Dựa DUY NHẤT trên SỐ LIỆU THẬT dưới đây, ` +
      `viết đánh giá điều hành chuẩn SaaS (giọng chuyên nghiệp, súc tích, nêu xu hướng/rủi ro/khuyến nghị hành động; ` +
      `KHÔNG bịa thêm số liệu). Trả về DUY NHẤT một JSON object hợp lệ (không kèm markdown/giải thích), gồm ĐÚNG 9 khóa: ` +
      `"overview","business","operations","finance","ai","infra","alerts","leaderboards","syslog". Mỗi giá trị là 2–4 câu tiếng Việt.\n\nSỐ LIỆU:\n${digest}`;
    let byAi = false;
    let sections = fallback;
    try {
      const res = await this.maika.composeText(prompt, JSON.stringify(fallback));
      const parsed = this.parseReview(res.text);
      if (parsed) { sections = { ...fallback, ...parsed }; byAi = res.byAi; }
    } catch { /* giữ fallback */ }
    return { generatedAt: data.generatedAt, sections, byAi, data };
  }

  /** Xuất PDF Command Center (bìa + 9 mục + đánh giá Maika) qua headless Chrome. null nếu không render được. */
  async pdf(opts: { range: RangeKey; clubId?: string | null; from?: string; to?: string }): Promise<Buffer | null> {
    const review = await this.aiReview(opts);
    const exportedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const html = buildCommandCenterHtml(review.data, review.sections, exportedAt);
    const footerTemplate =
      `<div style="width:100%;font-size:7px;color:#94A3B8;font-family:Arial,sans-serif;padding:0 11mm;display:flex;justify-content:space-between;align-items:center;">` +
      `<span>Trung tâm điều hành PickleFund</span><span>Trang <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;
    return renderHtmlToPdf(html, { margin: { top: '11mm', bottom: '15mm', left: '0mm', right: '0mm' }, footerTemplate });
  }

  private buildDigest(d: any): string {
    const k = d.kpi, biz = d.business, ops = d.operations, fin = d.finance, ai = d.ai, infra = d.infra, lb = d.leaderboards;
    const ag = ai.agents;
    const topStr = (rows: any[], m = false) => (rows ?? []).slice(0, 3).map((r) => `${r.name}(${m ? money(r.value) : r.value})`).join(', ') || '—';
    return [
      `CLB: tổng ${k.totalClubs}, hoạt động ${k.activeClubs}, bị khóa ${k.suspendedClubs}, mới ${ops.clubs.new}, sắp hết hạn ${biz.subscription.expiringSoon}, đã hết hạn ${biz.subscription.expired}.`,
      `Người dùng: tổng thành viên ${k.totalMembers}, mới ${ops.members.new}, đăng nhập 24h ${k.logins24h}, người dùng hoạt động ${k.activeUsers}.`,
      `Kinh doanh: MRR ${money(biz.revenue.mrr)}, ARR ${money(biz.revenue.arr)}, doanh thu tháng ${money(biz.revenue.month)}/quý ${money(biz.revenue.quarter)}/năm ${money(biz.revenue.year)}; thuê bao trả phí ${biz.subscription.paidSubscribers}, nâng cấp trong kỳ ${biz.subscription.upgradesInRange}, hủy ${biz.subscription.cancellationsInRange}.`,
      `Hoạt động: kỳ quỹ ${ops.business.fundPeriods}, buổi chơi ${ops.business.sessions}, đăng ký ${ops.members.registrations}, điểm danh ${ops.members.attendance}, giải đấu ${ops.business.minigames}, trận ${ops.business.matches}, báo cáo xuất ${ops.business.reportsExported}.`,
      `Tài chính: tổng thu ${money(fin.totalIncome)}, tổng chi ${money(fin.totalExpense)}, số dư ${money(fin.totalBalance)}, chi chờ duyệt ${fin.pendingExpenses}, công nợ ${money(fin.debt)}, quá hạn ${fin.overdueCount} khoản (${money(fin.overdueAmount)}), thu đúng hạn ${fin.onTimeRatio == null ? 'chưa có dữ liệu' : fin.onTimeRatio + '%'}.`,
      `AI: request ${ai.totals.requests}, tỷ lệ thành công ${ai.totals.successRate == null ? '—' : ai.totals.successRate + '%'}, lỗi ${ai.totals.errors}, token ${ai.totals.tokens ?? 'chưa có'}, chi phí ${ai.totals.cost == null ? 'chưa có' : '$' + ai.totals.cost}; Maika insight ${ag.maika.insights}, Lisa tin nhắn ${ag.lisa.messages}, Hermes chạy ${ag.hermes.runs}/lỗi ${ag.hermes.failed}, Mít Đặc chạy ${ag.mitDac.executed}/lỗi ${ag.mitDac.failed}, Notification gửi ${ag.notification.sent}/lỗi ${ag.notification.failed}.`,
      `Hạ tầng: CPU ${infra.cpu?.pct}%, RAM ${infra.memory?.pct}%, DB ${infra.db?.status}, disk ${infra.disk ? infra.disk.pct + '%' : 'chưa có'}, storage ${infra.storage ? infra.storage.usedMb + 'MB' : 'chưa có'}, hàng đợi việc ${infra.queue?.pending}, kết nối DB ${infra.dbConnections ?? '—'}, phiên đăng nhập ${infra.activeSessions}, req/phút ${infra.requestsPerMin ?? '—'}, lỗi 5xx ${infra.errorRate == null ? 'chưa có' : infra.errorRate + '%'}, backup ${infra.backup ? (infra.backup.success ? 'bình thường' : 'lỗi') : (infra.backupEnabled ? 'chờ chạy' : 'chưa bật')}.`,
      `Cảnh báo: ${(d.alerts ?? []).length} mục${(d.alerts ?? []).length ? ' — ' + (d.alerts as any[]).map((a) => `${a.severity}:${a.title}`).join('; ') : ''}.`,
      lb ? `Xếp hạng CLB — nhiều thành viên: ${topStr(lb.topByMembers)}; hoạt động: ${topStr(lb.topByActivity)}; doanh thu: ${topStr(lb.topByRevenue, true)}; giải đấu: ${topStr(lb.topByTournaments)}; dùng AI: ${topStr(lb.topByAiUsage)}.` : 'Xếp hạng: đang lọc theo 1 CLB (không có bảng xếp hạng toàn hệ thống).',
    ].join('\n');
  }

  private ruleBasedReview(d: any): ReviewSections {
    const k = d.kpi, biz = d.business, ops = d.operations, fin = d.finance, ai = d.ai, infra = d.infra;
    const alertsN = (d.alerts ?? []).length;
    return {
      overview: `Hệ thống hiện có ${k.activeClubs}/${k.totalClubs} CLB hoạt động (${k.suspendedClubs} bị khóa), ${k.totalMembers} thành viên và ${k.logins24h} lượt đăng nhập trong 24h. MRR ${money(k.mrr)} với ${k.paidSubscribers} CLB trả phí.`,
      business: `MRR ${money(biz.revenue.mrr)}, ARR ${money(biz.revenue.arr)}; doanh thu năm ${money(biz.revenue.year)}. ${biz.subscription.expiringSoon} CLB sắp hết hạn và ${biz.subscription.expired} đã hết hạn — cần ưu tiên nhắc gia hạn.`,
      operations: `Trong kỳ: ${ops.business.sessions} buổi chơi, ${ops.members.attendance} lượt điểm danh, ${ops.business.minigames} giải/minigame và ${ops.members.new} thành viên mới. Kỳ quỹ đang quản lý: ${ops.business.fundPeriods}.`,
      finance: `Tổng thu ghi nhận ${money(fin.totalIncome)}, tổng chi ${money(fin.totalExpense)}, số dư ${money(fin.totalBalance)}. Công nợ ${money(fin.debt)} với ${fin.overdueCount} khoản quá hạn; ${fin.pendingExpenses} khoản chi đang chờ duyệt.`,
      ai: `AI xử lý ${ai.totals.requests} request${ai.totals.successRate != null ? `, tỷ lệ thành công ${ai.totals.successRate}%` : ''}; ${ai.totals.errors} lỗi. Lisa trả lời ${ai.agents.lisa.messages} tin, Hermes chạy ${ai.agents.hermes.runs} workflow.`,
      infra: `CPU ~${infra.cpu?.pct}%, RAM ~${infra.memory?.pct}%, DB ${infra.db?.status === 'up' ? 'bình thường' : 'LỖI'}. Hàng đợi việc: ${infra.queue?.pending}; ${infra.activeSessions} phiên đăng nhập còn hiệu lực.`,
      alerts: alertsN ? `Có ${alertsN} cảnh báo cần theo dõi; ưu tiên xử lý các mục mức Critical/High trước.` : `Không có cảnh báo — hệ thống đang vận hành ổn định.`,
      leaderboards: d.leaderboards ? `Bảng xếp hạng phản ánh các CLB dẫn đầu về quy mô, hoạt động, doanh thu và mức dùng AI — hữu ích để xác định CLB tiêu biểu và CLB cần hỗ trợ.` : `Đang lọc theo 1 CLB nên không hiển thị bảng xếp hạng toàn hệ thống.`,
      syslog: `Nhật ký kiểm toán ghi nhận các thao tác quản trị quan trọng; theo dõi định kỳ để phát hiện bất thường về truy cập và thay đổi cấu hình.`,
    };
  }

  private parseReview(text: string): Partial<ReviewSections> | null {
    if (!text) return null;
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const s = cleaned.indexOf('{');
      const e = cleaned.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      const obj = JSON.parse(cleaned.slice(s, e + 1));
      const out: Partial<ReviewSections> = {};
      const keys: (keyof ReviewSections)[] = ['overview', 'business', 'operations', 'finance', 'ai', 'infra', 'alerts', 'leaderboards', 'syslog'];
      for (const key of keys) if (typeof obj[key] === 'string' && obj[key].trim()) out[key] = String(obj[key]).trim();
      return Object.keys(out).length ? out : null;
    } catch { return null; }
  }

  /**
   * Công nợ = Σ (kỳ đang mở) max(0, expected − đã đóng) theo từng thành viên trong roster.
   * Quá hạn = phần công nợ thuộc kỳ có dueDate đã qua. Thu đúng hạn = tỷ lệ khoản đóng
   * (đã xác nhận) có paymentDate ≤ dueDate, tính trên các kỳ CÓ đặt dueDate.
   * Kỳ chưa đặt dueDate → không tính quá hạn/đúng hạn cho kỳ đó (trung thực).
   */
  private async buildDebtMetrics(clubId: string | null | undefined, now: Date) {
    const scope = this.clubScope(clubId);
    // Kỳ đang mở (draft/active) — công nợ chỉ tính cho kỳ chưa đóng.
    const openPeriods = await this.prisma.fundPeriod.findMany({
      where: { status: { in: ['draft', 'active'] }, ...scope },
      select: { id: true, dueDate: true },
    });
    let debt = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    if (openPeriods.length) {
      const openIds = openPeriods.map((p) => p.id);
      const dueMap = new Map(openPeriods.map((p) => [p.id, p.dueDate]));
      const [roster, paidGroups] = await Promise.all([
        this.prisma.fundPeriodMember.findMany({ where: { fundPeriodId: { in: openIds } }, select: { fundPeriodId: true, memberId: true, expectedAmount: true } }),
        this.prisma.fundContribution.groupBy({ by: ['fundPeriodId', 'memberId'], where: { isConfirmed: true, fundPeriodId: { in: openIds }, memberId: { not: null } }, _sum: { amount: true } }),
      ]);
      const paidMap = new Map<string, number>();
      for (const g of paidGroups) paidMap.set(`${g.fundPeriodId}|${g.memberId}`, n(g._sum.amount));
      for (const r of roster) {
        const expected = n(r.expectedAmount);
        const paid = paidMap.get(`${r.fundPeriodId}|${r.memberId}`) ?? 0;
        const outstanding = Math.max(0, expected - paid);
        if (outstanding <= 0) continue;
        debt += outstanding;
        const due = dueMap.get(r.fundPeriodId);
        if (due && due < now) { overdueCount++; overdueAmount += outstanding; }
      }
    }

    // Thu đúng hạn — trên các kỳ CÓ dueDate (mọi trạng thái trong phạm vi).
    const duePeriods = await this.prisma.fundPeriod.findMany({
      where: { dueDate: { not: null }, ...scope },
      select: { id: true, dueDate: true },
    });
    let onTimeRatio: number | null = null;
    if (duePeriods.length) {
      const dueMap2 = new Map(duePeriods.map((p) => [p.id, p.dueDate as Date]));
      const contribs = await this.prisma.fundContribution.findMany({
        where: { isConfirmed: true, fundPeriodId: { in: duePeriods.map((p) => p.id) } },
        select: { fundPeriodId: true, paymentDate: true },
      });
      if (contribs.length) {
        let onTime = 0;
        for (const c of contribs) {
          const due = c.fundPeriodId ? dueMap2.get(c.fundPeriodId) : null;
          if (due && c.paymentDate && c.paymentDate <= due) onTime++;
        }
        onTimeRatio = Math.round((onTime / contribs.length) * 100);
      }
    }

    return { debt, overdueCount, overdueAmount, onTimeRatio };
  }

  /** Tổng dung lượng thư mục (đệ quy, best-effort). Bỏ qua lỗi/symlink để không treo. */
  private dirSize(dir: string): number {
    let total = 0;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      try {
        if (e.isDirectory()) total += this.dirSize(p);
        else if (e.isFile()) total += fs.statSync(p).size;
      } catch { /* bỏ qua file lỗi */ }
    }
    return total;
  }

  private async buildLeaderboards(start: Date, end: Date) {
    const clubName = async (ids: string[]) => {
      const rows = await this.prisma.club.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      return new Map(rows.map((r) => [r.id, r.name]));
    };

    const [byMembers, actGroups, revGroups, tourGroups, aiGroups] = await Promise.all([
      this.prisma.club.findMany({
        where: { status: { not: 'deleted' } },
        select: { id: true, name: true, _count: { select: { members: { where: { isDeleted: false } } } } },
        orderBy: { members: { _count: 'desc' } }, take: 5,
      }),
      this.prisma.attendanceSession.groupBy({ by: ['clubId'], where: { sessionDate: { gte: start, lte: end } }, _count: { _all: true }, orderBy: { _count: { clubId: 'desc' } }, take: 5 }),
      this.prisma.paymentOrder.groupBy({ by: ['clubId'], where: { status: 'PAID', paidAt: { gte: start, lte: end } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
      this.prisma.minigame.groupBy({ by: ['clubId'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true }, orderBy: { _count: { clubId: 'desc' } }, take: 5 }),
      this.prisma.aiAction.groupBy({ by: ['clubId'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true }, orderBy: { _count: { clubId: 'desc' } }, take: 5 }),
    ]);

    const ids = Array.from(new Set([
      ...actGroups.map((g) => g.clubId), ...revGroups.map((g) => g.clubId),
      ...tourGroups.map((g) => g.clubId), ...aiGroups.map((g) => g.clubId),
    ].filter(Boolean) as string[]));
    const names = await clubName(ids);

    return {
      topByMembers: byMembers.map((c) => ({ clubId: c.id, name: c.name, value: c._count.members })),
      topByActivity: actGroups.map((g) => ({ clubId: g.clubId, name: names.get(g.clubId) ?? g.clubId, value: g._count._all })),
      topByRevenue: revGroups.map((g) => ({ clubId: g.clubId, name: names.get(g.clubId) ?? g.clubId, value: n(g._sum.amount) })),
      topByTournaments: tourGroups.map((g) => ({ clubId: g.clubId, name: names.get(g.clubId) ?? g.clubId, value: g._count._all })),
      topByAiUsage: aiGroups.map((g) => ({ clubId: g.clubId, name: names.get(g.clubId) ?? g.clubId, value: g._count._all })),
    };
  }

  private async buildAlerts(x: { now: Date; soon: Date; dbStatus: string; wfFailed: number; notiFailed: number; suspendedClubs: number; clubId?: string | null }) {
    const alerts: { severity: 'critical' | 'high' | 'medium'; source: string; clubId: string | null; clubName: string | null; title: string; time: string; status: string }[] = [];
    if (x.dbStatus === 'down') alerts.push({ severity: 'critical', source: 'Hạ tầng', clubId: null, clubName: null, title: 'Không kết nối được cơ sở dữ liệu', time: x.now.toISOString(), status: 'open' });

    const expiring = await this.prisma.club.findMany({
      where: { ...(x.clubId ? { id: x.clubId } : {}), plan: { not: 'STARTER' }, planExpiresAt: { gte: x.now, lte: x.soon } },
      select: { id: true, name: true, planExpiresAt: true }, take: 8, orderBy: { planExpiresAt: 'asc' },
    });
    for (const c of expiring) alerts.push({ severity: 'high', source: 'Thuê bao', clubId: c.id, clubName: c.name, title: `CLB "${c.name}" sắp hết hạn gói`, time: (c.planExpiresAt ?? x.now).toISOString(), status: 'open' });

    if (x.wfFailed > 0) alerts.push({ severity: 'high', source: 'AIDO Workflow', clubId: null, clubName: null, title: `${x.wfFailed} workflow lỗi trong kỳ`, time: x.now.toISOString(), status: 'open' });
    if (x.notiFailed > 0) alerts.push({ severity: 'medium', source: 'Notification', clubId: null, clubName: null, title: `${x.notiFailed} thông báo gửi thất bại`, time: x.now.toISOString(), status: 'open' });
    if (x.suspendedClubs > 0) alerts.push({ severity: 'medium', source: 'CLB', clubId: null, clubName: null, title: `${x.suspendedClubs} CLB đang bị khóa`, time: x.now.toISOString(), status: 'open' });

    const order = { critical: 0, high: 1, medium: 2 } as const;
    return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  private buildSummary(x: Record<string, number | string>) {
    const vnd = (v: number) => `${Number(v).toLocaleString('vi-VN')}đ`;
    const status: string[] = [];
    const risks: string[] = [];
    const priorities: string[] = [];

    status.push(`${x.activeClubs}/${x.totalClubs} CLB đang hoạt động, ${x.suspendedClubs} bị khóa; tổng ${x.totalMembers} thành viên, ${x.logins24h} lượt đăng nhập 24 giờ.`);
    status.push(`Kinh doanh: MRR ${vnd(Number(x.mrr))}, ${x.paidSubscribers} CLB trả phí. Tài chính ghi nhận: thu ${vnd(Number(x.totalIncome))}, chi ${vnd(Number(x.totalExpense))}.`);
    status.push(`Hạ tầng: ${x.dbStatus === 'up' ? 'DB bình thường' : 'DB LỖI'}, CPU ~${x.cpuPct}%, RAM ~${x.memPct}%.`);

    if (Number(x.expiringSoon) > 0) risks.push(`${x.expiringSoon} CLB sắp hết hạn gói — cần nhắc gia hạn.`);
    if (Number(x.expiredClubs) > 0) risks.push(`${x.expiredClubs} CLB đã hết hạn gói.`);
    if (x.dbStatus !== 'up') risks.push('Cơ sở dữ liệu đang lỗi — ưu tiên xử lý ngay.');
    if (Number(x.wfFailed) > 0) risks.push(`${x.wfFailed} workflow AI lỗi trong kỳ.`);
    if (Number(x.notiFailed) > 0) risks.push(`${x.notiFailed} thông báo gửi thất bại.`);
    if (Number(x.pendingExpenses) > 0) risks.push(`${x.pendingExpenses} khoản chi đang chờ duyệt.`);

    if (x.dbStatus !== 'up') priorities.push('Khôi phục kết nối cơ sở dữ liệu.');
    if (Number(x.expiringSoon) > 0) priorities.push('Liên hệ các CLB sắp hết hạn để gia hạn.');
    if (Number(x.wfFailed) > 0) priorities.push('Rà soát workflow AI bị lỗi.');
    if (!priorities.length) priorities.push('Không có việc khẩn — theo dõi định kỳ.');

    return { status, risks, priorities };
  }
}
