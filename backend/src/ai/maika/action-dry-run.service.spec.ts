import { ActionDryRunService } from './action-dry-run.service';
import { ActionSafetyService } from './action-safety.service';
import { ActionPermissionService } from './action-permission.service';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';

describe('ActionDryRunService (simulate only, never execute)', () => {
  let dry: ActionDryRunService;
  let safety: ActionSafetyService;
  let perm: ActionPermissionService;

  beforeEach(() => {
    dry = new ActionDryRunService();
    safety = new ActionSafetyService(new VectorContentPolicyService());
    perm = new ActionPermissionService();
  });

  it('dryRunOnly=true, executed=false, requires human approval', () => {
    const c = safety.classify('MEMBER_REVIEW_PROPOSAL');
    const p = perm.check(
      { clubId: 'club-1', userId: 'u1', role: 'CLUB_ADMIN' },
      c,
      'low',
    );
    const s = safety.evaluate(c, undefined);
    const r = dry.build(c, p, s);
    expect(r.dryRunOnly).toBe(true);
    expect(r.executed).toBe(false);
    expect(r.requiredApprovals).toContain('human-approval');
    expect(r.affectedEntities).toContain('members');
    expect(r.wouldDo.join(' ')).toMatch(/DRY-RUN|dry-run/);
  });

  it('blocked action surfaces blockedReasons, no simulation', () => {
    const c = safety.classify('CREATE_EXPENSE');
    const p = perm.check(
      { clubId: 'club-1', userId: 'u1', role: 'CLUB_ADMIN' },
      c,
      'critical',
    );
    const s = safety.evaluate(c, undefined);
    const r = dry.build(c, p, s);
    expect(r.blockedReasons.length).toBeGreaterThan(0);
    expect(r.wouldDo.join(' ')).toMatch(/KHÔNG mô phỏng/);
    expect(r.executed).toBe(false);
  });
});
