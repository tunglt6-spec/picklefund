import { Injectable, Logger } from '@nestjs/common';
import { HermesWorkflowService } from './hermes-workflow.service';

/** Domain event nội bộ do business module phát sau khi transaction thành công. */
export interface BusinessEvent {
  clubId: string | null;
  /** userId thật (FK User) — thường là createdById của entity hoặc actor từ JWT. */
  userId: string;
  triggerType: string;
  context?: Record<string, unknown>;
  /** Key deterministic theo entity (vd `EXPENSE_RECORDED:<id>`) — dispatch trùng bị skip. */
  idempotencyKey?: string;
}

/**
 * Business Event Publisher (Epic 7) — cầu nối 1 chiều business → Hermes Runtime.
 * KHÔNG phải message broker; chỉ là in-process fire-and-forget tới dispatchTrigger.
 *
 * Hợp đồng an toàn với business module:
 * - KHÔNG BAO GIỜ throw: business transaction đã commit trước khi publish;
 *   lỗi dispatch chỉ được log (Nest Logger), không rollback, không nổi lên caller.
 * - Non-blocking: không await kết quả dispatch — caller trả response ngay.
 * - Idempotent: idempotencyKey theo entity → Hermes skip dispatch trùng
 *   (guard service-level + unique index từ Epic 6).
 * - Tenant-safe: clubId của entity đi thẳng vào dispatchTrigger (scope mọi query).
 */
@Injectable()
export class HermesEventPublisher {
  private readonly logger = new Logger(HermesEventPublisher.name);

  constructor(private readonly hermes: HermesWorkflowService) {}

  publish(event: BusinessEvent): void {
    try {
      const { clubId, userId, triggerType, context, idempotencyKey } = event;
      if (!clubId || !userId) return; // thiếu tenant/actor → bỏ qua an toàn
      this.hermes
        .dispatchTrigger(
          clubId,
          triggerType,
          { userId, clubId },
          context,
          idempotencyKey,
        )
        .then((s) => {
          if (s.createdRuns > 0 || s.skippedDuplicate) {
            this.logger.log(
              `Event ${triggerType}: runs=${s.createdRuns} matched=${s.matchedRules} actions=${s.createdActions} dup=${s.skippedDuplicate}`,
            );
          }
        })
        .catch((e: unknown) => {
          const detail =
            e instanceof Error ? (e.stack ?? e.message) : String(e);
          this.logger.error(
            `Hermes dispatch thất bại (${triggerType}) — business transaction vẫn giữ nguyên: ${detail}`,
          );
        });
    } catch (e) {
      // Phòng thủ tuyệt đối: publish không được phép ném lỗi về business caller.
      const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
      this.logger.error(`Publish event lỗi đồng bộ (bỏ qua): ${detail}`);
    }
  }
}
