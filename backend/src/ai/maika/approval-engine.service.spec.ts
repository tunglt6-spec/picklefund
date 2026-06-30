import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalPolicyService } from './approval-policy.service';
import { ApprovalDecisionService } from './approval-decision.service';
import { ActionSafetyService } from './action-safety.service';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { ActionActorContext } from './action-layer.types';

describe('ApprovalEngineService (evaluate / preview — no execution/persist)', () => {
  let svc: ApprovalEngineService;

  beforeEach(() => {
    const policy = new VectorContentPolicyService();
    const policies = new ApprovalPolicyService();
    svc = new ApprovalEngineService(
      policies,
      new ApprovalDecisionService(policies),
      policy,
      new ActionSafetyService(policy),
    );
  });

  const admin: ActionActorContext = {
    clubId: 'club-1',
    userId: 'u1',
    role: 'CLUB_ADMIN',
  };
  const dump = (x: unknown) => JSON.stringify(x);

  it('lists policies (read-only)', () => {
    expect(svc.listPolicies().length).toBe(4);
  });

  it('preview builds pending request, execution never allowed', () => {
    const r = svc.preview(admin, { actionType: 'MEMBER_REVIEW_PROPOSAL' });
    expect(r.request.status).toBe('pending');
    expect(r.request.requiresHumanApproval).toBe(true);
    expect(r.request.approved).toBe(false);
    expect(r.request.approvedBy).toBeNull();
    expect(r.request.executionAllowed).toBe(false);
    expect(r.preview.executionAllowed).toBe(false);
  });

  it('derives risk from action type (fund → high, write → critical)', () => {
    expect(
      svc.preview(admin, { actionType: 'FUND_REVIEW_PROPOSAL' }).request
        .riskLevel,
    ).toBe('high');
    expect(
      svc.preview(admin, { actionType: 'CREATE_RECEIPT' }).request.riskLevel,
    ).toBe('critical');
  });

  it('explicit riskLevel honored', () => {
    expect(
      svc.preview(admin, { riskLevel: 'critical' }).request.riskLevel,
    ).toBe('critical');
  });

  it('finance objective blocked (safe-reference), no raw numbers in output', () => {
    const r = svc.preview(admin, {
      actionType: 'MEMBER_REVIEW_PROPOSAL',
      objective: 'số dư quỹ chính 5.000.000 đồng',
    });
    expect(dump(r)).not.toContain('5.000.000');
    expect(r.evaluation.allowed).toBe(false); // finance block → not eligible
    expect(r.preview.wouldReject).toBe(true);
  });

  it('PII objective redacted; raw never appears', () => {
    const e = svc.evaluate(admin, {
      actionType: 'MEMBER_REVIEW_PROPOSAL',
      objective: 'email a@picklefund.vn phone 0987654321',
    });
    expect(dump(e)).not.toContain('a@picklefund.vn');
    expect(dump(e)).not.toContain('0987654321');
    expect(e.warnings.join(' ')).toMatch(/PII/);
  });

  it('member role → not eligible to approve', () => {
    const e = svc.evaluate(
      { clubId: 'club-1', userId: 'u2', role: 'CLUB_MEMBER' },
      { actionType: 'MEMBER_REVIEW_PROPOSAL' },
    );
    expect(e.allowed).toBe(false);
  });

  it('throws when clubId missing (tenant isolation)', () => {
    expect(() =>
      svc.evaluate(
        { clubId: null, userId: 'u1', role: 'CLUB_ADMIN' },
        { riskLevel: 'low' },
      ),
    ).toThrow('clubId');
  });

  it('guard rejects request with approvedAt != null', () => {
    const { request, preview } = svc.preview(admin, { riskLevel: 'low' });
    const tampered = { ...request, approvedAt: new Date() };
    expect(() =>
      (
        svc as unknown as {
          assertNotExecutable: (r: unknown, p: unknown) => void;
        }
      ).assertNotExecutable(tampered, preview),
    ).toThrow('Execution Readiness');
  });

  it('guard passes when approvedAt is null (normal preview)', () => {
    const { request, preview } = svc.preview(admin, { riskLevel: 'low' });
    expect(request.approvedAt).toBeNull();
    expect(() =>
      (
        svc as unknown as {
          assertNotExecutable: (r: unknown, p: unknown) => void;
        }
      ).assertNotExecutable(request, preview),
    ).not.toThrow();
  });
});
