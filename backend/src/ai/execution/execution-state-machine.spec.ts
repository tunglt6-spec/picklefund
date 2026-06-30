import { ExecutionStateMachine } from './execution-state-machine';
import { ExecutionTicketStatus as S } from './execution-ticket.types';

describe('ExecutionStateMachine (definition only, no auto-transition)', () => {
  let sm: ExecutionStateMachine;
  beforeEach(() => {
    sm = new ExecutionStateMachine();
  });

  it('initial status is DRAFT', () => {
    expect(sm.initialStatus).toBe(S.DRAFT);
  });

  it('allows DRAFT → VALIDATED → READY', () => {
    expect(sm.canTransition(S.DRAFT, S.VALIDATED)).toBe(true);
    expect(sm.canTransition(S.VALIDATED, S.READY)).toBe(true);
  });

  it('disallows skipping (DRAFT → EXECUTING / DRAFT → READY)', () => {
    expect(sm.canTransition(S.DRAFT, S.EXECUTING)).toBe(false);
    expect(sm.canTransition(S.DRAFT, S.READY)).toBe(false);
  });

  it('any state can go to CANCELLED only from DRAFT/VALIDATED/READY', () => {
    expect(sm.canTransition(S.DRAFT, S.CANCELLED)).toBe(true);
    expect(sm.canTransition(S.READY, S.CANCELLED)).toBe(true);
    expect(sm.canTransition(S.SUCCEEDED, S.CANCELLED)).toBe(false);
  });

  it('terminal states have no transitions', () => {
    expect(sm.isTerminal(S.SUCCEEDED)).toBe(true);
    expect(sm.isTerminal(S.ROLLED_BACK)).toBe(true);
    expect(sm.isTerminal(S.CANCELLED)).toBe(true);
    expect(sm.isTerminal(S.DRAFT)).toBe(false);
  });

  it('nextStates returns a copy (no external mutation)', () => {
    const a = sm.nextStates(S.DRAFT);
    a.push(S.SUCCEEDED);
    expect(sm.nextStates(S.DRAFT)).not.toContain(S.SUCCEEDED);
  });
});
