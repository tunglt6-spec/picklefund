/**
 * Organization Intelligence — types (Sprint 3, Epic 3.2).
 *
 * READ-ONLY. Tổng hợp tín hiệu vận hành/quan hệ thực thể/chất lượng dữ liệu + đề xuất
 * bước đọc (suggestedReadActions). KHÔNG action/write/workflow. KHÔNG tính/kết luận
 * tài chính (chỉ tham chiếu PickleFund API read-only). Không leak PII/finance (nguồn
 * dữ liệu là OrganizationContext đã sanitize ở Epic 3.1).
 */

/** Thực thể tổ chức CLB và mức độ hiện diện trong context. */
export type OrgEntity =
  | 'Club'
  | 'Season'
  | 'Session'
  | 'Member'
  | 'Attendance'
  | 'Fund'
  | 'Report'
  | 'Tournament';

export interface OrgEntityRelation {
  readonly entity: OrgEntity;
  /** Có bằng chứng/tín hiệu trong context (không phải dữ liệu sống). */
  readonly present: boolean;
  /** Nguồn dữ liệu sống (nếu cần) — đọc qua PickleFund API. */
  readonly note: string;
}

export type SignalLevel = 'info' | 'attention' | 'warning';

export interface IntelSignal {
  readonly code: string;
  readonly level: SignalLevel;
  readonly message: string;
}

/** Gợi ý gọi API ĐỌC (read-only) — không bao giờ mutate. */
export interface SuggestedReadAction {
  readonly label: string;
  readonly method: 'GET';
  readonly endpoint: string;
  readonly reason: string;
  readonly mutates: false;
}

/** Mô hình an toàn — phản ánh policy thực tế (không gán cứng). */
export interface OrgIntelligenceSafety {
  readonly containsPii: boolean;
  readonly containsFinanceData: boolean;
  readonly redactedCount: number;
  readonly blockedCount: number;
  readonly policyVersion: string;
}

export interface OrganizationIntelligence {
  readonly clubId: string;
  readonly generatedAt: Date;
  readonly summary: string;
  readonly entities: OrgEntityRelation[];
  readonly healthSignals: IntelSignal[];
  readonly attentionSignals: IntelSignal[];
  readonly dataQualitySignals: IntelSignal[];
  readonly suggestedReadActions: SuggestedReadAction[];
  readonly safety: OrgIntelligenceSafety;
  /** Bất biến read-only (AI Action Safety). */
  readonly readOnly: true;
  readonly mutates: false;
}
