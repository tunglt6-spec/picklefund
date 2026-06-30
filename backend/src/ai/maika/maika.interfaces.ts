/**
 * Maika Core — abstractions + DI tokens (Sprint 3, Epic 3.1).
 * Tất cả read-only. Không interface nào cho phép ghi/mutate/gọi API write.
 */
import {
  ApiReference,
  IntentClassification,
  MaikaIntent,
  MaikaPlan,
  OrganizationContext,
} from './maika.types';

/** Phân loại ý định người dùng (deterministic). */
export interface IIntentRouter {
  classify(query: string): IntentClassification;
}

/** Dựng bức tranh tổ chức từ Club Memory (read-only, không finance/PII). */
export interface IOrganizationContextProvider {
  build(clubId: string | null): Promise<OrganizationContext>;
}

/**
 * Cổng tham chiếu PickleFund API (read-only). CHỈ trả mô tả endpoint —
 * KHÔNG bao giờ trả số liệu, KHÔNG gọi API, KHÔNG cache.
 * Enforce: mọi số liệu tài chính phải lấy trực tiếp từ Finance Engine qua API.
 */
export interface IApiReferencePort {
  referencesFor(intent: MaikaIntent, financeRelated: boolean): ApiReference[];
}

/** Lập kế hoạch read-only (Hiểu → Lập kế hoạch). Không bước nào mutate. */
export interface IMaikaPlanner {
  plan(
    classification: IntentClassification,
    context: OrganizationContext,
  ): MaikaPlan;
}

export const INTENT_ROUTER = Symbol('MAIKA_INTENT_ROUTER');
export const ORGANIZATION_CONTEXT_PROVIDER = Symbol(
  'MAIKA_ORGANIZATION_CONTEXT_PROVIDER',
);
export const API_REFERENCE_PORT = Symbol('MAIKA_API_REFERENCE_PORT');
export const MAIKA_PLANNER = Symbol('MAIKA_PLANNER');
