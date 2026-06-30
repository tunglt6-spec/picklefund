/**
 * WorkflowTemplateService (Sprint 3, Epic 3.3) — kho TEMPLATE read-only.
 *
 * Định nghĩa các workflow template tĩnh, deterministic. Tất cả readOnly, mutates=false,
 * requiresHumanApproval=true. KHÔNG thực thi, KHÔNG persist, KHÔNG action/write.
 * Finance template chỉ ĐỌC Finance API — KHÔNG tính/kết luận số liệu.
 */
import { Injectable } from '@nestjs/common';
import { SuggestedReadAction } from './organization-intelligence.types';
import {
  WorkflowStepType,
  WorkflowTemplateId,
  WorkflowTemplateSummary,
} from './workflow-planning.types';

/** Định nghĩa step trong template (chưa gán id/order — gán khi build plan). */
export interface TemplateStepDef {
  readonly type: WorkflowStepType;
  readonly title: string;
  readonly description: string;
  readonly requiredData: string[];
  readonly suggestedEndpoint?: string;
  readonly requiresHumanApproval: boolean;
}

export interface WorkflowTemplateDef {
  readonly id: WorkflowTemplateId;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly steps: TemplateStepDef[];
  readonly readActions: SuggestedReadAction[];
}

const GET = 'GET' as const;
function read(
  label: string,
  endpoint: string,
  reason: string,
): SuggestedReadAction {
  return { label, method: GET, endpoint, reason, mutates: false };
}

