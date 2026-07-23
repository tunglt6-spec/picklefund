import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AgentResultsService } from './agent-results.service';

/**
 * OperationsRuntimeService — nguồn dữ liệu RUNTIME THẬT cho AI Operations Center (AIDO).
 *
 * MỘT endpoint tổng hợp (/aido/operations/runtime-summary) trả:
 *   - overview: 9 KPI vận hành (rule bật/tắt, runs, AI action, chờ duyệt, thành công, lỗi,
 *     bỏ qua trùng, chặn cooldown).
 *   - modules: số liệu runtime nhúng vào từng card khu vực vận hành.
 *   - agents: khối lượng công việc thật của từng agent.
 *
 * NGUYÊN TẮC:
 *   - CHỈ đọc DB thật (Prisma) + tái dùng AgentResultsService (đã có trong AidoModule).
 *     KHÔNG bịa, KHÔNG mock, KHÔNG random, KHÔNG số demo.
 *   - Tenant: MỌI truy vấn scope theo clubId (từ JWT, KHÔNG tin frontend).
 *   - Tránh circular DI: AidoModule KHÔNG import AiModule/WorkflowsModule/MaikaModule
 *     (sẽ tạo vòng qua AiActionsModule → AidoModule). Do đó 3 card Alert/Data/KPI Monitor
 *     tái dùng endpoint sẵn có ở frontend (operational-alerts, data-quality, health-score) —
 *     KHÔNG gọi chéo service ở đây.
 *   - Định nghĩa CANONICAL (thống nhất BE↔UI):
 *       · "Thành công hôm nay"  = WorkflowRun COMPLETED tạo trong ngày.
 *       · "Lỗi hôm nay"         = WorkflowRun FAILED tạo trong ngày.
 *       · "Runs hôm nay"        = MỌI WorkflowRun tạo trong ngày (mọi trạng thái).
 *       · "Bỏ qua trùng/cooldown" = tổng resultJson.skippedDuplicateCount/skippedCooldownCount
 *         của các run trong ngày (Hermes ghi khi AiAction bị dedup/cooldown).
 *   - Mốc ngày: nửa đêm giờ máy chủ (đồng nhất với AgentResultsService/AiActions.summary).
 */

export interface RuntimeOverview {
  activeRules: number;
  inactiveRules: number;
  runsToday: number;
  aiActionsCreatedToday: number;
  pendingApprovals: number;
  successfulToday: number;
  failedToday: number;
  duplicateSkippedToday: number;
  cooldownBlockedToday: number;
}

export interface RuntimeModules {
  hermes: {
    workflowToday: number;
    running: number;
    waitingApproval: number;
    completedToday: number;
    failedToday: number;
  };
  workflowStudio: {
    totalRules: number;
    activeRules: number;
    manualRules: number;
    disabledRules: number;
    runsToday: number;
    health: 'ok' | 'warn';
  };
  approvalCenter: {
    totalToday: number;
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    expiredToday: number;
  };
  notificationCenter: {
    sentToday: number;
    inApp: number;
    email: number;
    telegram: number;
    failedToday: number;
  };
  scheduler: {
    daily: number;
    weekly: number;
    monthly: number;
    manual: number;
    autoEnabled: boolean;
  };
  clubMemory: {
    total: number;
    byType: { type: string; count: number }[];
  };
  auditLogs: {
    total: number;
    byAction: { name: string; count: number }[];
  };
}

export interface RuntimeAgents {
  maika: { analyses: number; briefs: number; recommendations: number };
  lisa: { support: number; answered: number };
  hermes: { workflow: number; approval: number; completed: number };
  mitDac: { executed: number; errors: number; avgMs: number };
  notification: { sent: number; errors: number; successRate: number };
}

export interface RuntimeSummary {
  generatedAt: string;
  timezone: string;
  overview: RuntimeOverview;
  modules: RuntimeModules;
  agents: RuntimeAgents;
}

/** Hình dạng resultJson mà Hermes ghi cho mỗi WorkflowRun (đọc an toàn, thiếu → 0). */
interface RunResult {
  status: string;
  resultJson: unknown;
}

