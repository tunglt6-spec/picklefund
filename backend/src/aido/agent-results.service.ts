import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AgentResultsService — KẾT QUẢ CÔNG VIỆC THẬT của từng AI agent trong ngày (AIDO Office View).
 * CHỈ dữ liệu DB thật (không bịa). Lưu ý giới hạn hiện trạng:
 *  - Maika/Lisa KHÔNG persist nội dung phân tích/hội thoại → chỉ đếm gián tiếp (AiAction do Maika
 *    tạo, notification brief/nhắc nợ đã gửi). "Sức khỏe CLB" + "cảnh báo" Maika do FE lấy sẵn từ
 *    /maika/health-score + /ai/maika/operational-alerts (không lặp ở đây).
 *  - Mít Đặc/Hermes/Notification có số thật đầy đủ từ AiAction/WorkflowRun/Notification.
 */
const MAIKA_EVENTS = [
  'daily_brief',
  'weekly_report',
  'anomaly_alert',
  'health_score_low',
];
const LISA_EVENTS = ['payment_reminder', 'inactivity_alert'];

@Injectable()
export class AgentResultsService {
  constructor(private prisma: PrismaService) {}

  private empty() {
    return {
      maika: { actionsToday: 0, briefsToday: 0, insightsToday: 0, recentInsights: [] as Array<{ type: string; title: string; createdAt: Date }> },
      lisa: { remindersToday: 0, answeredToday: 0 },
      hermes: {
        runsToday: 0,
        waitingApproval: 0,
        running: 0,
        completedToday: 0,
        failedToday: 0,
      },
      mitDac: {
        executedToday: 0,
        running: 0,
        failedToday: 0,
        averageExecutionMs: 0,
      },
      notification: {
        sentToday: 0,
        byChannel: { IN_APP: 0, EMAIL: 0, TELEGRAM: 0 },
        failedToday: 0,
      },
    };
  }

  async getResults(clubId: string) {
    if (!clubId) return this.empty();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      maikaActions,
      maikaBriefs,
      lisaReminders,
      hermesByStatus,
      execRunning,
      execExecutedToday,
      execFailedToday,
      execRows,
      notifSent,
      notifFailed,
      maikaInsightsToday,
      maikaRecentInsights,
      lisaAnsweredToday,
    ] = await Promise.all([
      this.prisma.aiAction.count({
        where: {
          clubId,
          requestedByAi: 'MAIKA',
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.notification.count({
        where: {
          clubId,
          eventType: { in: MAIKA_EVENTS },
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.notification.count({
        where: {
          clubId,
          eventType: { in: LISA_EVENTS },
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        where: { clubId, createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
      this.prisma.aiAction.count({ where: { clubId, status: 'EXECUTING' } }),
      this.prisma.aiAction.count({
        where: { clubId, status: 'EXECUTED', updatedAt: { gte: todayStart } },
      }),
      this.prisma.aiAction.count({
        where: { clubId, status: 'FAILED', updatedAt: { gte: todayStart } },
      }),
      this.prisma.aiAction.findMany({
        where: { clubId, status: 'EXECUTED', executionDuration: { not: null } },
        select: { executionDuration: true },
      }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        where: { clubId, status: 'SENT', createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
      this.prisma.notification.count({
        where: { clubId, status: 'FAILED', createdAt: { gte: todayStart } },
      }),
      // Phase 2: insight Maika + hội thoại Lisa (bảng mới).
      this.prisma.maikaInsight.count({
        where: { clubId, createdAt: { gte: todayStart } },
      }),
      this.prisma.maikaInsight.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { type: true, title: true, createdAt: true },
      }),
      this.prisma.lisaMessage.count({
        where: { clubId, createdAt: { gte: todayStart } },
      }),
    ]);

    const hermesCount = (s: string) =>
      hermesByStatus.find((x) => x.status === s)?._count._all ?? 0;
    const avgMs = execRows.length
      ? Math.round(
          execRows.reduce((a, r) => a + (r.executionDuration ?? 0), 0) /
            execRows.length,
        )
      : 0;
    const chan = (c: string) =>
      notifSent.find((x) => x.channel === c)?._count._all ?? 0;

    return {
      maika: {
        actionsToday: maikaActions,
        briefsToday: maikaBriefs,
        insightsToday: maikaInsightsToday,
        recentInsights: maikaRecentInsights,
      },
      lisa: { remindersToday: lisaReminders, answeredToday: lisaAnsweredToday },
      hermes: {
        runsToday: hermesByStatus.reduce((a, x) => a + x._count._all, 0),
        waitingApproval: hermesCount('WAITING_APPROVAL'),
        running: hermesCount('RUNNING'),
        completedToday: hermesCount('COMPLETED'),
        failedToday: hermesCount('FAILED'),
      },
      mitDac: {
        executedToday: execExecutedToday,
        running: execRunning,
        failedToday: execFailedToday,
        averageExecutionMs: avgMs,
      },
      notification: {
        sentToday: notifSent.reduce((a, x) => a + x._count._all, 0),
        byChannel: {
          IN_APP: chan('IN_APP'),
          EMAIL: chan('EMAIL'),
          TELEGRAM: chan('TELEGRAM'),
        },
        failedToday: notifFailed,
      },
    };
  }

  /** Danh sách insight Maika (đọc toàn văn) — Nhật ký AI. */
  async listMaikaInsights(clubId: string, limit = 50) {
    if (!clubId) return [];
    return this.prisma.maikaInsight.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        severity: true,
        score: true,
        createdAt: true,
      },
    });
  }

  /** Lịch sử hỏi–đáp của Lisa (kèm tên thành viên) — Nhật ký AI. */
  async listLisaMessages(clubId: string, limit = 50) {
    if (!clubId) return [];
    const rows = await this.prisma.lisaMessage.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      select: {
        id: true,
        memberId: true,
        question: true,
        answer: true,
        createdAt: true,
      },
    });
    const memberIds = [
      ...new Set(rows.map((r) => r.memberId).filter((m): m is string => !!m)),
    ];
    const members = memberIds.length
      ? await this.prisma.member.findMany({
          where: { clubId, id: { in: memberIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameMap = new Map(members.map((m) => [m.id, m.fullName]));
    return rows.map((r) => ({
      ...r,
      memberName: r.memberId ? (nameMap.get(r.memberId) ?? null) : null,
    }));
  }
}
