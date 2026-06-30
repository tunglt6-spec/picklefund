import { ActionLayerService } from './action-layer.service';
import { ActionPermissionService } from './action-permission.service';
import { ActionSafetyService } from './action-safety.service';
import { ActionDryRunService } from './action-dry-run.service';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { ActionActorContext } from './action-layer.types';

describe('ActionLayerService (proposal / dry-run / validate — no execution)', () => {
  let svc: ActionLayerService;

  beforeEach(() => {
    const policy = new VectorContentPolicyService();
    svc = new ActionLayerService(
      new ActionPermissionService(),
      new ActionSafetyService(policy),
      new ActionDryRunService(),
    );
  });

  const admin: ActionActorContext = {
    clubId: 'club-1',
    userId: 'u1',
    role: 'CLUB_ADMIN',
  };

  function dump(p: unknown): string {
    return JSON.stringify(p);
  }

  it('creates safe dry-run proposal with all read-only invariants', () => {
    const p = svc.dryRun(admin, { actionType: 'MEMBER_REVIEW_PROPOSAL' });
    expect(p.status).toBe('proposed');
    expect(p.readOnly).toBe(true);
    expect(p.mutates).toBe(false);
    expect(p.requiresHumanApproval).toBe(true);
    expect(p.approvalStatus).toBe('required');
    expect(p.approvedBy).toBeNull();
    expect(p.approvedAt).toBeNull();
    expect(p.executionStatus).toBe('not_executed');
  });

  it('dryRun + auditLogPreview are dryRunOnly / not executed', () => {
    const p = svc.dryRun(admin, { actionType: 'SEASON_PREPARATION_PROPOSAL' });
    expect(p.dryRun.dryRunOnly).toBe(true);
    expect(p.dryRun.executed).toBe(false);
    expect(p.auditLogPreview.dryRunOnly).toBe(true);
    expect(p.auditLogPreview.executed).toBe(false);
    expect(p.dryRun.requiredApprovals).toContain('human-approval');
  });

  it('safety never allows execution/write', () => {
    const p = svc.dryRun(admin, { actionType: 'DATA_QUALITY_PROPOSAL' });
    expect(p.safetyDecision.actionExecutionAllowed).toBe(false);
    expect(p.safetyDecision.writeOperationsAllowed).toBe(false);
    expect(p.safetyDecision.policyVersion).toBe('policy-v1');
  });

  it('finance action → risk high, no calc, no write', () => {
    const p = svc.dryRun(admin, { actionType: 'FUND_REVIEW_PROPOSAL' });
    expect(p.riskLevel).toBe('high');
    expect(p.safetyDecision.containsFinanceData).toBe(true);
    expect(p.safetyDecision.writeOperationsAllowed).toBe(false);
    // không có con số tài chính nào được tạo
    expect(/\d[\d.,]*\s*(đồng|vnd|₫|triệu|tỷ)/i.test(dump(p))).toBe(false);
  });

  it('write/execute action types are blocked (not executable)', () => {
    for (const t of [
      'CREATE_MEMBER',
      'SEND_EMAIL',
      'RUN_WORKFLOW',
      'EXECUTE_ACTION',
    ]) {
      const p = svc.dryRun(admin, { actionType: t });
      expect(p.riskLevel).toBe('critical');
      expect(p.permissionDecision.allowed).toBe(false);
      expect(p.safetyDecision.allowed).toBe(false);
      expect(p.executionStatus).toBe('not_executed');
      expect(p.dryRun.blockedReasons.length).toBeGreaterThan(0);
    }
  });

  it('CLUB_MEMBER role denied for proposals', () => {
    const p = svc.dryRun(
      { clubId: 'club-1', userId: 'u2', role: 'CLUB_MEMBER' },
      { actionType: 'MEMBER_REVIEW_PROPOSAL' },
    );
    expect(p.permissionDecision.allowed).toBe(false);
    expect(p.permissionDecision.deniedReasons.join(' ')).toMatch(
      /not-permitted/,
    );
  });

  it('PII in objective is redacted; raw never in proposal JSON', () => {
    const p = svc.dryRun(admin, {
      actionType: 'MEMBER_REVIEW_PROPOSAL',
      objective: 'liên hệ a@picklefund.vn 0987654321 CCCD 001203004005',
    });
    const j = dump(p);
    expect(j).not.toContain('a@picklefund.vn');
    expect(j).not.toContain('0987654321');
    expect(j).not.toContain('001203004005');
    expect(p.safetyDecision.containsPii).toBe(true);
    expect(p.safetyDecision.redactedCount).toBeGreaterThan(0);
  });

  it('finance/money in objective is blocked (safe-reference, no raw numbers)', () => {
    const p = svc.dryRun(admin, {
      actionType: 'MEMBER_REVIEW_PROPOSAL',
      objective: 'số dư quỹ chính 5.000.000 đồng',
    });
    const j = dump(p);
    expect(j).not.toContain('5.000.000');
    expect(p.safetyDecision.containsFinanceData).toBe(true);
    expect(p.safetyDecision.blockedReasons).toContain(
      'finance-content-in-objective',
    );
  });

  it('validate returns permission + safety only (no proposal)', () => {
    const res = svc.validate(admin, { actionType: 'DATA_QUALITY_PROPOSAL' });
    expect(res.permissionDecision.allowed).toBe(true);
    expect(res.safetyDecision.allowed).toBe(true);
    expect(res.safetyDecision.actionExecutionAllowed).toBe(false);
  });

  it('permission uses context clubId/role, denies when missing', () => {
    const res = svc.validate(
      { clubId: 'club-1', userId: null, role: null },
      { actionType: 'MEMBER_REVIEW_PROPOSAL' },
    );
    expect(res.permissionDecision.allowed).toBe(false);
    expect(res.permissionDecision.deniedReasons).toContain('missing-role');
  });

  it('throws when clubId missing (tenant isolation)', () => {
    expect(() =>
      svc.dryRun(
        { clubId: null, userId: 'u1', role: 'CLUB_ADMIN' },
        { actionType: 'MEMBER_REVIEW_PROPOSAL' },
      ),
    ).toThrow('clubId');
  });
});
