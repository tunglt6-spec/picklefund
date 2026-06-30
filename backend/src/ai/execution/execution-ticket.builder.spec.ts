import { ExecutionTicketBuilder } from './execution-ticket.builder';
import { ExecutionStateMachine } from './execution-state-machine';
import {
  ExecutionContextInput,
  ExecutionTicketStatus,
} from './execution-ticket.types';

export function ctx(
  over: Partial<ExecutionContextInput> = {},
): ExecutionContextInput {
  return {
    actionProposalId: 'ap-1',
    clubId: 'club-1',
    createdBy: 'u1',
    riskLevel: 'low',
    permissionSnapshot: {
      allowed: true,
      role: 'CLUB_ADMIN',
      clubId: 'club-1',
      reasons: ['role-CLUB_ADMIN-permitted'],
      deniedReasons: [],
    },
    approvalSnapshot: {
      approvalId: 'apr-1',
      requiresHumanApproval: true,
      approved: false,
      approvedBy: null,
      approvedAt: null,
    },
    executionSnapshot: {
      actionType: 'MEMBER_REVIEW_PROPOSAL',
      source: 'maika',
      capturedAt: new Date(),
      dryRunReference: null,
    },
    ...over,
  };
}

describe('ExecutionTicketBuilder (read-only, no execute)', () => {
  let builder: ExecutionTicketBuilder;
  beforeEach(() => {
    builder = new ExecutionTicketBuilder(new ExecutionStateMachine());
  });

  it('creates a DRAFT ticket that is read-only and not executable', () => {
    const t = builder.build(ctx());
    expect(t.status).toBe(ExecutionTicketStatus.DRAFT);
    expect(t.readOnly).toBe(true);
    expect(t.executionAllowed).toBe(false);
    expect(t.ticketId).toBeTruthy();
    expect(t.metadata.mode).toBe('framework-only');
    expect(t.metadata.writeOperation).toBe(false);
    expect(t.metadata.autoExecution).toBe(false);
    expect(t.metadata.autoApproval).toBe(false);
  });

  it('captures permission/approval/execution snapshots', () => {
    const t = builder.build(ctx());
    expect(t.permissionSnapshot.allowed).toBe(true);
    expect(t.approvalSnapshot.approved).toBe(false);
    expect(t.approvalSnapshot.requiresHumanApproval).toBe(true);
    expect(t.snapshot.actionType).toBe('MEMBER_REVIEW_PROPOSAL');
  });

  it('derives a deterministic idempotencyKey when none provided', () => {
    const a = builder.build(ctx());
    const b = builder.build(ctx());
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    // ticketId vẫn khác nhau (mỗi build là một ticket riêng)
    expect(a.ticketId).not.toBe(b.ticketId);
  });

  it('hashes explicit idempotencyKey (never stores raw)', () => {
    const t = builder.build(ctx({ idempotencyKey: 'custom-key' }));
    expect(t.idempotencyKey).not.toBe('custom-key');
    expect(t.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('idempotencyKey never contains raw PII/finance from input', () => {
    const raw = 'email a@picklefund.vn phone 0987654321 số tiền 5.000.000 đồng';
    const t = builder.build(ctx({ idempotencyKey: raw }));
    expect(t.idempotencyKey).not.toContain('a@picklefund.vn');
    expect(t.idempotencyKey).not.toContain('0987654321');
    expect(t.idempotencyKey).not.toContain('5.000.000');
    expect(t.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('snapshots are immutable: mutating input after build does not affect ticket', () => {
    const input = ctx();
    const t = builder.build(input);
    // Mutate input sau khi build (cast bỏ readonly để mô phỏng caller cố tình sửa).
    (input.executionSnapshot as { actionType: string }).actionType = 'TAMPERED';
    input.permissionSnapshot.reasons.push('tampered');
    (input.permissionSnapshot as { allowed: boolean }).allowed = false;
    (input.approvalSnapshot as { approvedBy: string | null }).approvedBy =
      'hacker';

    expect(t.snapshot.actionType).toBe('MEMBER_REVIEW_PROPOSAL');
    expect(t.permissionSnapshot.reasons).not.toContain('tampered');
    expect(t.permissionSnapshot.allowed).toBe(true);
    expect(t.approvalSnapshot.approvedBy).toBeNull();
  });

  it('ticket snapshots are frozen (cannot be mutated)', () => {
    const t = builder.build(ctx());
    expect(Object.isFrozen(t.snapshot)).toBe(true);
    expect(Object.isFrozen(t.permissionSnapshot)).toBe(true);
    expect(Object.isFrozen(t.approvalSnapshot)).toBe(true);
  });

  it('throws when clubId or actionProposalId missing', () => {
    expect(() => builder.build(ctx({ clubId: '' }))).toThrow('clubId');
    expect(() => builder.build(ctx({ actionProposalId: '' }))).toThrow(
      'actionProposalId',
    );
  });
});
