/**
 * OperationalAlertsService (V2.2 — Maika Insight) — READ-ONLY cảnh báo vận hành.
 *
 * Bổ sung cho OrganizationIntelligenceService (thuần Club Memory): sinh cảnh báo THẬT từ
 * dữ liệu sống — quỹ thấp/âm, công nợ, chuyên cần thấp.
 *
 * FINANCE ISOLATION: Maika KHÔNG tự tính tài chính. Mọi số liệu lấy TRỰC TIẾP từ Finance
 * Engine RC1 (FundPeriodsService.summary — nguồn chân lý). Ở đây chỉ ĐỌC + so ngưỡng để
 * gắn cờ cảnh báo (unpaidCount / lowAttendanceCount / balance đã được Finance Engine tính sẵn).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FundPeriodsService } from '../../fund-periods/fund-periods.service';
import type { IntelSignal } from './organization-intelligence.types';

@Injectable()
export class OperationalAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fundPeriods: FundPeriodsService,
  ) {}

  /** Cảnh báo vận hành cho kỳ quỹ đang mở (read-only). clubId scope tenant. */
  async analyze(clubId: string): Promise<IntelSignal[]> {
    if (!clubId) return [];

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active', type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    });

    if (!period) {
      return [
        {
          code: 'OPS_NO_ACTIVE_PERIOD',
          level: 'info',
          message:
            'Chưa có kỳ quỹ đang mở — chưa thể phân tích cảnh báo vận hành. Hãy mở một kỳ quỹ.',
        },
      ];
    }

    // Số liệu từ Finance Engine (đã tính sẵn) — Maika chỉ đọc, không tính lại.
    const s = await this.fundPeriods.summary(period.id, clubId);
    const balance = Number(s.balance);
    const miniBalance = Number(s.miniBalance);
    const unpaid = Number(s.unpaidCount) || 0;
    const lowAttendance = Number(s.lowAttendanceCount) || 0;

    const signals: IntelSignal[] = [];

    if (balance < 0) {
      signals.push({
        code: 'OPS_FUND_NEGATIVE',
        level: 'warning',
        message: `Quỹ Chính kỳ "${period.name}" đang ÂM. Cần rà soát thu/chi (số liệu từ Finance Engine).`,
      });
    }
    if (miniBalance < 0) {
      signals.push({
        code: 'OPS_MINI_FUND_NEGATIVE',
        level: 'warning',
        message: `Quỹ Phụ (Mini) kỳ "${period.name}" đang ÂM. Cần rà soát chi minigame.`,
      });
    }
    if (unpaid > 0) {
      signals.push({
        code: 'OPS_UNPAID_MEMBERS',
        level: 'attention',
        message: `Công nợ: ${unpaid} thành viên chưa hoàn tất đóng quỹ kỳ "${period.name}". Cân nhắc nhắc đóng (Hermes/Mít Đặc).`,
      });
    }
    if (lowAttendance > 0) {
      signals.push({
        code: 'OPS_LOW_ATTENDANCE',
        level: 'attention',
        message: `Chuyên cần thấp: ${lowAttendance} thành viên tham dự dưới 50% số buổi kỳ "${period.name}".`,
      });
    }

    if (signals.length === 0) {
      signals.push({
        code: 'OPS_HEALTHY',
        level: 'info',
        message: `Vận hành ổn định kỳ "${period.name}": quỹ không âm, không công nợ tồn đọng, chuyên cần đạt.`,
      });
    }

    return signals;
  }
}
