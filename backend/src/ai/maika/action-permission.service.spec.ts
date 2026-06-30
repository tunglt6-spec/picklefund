import { ActionPermissionService } from './action-permission.service';
import { ActionType, ActionTypeClassification } from './action-layer.types';

function cls(
  raw: string,
  type: ActionType | null,
  supported: boolean,
  isWrite: boolean,
): ActionTypeClassification {
  return { raw, type, supported, isWriteOrExecute: isWrite };
}

describe('ActionPermissionService (role/clubId từ context, không body)', () => {
  let svc: ActionPermissionService;
  beforeEach(() => {
    svc = new ActionPermissionService();
  });

  it('admin allowed for low-risk proposal', () => {
    const d = svc.check(
      { clubId: 'club-1', userId: 'u1', role: 'CLUB_ADMIN' },
      cls(
        'MEMBER_REVIEW_PROPOSAL',
        ActionType.MEMBER_REVIEW_PROPOSAL,
        true,
        false,
      ),
      'low',
    );
    expect(d.allowed).toBe(true);
    expect(d.clubId).toBe('club-1');
  });

  it('member denied', () => {
    const d = svc.check(
      { clubId: 'club-1', userId: 'u2', role: 'CLUB_MEMBER' },
      cls(
        'MEMBER_REVIEW_PROPOSAL',
        ActionType.MEMBER_REVIEW_PROPOSAL,
        true,
        false,
      ),
      'low',
    );
    expect(d.allowed).toBe(false);
  });

  it('write/execute denied regardless of role', () => {
    const d = svc.check(
      { clubId: 'club-1', userId: 'u1', role: 'CLUB_ADMIN' },
      cls('CREATE_MEMBER', null, false, true),
      'critical',
    );
    expect(d.allowed).toBe(false);
    expect(d.deniedReasons.join(' ')).toMatch(/write-or-execute/);
  });

  it('missing club scope / role denied', () => {
    const d = svc.check(
      { clubId: null, userId: null, role: null },
      cls(
        'DATA_QUALITY_PROPOSAL',
        ActionType.DATA_QUALITY_PROPOSAL,
        true,
        false,
      ),
      'low',
    );
    expect(d.allowed).toBe(false);
    expect(d.deniedReasons).toContain('missing-club-scope');
    expect(d.deniedReasons).toContain('missing-role');
  });

  it('treasurer allowed for high-risk fund review', () => {
    const d = svc.check(
      { clubId: 'club-1', userId: 'u3', role: 'CLUB_TREASURER' },
      cls('FUND_REVIEW_PROPOSAL', ActionType.FUND_REVIEW_PROPOSAL, true, false),
      'high',
    );
    expect(d.allowed).toBe(true);
  });
});
