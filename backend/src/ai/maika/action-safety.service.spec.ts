import { ActionSafetyService } from './action-safety.service';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { ActionType } from './action-layer.types';

describe('ActionSafetyService (classify + safety, execution/write always false)', () => {
  let svc: ActionSafetyService;
  beforeEach(() => {
    svc = new ActionSafetyService(new VectorContentPolicyService());
  });

  it('classifies supported proposal type', () => {
    const c = svc.classify('member_review_proposal');
    expect(c.type).toBe(ActionType.MEMBER_REVIEW_PROPOSAL);
    expect(c.supported).toBe(true);
    expect(c.isWriteOrExecute).toBe(false);
  });

  it('classifies write/execute type as blocked', () => {
    expect(svc.classify('CREATE_RECEIPT').isWriteOrExecute).toBe(true);
    expect(svc.classify('UPDATE_MEMBER').isWriteOrExecute).toBe(true);
    expect(svc.classify('EXECUTE_ACTION').supported).toBe(false);
  });

  it('unsupported type → not supported, not write', () => {
    const c = svc.classify('FOO_BAR');
    expect(c.supported).toBe(false);
    expect(c.isWriteOrExecute).toBe(false);
  });

  it('safety always actionExecution/write = false', () => {
    const d = svc.evaluate(svc.classify('DATA_QUALITY_PROPOSAL'), undefined);
    expect(d.actionExecutionAllowed).toBe(false);
    expect(d.writeOperationsAllowed).toBe(false);
    expect(d.allowed).toBe(true);
  });

  it('write action → blocked reasons, allowed=false', () => {
    const d = svc.evaluate(svc.classify('SEND_TELEGRAM'), undefined);
    expect(d.allowed).toBe(false);
    expect(d.blockedReasons).toContain('write-or-execute-action-not-allowed');
  });

  it('finance objective blocked; PII redacted; no raw', () => {
    const d1 = svc.evaluate(
      svc.classify('MEMBER_REVIEW_PROPOSAL'),
      'số dư 5.000.000 đồng',
    );
    expect(d1.containsFinanceData).toBe(true);
    expect(d1.blockedReasons).toContain('finance-content-in-objective');

    const d2 = svc.evaluate(
      svc.classify('MEMBER_REVIEW_PROPOSAL'),
      'email a@picklefund.vn',
    );
    expect(d2.containsPii).toBe(true);
    expect(d2.redactedCount).toBeGreaterThan(0);
  });

  it('fund review action flags finance + warning', () => {
    const d = svc.evaluate(svc.classify('FUND_REVIEW_PROPOSAL'), undefined);
    expect(d.containsFinanceData).toBe(true);
    expect(d.safetyWarnings.join(' ')).toMatch(/tài chính/);
  });
});
