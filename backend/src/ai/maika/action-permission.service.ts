/**
 * ActionPermissionService (Sprint 3, Epic 3.4).
 *
 * Kiểm tra quyền cho action proposal. role/clubId LẤY TỪ JWT (KHÔNG tin body).
 * Xét: role · club scope · action type · risk level · write-requested.
 * Write/execute hoặc không hỗ trợ → allowed=false. Không tạo executable action.
 */
import { Injectable } from '@nestjs/common';
import { PermissionDecision } from './action-audit.types';
import {
  ActionActorContext,
  ActionTypeClassification,
  RiskLevel,
} from './action-layer.types';

/** Vai trò được phép tạo proposal (member KHÔNG được). */
const PROPOSAL_ROLES = ['SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER'];
/** Risk cao → giới hạn vai trò (vẫn trong nhóm trên; member luôn bị từ chối). */
const HIGH_RISK_ROLES = ['SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER'];

@Injectable()
export class ActionPermissionService {
  check(
    ctx: ActionActorContext,
    classification: ActionTypeClassification,
    riskLevel: RiskLevel,
  ): PermissionDecision {
    const reasons: string[] = [];
    const deniedReasons: string[] = [];
    const role = ctx.role;
    const clubId = ctx.clubId ?? '';

    if (!clubId) deniedReasons.push('missing-club-scope');
    if (!role) deniedReasons.push('missing-role');

    if (classification.isWriteOrExecute) {
      deniedReasons.push('write-or-execute-not-permitted-in-epic-3.4');
    } else if (!classification.supported) {
      deniedReasons.push('unsupported-action-type');
    }

    if (role) {
      const allowedRoles =
        riskLevel === 'high' || riskLevel === 'critical'
          ? HIGH_RISK_ROLES
          : PROPOSAL_ROLES;
      if (allowedRoles.includes(role)) {
        reasons.push(`role-${role}-permitted-for-proposal`);
      } else {
        deniedReasons.push(`role-${role}-not-permitted`);
      }
    }

    return {
      allowed: deniedReasons.length === 0,
      role: role ?? null,
      clubId,
      reasons,
      deniedReasons,
    };
  }
}
