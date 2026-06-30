import { ApprovalPolicyService } from './approval-policy.service';

describe('ApprovalPolicyService (deterministic risk policies)', () => {
  let svc: ApprovalPolicyService;
  beforeEach(() => {
    svc = new ApprovalPolicyService();
  });

  it('lists 4 policies (low/medium/high/critical)', () => {
    const list = svc.list();
    expect(list.map((p) => p.riskLevel).sort()).toEqual([
      'critical',
      'high',
      'low',
      'medium',
    ]);
  });

  it('low → 1 admin, no safety/manual', () => {
    const p = svc.forRisk('low');
    expect(p.requiredApprovalCount).toBe(1);
    expect(p.requiresSafetyCheck).toBe(false);
    expect(p.requiresManualConfirmation).toBe(false);
  });

  it('medium → 1 admin + safety check', () => {
    const p = svc.forRisk('medium');
    expect(p.requiredApprovalCount).toBe(1);
    expect(p.requiresSafetyCheck).toBe(true);
  });

  it('high → 2 admins', () => {
    expect(svc.forRisk('high').requiredApprovalCount).toBe(2);
  });

  it('critical → 2 admins + manual confirmation', () => {
    const p = svc.forRisk('critical');
    expect(p.requiredApprovalCount).toBe(2);
    expect(p.requiresManualConfirmation).toBe(true);
  });

  it('approver roles are admin-level only', () => {
    for (const p of svc.list()) {
      expect(p.requiredRoles).toEqual(['SUPER_ADMIN', 'CLUB_ADMIN']);
    }
  });
});
