import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FundPeriodsService } from '../fund-periods/fund-periods.service';
import { ScoringService } from '../scoring/scoring.service';

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
    const withPresence = sessions
      .map((s) => ({ ...s, present: s.presentCount }))
      .sort((a, b) => b.present - a.present);
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
    const activityDim = this.clamp(
      clubParticipation - activity.cancelledRate * 0.5,
    );
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
      generatedAt: to, // mốc dữ liệu = cuối kỳ (hoặc hiện tại nếu kỳ đang mở)
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Attendance per member trong kỳ (nhân bản logic AttendanceService.getMemberSummary). */
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
      where: { clubId, fundPeriodId },
      select: { id: true },
    });
    if (sessions.length === 0 && period.endDate) {
      sessions = await this.prisma.attendanceSession.findMany({
        where: {
          clubId,
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
}
