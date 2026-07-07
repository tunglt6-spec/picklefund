import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { MemberScopeGuard } from './member-scope.guard';

function ctxFor(
  user: unknown,
  path: string,
  method = 'GET',
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, path, method }),
    }),
  } as unknown as ExecutionContext;
}

describe('MemberScopeGuard', () => {
  const guard = new MemberScopeGuard();

  describe('role không phải MEMBER_VIEW → luôn cho qua', () => {
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

  describe('MEMBER_VIEW — allowlist self/auth', () => {
    const member = { role: 'MEMBER_VIEW' };
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

  describe('MEMBER_VIEW — portal read-only (GET) toàn CLB', () => {
    const member = { role: 'MEMBER_VIEW' };
    it.each([
      '/api/attendance',
      '/api/attendance/sessions',
      '/api/fund-periods',
      '/api/fund-periods/x/summary',
      '/api/contributions',
      '/api/expenses',
      '/api/members',
      '/api/clubs/me',
      '/api/clubs/me/minigame-delegates',
    ])('cho phép GET %s', (path) => {
      expect(guard.canActivate(ctxFor(member, path, 'GET'))).toBe(true);
    });

    it('chặn mutation trên route GET-only (POST /attendance → 403)', () => {
      expect(() =>
        guard.canActivate(ctxFor(member, '/api/attendance', 'POST')),
      ).toThrow(ForbiddenException);
    });

    it.each(['/api/members', '/api/fund-periods', '/api/expenses'])(
      'chặn POST %s',
      (path) => {
        expect(() =>
          guard.canActivate(ctxFor(member, path, 'POST')),
        ).toThrow(ForbiddenException);
      },
    );
  });

  describe('MEMBER_VIEW — minigame mọi method (siết ở MinigameDelegateGuard)', () => {
    const member = { role: 'MEMBER_VIEW' };
    it.each([
      ['GET', '/api/minigames'],
      ['POST', '/api/minigames'],
      ['POST', '/api/minigames/mg-1/start'],
    ])('cho phép %s %s', (method, path) => {
      expect(guard.canActivate(ctxFor(member, path, method))).toBe(true);
    });
  });

  describe('MEMBER_VIEW — chặn route quản trị (403)', () => {
    const member = { role: 'MEMBER_VIEW' };
    it.each([
      '/api/reports/summary',
      '/api/users',
      '/api/clubs',
      '/api/clubs/abc-123',
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

    it('không lách được tiền tố GET-only (/members-export)', () => {
      expect(() =>
        guard.canActivate(ctxFor(member, '/api/members-export')),
      ).toThrow(ForbiddenException);
    });
  });
});
