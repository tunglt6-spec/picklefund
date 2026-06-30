/**
 * Maika Core — types (Sprint 3, Epic 3.1) — Club Intelligence Manager.
 *
 * READ-ONLY intelligence: Hiểu → Lập kế hoạch → Đề xuất. KHÔNG action/ghi/gọi API write.
 * Bất biến: KHÔNG tính/suy luận/cache số liệu tài chính — mọi số liệu tài chính phải
 * lấy trực tiếp từ PickleFund API (Finance Engine = Source of Truth). KHÔNG PII/finance
 * đi vào embedding (chỉ dùng Club Memory đã sạch + retrieval read-only).
 */
import { ClubMemoryType } from '../club-memory/club-memory.types';

/** Ý định nhận thức của Maika (deterministic, không LLM). */
export enum MaikaIntent {
  ORGANIZATION_OVERVIEW = 'ORGANIZATION_OVERVIEW',
  MEMBER_INSIGHT = 'MEMBER_INSIGHT',
  FUND_PERIOD_INSIGHT = 'FUND_PERIOD_INSIGHT',
  TOURNAMENT_INSIGHT = 'TOURNAMENT_INSIGHT',
  WORKFLOW_INSIGHT = 'WORKFLOW_INSIGHT',
  HISTORY_LOOKUP = 'HISTORY_LOOKUP',
  FINANCE_REFERENCE = 'FINANCE_REFERENCE',
  UNKNOWN = 'UNKNOWN',
}

/** Kết quả phân loại ý định. */
export interface IntentClassification {
  readonly intent: MaikaIntent;
  /** 0..1 — tỉ lệ tin cậy theo số keyword khớp (deterministic). */
  readonly confidence: number;
  /** true nếu câu hỏi liên quan tài chính → BẮT BUỘC reference PickleFund API. */
  readonly financeRelated: boolean;
  readonly matchedKeywords: string[];
  readonly rationale: string;
}

/** Bức tranh tổ chức (KHÔNG số liệu tài chính, KHÔNG PII). */
export interface OrgTypeCount {
  readonly type: ClubMemoryType;
  readonly count: number;
}
export interface OrgTagCount {
  readonly tag: string;
  readonly count: number;
}
export interface OrgKnowledgeHighlight {
  readonly memoryId: string;
  readonly title: string | null;
  readonly snippet: string;
  readonly type: ClubMemoryType;
}
export interface OrganizationContext {
  readonly clubId: string;
  readonly generatedAt: Date;
  readonly totalMemories: number;
  readonly byType: OrgTypeCount[];
  readonly topTags: OrgTagCount[];
  readonly knowledgeHighlights: OrgKnowledgeHighlight[];
  /**
   * Cờ cảnh báo an toàn — TÍNH TỪ POLICY THỰC TẾ (không gán cứng).
   * true nếu có item bị block vì finance/money. Dù true, raw finance KHÔNG vào context.
   */
  readonly containsFinanceData: boolean;
  /**
   * true nếu có title/content/tag bị redact PII. Dù true, raw PII KHÔNG vào context.
   */
  readonly containsPii: boolean;
}

/** Tham chiếu endpoint PickleFund API (chỉ mô tả — KHÔNG chứa số liệu). */
export interface ApiReference {
  readonly category: 'finance' | 'member' | 'fund' | 'tournament' | 'general';
  readonly method: 'GET';
  readonly endpoint: string;
  readonly purpose: string;
  readonly note: string;
}

/** Một bước trong kế hoạch read-only. mutates LUÔN = false. */
export type MaikaStepAction = 'READ' | 'REFERENCE' | 'PROPOSE';
export interface MaikaPlanStep {
  readonly order: number;
  readonly action: MaikaStepAction;
  readonly description: string;
  readonly dataSource: string;
  readonly requiresPickleFundApi: boolean;
  readonly mutates: false;
}

/** Kế hoạch nhận thức — read-only, không bao giờ mutate. */
export interface MaikaPlan {
  readonly intent: MaikaIntent;
  readonly readOnly: true;
  readonly mutates: false;
  readonly steps: MaikaPlanStep[];
}

/** Một đề xuất (chỉ gợi ý cho con người quyết định). */
export interface MaikaSuggestion {
  readonly text: string;
  readonly rationale: string;
  readonly severity: 'info' | 'suggestion' | 'attention';
}

/** Đề xuất của Maika — luôn cần con người hành động (requiresHumanAction = true). */
export interface MaikaProposal {
  readonly title: string;
  readonly summary: string;
  readonly suggestions: MaikaSuggestion[];
  readonly apiReferences: ApiReference[];
  readonly disclaimers: string[];
  readonly requiresHumanAction: true;
}

/** Phản hồi tổng hợp của Maika Core: Hiểu → Lập kế hoạch → Đề xuất. */
export interface MaikaResponse {
  readonly clubId: string;
  readonly query: string;
  readonly classification: IntentClassification;
  readonly context: OrganizationContext;
  readonly plan: MaikaPlan;
  readonly proposal: MaikaProposal;
}
