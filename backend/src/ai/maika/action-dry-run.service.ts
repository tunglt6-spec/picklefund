/**
 * ActionDryRunService (Sprint 3, Epic 3.4).
 *
 * Mô phỏng action — KHÔNG persist/mutate/send/schedule/call-write. Trả wouldDo,
 * requiredPermissions, requiredApprovals, affectedEntities (an toàn), warnings, blocked.
 */
import { Injectable } from '@nestjs/common';
import {
  DryRunResult,
  PermissionDecision,
  SafetyDecision,
} from './action-audit.types';
import { ActionType, ActionTypeClassification } from './action-layer.types';

/** Thực thể bị ảnh hưởng (TÊN AN TOÀN — không ID/PII). */
const AFFECTED: Record<ActionType, string[]> = {
  [ActionType.MEMBER_REVIEW_PROPOSAL]: ['members', 'attendance'],
  [ActionType.SEASON_PREPARATION_PROPOSAL]: ['fund-periods', 'members'],
  [ActionType.FUND_REVIEW_PROPOSAL]: [
    'fund-period-summary (read via Finance API)',
  ],
  [ActionType.DATA_QUALITY_PROPOSAL]: ['organization-intelligence'],
  [ActionType.TOURNAMENT_REVIEW_PROPOSAL]: ['minigames', 'attendance'],
};

@Injectable()
export class ActionDryRunService {
  build(
    classification: ActionTypeClassification,
    permission: PermissionDecision,
    safety: SafetyDecision,
  ): DryRunResult {
    const blockedReasons = [
      ...permission.deniedReasons,
      ...safety.blockedReasons,
    ];
    const affectedEntities = classification.type
      ? [...AFFECTED[classification.type]]
      : [];

    const wouldDo = blockedReasons.length
      ? [
          `KHÔNG mô phỏng: action "${classification.raw}" bị chặn (xem blockedReasons).`,
        ]
      : [
          `Tạo ĐỀ XUẤT (proposal) loại "${classification.raw}" — DRY-RUN, KHÔNG thực thi.`,
          'Đề xuất con người xem xét & duyệt thủ công.',
        ];

    return {
      dryRunOnly: true,
      executed: false,
      wouldDo,
      requiredPermissions: [
        'club-scope',
        'role: SUPER_ADMIN | CLUB_ADMIN | CLUB_TREASURER',
      ],
      requiredApprovals: ['human-approval'],
      affectedEntities,
      safetyWarnings: [...safety.safetyWarnings],
      blockedReasons,
    };
  }
}
