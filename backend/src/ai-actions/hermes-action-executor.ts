import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';
import type { ActionExecutor, ExecutableAction } from './action-executor';

/**
 * HermesActionExecutor — Execution Bridge THẬT cho Mít Đặc (Operations Executor).
 *
 * Thay NoOpExecutor: với action ĐÃ DUYỆT loại `workflow:DEBT_ESCALATION`, tạo sản phẩm
 * thật = fan-out thông báo IN_APP "nhắc đóng quỹ" tới các thành viên CHƯA đóng kỳ quỹ
 * đang mở (active) VÀ có tài khoản đăng nhập (Member.userId != null). Member chưa có
 * tài khoản → ghi nhận skipped (không nhận được in-app), báo trong kết quả thực thi.
 *
 * Ranh giới an toàn:
 * - CHỈ chạy trên action đã duyệt (do AiActionsService.execute gọi sau khi acquire EXECUTING).
 * - KHÔNG tính/kết luận/ghi tài chính: chỉ ĐỌC member + đóng quỹ để xác định người nhận.
 * - Fan-out qua NotificationRuntime (idempotent theo action + user) — không bypass hạ tầng.
 * - Action type chưa hỗ trợ → no-op (giữ nguyên hành vi cũ, tài liệu hoá rõ).
 */
@Injectable()
export class HermesActionExecutor implements ActionExecutor {
  private readonly logger = new Logger(HermesActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationRuntimeService,
  ) {}

  execute(action: ExecutableAction): Promise<Record<string, unknown>> {
    if (action.actionType === 'workflow:DEBT_ESCALATION') {
      return this.executeDebtEscalation(action);
    }
    // Loại action khác: chưa có executor thật → no-op (không giả lập kết quả).
    return Promise.resolve({
      ok: true,
      mode: 'no-op',
      executor: 'MIT_DAT',
      message: `Bridge no-op: chưa hỗ trợ executor thật cho '${action.actionType}'.`,
    });
  }

  /**
   * DEBT_ESCALATION → gửi thông báo IN_APP nhắc đóng quỹ tới thành viên chưa đóng
   * kỳ active có tài khoản. Idempotent per-user theo AI_ACTION:<id>:USER:<userId>.
   */
  private async executeDebtEscalation(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    // Kỳ quỹ đang mở (giống buildLiveContext để nhất quán số liệu với dashboard/workflow).
    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    });
    if (!period) {
      return {
        ok: true,
        mode: 'live',
        executor: 'MIT_DAT',
        message: 'Không có kỳ quỹ đang mở — không có thành viên nào để nhắc.',
      };
    }

    const [members, paidRows] = await Promise.all([
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false },
        select: { id: true, userId: true },
      }),
      this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: period.id,
          fundSource: 'COMMON',
          isConfirmed: true,
          memberId: { not: null },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
    ]);

    const paid = new Set(paidRows.map((r) => r.memberId));
    const unpaid = members.filter((m) => !paid.has(m.id));
    const recipients = unpaid.filter(
      (m): m is { id: string; userId: string } => !!m.userId,
    );
    const skippedNoAccount = unpaid.length - recipients.length;

    const title = action.title || 'Nhắc đóng quỹ';
    const body =
      action.summary ||
      `Bạn chưa hoàn tất đóng quỹ kỳ "${period.name}". Vui lòng đóng quỹ sớm nhé.`;

    let notified = 0;
    for (const m of recipients) {
      const job = (await this.notifications.dispatch(clubId, {
        channel: 'IN_APP',
        targetType: 'USER',
        targetId: m.userId,
        title,
        bodySummary: body,
        idempotencyKey: `AI_ACTION:${action.id}:USER:${m.userId}`,
        aiActionId: action.id,
      })) as { status?: string; duplicate?: boolean } | null;
      // READY (không phải duplicate) = vừa tạo record in-app mới cho member.
      if (job && job.status === 'READY' && !job.duplicate) notified++;
    }

    this.logger.log(
      `DEBT_ESCALATION ${action.id}: notified=${notified}/${unpaid.length} skippedNoAccount=${skippedNoAccount}`,
    );

    return {
      ok: true,
      mode: 'live',
      executor: 'MIT_DAT',
      // Số liệu nhét vào message vì sanitizeExecutionResult chỉ whitelist ok/mode/message/...
      message: `Nhắc nợ IN_APP kỳ "${period.name}": đã gửi ${notified}/${unpaid.length} thành viên chưa đóng (${skippedNoAccount} chưa có tài khoản).`,
    };
  }
}
