import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AgentActivityService } from '../aido/agent-activity.service';
import {
  HermesWorkflowService,
  type DispatchSummary,
} from './hermes-workflow.service';

/** Lịch hỗ trợ — MANUAL không bao giờ được scheduler tự dispatch. */
export const SCHEDULE_TYPES = ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
const AUTO_TYPES: ScheduleType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

/** Khóa lưu bền trạng thái BẬT/TẮT timer (UI toggle) — giữ qua restart/deploy. */
const SCHEDULER_SETTING_KEY = 'HERMES_SCHEDULER_ENABLED';

export interface TickSummary {
  tickedAt: string;
  groups: number;
  dispatched: number;
  skippedDuplicate: number;
  failedGroups: number;
}

/**
 * Hermes Scheduler Runtime (Epic 9) — hạ tầng thuần, KHÔNG business logic.
 *
 * - Timer nội bộ (setInterval, không cron ngoài/không broker/không dependency mới),
 *   BẬT qua env HERMES_SCHEDULER_ENABLED=true — mặc định TẮT (an toàn dev/test,
 *   không dispatch nhầm). run-now thủ công vẫn hoạt động khi timer tắt.
 * - Mỗi tick: gom rule enabled có scheduleType DAILY/WEEKLY/MONTHLY theo
 *   (clubId, triggerType, scheduleType) → gọi HermesWorkflowService.dispatchTrigger
 *   với idempotencyKey theo KỲ (`SCHED:<trigger>:<type>:<periodKey>`) — engine
 *   Epic 6 chặn dispatch trùng trong cùng kỳ (guard + unique index). KHÔNG lặp lại
 *   logic workflow, KHÔNG thực thi business trực tiếp (action vẫn qua Action Center).
 * - Partial failure: 1 nhóm lỗi → log + đếm, các nhóm khác vẫn chạy.
 * - Tenant: mỗi dispatch scope đúng clubId của rule; run-now chỉ chạy club từ JWT.
 */
