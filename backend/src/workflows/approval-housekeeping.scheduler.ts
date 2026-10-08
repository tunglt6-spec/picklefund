import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiActionsService } from '../ai-actions/ai-actions.service';
import { HermesWorkflowService } from './hermes-workflow.service';

/**
 * Dọn việc chờ duyệt quá hạn THEO LỊCH (mỗi giờ). Trước đây hết hạn chỉ chạy "lazy" khi ai đó mở
 * màn Approval/Workflow → CLB không ai mở thì đề xuất quá TTL (7 ngày) treo mãi ở PENDING_APPROVAL
 * và làm phồng "Hàng đợi việc" trên Command Center. Dùng đúng logic sẵn có (không đổi nghiệp vụ).
 */
@Injectable()
export class ApprovalHousekeepingScheduler {
  private readonly logger = new Logger(ApprovalHousekeepingScheduler.name);

  constructor(
    private prisma: PrismaService,
    private actions: AiActionsService,
    private workflows: HermesWorkflowService,
  ) {}

  @Cron('15 * * * *', { name: 'approval_housekeeping' })
  async run(): Promise<{ clubs: number }> {
    const [a, w] = await Promise.all([
      this.prisma.aiAction.findMany({ where: { status: 'PENDING_APPROVAL' }, select: { clubId: true }, distinct: ['clubId'] }),
      this.prisma.workflowRun.findMany({ where: { status: 'WAITING_APPROVAL' as never }, select: { clubId: true }, distinct: ['clubId'] }),
    ]);
    const clubIds = [...new Set([...a, ...w].map((x) => x.clubId))];
    for (const clubId of clubIds) {
      try {
        await this.actions.expireStale(clubId);
        await this.workflows.resolveStaleApprovalRuns(clubId);
      } catch (err) {
        this.logger.warn(`housekeeping club ${clubId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (clubIds.length) this.logger.log(`Approval housekeeping: ${clubIds.length} CLB`);
    return { clubs: clubIds.length };
  }
}
