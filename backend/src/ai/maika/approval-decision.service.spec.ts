import { ApprovalDecisionService } from './approval-decision.service';
import { ApprovalPolicyService } from './approval-policy.service';
import { ActionActorContext } from './action-layer.types';

describe('ApprovalDecisionService (evaluate + preview, no execution)', () => {
  let svc: ApprovalDecisionService;
  beforeEach(() => {
    svc = new ApprovalDecisionService(new ApprovalPolicyService());
  });

  const admin: ActionActorContext = {
    clubId: 'club-1',
    userId: 'u1',
    role: 'CLUB_ADMIN',
  };
  const clean = {
    containsPii: false,
    containsFinanceData: false,
    blockedReasons: [],
    warnings: [],
  };

  it('admin eligible → allowed, lists required approvals', () => {
    const e = svc.evaluate(admin, 'low', clean);
    expect(e.allowed).toBe(true);
    expect(e.requiredApprovals).toContain('admin-approval');
  });

  it('member not an approver → not allowed', () => {
    const e = svc.evaluate(
      { clubId: 'club-1', userId: 'u2', role: 'CLUB_MEMBER' },
      'low',
      clean,
    );
    expect(e.allowed).toBe(false);
    expect(e.reason).toMatch(/not-an-approver/);
  });

  it('missing role/club → not allowed', () => {
    const e = svc.evaluate(
      { clubId: null, userId: null, role: null },
      'high',
      clean,
    );
    expect(e.allowed).toBe(false);
  });

  it('finance blocked reason propagates, allowed=false', () => {
    const e = svc.evaluate(admin, 'high', {
      containsPii: false,
      containsFinanceData: true,
      blockedReasons: ['finance-content-in-objective'],
      warnings: ['finance'],
    });
    expect(e.allowed).toBe(false);
  });

  it('preview when allowed → pending (wouldApprove=false), execution false', () => {
    const e = svc.evaluate(admin, 'critical', clean);
    const p = svc.preview(e, 'critical');
    expect(p.executionAllowed).toBe(false);
    expect(p.wouldApprove).toBe(false);
    expect(p.wouldReject).toBe(false);
    expect(p.missingRequirements.join(' ')).toMatch(/thủ công|phê duyệt/);
  });

  it('preview when not allowed → wouldReject=true', () => {
    const e = svc.evaluate(
      { clubId: 'club-1', userId: 'u2', role: 'CLUB_MEMBER' },
      'low',
      clean,
    );
    const p = svc.preview(e, 'low');
    expect(p.wouldReject).toBe(true);
    expect(p.executionAllowed).toBe(false);
  });
});
