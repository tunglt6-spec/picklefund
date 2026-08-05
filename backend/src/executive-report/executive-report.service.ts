import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FundPeriodsService } from '../fund-periods/fund-periods.service';
import { ScoringService } from '../scoring/scoring.service';
import { MaikaService } from '../maika/maika.service';
import { EmailService } from '../email/email.service';
import { buildExecutiveReportPdf } from './executive-report-pdf';
import { buildReportHtml } from './executive-report-html';
import { renderHtmlToPdf } from './render-pdf';

/**
 * AIDO Executive Report v1.0 — báo cáo điều hành cho Ban quản trị CLB.
 *
 * NGUYÊN TẮC: mọi con số đều từ DB THẬT (không mock). Phần nào hệ thống chưa đo được
 * (vd: giờ check-in đúng/muộn, MVP chính thức, dòng tiền theo tuần) thì KHÔNG bịa —
 * hoặc bỏ, hoặc thay bằng chỉ số thật tương đương (theo kỳ quỹ, "người dẫn đầu BXH"…).
 *
 * Báo cáo scope theo 1 KỲ QUỸ (fundPeriodId) — đơn vị tự nhiên của dữ liệu tài chính.
 * Tài chính tái dùng FundPeriodsService (carry-forward chuẩn). Điểm hạnh kiểm tái dùng
 * ScoringService. Các phần khác (thành viên/hoạt động/giải/AI/thông báo) query trực tiếp.
 */
