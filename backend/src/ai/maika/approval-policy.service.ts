/**
 * ApprovalPolicyService (Sprint 3, Epic 3.5) — policy duyệt DETERMINISTIC (preview).
 *
 * Low → 1 Admin · Medium → 1 Admin + Safety Check · High → 2 Admin ·
 * Critical → 2 Admin + Manual Confirmation. CHỈ policy preview — KHÔNG duyệt thật.
 */
import { Injectable } from '@nestjs/common';
import { RiskLevel } from './action-layer.types';
import { ApprovalPolicy } from './approval-engine.types';

const APPROVER_ROLES = ['SUPER_ADMIN', 'CLUB_ADMIN'];

const POLICIES: Record<RiskLevel, ApprovalPolicy> = {
  low: {
    riskLevel: 'low',
    requiredApprovalCount: 1,
    requiredRoles: APPROVER_ROLES,
    requiredApprovals: ['admin-approval'],
    requiresSafetyCheck: false,
    requiresManualConfirmation: false,
    description: 'Rủi ro thấp → 1 Admin duyệt.',
  },
  medium: {
    riskLevel: 'medium',
    requiredApprovalCount: 1,
    requiredRoles: APPROVER_ROLES,
    requiredApprovals: ['admin-approval', 'safety-check'],
    requiresSafetyCheck: true,
    requiresManualConfirmation: false,
    description: 'Rủi ro trung bình → 1 Admin + Safety Check.',
  },
  high: {
    riskLevel: 'high',
    requiredApprovalCount: 2,
    requiredRoles: APPROVER_ROLES,
    requiredApprovals: ['admin-approval-1', 'admin-approval-2'],
    requiresSafetyCheck: true,
    requiresManualConfirmation: false,
    description: 'Rủi ro cao → 2 Admin duyệt.',
  },
  critical: {
    riskLevel: 'critical',
    requiredApprovalCount: 2,
    requiredRoles: APPROVER_ROLES,
    requiredApprovals: [
      'admin-approval-1',
      'admin-approval-2',
      'manual-confirmation',
    ],
    requiresSafetyCheck: true,
    requiresManualConfirmation: true,
    description: 'Rủi ro nghiêm trọng → 2 Admin + xác nhận thủ công.',
  },
};

@Injectable()
export class ApprovalPolicyService {
  /** Liệt kê toàn bộ policy (preview). */
  list(): ApprovalPolicy[] {
    return Object.values(POLICIES);
  }

  /** Policy theo risk level. */
  forRisk(riskLevel: RiskLevel): ApprovalPolicy {
    return POLICIES[riskLevel];
  }
}
