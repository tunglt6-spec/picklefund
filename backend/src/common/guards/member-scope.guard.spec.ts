import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { MemberScopeGuard } from './member-scope.guard';

function ctxFor(user: unknown, path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, path }),
    }),
  } as unknown as ExecutionContext;
}

describe('MemberScopeGuard', () => {
  const guard = new MemberScopeGuard();

  describe('role không phải CLUB_MEMBER → luôn cho qua', () => {
    it.each([
      ['SUPER_ADMIN', '/api/members'],
      ['CLUB_ADMIN', '/api/fund-periods'],
      ['CLUB_TREASURER', '/api/expenses'],
    ])('%s truy cập %s được phép', (role, path) => {
      expect(guard.canActivate(ctxFor({ role }, path))).toBe(true);
    });

    it('không có user (route public) → cho qua', () => {
      expect(guard.canActivate(ctxFor(undefined, '/api/auth/login'))).toBe(
        true,
      );
    });
  });

  describe('CLUB_MEMBER — allowlist self/auth', () => {
    const member = { role: 'CLUB_MEMBER' };
    it.each([
      '/api/member/me',
      '/api/member/me/attendance',
      '/api/member/me/finance',
      '/api/auth/me',
      '/api/auth/change-password',
      '/api/lisa/brief',
      '/api/hermes/notifications',
      '/api/hermes/notifications/abc/read',
      '/api/personal-receipts/mine',
    ])('cho phép %s', (path) => {
      expect(guard.canActivate(ctxFor(member, path))).toBe(true);
    });
  });

  describe('CLUB_MEMBER — chặn route quản trị (403)', () => {
    const member = { role: 'CLUB_MEMBER' };
    it.each([
      '/api/members',
      '/api/members/mem-B',
      '/api/fund-periods',
      '/api/attendance',
      '/api/contributions',
      '/api/expenses',
      '/api/minigames',
      '/api/reports/summary',
      '/api/users',
      '/api/clubs',
      '/api/personal-receipts', // danh sách toàn CLB — không phải /mine
    ])('chặn %s', (path) => {
      expect(() => guard.canActivate(ctxFor(member, path))).toThrow(
        ForbiddenException,
      );
    });

    it('không lách được bằng path traversal tiền tố (/member-accounts)', () => {
      expect(() =>
        guard.canActivate(ctxFor(member, '/api/member-accounts')),
      ).toThrow(ForbiddenException);
    });
  });
});