@Injectable()
export class OperationsRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentResults: AgentResultsService,
    private readonly config: ConfigService,
  ) {}

  private emptySummary(generatedAt: string, timezone: string): RuntimeSummary {
    return {
      generatedAt,
      timezone,
      overview: {
        activeRules: 0,
        inactiveRules: 0,
        runsToday: 0,
        aiActionsCreatedToday: 0,
        pendingApprovals: 0,
        successfulToday: 0,
        failedToday: 0,
        duplicateSkippedToday: 0,
        cooldownBlockedToday: 0,
      },
      modules: {
        hermes: {
          workflowToday: 0,
          running: 0,
          waitingApproval: 0,
          completedToday: 0,
          failedToday: 0,
        },
        workflowStudio: {
          totalRules: 0,
          activeRules: 0,
          manualRules: 0,
          disabledRules: 0,
          runsToday: 0,
          health: 'ok',
        },
        approvalCenter: {
          totalToday: 0,
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          expiredToday: 0,
        },
        notificationCenter: {
          sentToday: 0,
          inApp: 0,
          email: 0,
          telegram: 0,
          failedToday: 0,
        },
        scheduler: {
          daily: 0,
          weekly: 0,
          monthly: 0,
          manual: 0,
          autoEnabled: false,
        },
        clubMemory: { total: 0, byType: [] },
        auditLogs: { total: 0, byAction: [] },
      },
      agents: {
        maika: { analyses: 0, briefs: 0, recommendations: 0 },
        lisa: { support: 0, answered: 0 },
        hermes: { workflow: 0, approval: 0, completed: 0 },
        mitDac: { executed: 0, errors: 0, avgMs: 0 },
        notification: { sent: 0, errors: 0, successRate: 0 },
      },
    };
  }

  async getRuntimeSummary(clubId: string): Promise<RuntimeSummary> {
    const generatedAt = new Date().toISOString();
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    if (!clubId) return this.emptySummary(generatedAt, timezone);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      rulesByEnabledSchedule,
      runsToday,
      actionsCreatedTodayByStatus,
      pendingApprovals,
      clubMemoryByType,
      auditLogsToday,
      agentResults,
    ] = await Promise.all([
      // Rule của CLB theo (enabled, scheduleType) — 1 groupBy phục vụ overview + Workflow Studio + Scheduler.
      this.prisma.workflowRule.groupBy({
        by: ['enabled', 'scheduleType'],
        where: { clubId },
        _count: { _all: true },
      }),
      // MỌI run tạo trong ngày (kèm resultJson để cộng dedup/cooldown) — scope clubId.
      this.prisma.workflowRun.findMany({
        where: { clubId, createdAt: { gte: todayStart } },
        select: { status: true, resultJson: true },
      }),
      // AI Action TẠO trong ngày, gom theo trạng thái hiện tại → Approval Center + overview.
      this.prisma.aiAction.groupBy({
        by: ['status'],
        where: { clubId, createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
      // Hàng chờ duyệt HIỆN TẠI (mọi thời điểm, chưa xử lý) — overview #5.
      this.prisma.aiAction.count({
        where: { clubId, status: 'PENDING_APPROVAL' },
      }),
      this.prisma.clubMemory.groupBy({
        by: ['type'],
        where: { clubId },
        _count: { _all: true },
      }),
      // Audit log CỦA CLB trong ngày (loại log hệ thống clubId=null) → tổng + top action.
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { clubId, createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
      // Tái dùng: kết quả công việc thật của từng agent (đã scope clubId).
      this.agentResults.getResults(clubId),
    ]);

    // ── Rule counts ──
    let activeRules = 0;
    let inactiveRules = 0;
    let manualRules = 0;
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    let manualScheduled = 0;
    for (const g of rulesByEnabledSchedule) {
      const n = g._count._all;
      if (g.enabled) {
        activeRules += n;
        // Lịch của các rule ĐANG BẬT (những rule sẽ thực sự chạy).
        switch (g.scheduleType) {
          case 'DAILY':
            daily += n;
            break;
          case 'WEEKLY':
            weekly += n;
            break;
          case 'MONTHLY':
            monthly += n;
            break;
          default:
            manualScheduled += n; // MANUAL (chạy thủ công)
        }
      } else {
        inactiveRules += n;
      }
    }
    manualRules = manualScheduled;
    const totalRules = activeRules + inactiveRules;

    // ── Runs today ──
    const runs = runsToday as RunResult[];
    let successfulToday = 0;
    let failedToday = 0;
    let duplicateSkippedToday = 0;
    let cooldownBlockedToday = 0;
    for (const r of runs) {
      if (r.status === 'COMPLETED') successfulToday += 1;
      else if (r.status === 'FAILED') failedToday += 1;
      const rj = (r.resultJson ?? {}) as {
        skippedDuplicateCount?: number;
        skippedCooldownCount?: number;
      };
      duplicateSkippedToday += Number(rj.skippedDuplicateCount) || 0;
      cooldownBlockedToday += Number(rj.skippedCooldownCount) || 0;
    }
    const runsTodayCount = runs.length;

    // ── AI Action today (breakdown theo trạng thái hiện tại) ──
    const actionCountOf = (s: string) =>
      actionsCreatedTodayByStatus.find((x) => x.status === s)?._count._all ?? 0;
    const aiActionsCreatedToday = actionsCreatedTodayByStatus.reduce(
      (sum, x) => sum + x._count._all,
      0,
    );

    // ── Club Memory ──
    const clubMemoryByTypeArr = clubMemoryByType.map((x) => ({
      type: String(x.type),
      count: x._count._all,
    }));
    const clubMemoryTotal = clubMemoryByTypeArr.reduce(
      (s, x) => s + x.count,
      0,
    );

    // ── Audit logs ──
    const auditByAction = auditLogsToday
      .map((x) => ({ name: String(x.action), count: x._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const auditTotal = auditLogsToday.reduce((s, x) => s + x._count._all, 0);

    const ar = agentResults;
    const notifSent = ar.notification.sentToday;
    const notifFailed = ar.notification.failedToday;
    const notifAttempted = notifSent + notifFailed;
    const notifSuccessRate =
      notifAttempted > 0 ? Math.round((notifSent / notifAttempted) * 100) : 0;

    return {
      generatedAt,
      timezone,
      overview: {
        activeRules,
        inactiveRules,
        runsToday: runsTodayCount,
        aiActionsCreatedToday,
        pendingApprovals,
        successfulToday,
        failedToday,
        duplicateSkippedToday,
        cooldownBlockedToday,
      },
      modules: {
        hermes: {
          workflowToday: ar.hermes.runsToday,
          running: ar.hermes.running,
          waitingApproval: ar.hermes.waitingApproval,
          completedToday: ar.hermes.completedToday,
          failedToday: ar.hermes.failedToday,
        },
        workflowStudio: {
          totalRules,
          activeRules,
          manualRules,
          disabledRules: inactiveRules,
          runsToday: runsTodayCount,
          health: failedToday > 0 ? 'warn' : 'ok',
        },
        approvalCenter: {
          totalToday: aiActionsCreatedToday,
          // Của các action TẠO HÔM NAY: đang chờ / đã duyệt / từ chối / hết hạn (tổng = totalToday).
          pending: actionCountOf('PENDING_APPROVAL'),
          approvedToday: actionCountOf('APPROVED'),
          rejectedToday: actionCountOf('REJECTED'),
          expiredToday: actionCountOf('EXPIRED'),
        },
        notificationCenter: {
          sentToday: ar.notification.sentToday,
          inApp: ar.notification.byChannel.IN_APP,
          email: ar.notification.byChannel.EMAIL,
          telegram: ar.notification.byChannel.TELEGRAM,
          failedToday: ar.notification.failedToday,
        },
        scheduler: {
          daily,
          weekly,
          monthly,
          manual: manualRules,
          autoEnabled:
            this.config.get<string>('HERMES_SCHEDULER_ENABLED') === 'true',
        },
        clubMemory: { total: clubMemoryTotal, byType: clubMemoryByTypeArr },
        auditLogs: { total: auditTotal, byAction: auditByAction },
      },
      agents: {
        maika: {
          analyses: ar.maika.insightsToday,
          briefs: ar.maika.briefsToday,
          recommendations: ar.maika.actionsToday,
        },
        lisa: { support: ar.lisa.remindersToday, answered: ar.lisa.answeredToday },
        hermes: {
          workflow: ar.hermes.runsToday,
          approval: ar.hermes.waitingApproval,
          completed: ar.hermes.completedToday,
        },
        mitDac: {
          executed: ar.mitDac.executedToday,
          errors: ar.mitDac.failedToday,
          avgMs: ar.mitDac.averageExecutionMs,
        },
        notification: {
          sent: notifSent,
          errors: notifFailed,
          successRate: notifSuccessRate,
        },
      },
    };
  }
}
