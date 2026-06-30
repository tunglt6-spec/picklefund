import { ExecutionTicketValidator } from './execution-ticket.validator';
import { ExecutionGuard } from './execution-guard.service';
import { ExecutionTicketBuilder } from './execution-ticket.builder';
import { ExecutionStateMachine } from './execution-state-machine';
import { ctx } from './execution-ticket.builder.spec';
import { ExecutionTicket } from './execution-ticket.types';

describe('ExecutionTicketValidator (structure + guard, no execute)', () => {
  let validator: ExecutionTicketValidator;
  let builder: ExecutionTicketBuilder;

  beforeEach(() => {
    validator = new ExecutionTicketValidator(new ExecutionGuard());
    builder = new ExecutionTicketBuilder(new ExecutionStateMachine());
  });

  it('valid ticket → valid=true, no errors', () => {
    const r = validator.validate(builder.build(ctx()));
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('invalid status → error', () => {
    const bad = {
      ...builder.build(ctx()),
      status: 'WAT' as unknown,
    } as ExecutionTicket;
    const r = validator.validate(bad);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('invalid-status');
  });

  it('surfaces guard errors (execution not allowed)', () => {
    const bad = {
      ...builder.build(ctx()),
      executionAllowed: true as unknown as false,
    } as ExecutionTicket;
    const r = validator.validate(bad);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('execution-not-allowed');
  });

  it('missing core fields → errors', () => {
    const bad = {
      ...builder.build(ctx()),
      ticketId: '',
      clubId: '',
    } as ExecutionTicket;
    const r = validator.validate(bad);
    expect(r.errors).toContain('missing-ticketId');
    expect(r.errors).toContain('missing-clubId');
  });
});
