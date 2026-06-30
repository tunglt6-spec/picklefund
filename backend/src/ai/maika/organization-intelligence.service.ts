/**
 * OrganizationIntelligenceService (Sprint 3, Epic 3.2) — READ-ONLY.
 *
 * Nâng Maika từ "hiểu ngữ cảnh" → "hiểu cấu trúc tổ chức & trạng thái vận hành".
 * Composition trên Epic 3.1: nguồn duy nhất là OrganizationContext (ĐÃ sanitize
 * PII/finance ở OrganizationContextManager). KHÔNG đọc raw, KHÔNG gọi business API,
 * KHÔNG tính/kết luận tài chính, KHÔNG action/write/workflow.
 *
 * Output: summary · entities · healthSignals · attentionSignals · dataQualitySignals
 * · suggestedReadActions (chỉ GET, mutates=false) · safety. Thiếu dữ liệu → sinh
 * dataQualitySignals (KHÔNG throw).
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORGANIZATION_CONTEXT_PROVIDER } from './maika.interfaces';
import type { IOrganizationContextProvider } from './maika.interfaces';
import { OrganizationContext } from './maika.types';
import {
  IntelSignal,
  OrgEntity,
  OrgEntityRelation,
  OrganizationIntelligence,
  SuggestedReadAction,
} from './organization-intelligence.types';

/** Các endpoint ĐỌC chuẩn (read-only) để lấy dữ liệu sống — KHÔNG gọi ở đây. */
const READ_ACTIONS: Record<string, SuggestedReadAction> = {
  members: {
    label: 'Xem danh sách thành viên',
    method: 'GET',
    endpoint: '/members',
    reason: 'Đối chiếu cấu trúc & trạng thái thành viên',
    mutates: false,
  },
  fundPeriods: {
    label: 'Xem kỳ quỹ',
    method: 'GET',
    endpoint: '/fund-periods',
    reason: 'Kiểm tra kỳ quỹ & trạng thái vận hành',
    mutates: false,
  },
  sessions: {
    label: 'Xem báo cáo buổi tập/điểm danh',
    method: 'GET',
    endpoint: '/reports',
    reason: 'Đối chiếu hoạt động & điểm danh',
    mutates: false,
  },
  minigames: {
    label: 'Xem giải đấu / minigame',
    method: 'GET',
    endpoint: '/minigames',
    reason: 'Kiểm tra giải đấu nếu có dữ liệu',
    mutates: false,
  },
  financeSummary: {
    label: 'Xem số liệu tài chính (Finance Engine)',
    method: 'GET',
    endpoint: '/fund-periods/:id/summary',
    reason:
      'Số liệu tài chính lấy TRỰC TIẾP từ Finance Engine. Maika KHÔNG tính/kết luận tài chính.',
    mutates: false,
  },
};

@Injectable()
export class OrganizationIntelligenceService {
  constructor(
    @Inject(ORGANIZATION_CONTEXT_PROVIDER)
    private readonly orgContext: IOrganizationContextProvider,
  ) {}

  /** Phân tích tổ chức (read-only). clubId scope tenant; thiếu dữ liệu → signals. */
  async analyze(clubId: string | null): Promise<OrganizationIntelligence> {
    const context = await this.orgContext.build(clubId);

    const entities = this.deriveEntities(context);
    const healthSignals = this.healthSignals(context);
    const attentionSignals = this.attentionSignals(context);
    const dataQualitySignals = this.dataQualitySignals(context);
    const suggestedReadActions = this.suggestedReadActions(context);

    return {
      clubId: context.clubId,
      generatedAt: new Date(),
      summary: this.summary(context),
      entities,
      healthSignals,
      attentionSignals,
      dataQualitySignals,
      suggestedReadActions,
      safety: {
        containsPii: context.containsPii,
        containsFinanceData: context.containsFinanceData,
        redactedCount: context.redactedCount,
        blockedCount: context.blockedCount,
        policyVersion: context.policyVersion,
      },
      readOnly: true,
      mutates: false,
    };
  }

  private summary(ctx: OrganizationContext): string {
    if (ctx.totalMemories === 0) {
      return 'CLB chưa có tri thức nền (Club Memory). Cần bổ sung để Maika hiểu tổ chức rõ hơn.';
    }
    const types = ctx.byType.map((t) => `${t.type}:${t.count}`).join(', ');
    return `CLB có ${ctx.totalMemories} tri thức nền (${types}). Maika tổng hợp tín hiệu vận hành read-only — số liệu tài chính lấy từ PickleFund API.`;
  }

