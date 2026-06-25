import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';

function makeCtx(user: any, isPublic = false): ExecutionContext {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as unknown as Reflector;
  const request = { user, clubId: undefined as string | undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    _request: request,
    _reflector: reflector,
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new TenantGuard(reflector);
  });

  it('should allow public endpoints without auth', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = makeCtx(undefined, true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny when user is missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const ctx = makeCtx(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should allow SUPER_ADMIN without clubId', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const ctx = makeCtx({ role: 'SUPER_ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when CLUB_ADMIN has no clubId', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const ctx = makeCtx({ role: 'CLUB_ADMIN', clubId: undefined });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow CLUB_ADMIN with clubId and inject it into request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const request = { user: { role: 'CLUB_ADMIN', clubId: 'club-1' }, clubId: undefined as string | undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.clubId).toBe('club-1');
  });

  it('should allow CLUB_MEMBER with clubId', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const ctx = makeCtx({ role: 'CLUB_MEMBER', clubId: 'club-2' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