@Injectable()
export class ExecutiveReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundPeriods: FundPeriodsService,
    private readonly scoring: ScoringService,
    private readonly maika: MaikaService,
    private readonly email: EmailService,
  ) {}

  private clamp(n: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, Math.round(n)));
  }
  private pct(num: number, den: number): number {
    return den > 0 ? Math.round((num / den) * 1000) / 10 : 0; // 1 chữ số thập phân
  }
  private ym(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  private deltaPct(cur: number, prev: number): number | null {
    if (prev === 0) return cur === 0 ? 0 : null; // null = không có nền so sánh
    return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
  }
  private starFor(h: number): number {
    // 0 = ⚠️ (dưới 50). 1–5 sao.
    if (h < 50) return 0;
    if (h >= 90) return 5;
    if (h >= 80) return 4;
    if (h >= 65) return 3;
    return 2;
  }

  async generate(clubId: string, fundPeriodId: string) {
    const period = await this.prisma.fundPeriod.findFirst({
      where: { id: fundPeriodId, clubId },
    });
    if (!period) throw new NotFoundException('Không tìm thấy kỳ quỹ');

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true, code: true },
    });

    // Cửa sổ thời gian của kỳ (dùng cho AI/thông báo/giải theo createdAt)
    const from = new Date(period.startDate);
    from.setHours(0, 0, 0, 0);
    const to = period.endDate ? new Date(period.endDate) : new Date();
    to.setHours(23, 59, 59, 999);
    const scoringMonth = this.ym(period.endDate ?? period.startDate);

    // Chạy song song các nguồn độc lập. Tách 2 nhóm (mỗi nhóm ≤10) để TS giữ được
    // suy luận tuple thay vì gộp union (Promise.all >10 phần tử → mất kiểu).
    const [
      finance,
      trends,
      attendance,
      memberRoster,
      scores,
      sessions,
      minigames,
    ] = await Promise.all([
      this.fundPeriods.summary(fundPeriodId, clubId),
      this.fundPeriods.trends(clubId, period.type ?? 'chung', 6).catch(() => []),
      this.attendanceSummary(clubId, fundPeriodId, period),
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false },
        select: { id: true, fullName: true, status: true },
      }),
      this.scoring.getPeriodScores(clubId, scoringMonth).catch(() => []),
      this.sessionsInPeriod(clubId, fundPeriodId, period),
      this.minigamesInPeriod(clubId, from, to),
    ]);
    const [
      aiActions,
      workflowRuns,
      notifications,
      maikaInsights,
      lisaCount,
      prevPeriod,
    ] = await Promise.all([
      this.aiActionStats(clubId, from, to),
      this.workflowStats(clubId, from, to),
      this.notificationStats(clubId, from, to),
      this.prisma.maikaInsight.count({
        where: { clubId, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.lisaMessage.count({
        where: { clubId, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.fundPeriod.findFirst({
        where: {
          clubId,
          type: period.type ?? 'chung',
          startDate: { lt: period.startDate },
        },
        orderBy: { startDate: 'desc' },
        select: { id: true, name: true },
      }),
    ]);

    const activeMembers = memberRoster.filter(
      (m) => m.status === 'active',
    ).length;
    const totalMembers = memberRoster.length;

    // ── Member Intelligence + Health Score ──────────────────────────────
    const attendMap = new Map(
      attendance.map((a) => [a.memberId, a] as const),
    );
    const scoreMap = new Map(scores.map((s) => [s.memberId, s.total] as const));
    type FinMember = {
      memberId: string;
      memberName: string;
      amountPaid: number;
      balance: number;
    };
    const financeMembers = finance.members as FinMember[];
    const financeMemberMap = new Map<string, FinMember>(
      financeMembers.map((m) => [m.memberId, m] as const),
    );
    const minigamePlayed = await this.minigameParticipationByMember(
      clubId,
      from,
      to,
    );

    const activeRoster = memberRoster.filter((m) => m.status === 'active');
    const memberHealth = activeRoster
      .map((m) => {
        const att = attendMap.get(m.id);
        const attended = att?.attendedSessions ?? 0;
        const totalSes = att?.totalSessions ?? 0;
        const fin = financeMemberMap.get(m.id);
        const conduct = scoreMap.get(m.id); // 0..100 hoặc undefined
        const played = minigamePlayed.get(m.id) ?? 0;

        // Thành phần (0..1); bỏ thành phần thiếu dữ liệu, chuẩn hoá lại trọng số.
        const parts: Array<{ w: number; v: number }> = [];
        if (totalSes > 0) parts.push({ w: 0.4, v: attended / totalSes });
        // Đóng quỹ: trả đủ (balance>=0 và có đóng) = 1; nợ = 0; chưa tới hạn/không phát sinh = bỏ
        if (fin) {
          const paid = fin.balance >= 0 ? 1 : 0;
          parts.push({ w: 0.3, v: paid });
        }
        if (conduct != null) parts.push({ w: 0.3, v: conduct / 100 });

        const wSum = parts.reduce((s, p) => s + p.w, 0);
        const health =
          wSum > 0
            ? this.clamp(
                (parts.reduce((s, p) => s + p.w * p.v, 0) / wSum) * 100,
              )
            : 0;

        return {
          memberId: m.id,
          name: m.fullName,
          attended,
          totalSessions: totalSes,
          participationRate: this.pct(attended, totalSes),
          paymentStatus: fin
            ? fin.balance >= 0
              ? fin.amountPaid > 0
                ? 'paid'
                : 'nodue'
              : 'debt'
            : 'nodue',
          balance: fin?.balance ?? 0,
          conductScore: conduct ?? null,
          minigamesPlayed: played,
          healthScore: health,
          stars: this.starFor(health),
        };
      })
      .sort((a, b) => b.healthScore - a.healthScore);

    const avgMemberHealth =
      memberHealth.length > 0
        ? Math.round(
            memberHealth.reduce((s, m) => s + m.healthScore, 0) /
              memberHealth.length,
          )
        : 0;
    const distribution = {
      excellent: memberHealth.filter((m) => m.healthScore >= 90).length,
      good: memberHealth.filter(
        (m) => m.healthScore >= 80 && m.healthScore < 90,
      ).length,
      fair: memberHealth.filter(
        (m) => m.healthScore >= 50 && m.healthScore < 80,
      ).length,
      atRisk: memberHealth.filter((m) => m.healthScore < 50).length,
    };

    // ── Tài chính + so sánh kỳ trước ────────────────────────────────────
    let compare: {
      prevName: string;
      incomeDeltaPct: number | null;
      expenseDeltaPct: number | null;
      balanceDeltaPct: number | null;
    } | null = null;
    if (prevPeriod) {
      const prev = await this.fundPeriods
        .summary(prevPeriod.id, clubId)
        .catch(() => null);
      if (prev) {
        compare = {
          prevName: prevPeriod.name,
          incomeDeltaPct: this.deltaPct(
            finance.totalIncome,
            prev.totalIncome,
          ),
          expenseDeltaPct: this.deltaPct(
            finance.totalExpenses,
            prev.totalExpenses,
          ),
          balanceDeltaPct: this.deltaPct(finance.balance, prev.balance),
        };
      }
    }

    // ── Hoạt động ───────────────────────────────────────────────────────
    const completed = sessions.filter((s) => s.status === 'completed');
    const cancelled = sessions.filter((s) => s.status === 'cancelled');
    // Buổi đông/vắng nhất CHỈ xét trong buổi ĐÃ hoàn thành (buổi mới lên lịch có 0 người
    // không phải "vắng nhất" thật).
    const withPresence = completed
      .map((s) => ({ ...s, present: s.presentCount }))
      .sort((a, b) => b.present - a.present);
    // Tỉ lệ tham gia = tổng lượt điểm danh / (sĩ số hoạt động × số buổi ĐÃ hoàn thành).
    // attendanceSummary đã trả totalSessions = số buổi hoàn thành (mẫu số chuẩn cho kỳ đang mở).
    const clubParticipation = this.pct(
      attendance.reduce((s, a) => s + a.attendedSessions, 0),
      activeMembers * (attendance[0]?.totalSessions ?? 0),
    );
    const activity = {
      totalSessions: sessions.length,
      completed: completed.length,
      cancelled: cancelled.length,
      cancelledRate: this.pct(cancelled.length, sessions.length),
      avgPresentPerSession:
        completed.length > 0
          ? Math.round(
              (completed.reduce((s, x) => s + x.presentCount, 0) /
                completed.length) *
                10,
            ) / 10
          : 0,
      participationRate: clubParticipation,
      busiest: withPresence[0]
        ? {
            name: withPresence[0].name,
            date: withPresence[0].date,
            present: withPresence[0].present,
          }
        : null,
      emptiest:
        withPresence.length > 1
          ? {
              name: withPresence[withPresence.length - 1].name,
              date: withPresence[withPresence.length - 1].date,
              present: withPresence[withPresence.length - 1].present,
            }
          : null,
    };

    // ── Thi đấu (minigame = giải) ───────────────────────────────────────
    const tournament = await this.tournamentReport(clubId, minigames);

    // ── AI Office + Automation Score ────────────────────────────────────
    const ai = {
      hermes: workflowRuns,
      mitdac: aiActions.mitdac,
      maika: {
        actions: aiActions.maikaActions,
        insights: maikaInsights,
      },
      lisa: {
        reminders: notifications.lisaReminders,
        answered: lisaCount,
      },
      notification: {
        sent: notifications.sent,
        byChannel: notifications.byChannel,
        failed: notifications.failed,
      },
    };
    const automationScore = this.automationScore(
      workflowRuns,
      aiActions,
      notifications,
    );

    // ── Club Health Score (6 chiều) ─────────────────────────────────────
    const outstandingRatio =
      activeMembers > 0 ? finance.unpaidCount / activeMembers : 0;
    const financeDim = this.clamp(
      100 - outstandingRatio * 40 - (finance.balance < 0 ? 30 : 0),
    );
    // Chiều "Hoạt động" = SỨC KHỎE VẬN HÀNH của CLB, KHÔNG phải chỉ tỉ lệ tham gia thô
    // (tránh phạt nặng CLB xoay tua người chơi). Blend 3 phần thật:
    //  • Độ tin cậy tổ chức: buổi hoàn thành / (hoàn thành + hủy) — chỉ tính buổi ĐÃ quyết,
    //    KHÔNG tính buổi mới lên lịch (kỳ đang mở) để không bị tụt oan.
    //  • Độ đông mỗi buổi: TB người/buổi ÷ sĩ số hoạt động.
    //  • Độ phủ tham gia: tỉ lệ tham gia (đã theo buổi hoàn thành), scale nhẹ ×1.5.
    // CLB không có buổi hoàn thành nào trong kỳ → null (loại khỏi điểm tổng, không tính 0 oan).
    const decided = activity.completed + activity.cancelled;
    const reliability = decided > 0 ? (activity.completed / decided) * 100 : 100;
    const fillPerSession =
      activity.completed > 0
        ? Math.min(100, this.pct(activity.avgPresentPerSession, activeMembers))
        : 0;
    const coverage = Math.min(100, clubParticipation * 1.5);
    const activityDim =
      activity.completed > 0
        ? this.clamp(0.4 * reliability + 0.35 * fillPerSession + 0.25 * coverage)
        : null;
    const memberDim = avgMemberHealth;
    const distinctPlayers = minigamePlayed.size;
    const tournamentAvailable = minigames.length > 0;
    const tournamentDim = tournamentAvailable
      ? this.clamp(this.pct(distinctPlayers, activeMembers))
      : null;
    const aiDim = automationScore.score;
    const transparency = await this.transparencyDim(clubId, fundPeriodId);

    const dims: Array<{ key: string; score: number | null; weight: number }> = [
      { key: 'Tài chính', score: financeDim, weight: 0.25 },
      { key: 'Thành viên', score: memberDim, weight: 0.2 },
      { key: 'Hoạt động', score: activityDim, weight: 0.2 },
      { key: 'Minh bạch', score: transparency.score, weight: 0.15 },
      { key: 'AI', score: aiDim, weight: 0.1 },
      { key: 'Thi đấu', score: tournamentDim, weight: 0.1 },
    ];
    const availDims = dims.filter((d) => d.score != null) as Array<{
      key: string;
      score: number;
      weight: number;
    }>;
    const wTotal = availDims.reduce((s, d) => s + d.weight, 0);
    const clubHealthScore =
      wTotal > 0
        ? this.clamp(
            availDims.reduce((s, d) => s + d.score * d.weight, 0) / wTotal,
          )
        : 0;

    // ── Timeline + Cảnh báo + Gợi ý ─────────────────────────────────────
    const timeline = await this.buildTimeline(
      clubId,
      fundPeriodId,
      from,
      to,
      minigames,
    );
    const alerts = this.buildAlerts(finance, activity, memberHealth);
    const recommendations = this.buildRecommendations(
      finance,
      activity,
      tournamentAvailable,
      memberHealth,
    );
    const forecast = this.buildForecast(finance, trends, period);
    const dna = this.buildClubDNA({
      financeDim,
      activityDim,
      memberDim,
      tournamentDim,
      aiDim,
      transparency: transparency.score,
      participationRate: clubParticipation,
      sessionsPerMember: activeMembers > 0 ? sessions.length / activeMembers : 0,
      minigames: minigames.length,
      outstandingCount: finance.unpaidCount,
    });

    return {
      meta: {
        clubName: club?.name ?? '',
        clubCode: club?.code ?? '',
        periodId: period.id,
        periodName: period.name,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        periodStatus: period.status,
        scoringMonth,
        comparedTo: compare?.prevName ?? null,
      },
      summary: {
        totalMembers,
        activeMembers,
        totalSessions: sessions.length,
        completedSessions: completed.length,
        cancelledSessions: cancelled.length,
        participationRate: clubParticipation,
        totalIncome: finance.totalIncome,
        totalExpense: finance.totalExpenses,
        balance: finance.balance,
        carryForward: finance.carryForward?.balance ?? 0,
        clubAssets: finance.clubAssets?.balance ?? 0,
        outstandingCount: finance.unpaidCount,
        outstandingMembers: finance.negativeBalanceCount,
        tournamentsCount: minigames.length,
        aiActionsExecuted: aiActions.mitdac.executed,
        clubHealthScore,
      },
      finance: {
        totalIncome: finance.totalIncome,
        totalExpense: finance.totalExpenses,
        courtExpenses: finance.courtExpenses,
        livingExpenses: finance.livingExpenses,
        balance: finance.balance,
        carryForward: finance.carryForward?.balance ?? 0,
        clubAssets: finance.clubAssets?.balance ?? 0,
        costPerAttendance: finance.costPerAttendance,
        avgIncomePerMember:
          activeMembers > 0
            ? Math.round(finance.totalIncome / activeMembers)
            : 0,
        miniIncome: finance.miniIncome,
        miniExpense: finance.miniExpense,
        miniBalance: finance.miniBalance,
        trends,
        compare,
      },
      members: {
        total: totalMembers,
        active: activeMembers,
        avgHealth: avgMemberHealth,
        distribution,
        top10: memberHealth.slice(0, 10),
        all: memberHealth,
      },
      activity,
      tournament,
      ai: { ...ai, automationScore },
      health: {
        overall: clubHealthScore,
        dimensions: dims.map((d) => ({ key: d.key, score: d.score })),
      },
      timeline,
      alerts,
      recommendations,
      forecast,
      dna,
      generatedAt: to, // mốc dữ liệu = cuối kỳ (hoặc hiện tại nếu kỳ đang mở)
    };
  }

  /**
   * AI Executive Summary — TÓM TẮT ĐIỀU HÀNH bằng ngôn ngữ tự nhiên.
   * Dùng LLM THẬT (Gemini qua MaikaService khi có GOOGLE_API_KEY); không có key → bản
   * rule-based (vẫn từ số thật). Endpoint riêng để FE tải lười (không chặn render báo cáo).
   */
  async aiSummary(
    clubId: string,
    fundPeriodId: string,
    precomputed?: Awaited<ReturnType<ExecutiveReportService['generate']>>,
  ) {
    const r = precomputed ?? (await this.generate(clubId, fundPeriodId));
    const s = r.summary;
    const fin = r.finance;
    const money = (n: number) =>
      new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';

    const facts = [
      `CLB: ${r.meta.clubName}`,
      `Kỳ: ${r.meta.periodName}`,
      `Điểm sức khỏe CLB: ${s.clubHealthScore}/100`,
      `Thành viên: ${s.activeMembers}/${s.totalMembers} hoạt động; tỷ lệ tham gia ${s.participationRate}%`,
      `Buổi chơi: ${s.totalSessions} (hoàn thành ${s.completedSessions}, hủy ${s.cancelledSessions})`,
      `Giải/minigame: ${s.tournamentsCount}`,
      `Tài chính: thu ${money(fin.totalIncome)}, chi ${money(fin.totalExpense)}, cân đối ${money(fin.balance)}, tổng tài sản ${money(fin.clubAssets)}`,
      fin.compare
        ? `So kỳ trước: thu ${fin.compare.incomeDeltaPct ?? '—'}%, chi ${fin.compare.expenseDeltaPct ?? '—'}%`
        : 'Chưa có kỳ trước để so sánh',
      `Công nợ: ${s.outstandingCount} thành viên`,
      `Cảnh báo: ${r.alerts.map((a: { message: string }) => a.message).join('; ') || 'không có'}`,
      `Phong cách vận hành (Club DNA): ${r.dna.archetype}`,
      `Dự báo tài sản ~90 ngày: ${money(r.forecast.projected90)} (${r.forecast.trendLabel})`,
    ].join('\n');

    const prompt = `Bạn là Maika — trợ lý phân tích điều hành cho câu lạc bộ thể thao. Viết BÁO CÁO ĐIỀU HÀNH ngắn gọn bằng TIẾNG VIỆT cho Ban quản trị, dựa DUY NHẤT trên số liệu dưới đây (KHÔNG bịa thêm số). Văn phong chuyên nghiệp, súc tích, hành động được. Cấu trúc:
1) Một câu đánh giá tổng thể sức khỏe CLB.
2) 2–3 điểm nổi bật (tài chính/hoạt động/thành viên/thi đấu).
3) 1–2 rủi ro cần lưu ý.
4) 2–3 khuyến nghị ưu tiên cho kỳ tới.
Tối đa ~180 từ. Không dùng markdown heading, chỉ đoạn văn + gạch đầu dòng ngắn.

SỐ LIỆU:
${facts}`;

    const fallback = this.ruleBasedSummary(r);
    const { text, byAi } = await this.maika
      .composeText(prompt, fallback)
      .catch(() => ({ text: fallback, byAi: false }));
    return {
      periodName: r.meta.periodName,
      clubHealthScore: s.clubHealthScore,
      text,
      generatedBy: byAi ? 'ai' : 'rule',
      generatedAt: r.generatedAt,
    };
  }

  /** Bản tóm tắt rule-based (dùng khi không có LLM) — vẫn từ số thật, trung thực. */
  private ruleBasedSummary(r: any): string {
    const s = r.summary;
    const grade =
      s.clubHealthScore >= 80
        ? 'rất tốt'
        : s.clubHealthScore >= 65
          ? 'ổn định'
          : s.clubHealthScore >= 50
            ? 'cần cải thiện'
            : 'đáng lo';
    const lines = [
      `CLB ${r.meta.clubName} kỳ ${r.meta.periodName} đang ở mức ${grade} (sức khỏe ${s.clubHealthScore}/100).`,
      `• Tài chính: thu ${new Intl.NumberFormat('vi-VN').format(r.finance.totalIncome)}đ, chi ${new Intl.NumberFormat('vi-VN').format(r.finance.totalExpense)}đ, tổng tài sản ${new Intl.NumberFormat('vi-VN').format(r.finance.clubAssets)}đ.`,
      `• Hoạt động: ${s.completedSessions} buổi hoàn thành, tham gia ${s.participationRate}%; ${s.tournamentsCount} giải/minigame.`,
      `• Phong cách: ${r.dna.archetype}.`,
    ];
    if (r.alerts.length)
      lines.push(
        `• Lưu ý: ${r.alerts.map((a: { message: string }) => a.message).join('; ')}.`,
      );
    if (r.recommendations.length)
      lines.push(
        `• Nên làm: ${r.recommendations.map((x: { text: string }) => x.text).join(' ')}`,
      );
    return lines.join('\n');
  }

  /**
   * Dự báo 30/60/90 ngày — ƯỚC LƯỢNG theo xu hướng thu–chi gần đây (KHÔNG phải cam kết).
   * dòng tiền/ngày = net TB mỗi kỳ ÷ độ dài kỳ TB (ngày). Chiếu từ tổng tài sản hiện tại.
   */
  private buildForecast(
    finance: { clubAssets?: { balance: number } },
    trends: Array<{ thu: number; chi: number; startDate: Date }>,
    period: { startDate: Date; endDate: Date | null },
  ) {
    const assets = finance.clubAssets?.balance ?? 0;
    const nets = (trends || []).map((t) => t.thu - t.chi);
    const avgNet =
      nets.length > 0 ? nets.reduce((a, b) => a + b, 0) / nets.length : 0;

    // Độ dài kỳ TB (ngày): ưu tiên khoảng cách giữa các startDate của trend; fallback 90.
    let periodDays = 90;
    const ds = (trends || [])
      .map((t) => new Date(t.startDate).getTime())
      .sort((a, b) => a - b);
    if (ds.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < ds.length; i++)
        gaps.push((ds[i] - ds[i - 1]) / 86400000);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap > 15 && avgGap < 400) periodDays = Math.round(avgGap);
    } else if (period.endDate) {
      const d =
        (new Date(period.endDate).getTime() -
          new Date(period.startDate).getTime()) /
        86400000;
      if (d > 15) periodDays = Math.round(d);
    }
    const dailyNet = periodDays > 0 ? avgNet / periodDays : 0;
    const project = (days: number) => Math.round(assets + dailyNet * days);
    const runwayMonths =
      dailyNet < 0 && assets > 0
        ? Math.max(0, Math.round((assets / (-dailyNet * 30)) * 10) / 10)
        : null;
    return {
      basedOnPeriods: nets.length,
      avgNetPerPeriod: Math.round(avgNet),
      dailyNet: Math.round(dailyNet),
      current: Math.round(assets),
      projected30: project(30),
      projected60: project(60),
      projected90: project(90),
      trendLabel:
        dailyNet > 0
          ? 'xu hướng tăng'
          : dailyNet < 0
            ? 'xu hướng giảm'
            : 'đi ngang',
      runwayMonths, // số tháng quỹ trụ được nếu tiếp tục âm; null nếu đang dương
      note: 'Ước lượng tuyến tính theo xu hướng thu–chi gần đây — không phải cam kết.',
    };
  }

  /**
   * Club DNA — phong cách vận hành, suy từ các chiều điểm THẬT. Chọn archetype theo trait
   * trội nhất + liệt kê trait (0–100). Mô tả rule-based (không bịa).
   */
  private buildClubDNA(x: {
    financeDim: number;
    activityDim: number | null;
    memberDim: number;
    tournamentDim: number | null;
    aiDim: number;
    transparency: number;
    participationRate: number;
    sessionsPerMember: number;
    minigames: number;
    outstandingCount: number;
  }) {
    const traits = [
      { key: 'Kỷ luật tài chính', score: Math.round((x.financeDim + x.transparency) / 2) },
      { key: 'Năng động', score: x.activityDim ?? 0 },
      { key: 'Gắn kết thành viên', score: x.memberDim },
      { key: 'Máu lửa thi đấu', score: x.tournamentDim ?? 0 },
      { key: 'Vận hành hiện đại (AI)', score: x.aiDim },
    ].sort((a, b) => b.score - a.score);

    const top = traits[0];
    const archetypeMap: Record<string, string> = {
      'Kỷ luật tài chính': 'CLB Kỷ luật — quản trị quỹ minh bạch, chặt chẽ',
      'Năng động': 'CLB Năng động — chơi đều, lịch dày',
      'Gắn kết thành viên': 'CLB Gắn kết — thành viên tham gia cao, đều tay',
      'Máu lửa thi đấu': 'CLB Thi đấu — mạnh về giải/minigame',
      'Vận hành hiện đại (AI)': 'CLB Công nghệ — tự động hóa vận hành cao',
    };
    return {
      archetype: archetypeMap[top.key] ?? 'CLB Cân bằng',
      traits,
      note: 'Suy từ các chiều điểm thật của kỳ (không phải nhãn cố định).',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Attendance per member trong kỳ (nhân bản logic AttendanceService.getMemberSummary),
   * NHƯNG mẫu số = số buổi ĐÃ HOÀN THÀNH (status 'completed') — buổi mới lên lịch chưa
   * diễn ra không tính vào "tổng buổi có thể tham gia" (chuẩn cho kỳ đang mở).
   */
  private async attendanceSummary(
    clubId: string,
    fundPeriodId: string,
    period: { startDate: Date; endDate: Date | null },
  ) {
    const members = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: { id: true },
    });
    let sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, fundPeriodId, status: 'completed' },
      select: { id: true },
    });
    if (sessions.length === 0 && period.endDate) {
      sessions = await this.prisma.attendanceSession.findMany({
        where: {
          clubId,
          status: 'completed',
          sessionDate: { gte: period.startDate, lte: period.endDate },
        },
        select: { id: true },
      });
    }
    const sessionIds = sessions.map((s) => s.id);
    const records =
      sessionIds.length > 0
        ? await this.prisma.attendanceRecord.findMany({
            where: {
              clubId,
              status: 'PRESENT',
              attendanceSessionId: { in: sessionIds },
            },
            select: { memberId: true },
          })
        : [];
    const countByMember: Record<string, number> = {};
    records.forEach((r) => {
      countByMember[r.memberId] = (countByMember[r.memberId] ?? 0) + 1;
    });
    return members.map((m) => ({
      memberId: m.id,
      attendedSessions: countByMember[m.id] ?? 0,
      totalSessions: sessionIds.length,
    }));
  }

  /** Danh sách buổi chơi trong kỳ + số người PRESENT mỗi buổi. */
  private async sessionsInPeriod(
    clubId: string,
    fundPeriodId: string,
    period: { startDate: Date; endDate: Date | null },
  ) {
    let list = await this.prisma.attendanceSession.findMany({
      where: { clubId, fundPeriodId },
      select: {
        id: true,
        courtName: true,
        sessionDate: true,
        status: true,
        _count: { select: { attendanceRecords: true } },
      },
    });
    if (list.length === 0 && period.endDate) {
      list = await this.prisma.attendanceSession.findMany({
        where: {
          clubId,
          sessionDate: { gte: period.startDate, lte: period.endDate },
        },
        select: {
          id: true,
          courtName: true,
          sessionDate: true,
          status: true,
          _count: { select: { attendanceRecords: true } },
        },
      });
    }
    // Đếm PRESENT thực (attendanceRecords _count gồm cả ABSENT nếu có bản ghi ABSENT)
    const ids = list.map((s) => s.id);
    const presentGroups =
      ids.length > 0
        ? await this.prisma.attendanceRecord.groupBy({
            by: ['attendanceSessionId'],
            where: {
              clubId,
              status: 'PRESENT',
              attendanceSessionId: { in: ids },
            },
            _count: { _all: true },
          })
        : [];
    const presentMap = new Map(
      presentGroups.map((g) => [g.attendanceSessionId, g._count._all]),
    );
    return list.map((s) => ({
      id: s.id,
      name: s.courtName || 'Buổi chơi',
      date: s.sessionDate,
      status: s.status,
      presentCount: presentMap.get(s.id) ?? 0,
    }));
  }

  private async minigamesInPeriod(clubId: string, from: Date, to: Date) {
    return this.prisma.minigame.findMany({
      where: { clubId, createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        name: true,
        status: true,
        format: true,
        createdAt: true,
        _count: { select: { teams: true, matches: true, participants: true } },
      },
    });
  }

  private async minigameParticipationByMember(
    clubId: string,
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.minigameParticipant.findMany({
      where: {
        minigame: { clubId, createdAt: { gte: from, lte: to } },
      },
      select: { memberId: true },
    });
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.memberId, (map.get(r.memberId) ?? 0) + 1));
    return map;
  }

  /** Tổng hợp giải/minigame xuyên kỳ: số trận/đội + top người chơi (thắng/hiệu số). */
  private async tournamentReport(
    clubId: string,
    minigames: Array<{ id: string; _count: { teams: number; matches: number } }>,
  ) {
    const ids = minigames.map((m) => m.id);
    const teamsCount = minigames.reduce((s, m) => s + m._count.teams, 0);
    const matchesCount = minigames.reduce((s, m) => s + m._count.matches, 0);

    // Gán wins/losses/points của đội cho player1/player2 → tổng hợp per member.
    const teams =
      ids.length > 0
        ? await this.prisma.minigameTeam.findMany({
            where: { minigameId: { in: ids } },
            select: {
              player1Id: true,
              player2Id: true,
              player1: { select: { fullName: true } },
              player2: { select: { fullName: true } },
              wins: true,
              losses: true,
              points: true,
            },
          })
        : [];
    const agg = new Map<
      string,
      { name: string; wins: number; losses: number; points: number }
    >();
    const add = (
      id: string | null,
      name: string | undefined,
      t: { wins: number; losses: number; points: number },
    ) => {
      if (!id) return;
      const cur = agg.get(id) ?? {
        name: name ?? 'Thành viên',
        wins: 0,
        losses: 0,
        points: 0,
      };
      cur.wins += t.wins;
      cur.losses += t.losses;
      cur.points += t.points;
      agg.set(id, cur);
    };
    teams.forEach((t) => {
      add(t.player1Id, t.player1?.fullName, t);
      add(t.player2Id, t.player2?.fullName, t);
    });
    const topPlayers = [...agg.values()]
      .map((p) => ({
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        points: p.points,
        winRate: this.pct(p.wins, p.wins + p.losses),
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 5);

    return {
      tournamentsCount: minigames.length,
      completedCount: minigames.filter(
        (m: any) => m.status === 'COMPLETED',
      ).length,
      teamsCount,
      matchesCount,
      topPlayers,
      leader: topPlayers[0] ?? null, // "người dẫn đầu" (KHÔNG phải giải MVP chính thức)
    };
  }

  private async aiActionStats(clubId: string, from: Date, to: Date) {
    const rows = await this.prisma.aiAction.groupBy({
      by: ['status', 'requestedByAi'],
      where: { clubId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const durAgg = await this.prisma.aiAction.aggregate({
      where: {
        clubId,
        status: 'EXECUTED',
        createdAt: { gte: from, lte: to },
      },
      _avg: { executionDuration: true },
    });
    let executed = 0,
      failed = 0,
      maikaActions = 0;
    rows.forEach((r) => {
      if (r.status === 'EXECUTED') executed += r._count._all;
      if (r.status === 'FAILED') failed += r._count._all;
      if (r.requestedByAi === 'MAIKA') maikaActions += r._count._all;
    });
    return {
      mitdac: {
        executed,
        failed,
        avgMs: Math.round(durAgg._avg.executionDuration ?? 0),
      },
      maikaActions,
    };
  }

  private async workflowStats(clubId: string, from: Date, to: Date) {
    const rows = await this.prisma.workflowRun.groupBy({
      by: ['status'],
      where: { clubId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const by = (s: string) =>
      rows.find((r) => r.status === s)?._count._all ?? 0;
    const runs = rows.reduce((s, r) => s + r._count._all, 0);
    return {
      runs,
      completed: by('COMPLETED'),
      failed: by('FAILED'),
      running: by('RUNNING') + by('WAITING_APPROVAL'),
    };
  }

  private async notificationStats(clubId: string, from: Date, to: Date) {
    const [sentRows, failedCount, lisaReminders] = await Promise.all([
      this.prisma.notification.groupBy({
        by: ['channel'],
        where: {
          clubId,
          status: { in: ['SENT', 'READ'] },
          createdAt: { gte: from, lte: to },
        },
        _count: { _all: true },
      }),
      this.prisma.notification.count({
        where: {
          clubId,
          status: 'FAILED',
          createdAt: { gte: from, lte: to },
        },
      }),
      this.prisma.notification.count({
        where: {
          clubId,
          eventType: { startsWith: 'lisa' },
          createdAt: { gte: from, lte: to },
        },
      }),
    ]);
    const ch = (c: string) =>
      sentRows.find((r) => r.channel === c)?._count._all ?? 0;
    const sent = sentRows.reduce((s, r) => s + r._count._all, 0);
    return {
      sent,
      failed: failedCount,
      byChannel: {
        IN_APP: ch('IN_APP'),
        EMAIL: ch('EMAIL'),
        TELEGRAM: ch('TELEGRAM'),
      },
      lisaReminders,
    };
  }

  /**
   * AI Automation Score (0..100) — ĐO MỨC DÙNG + ĐỘ TIN CẬY tự động hóa trong kỳ.
   * Blend: tỉ lệ hoàn tất workflow, tỉ lệ thực thi action thành công, tỉ lệ gửi thông báo OK.
   * CLB không dùng AI trong kỳ → 0 (kèm cờ noActivity, KHÔNG coi là "sức khỏe kém").
   */
  private automationScore(
    wf: { runs: number; completed: number; failed: number },
    ai: { mitdac: { executed: number; failed: number } },
    notif: { sent: number; failed: number },
  ) {
    const parts: number[] = [];
    if (wf.runs > 0) parts.push((wf.completed / wf.runs) * 100);
    const actTotal = ai.mitdac.executed + ai.mitdac.failed;
    if (actTotal > 0) parts.push((ai.mitdac.executed / actTotal) * 100);
    const notifTotal = notif.sent + notif.failed;
    if (notifTotal > 0) parts.push((notif.sent / notifTotal) * 100);
    const noActivity = parts.length === 0;
    const score = noActivity
      ? 0
      : this.clamp(parts.reduce((s, p) => s + p, 0) / parts.length);
    return { score, noActivity };
  }

  /** Minh bạch: % chi có chứng từ + % thu đã xác nhận trong kỳ. */
  private async transparencyDim(clubId: string, fundPeriodId: string) {
    const [expenses, contribGroups] = await Promise.all([
      this.prisma.livingExpense.findMany({
        where: {
          clubId,
          fundPeriodId,
          status: { in: ['approved', 'paid'] },
        },
        select: { receiptUrl: true },
      }),
      this.prisma.fundContribution.groupBy({
        by: ['isConfirmed'],
        where: { clubId, fundPeriodId },
        _count: { _all: true },
      }),
    ]);
    const missingReceipt = expenses.filter((e) => !e.receiptUrl).length;
    const missingRatio =
      expenses.length > 0 ? missingReceipt / expenses.length : 0;
    const confirmed =
      contribGroups.find((g) => g.isConfirmed)?._count._all ?? 0;
    const totalContrib = contribGroups.reduce((s, g) => s + g._count._all, 0);
    const unconfirmedRatio =
      totalContrib > 0 ? 1 - confirmed / totalContrib : 0;
    return {
      score: this.clamp(100 - missingRatio * 50 - unconfirmedRatio * 30),
      missingReceipt,
      totalExpenses: expenses.length,
    };
  }

  private async buildTimeline(
    clubId: string,
    fundPeriodId: string,
    from: Date,
    to: Date,
    minigames: Array<{ name: string; createdAt: Date }>,
  ) {
    const [bigExpenses, topContribs] = await Promise.all([
      this.prisma.livingExpense.findMany({
        where: {
          clubId,
          fundPeriodId,
          status: { in: ['approved', 'paid'] },
        },
        orderBy: { amount: 'desc' },
        take: 4,
        select: { description: true, amount: true, expenseDate: true },
      }),
      this.prisma.fundContribution.findMany({
        where: { clubId, fundPeriodId, isConfirmed: true },
        orderBy: { amount: 'desc' },
        take: 3,
        select: { amount: true, paymentDate: true, payerName: true },
      }),
    ]);
    const items: Array<{
      date: Date;
      type: string;
      label: string;
      amount?: number;
    }> = [];
    minigames.forEach((m) =>
      items.push({ date: m.createdAt, type: 'tournament', label: m.name }),
    );
    bigExpenses.forEach((e) =>
      items.push({
        date: e.expenseDate,
        type: 'expense',
        label: e.description || 'Chi phí',
        amount: Number(e.amount),
      }),
    );
    topContribs.forEach((c) =>
      items.push({
        date: c.paymentDate,
        type: 'income',
        label: `Thu quỹ${c.payerName ? ' · ' + c.payerName : ''}`,
        amount: Number(c.amount),
      }),
    );
    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 12);
  }

  private buildAlerts(
    finance: {
      unpaidCount: number;
      negativeBalanceCount: number;
      balance: number;
      lowAttendanceCount: number;
      clubAssets: { balance: number };
      totalExpenses: number;
    },
    activity: { cancelled: number },
    memberHealth: Array<{ healthScore: number }>,
  ) {
    const alerts: Array<{ level: 'warning' | 'info'; message: string }> = [];
    const atRisk = memberHealth.filter((m) => m.healthScore < 50).length;
    if (finance.lowAttendanceCount > 0)
      alerts.push({
        level: 'warning',
        message: `${finance.lowAttendanceCount} thành viên tham gia dưới 50%`,
      });
    if (finance.unpaidCount > 0)
      alerts.push({
        level: 'warning',
        message: `${finance.unpaidCount} thành viên chưa/không đủ đóng quỹ`,
      });
    if (finance.balance < 0)
      alerts.push({
        level: 'warning',
        message: 'Cân đối thu–chi kỳ này đang âm',
      });
    if (activity.cancelled > 0)
      alerts.push({
        level: 'info',
        message: `${activity.cancelled} buổi bị hủy trong kỳ`,
      });
    if (
      finance.clubAssets?.balance != null &&
      finance.totalExpenses > 0 &&
      finance.clubAssets.balance < finance.totalExpenses
    )
      alerts.push({
        level: 'warning',
        message: 'Tổng quỹ hiện thấp hơn 1 kỳ chi — nguy cơ thiếu quỹ',
      });
    if (atRisk > 0)
      alerts.push({
        level: 'info',
        message: `${atRisk} thành viên có điểm sức khỏe dưới 50 (cần quan tâm)`,
      });
    return alerts;
  }

  /**
   * Gợi ý hành động — SUY RA TỪ DỮ LIỆU THẬT (rule-based), gắn nhãn agent phù hợp.
   * KHÔNG phải văn bản do AI tự sinh (đó là v2). Chỉ là ánh xạ cảnh báo → việc nên làm.
   */
  private buildRecommendations(
    finance: { unpaidCount: number; lowAttendanceCount: number },
    activity: { cancelled: number },
    hasTournament: boolean,
    memberHealth: Array<{ healthScore: number }>,
  ) {
    const recs: Array<{ agent: string; text: string }> = [];
    if (finance.lowAttendanceCount > 0)
      recs.push({
        agent: 'Maika',
        text: `Cân nhắc thêm buổi chơi/khảo sát lịch — ${finance.lowAttendanceCount} thành viên tham gia thấp.`,
      });
    if (finance.unpaidCount > 0) {
      recs.push({
        agent: 'Lisa',
        text: `Nhắc ${finance.unpaidCount} thành viên đóng quỹ.`,
      });
      recs.push({
        agent: 'Hermes',
        text: 'Bật workflow tự động nhắc quỹ định kỳ.',
      });
    }
    if (!hasTournament)
      recs.push({
        agent: 'Mít Đặc',
        text: 'Chưa có minigame/giải trong kỳ — chuẩn bị giải kế tiếp để tăng gắn kết.',
      });
    return recs;
  }

  // ══════════════════════════════════════════════════════════════════════
  // TỰ GỬI EMAIL BÁO CÁO ĐẦU MỖI THÁNG (opt-in từng CLB)
  // ══════════════════════════════════════════════════════════════════════

  /** Kỳ để báo cáo định kỳ: kỳ 'chung' đang mở (ưu tiên), nếu không có → kỳ 'chung' mới nhất. */
  private async resolveTargetPeriod(clubId: string) {
    const active = await this.prisma.fundPeriod.findFirst({
      where: { clubId, type: 'chung', status: 'active' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    if (active) return active;
    return this.prisma.fundPeriod.findFirst({
      where: { clubId, type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
  }

  /** Danh sách email admin CLB nhận báo cáo (đánh dấu email tự-sinh @picklefund.vn = chưa hợp lệ). */
  private async recipients(clubId: string) {
    const admins = await this.prisma.user.findMany({
      where: { clubId, role: 'CLUB_ADMIN', isActive: true },
      select: { email: true },
    });
    return admins
      .filter((a) => !!a.email)
      .map((a) => ({
        email: a.email,
        isPlaceholder: a.email.endsWith('@picklefund.vn'),
      }));
  }

  /** Cấu hình tự-gửi email của CLB (đọc từ Club.settings). */
  async getAutoEmailConfig(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { settings: true },
    });
    const s = (club?.settings as Record<string, unknown>) ?? {};
    return {
      enabled: s.autoMonthlyReport === true,
      lastSent: (s.autoMonthlyReportLastSent as string) ?? null,
      smtpReady: this.email.isEnabled, // false = server chưa cấu hình SMTP → chưa gửi được
      recipients: await this.recipients(clubId),
    };
  }

  /** Bật/tắt tự-gửi email (ghi vào Club.settings, giữ nguyên các key khác). */
  async setAutoEmail(clubId: string, enabled: boolean) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { settings: true },
    });
    const s = (club?.settings as Record<string, unknown>) ?? {};
    s.autoMonthlyReport = enabled;
    await this.prisma.club.update({
      where: { id: clubId },
      data: { settings: s as any },
    });
    return this.getAutoEmailConfig(clubId);
  }

  /**
   * Gửi email báo cáo điều hành cho admin CLB. Dùng cho cả "gửi thử" (test) lẫn cron tháng.
   * `recordMonth` (YYYY-MM) truyền vào từ cron → ghi mốc chống gửi trùng trong tháng.
   * KHÔNG gửi tới email tự-sinh (@picklefund.vn). Nếu SMTP chưa cấu hình → sent=0 (trung thực).
   */
  async sendMonthlyReportEmail(clubId: string, recordMonth?: string) {
    const period = await this.resolveTargetPeriod(clubId);
    if (!period)
      return {
        sent: 0,
        reason: 'no_period',
        smtpReady: this.email.isEnabled,
        recipients: [] as string[],
      };
    const report = await this.generate(clubId, period.id);
    const ai = await this.aiSummary(clubId, period.id, report);
    const targets = (await this.recipients(clubId)).filter(
      (r) => !r.isPlaceholder,
    );
    const subject = `[${report.meta.clubName}] Báo cáo điều hành — ${report.meta.periodName}`;
    const html = this.buildEmailHtml(report, ai.text);

    // PDF đầy đủ đính kèm (server-side, GIỐNG web). Lỗi sinh PDF KHÔNG chặn gửi (gửi bản HTML).
    let attachments:
      | Array<{ filename: string; content: Buffer }>
      | undefined;
    try {
      const pdf = await this.buildReportPdf(clubId, period.id, report, ai.text);
      if (pdf)
        attachments = [{ filename: this.pdfFileName(report), content: pdf }];
    } catch {
      attachments = undefined; // sinh PDF lỗi → gửi email không kèm file
    }

    let sent = 0;
    if (this.email.isEnabled) {
      for (const r of targets) {
        const ok = await this.email.send(r.email, subject, html, {
          fromName: report.meta.clubName,
          attachments,
        });
        if (ok) sent++;
      }
    }
    if (recordMonth) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        select: { settings: true },
      });
      const s = (club?.settings as Record<string, unknown>) ?? {};
      s.autoMonthlyReportLastSent = recordMonth;
      await this.prisma.club.update({
        where: { id: clubId },
        data: { settings: s as any },
      });
    }
    return {
      sent,
      smtpReady: this.email.isEnabled,
      recipients: targets.map((r) => r.email),
      skippedPlaceholders: (await this.recipients(clubId)).filter(
        (r) => r.isPlaceholder,
      ).length,
      periodName: report.meta.periodName,
      healthScore: report.summary.clubHealthScore,
    };
  }

  /** Tên file PDF an toàn (bỏ ký tự đặc biệt, giữ chữ có dấu/chữ số). */
  private pdfFileName(report: {
    meta: { periodName: string };
  }): string {
    const safe = `BaoCao_DieuHanh_${report.meta.periodName}`.replace(
      /[^\p{L}\p{N}_-]+/gu,
      '_',
    );
    return `${safe}.pdf`;
  }

  /**
   * Sinh PDF Báo cáo điều hành — DÙNG CHUNG cho email đính kèm và nút "PDF" trên web
   * (1 bản chuẩn duy nhất). Chính: HTML in-ấn render headless Chrome (giống web, chia trang
   * A4 sạch). Fallback: jsPDF (khi không có Chromium) để LUÔN có PDF. Trả {buffer, filename}.
   */
  async buildReportPdf(
    clubId: string,
    fundPeriodId: string,
    precomputed?: Awaited<ReturnType<ExecutiveReportService['generate']>>,
    precomputedAiText?: string,
  ): Promise<Buffer | null> {
    const report = precomputed ?? (await this.generate(clubId, fundPeriodId));
    const aiText =
      precomputedAiText ??
      (await this.aiSummary(clubId, fundPeriodId, report)).text;
    const html = buildReportHtml(report, aiText);
    // Footer chạy trang (ASCII-only để không lệ thuộc font trong container Chromium).
    const footerTemplate = `<div style="width:100%;font-size:7px;color:#94A3B8;font-family:Arial,sans-serif;padding:0 11mm;display:flex;justify-content:space-between;align-items:center;">
      <span>PickleFund &middot; AIDO Executive Report</span>
      <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;
    const viaChrome = await renderHtmlToPdf(html, {
      margin: { top: '11mm', bottom: '13mm', left: '11mm', right: '11mm' },
      headerTemplate: '<span></span>',
      footerTemplate,
    }).catch(() => null);
    if (viaChrome) return viaChrome;
    // Fallback: jsPDF (nhẹ, không cần Chromium) — vẫn đầy đủ nội dung.
    try {
      return buildExecutiveReportPdf(report, aiText);
    } catch {
      return null;
    }
  }

  /** Cho endpoint web: trả PDF + tên file. */
  async pdfForDownload(clubId: string, fundPeriodId: string) {
    const report = await this.generate(clubId, fundPeriodId);
    const ai = await this.aiSummary(clubId, fundPeriodId, report);
    const buffer = await this.buildReportPdf(
      clubId,
      fundPeriodId,
      report,
      ai.text,
    );
    return { buffer, filename: this.pdfFileName(report) };
  }

  /** ID các CLB đã bật tự-gửi email (cron đọc). Lọc JS vì filter JSON boolean khác nhau theo DB. */
  async monthlyReportClubIds(currentMonth: string): Promise<string[]> {
    const clubs = await this.prisma.club.findMany({
      select: { id: true, settings: true },
    });
    return clubs
      .filter((c) => {
        const s = (c.settings as Record<string, unknown>) ?? {};
        return (
          s.autoMonthlyReport === true &&
          s.autoMonthlyReportLastSent !== currentMonth // chống gửi trùng trong tháng
        );
      })
      .map((c) => c.id);
  }

  /** HTML email digest (inline style — client email không đọc CSS ngoài). */
  private buildEmailHtml(
    r: Awaited<ReturnType<ExecutiveReportService['generate']>>,
    aiText: string,
  ): string {
    const esc = (x: string) =>
      String(x)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const money = (n: number) =>
      new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
    const s = r.summary;
    const hc =
      s.clubHealthScore >= 80
        ? '#059669'
        : s.clubHealthScore >= 65
          ? '#0EA5E9'
          : s.clubHealthScore >= 50
            ? '#F59E0B'
            : '#E11D48';
    const kpi = (label: string, val: string) =>
      `<td style="padding:10px 12px;border:1px solid #eee;"><div style="font-size:11px;color:#888;">${label}</div><div style="font-size:16px;font-weight:700;color:#111;">${val}</div></td>`;
    const alerts = r.alerts.length
      ? `<ul style="margin:6px 0;padding-left:18px;color:#b45309;font-size:13px;">${r.alerts.map((a: { message: string }) => `<li>${esc(a.message)}</li>`).join('')}</ul>`
      : '<p style="color:#059669;font-size:13px;">✓ Không có cảnh báo.</p>';
    return `<div style="max-width:640px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#111;">
  <div style="background:linear-gradient(135deg,#6D5DFB,#5B4BE8);color:#fff;padding:20px 24px;border-radius:14px 14px 0 0;">
    <div style="font-size:13px;opacity:.9;">Báo cáo điều hành hằng tháng</div>
    <div style="font-size:20px;font-weight:800;">${esc(r.meta.clubName)}</div>
    <div style="font-size:13px;opacity:.9;">${esc(r.meta.periodName)}</div>
  </div>
  <div style="border:1px solid #eee;border-top:none;border-radius:0 0 14px 14px;padding:20px 24px;">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="display:inline-block;border:6px solid ${hc};border-radius:50%;width:84px;height:84px;line-height:72px;font-size:26px;font-weight:800;color:${hc};">${s.clubHealthScore}</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">Điểm sức khỏe CLB / 100</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <tr>${kpi('Thành viên', `${s.activeMembers}/${s.totalMembers}`)}${kpi('Tham gia', `${s.participationRate}%`)}${kpi('Buổi chơi', String(s.completedSessions))}</tr>
      <tr>${kpi('Tổng thu', money(r.finance.totalIncome))}${kpi('Tổng chi', money(r.finance.totalExpense))}${kpi('Tổng tài sản', money(r.finance.clubAssets))}</tr>
    </table>
    <div style="background:#f6f5ff;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:700;color:#6D5DFB;margin-bottom:6px;">✨ Tóm tắt điều hành (AI)</div>
      <div style="font-size:13px;line-height:1.6;white-space:pre-line;color:#333;">${esc(aiText)}</div>
    </div>
    <div style="font-size:13px;font-weight:700;margin-bottom:2px;">Cảnh báo</div>
    ${alerts}
    <div style="text-align:center;margin-top:18px;">
      <a href="https://app.picklefund.uk/aido" style="display:inline-block;background:#6D5DFB;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;">Xem báo cáo đầy đủ</a>
    </div>
    <p style="font-size:11px;color:#aaa;margin-top:16px;text-align:center;">PickleFund · AIDO Executive Report · mọi con số từ dữ liệu thật của CLB</p>
  </div>
</div>`;
  }
}