  /**
   * Quan hệ thực thể: chỉ Club + tri thức nền là "present" từ context an toàn.
   * Member/Session/Fund/Report/Tournament là dữ liệu sống → đọc qua API (present=false).
   */
  private deriveEntities(ctx: OrganizationContext): OrgEntityRelation[] {
    const hasKnowledge = ctx.totalMemories > 0;
    const liveNote = 'Dữ liệu sống — đọc qua PickleFund API (read-only).';
    const rel = (
      entity: OrgEntity,
      present: boolean,
      note: string,
    ): OrgEntityRelation => ({ entity, present, note });

    return [
      rel(
        'Club',
        true,
        hasKnowledge
          ? 'Có tri thức nền trong Club Memory.'
          : 'Chưa có tri thức nền trong Club Memory.',
      ),
      rel('Season', false, liveNote),
      rel('Session', false, liveNote),
      rel('Member', false, liveNote),
      rel('Attendance', false, liveNote),
      rel(
        'Fund',
        false,
        liveNote + ' Finance Engine là nguồn tài chính duy nhất.',
      ),
      rel('Report', false, liveNote),
      rel('Tournament', false, liveNote),
    ];
  }

  private healthSignals(ctx: OrganizationContext): IntelSignal[] {
    const signals: IntelSignal[] = [];
    if (ctx.totalMemories > 0) {
      signals.push({
        code: 'HEALTH_KNOWLEDGE_PRESENT',
        level: 'info',
        message: `CLB có ${ctx.totalMemories} tri thức nền — nền tảng vận hành đã được ghi nhận.`,
      });
    }
    if (ctx.byType.length >= 3) {
      signals.push({
        code: 'HEALTH_KNOWLEDGE_DIVERSE',
        level: 'info',
        message: `Tri thức đa dạng (${ctx.byType.length} loại) — bối cảnh tổ chức phong phú.`,
      });
    }
    if (ctx.topTags.length > 0) {
      signals.push({
        code: 'HEALTH_TAGGING_ACTIVE',
        level: 'info',
        message: `Có ${ctx.topTags.length} nhãn phân loại — dữ liệu được tổ chức.`,
      });
    }
    return signals;
  }

  private attentionSignals(ctx: OrganizationContext): IntelSignal[] {
    const signals: IntelSignal[] = [];
    if (ctx.containsFinanceData) {
      signals.push({
        code: 'ATTENTION_FINANCE_CONTENT',
        level: 'attention',
        message:
          'Phát hiện nội dung tài chính trong Club Memory (đã chặn khỏi context). Nên xem số liệu qua Finance Engine/API — Maika KHÔNG kết luận tài chính.',
      });
    }
    if (ctx.containsPii) {
      signals.push({
        code: 'ATTENTION_PII_CONTENT',
        level: 'attention',
        message:
          'Phát hiện PII trong Club Memory (đã redact khỏi context). Nên rà soát & hạn chế lưu PII.',
      });
    }
    return signals;
  }

  private dataQualitySignals(ctx: OrganizationContext): IntelSignal[] {
    const signals: IntelSignal[] = [];
    if (ctx.totalMemories === 0) {
      signals.push({
        code: 'DQ_NO_CLUB_MEMORY',
        level: 'warning',
        message:
          'Thiếu Club Memory — nên bổ sung quy định/chính sách/ghi chú vận hành.',
      });
    }
    if (ctx.topTags.length === 0 && ctx.totalMemories > 0) {
      signals.push({
        code: 'DQ_NO_TAGS',
        level: 'attention',
        message: 'Tri thức chưa được gắn nhãn — nên thêm tag để phân loại.',
      });
    }
    // Dữ liệu sống (session/member/fund) không nằm trong context → gợi ý đọc qua API.
    signals.push({
      code: 'DQ_LIVE_DATA_VIA_API',
      level: 'info',
      message:
        'Dữ liệu thành viên/buổi tập/kỳ quỹ là dữ liệu sống — cần đọc qua PickleFund API để đối chiếu.',
    });
    return signals;
  }

  private suggestedReadActions(
    ctx: OrganizationContext,
  ): SuggestedReadAction[] {
    const actions: SuggestedReadAction[] = [
      READ_ACTIONS.members,
      READ_ACTIONS.fundPeriods,
      READ_ACTIONS.sessions,
      READ_ACTIONS.minigames,
    ];
    // Chỉ gợi ý finance API khi có dấu hiệu tài chính — vẫn read-only, không tính toán.
    if (ctx.containsFinanceData) {
      actions.push(READ_ACTIONS.financeSummary);
    }
    return actions;
  }
}