@Injectable()
export class HermesSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HermesSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  // enabled RUNTIME-mutable: bật/tắt qua UI (setEnabled) + lưu bền SystemSetting. env chỉ là
  // mặc định khi CHƯA có bản ghi đã lưu.
  private enabled: boolean;
  private readonly envDefault: boolean;
  private readonly intervalMs = 60_000;
  private lastTick: TickSummary | null = null;

  constructor(
    private prisma: PrismaService,
    private hermes: HermesWorkflowService,
    private activity: AgentActivityService,
    config: ConfigService,
  ) {
    this.envDefault = config.get<string>('HERMES_SCHEDULER_ENABLED') === 'true';
    this.enabled = this.envDefault;
  }

  async onModuleInit() {
    // Trạng thái đã lưu (UI toggle) ĐÈ lên env default; lỗi đọc → giữ env default (an toàn).
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key: SCHEDULER_SETTING_KEY },
      });
      if (row) this.enabled = row.value === 'true';
    } catch (e) {
      this.logSafe('load scheduler setting', e);
    }
    if (this.enabled) this.startTimer();
    else this.logger.log('Scheduler TẮT — chỉ run-now thủ công.');
  }

  onModuleDestroy() {
    this.stopTimer();
  }

  private startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((e: unknown) => this.logSafe('tick', e));
    }, this.intervalMs);
    // KHÔNG để riêng timer giữ tiến trình sống (HTTP server đã giữ) — tránh chặn thoát/test teardown.
    this.timer.unref?.();
    this.logger.log(`Scheduler BẬT — tick mỗi ${this.intervalMs / 1000}s.`);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Bật/tắt timer lúc chạy (UI) + LƯU BỀN vào SystemSetting → giữ nguyên qua restart/deploy.
   * Đây là CÔNG TẮC HỆ THỐNG (global): timer bật sẽ quét rule định kỳ của MỌI CLB.
   */
  async setEnabled(on: boolean): Promise<{ enabled: boolean }> {
    this.enabled = on;
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: SCHEDULER_SETTING_KEY },
        update: { value: String(on) },
        create: { key: SCHEDULER_SETTING_KEY, value: String(on) },
      });
    } catch (e) {
      this.logSafe('persist scheduler setting', e);
    }
    if (on) this.startTimer();
    else this.stopTimer();
    this.logger.log(`Scheduler ${on ? 'BẬT' : 'TẮT'} qua UI (đã lưu bền).`);
    return { enabled: this.enabled };
  }

  // ---------- Period keys (chống dispatch trùng trong cùng kỳ) ----------
  /** DAILY: YYYY-MM-DD · WEEKLY: YYYY-Www (ISO) · MONTHLY: YYYY-MM. */
  periodKey(scheduleType: ScheduleType, now: Date = new Date()): string {
    if (scheduleType === 'WEEKLY') return this.isoWeek(now);
    if (scheduleType === 'MONTHLY') return now.toISOString().slice(0, 7);
    return now.toISOString().slice(0, 10); // DAILY
  }

  private isoWeek(d: Date): string {
    const date = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
    );
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  // ---------- Tick (toàn hệ thống, mỗi dispatch scope theo club) ----------
  async tick(now: Date = new Date()): Promise<TickSummary> {
    const rules = await this.prisma.workflowRule.findMany({
      where: { enabled: true, scheduleType: { in: AUTO_TYPES } },
      select: {
        id: true,
        clubId: true,
        triggerType: true,
        scheduleType: true,
        createdById: true,
      },
    });

    // Gom theo (clubId, triggerType, scheduleType) — dispatchTrigger đánh giá
    // TẤT CẢ rule enabled của trigger đó trong club (ngữ nghĩa event, Epic 7).
    const groups = new Map<
      string,
      {
        clubId: string;
        triggerType: string;
        scheduleType: ScheduleType;
        actorUserId: string | null;
      }
    >();
    for (const r of rules) {
      const gk = `${r.clubId}|${r.triggerType}|${r.scheduleType}`;
      if (!groups.has(gk)) {
        groups.set(gk, {
          clubId: r.clubId,
          triggerType: r.triggerType,
          scheduleType: r.scheduleType as ScheduleType,
          actorUserId: r.createdById,
        });
      }
    }

    const summary: TickSummary = {
      tickedAt: now.toISOString(),
      groups: groups.size,
      dispatched: 0,
      skippedDuplicate: 0,
      failedGroups: 0,
    };

    for (const g of groups.values()) {
      if (!g.actorUserId) continue; // không có actor hợp lệ → bỏ qua an toàn
      const actorUserId = g.actorUserId; // giữ narrowing trong closure track()
      const key = `SCHED:${g.triggerType}:${g.scheduleType}:${this.periodKey(g.scheduleType, now)}`;
      try {
        // Dựng NGỮ CẢNH DỮ LIỆU THẬT cho scheduled dispatch (giống đường "Chạy dữ liệu thật")
        // → rule scheduled (vd WEEKLY_CLUB_HEALTH_REPORT) khớp điều kiện thực tế, không dùng
        // context tĩnh. Lỗi build context KHÔNG chặn tick — fallback context tối thiểu.
        let liveCtx: Record<string, unknown> = {};
        try {
          liveCtx = await this.hermes.buildLiveContext(g.clubId, g.triggerType);
        } catch (ctxErr) {
          this.logSafe(`buildLiveContext ${g.triggerType}@${g.clubId}`, ctxErr);
        }
        // POLISH-001: lọc đúng scheduleType — rule MANUAL cùng triggerType KHÔNG tự chạy.
        // Đánh dấu Hermes 'busy' đúng lúc tick nền dispatch (hoạt động nền THẬT → AIDO thấy).
        const s: DispatchSummary = await this.activity.track(
          g.clubId,
          'HERMES',
          'Đang quét lịch tự động',
          () =>
            this.hermes.dispatchTrigger(
              g.clubId,
              g.triggerType,
              { userId: actorUserId, clubId: g.clubId },
              { ...liveCtx, scheduled: true, scheduleType: g.scheduleType },
              key,
              { scheduleType: g.scheduleType },
            ),
        );
        if (s.skippedDuplicate) summary.skippedDuplicate += 1;
        else summary.dispatched += 1;
      } catch (e) {
        // 1 nhóm lỗi KHÔNG dừng các nhóm khác.
        summary.failedGroups += 1;
        this.logSafe(`dispatch ${g.triggerType}@${g.clubId}`, e);
      }
    }

    this.lastTick = summary;
    if (summary.groups > 0) {
      this.logger.log(
        `Tick: groups=${summary.groups} dispatched=${summary.dispatched} dup=${summary.skippedDuplicate} failed=${summary.failedGroups}`,
      );
    }
    return summary;
  }

  // ---------- Admin APIs (backend-only) ----------
  status() {
    return {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      supportedScheduleTypes: SCHEDULE_TYPES,
      lastTick: this.lastTick,
    };
  }

  /** Run gần đây do scheduler dispatch (idempotencyKey prefix SCHED:) — đã sanitize. */
  async history(clubId: string | null) {
    const runs = (await this.hermes.listRuns(clubId, {})) as Array<
      Record<string, unknown>
    >;
    return runs.filter(
      (r) =>
        typeof r.idempotencyKey === 'string' &&
        r.idempotencyKey.startsWith('SCHED:'),
    );
  }

  /**
   * run-now: dispatch thủ công các nhóm scheduled của CLB actor (tenant-scoped).
   * Dùng cùng period key → idempotent: kỳ này đã chạy thì trả skippedDuplicate,
   * KHÔNG tạo run trùng.
   */
  async runNow(clubId: string | null, actorUserId: string) {
    const rules = await this.prisma.workflowRule.findMany({
      where: {
        clubId: clubId ?? '__none__',
        enabled: true,
        scheduleType: { in: AUTO_TYPES },
      },
      select: { clubId: true, triggerType: true, scheduleType: true },
    });
    const seen = new Set<string>();
    const results: DispatchSummary[] = [];
    let failed = 0;
    for (const r of rules) {
      const gk = `${r.triggerType}|${r.scheduleType}`;
      if (seen.has(gk)) continue;
      seen.add(gk);
      const st = r.scheduleType as ScheduleType;
      const key = `SCHED:${r.triggerType}:${st}:${this.periodKey(st)}`;
      try {
        // POLISH-001: run-now cũng lọc scheduleType — không đánh giá rule MANUAL.
        results.push(
          await this.hermes.dispatchTrigger(
            r.clubId,
            r.triggerType,
            { userId: actorUserId, clubId: r.clubId },
            { scheduled: true, scheduleType: st, manualRunNow: true },
            key,
            { scheduleType: st },
          ),
        );
      } catch (e) {
        failed += 1;
        this.logSafe(`run-now ${r.triggerType}`, e);
      }
    }
    return { groups: seen.size, failed, results };
  }

  /** Log chi tiết server-side; không bao giờ đẩy raw error ra ngoài. */
  private logSafe(ctx: string, e: unknown): void {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    this.logger.error(`Scheduler lỗi (${ctx}): ${detail}`);
  }
}