const TEMPLATES: Record<WorkflowTemplateId, WorkflowTemplateDef> = {
  [WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW]: {
    id: WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW,
    title: 'Rà soát mức độ tham gia thành viên',
    description:
      'Đọc thành viên & điểm danh, phân tích tham gia, đề xuất admin kiểm tra (read-only).',
    category: 'engagement',
    steps: [
      {
        type: 'read',
        title: 'Đọc danh sách thành viên',
        description: 'Lấy thành viên & trạng thái qua PickleFund API.',
        requiredData: ['members'],
        suggestedEndpoint: '/members',
        requiresHumanApproval: false,
      },
      {
        type: 'read',
        title: 'Đọc dữ liệu điểm danh',
        description: 'Lấy báo cáo điểm danh/buổi tập qua API.',
        requiredData: ['attendance', 'reports'],
        suggestedEndpoint: '/reports',
        requiresHumanApproval: false,
      },
      {
        type: 'analyze',
        title: 'Phân tích mức tham gia',
        description: 'Tổng hợp tín hiệu tham gia (không kết luận thay người).',
        requiredData: ['members', 'attendance'],
        requiresHumanApproval: false,
      },
      {
        type: 'human_review',
        title: 'Admin xem xét & quyết định',
        description: 'Đề xuất admin kiểm tra thành viên ít tham gia.',
        requiredData: [],
        requiresHumanApproval: true,
      },
    ],
    readActions: [
      read('Xem thành viên', '/members', 'Đối chiếu trạng thái thành viên'),
      read('Xem điểm danh', '/reports', 'Đối chiếu mức tham gia'),
    ],
  },

  [WorkflowTemplateId.FUND_HEALTH_REVIEW]: {
    id: WorkflowTemplateId.FUND_HEALTH_REVIEW,
    title: 'Rà soát sức khỏe quỹ',
    description:
      'Chỉ ĐỌC số liệu qua Finance API — Maika KHÔNG tính toán/kết luận tài chính. Đề xuất admin mở báo cáo.',
    category: 'finance',
    steps: [
      {
        type: 'read',
        title: 'Đọc số liệu tài chính (Finance Engine)',
        description:
          'Lấy summary kỳ quỹ qua Finance API. Maika KHÔNG tính/suy luận số liệu.',
        requiredData: ['fund-period-summary'],
        suggestedEndpoint: '/fund-periods/:id/summary',
        requiresHumanApproval: false,
      },
      {
        type: 'propose',
        title: 'Đề xuất admin mở báo cáo tài chính',
        description:
          'Gợi ý admin xem báo cáo chính thức từ Finance Engine (nguồn duy nhất).',
        requiredData: [],
        requiresHumanApproval: false,
      },
      {
        type: 'human_review',
        title: 'Admin xác nhận tình hình quỹ',
        description: 'Con người quyết định dựa trên số liệu Finance Engine.',
        requiredData: [],
        requiresHumanApproval: true,
      },
    ],
    readActions: [
      read(
        'Xem số liệu tài chính',
        '/fund-periods/:id/summary',
        'Số liệu lấy TRỰC TIẾP từ Finance Engine; Maika không tính toán.',
      ),
    ],
  },

  [WorkflowTemplateId.SEASON_PREPARATION]: {
    id: WorkflowTemplateId.SEASON_PREPARATION,
    title: 'Chuẩn bị kỳ/mùa mới',
    description:
      'Đọc kỳ quỹ, thành viên, lịch/buổi tập; tạo checklist chuẩn bị (read-only).',
    category: 'season',
    steps: [
      {
        type: 'read',
        title: 'Đọc kỳ quỹ',
        description: 'Lấy danh sách & trạng thái kỳ quỹ qua API.',
        requiredData: ['fund-periods'],
        suggestedEndpoint: '/fund-periods',
        requiresHumanApproval: false,
      },
      {
        type: 'read',
        title: 'Đọc thành viên',
        description: 'Lấy thành viên qua API.',
        requiredData: ['members'],
        suggestedEndpoint: '/members',
        requiresHumanApproval: false,
      },
      {
        type: 'analyze',
        title: 'Lập checklist chuẩn bị',
        description: 'Tổng hợp checklist chuẩn bị mùa (read-only).',
        requiredData: ['fund-periods', 'members'],
        requiresHumanApproval: false,
      },
      {
        type: 'human_review',
        title: 'Admin duyệt checklist',
        description: 'Con người xác nhận trước khi mở kỳ mới.',
        requiredData: [],
        requiresHumanApproval: true,
      },
    ],
    readActions: [
      read('Xem kỳ quỹ', '/fund-periods', 'Kiểm tra kỳ quỹ hiện tại'),
      read('Xem thành viên', '/members', 'Chuẩn bị danh sách mùa mới'),
    ],
  },

  [WorkflowTemplateId.TOURNAMENT_REVIEW]: {
    id: WorkflowTemplateId.TOURNAMENT_REVIEW,
    title: 'Rà soát giải đấu / minigame',
    description:
      'Đọc minigame & điểm danh, đề xuất admin kiểm tra dữ liệu (read-only).',
    category: 'tournament',
    steps: [
      {
        type: 'read',
        title: 'Đọc giải đấu / minigame',
        description: 'Lấy danh sách minigame qua API.',
        requiredData: ['minigames'],
        suggestedEndpoint: '/minigames',
        requiresHumanApproval: false,
      },
      {
        type: 'read',
        title: 'Đọc điểm danh liên quan',
        description: 'Lấy dữ liệu điểm danh qua API.',
        requiredData: ['attendance'],
        suggestedEndpoint: '/reports',
        requiresHumanApproval: false,
      },
      {
        type: 'human_review',
        title: 'Admin kiểm tra dữ liệu giải đấu',
        description: 'Đề xuất admin xác nhận kết quả/dữ liệu.',
        requiredData: [],
        requiresHumanApproval: true,
      },
    ],
    readActions: [
      read('Xem minigame', '/minigames', 'Kiểm tra giải đấu'),
      read('Xem điểm danh', '/reports', 'Đối chiếu tham gia'),
    ],
  },

  [WorkflowTemplateId.DATA_QUALITY_REVIEW]: {
    id: WorkflowTemplateId.DATA_QUALITY_REVIEW,
    title: 'Rà soát chất lượng dữ liệu',
    description:
      'Đọc Organization Intelligence, phát hiện thiếu dữ liệu, đề xuất bổ sung thủ công.',
    category: 'data-quality',
    steps: [
      {
        type: 'read',
        title: 'Đọc Organization Intelligence',
        description: 'Lấy bức tranh tổ chức read-only (Epic 3.2).',
        requiredData: ['organization-intelligence'],
        suggestedEndpoint: '/ai/maika/organization-intelligence',
        requiresHumanApproval: false,
      },
      {
        type: 'analyze',
        title: 'Phát hiện thiếu dữ liệu',
        description: 'Tổng hợp dataQualitySignals.',
        requiredData: ['organization-intelligence'],
        requiresHumanApproval: false,
      },
      {
        type: 'human_review',
        title: 'Admin bổ sung dữ liệu thủ công',
        description:
          'Đề xuất con người bổ sung tri thức/club memory còn thiếu.',
        requiredData: [],
        requiresHumanApproval: true,
      },
    ],
    readActions: [
      read(
        'Xem Organization Intelligence',
        '/ai/maika/organization-intelligence',
        'Phát hiện thiếu dữ liệu',
      ),
    ],
  },
};

@Injectable()
export class WorkflowTemplateService {
  /** Liệt kê template (read-only summary). */
  list(): WorkflowTemplateSummary[] {
    return Object.values(TEMPLATES).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      stepCount: t.steps.length,
      readOnly: true,
    }));
  }

  /** Lấy template theo id; null nếu không tồn tại (không throw). */
  getById(id: WorkflowTemplateId): WorkflowTemplateDef | null {
    return TEMPLATES[id] ?? null;
  }

  /** Map keyword (deterministic) → template id; mặc định DATA_QUALITY_REVIEW. */
  resolveByKeyword(text: string): WorkflowTemplateId {
    const q = (text ?? '').toLowerCase();
    if (/thành viên|member|tham gia|engagement/.test(q))
      return WorkflowTemplateId.MEMBER_ENGAGEMENT_REVIEW;
    if (/quỹ|fund|tài chính|finance/.test(q))
      return WorkflowTemplateId.FUND_HEALTH_REVIEW;
    if (/mùa|kỳ|season|chuẩn bị/.test(q))
      return WorkflowTemplateId.SEASON_PREPARATION;
    if (/giải|minigame|tournament|thi đấu/.test(q))
      return WorkflowTemplateId.TOURNAMENT_REVIEW;
    return WorkflowTemplateId.DATA_QUALITY_REVIEW;
  }
}
