import { ExecutionGuard } from './execution-guard.service';
import { ExecutionTicketBuilder } from './execution-ticket.builder';
import { ExecutionStateMachine } from './execution-state-machine';
import { ctx } from './execution-ticket.builder.spec';
import { ExecutionTicket } from './execution-ticket.types';

describe('ExecutionGuard (blocks unsafe tickets, no execute)', () => {
  let guard: ExecutionGuard;
  let builder: ExecutionTicketBuilder;

  beforeEach(() => {
    guard = new ExecutionGuard();
    builder = new ExecutionTicketBuilder(new ExecutionStateMachine());
  });

  const tamper = (over: Partial<ExecutionTicket>): ExecutionTicket => ({
    ...builder.build(ctx()),
    ...over,
  });

  it('safe ticket passes guard', () => {
    expect(guard.inspect(builder.build(ctx()))).toEqual([]);
    expect(guard.isSafe(builder.build(ctx()))).toBe(true);
  });

  it('blocks executionAllowed != false', () => {
    expect(
      guard.inspect(tamper({ executionAllowed: true as unknown as false })),
    ).toContain('execution-not-allowed');
  });

  it('blocks non read-only ticket', () => {
    expect(
      guard.inspect(tamper({ readOnly: false as unknown as true })),
    ).toContain('ticket-must-be-read-only');
  });

  it('blocks writeOperation / autoExecution / autoApproval flags', () => {
    const t = builder.build(ctx());
    const bad = {
      ...t,
      metadata: {
        ...t.metadata,
        writeOperation: true,
        autoExecution: true,
        autoApproval: true,
      },
    } as unknown as ExecutionTicket;
    const reasons = guard.inspect(bad);
    expect(reasons).toContain('write-operation-not-allowed');
    expect(reasons).toContain('auto-execution-not-allowed');
    expect(reasons).toContain('auto-approval-not-allowed');
  });

  it('blocks invalid permission', () => {
    const t = builder.build(ctx());
    const bad = {
      ...t,
      permissionSnapshot: { ...t.permissionSnapshot, allowed: false },
    } as unknown as ExecutionTicket;
    expect(guard.inspect(bad)).toContain('invalid-permission');
  });

  it('blocks auto-approved approval snapshot', () => {
    const t = builder.build(ctx());
    const bad = {
      ...t,
      approvalSnapshot: {
        ...t.approvalSnapshot,
        approved: true,
        approvedBy: 'u9',
      },
    } as unknown as ExecutionTicket;
    const reasons = guard.inspect(bad);
    expect(reasons).toContain('invalid-approval-auto-approved');
    expect(reasons).toContain('invalid-approval-approvedBy');
  });

  it('blocks approval with approvedAt != null (even if approved=false)', () => {
    const t = builder.build(ctx());
    const bad = {
      ...t,
      approvalSnapshot: {
        ...t.approvalSnapshot,
        approved: false,
        approvedAt: new Date(),
      },
    } as unknown as ExecutionTicket;
    expect(guard.inspect(bad)).toContain('invalid-approval-approvedAt');
  });

  it('blocks missing idempotency key', () => {
    expect(guard.inspect(tamper({ idempotencyKey: '' }))).toContain(
      'missing-idempotency-key',
    );
  });
});
