/**
 * IntentRouter (Sprint 3, Epic 3.1) — phân loại ý định DETERMINISTIC (keyword-based).
 * KHÔNG LLM, KHÔNG external, KHÔNG embedding. Đầu vào là text thô; phát hiện
 * finance-related để Maika BẮT BUỘC reference PickleFund API thay vì tự suy luận.
 */
import { Injectable } from '@nestjs/common';
import { IIntentRouter } from './maika.interfaces';
import { IntentClassification, MaikaIntent } from './maika.types';

/** Từ khoá tài chính — nếu khớp → financeRelated = true (vi + en). */
const FINANCE_KEYWORDS = [
  'tài chính',
  'số dư',
  'quỹ',
  'đóng quỹ',
  'thu quỹ',
  'chi phí',
  'công nợ',
  'doanh thu',
  'tổng tài sản',
  'chuyển kỳ',
  'phiếu thu',
  'báo cáo tài chính',
  'tiền',
  'balance',
  'fund',
  'contribution',
  'expense',
  'receipt',
  'revenue',
  'asset',
];

/** Bản đồ intent → keyword (deterministic, ưu tiên theo số keyword khớp). */
const INTENT_KEYWORDS: { intent: MaikaIntent; keywords: string[] }[] = [
  {
    intent: MaikaIntent.MEMBER_INSIGHT,
    keywords: [
      'thành viên',
      'hội viên',
      'member',
      'người chơi',
      'vận động viên',
    ],
  },
  {
    intent: MaikaIntent.FUND_PERIOD_INSIGHT,
    keywords: ['kỳ quỹ', 'kỳ', 'fund period', 'period', 'đợt'],
  },
  {
    intent: MaikaIntent.TOURNAMENT_INSIGHT,
    keywords: ['giải đấu', 'giải', 'tournament', 'thi đấu', 'trận'],
  },
  {
    intent: MaikaIntent.WORKFLOW_INSIGHT,
    keywords: ['quy trình', 'workflow', 'luồng', 'các bước', 'process'],
  },
  {
    intent: MaikaIntent.HISTORY_LOOKUP,
    keywords: ['lịch sử', 'trước đây', 'history', 'quá khứ', 'đã từng'],
  },
  {
    intent: MaikaIntent.ORGANIZATION_OVERVIEW,
    keywords: [
      'tổ chức',
      'tổng quan',
      'clb',
      'câu lạc bộ',
      'organization',
      'overview',
    ],
  },
];

@Injectable()
export class IntentRouter implements IIntentRouter {
  classify(query: string): IntentClassification {
    const q = (query ?? '').toLowerCase().trim();

    const financeMatches = FINANCE_KEYWORDS.filter((k) => q.includes(k));
    const financeRelated = financeMatches.length > 0;

    // Đếm keyword khớp cho từng intent.
    let best: { intent: MaikaIntent; matched: string[] } = {
      intent: MaikaIntent.UNKNOWN,
      matched: [],
    };
    for (const entry of INTENT_KEYWORDS) {
      const matched = entry.keywords.filter((k) => q.includes(k));
      if (matched.length > best.matched.length) {
        best = { intent: entry.intent, matched };
      }
    }

    // Finance ưu tiên cao nhất nếu không có intent cụ thể nào mạnh hơn.
    if (financeRelated && best.matched.length === 0) {
      return {
        intent: MaikaIntent.FINANCE_REFERENCE,
        confidence: this.score(financeMatches.length),
        financeRelated: true,
        matchedKeywords: financeMatches,
        rationale:
          'Câu hỏi liên quan tài chính — Maika sẽ tham chiếu PickleFund API, KHÔNG tự tính/suy luận số liệu.',
      };
    }

    if (best.intent === MaikaIntent.UNKNOWN) {
      return {
        intent: MaikaIntent.UNKNOWN,
        confidence: 0,
        financeRelated,
        matchedKeywords: financeMatches,
        rationale:
          'Không khớp ý định cụ thể — trả về tổng quan an toàn (read-only).',
      };
    }

    return {
      intent: best.intent,
      confidence: this.score(best.matched.length),
      financeRelated,
      matchedKeywords: [...best.matched, ...financeMatches],
      rationale: financeRelated
        ? `Ý định ${best.intent}; có yếu tố tài chính → bổ sung tham chiếu PickleFund API.`
        : `Ý định ${best.intent} (deterministic keyword match).`,
    };
  }

  /** Quy đổi số keyword khớp → confidence 0..1 (bão hoà ở 3 keyword). */
  private score(matchCount: number): number {
    if (matchCount <= 0) return 0;
    return Math.min(1, Number((matchCount / 3).toFixed(2)));
  }
}
