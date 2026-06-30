/**
 * PickleFundApiReferencePort (Sprint 3, Epic 3.1).
 *
 * Cổng tham chiếu read-only tới PickleFund API. CHỈ trả MÔ TẢ endpoint (method + path +
 * mục đích) — KHÔNG gọi API, KHÔNG trả số liệu, KHÔNG cache. Đây là điểm enforce
 * Finance Isolation: mọi số liệu tài chính phải lấy trực tiếp từ Finance Engine qua API,
 * Maika KHÔNG tự tính/suy luận/cache.
 */
import { Injectable } from '@nestjs/common';
import { IApiReferencePort } from './maika.interfaces';
import { ApiReference, MaikaIntent } from './maika.types';

const FINANCE_NOTE =
  'Số liệu lấy TRỰC TIẾP từ Finance Engine qua API. Maika KHÔNG tính/suy luận/cache.';

const FINANCE_REFS: ApiReference[] = [
  {
    category: 'finance',
    method: 'GET',
    endpoint: '/fund-periods/:id/summary',
    purpose: 'Số dư Quỹ Chính, Tổng tài sản, Số dư chuyển kỳ của kỳ',
    note: FINANCE_NOTE,
  },
  {
    category: 'finance',
    method: 'GET',
    endpoint: '/contributions/summary',
    purpose: 'Tổng thu quỹ (Quỹ Chính / Quỹ Phụ)',
    note: FINANCE_NOTE,
  },
  {
    category: 'finance',
    method: 'GET',
    endpoint: '/expenses/summary',
    purpose: 'Tổng chi phí (Quỹ Chính / Quỹ Phụ)',
    note: FINANCE_NOTE,
  },
];

@Injectable()
export class PickleFundApiReferencePort implements IApiReferencePort {
  referencesFor(intent: MaikaIntent, financeRelated: boolean): ApiReference[] {
    const refs: ApiReference[] = [];

    switch (intent) {
      case MaikaIntent.MEMBER_INSIGHT:
        refs.push({
          category: 'member',
          method: 'GET',
          endpoint: '/members',
          purpose: 'Danh sách & trạng thái thành viên',
          note: 'Dữ liệu thành viên lấy từ PickleFund API (read-only).',
        });
        break;
      case MaikaIntent.FUND_PERIOD_INSIGHT:
        refs.push({
          category: 'fund',
          method: 'GET',
          endpoint: '/fund-periods',
          purpose: 'Danh sách kỳ quỹ & trạng thái',
          note: 'Dữ liệu kỳ quỹ lấy từ PickleFund API (read-only).',
        });
        break;
      case MaikaIntent.TOURNAMENT_INSIGHT:
        refs.push({
          category: 'tournament',
          method: 'GET',
          endpoint: '/minigames',
          purpose: 'Danh sách giải đấu / minigame',
          note: 'Dữ liệu giải đấu lấy từ PickleFund API (read-only).',
        });
        break;
      default:
        break;
    }

    // Bất kỳ ý định nào liên quan tài chính → BẮT BUỘC tham chiếu finance API.
    if (financeRelated || intent === MaikaIntent.FINANCE_REFERENCE) {
      refs.push(...FINANCE_REFS);
    }

    return refs;
  }
}
