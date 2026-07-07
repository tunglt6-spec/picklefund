import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { MinigameDelegateGuard } from './minigame-delegate.guard';
import type { PrismaService } from '../prisma/prisma.service';

function ctxFor(user: unknown, method: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, method, path: '/api/minigames' }),
    }),
  } as unknown as ExecutionContext;
}

describe('MinigameDelegateGuard', () => {
  const prisma = {
    club: { findUnique: jest.fn() },
  };
  const guard = new MinigameDelegateGuard(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.club.findUnique.mockResolvedValue({
      settings: { minigameDelegateMemberIds: ['mem-A'] },
    });
  });

  it('GET luôn cho qua (kể cả MEMBER_VIEW chưa ủy quyền)', async () => {
    const user = { role: 'MEMBER_VIEW', memberId: 'mem-X', clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'GET'))).resolves.toBe(true);
    expect(prisma.club.findUnique).not.toHaveBeenCalled();
  });

  it('CLUB_ADMIN POST cho qua (role khác do RolesGuard xử lý)', async () => {
    const user = { role: 'CLUB_ADMIN', memberId: null, clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'POST'))).resolves.toBe(true);
    expect(prisma.club.findUnique).not.toHaveBeenCalled();
  });

  it('MEMBER_VIEW POST KHÔNG nằm trong delegates → Forbidden', async () => {
    const user = { role: 'MEMBER_VIEW', memberId: 'mem-X', clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('MEMBER_VIEW POST nằm trong delegates → cho qua', async () => {
    const user = { role: 'MEMBER_VIEW', memberId: 'mem-A', clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'POST'))).resolves.toBe(true);
    expect(prisma.club.findUnique).toHaveBeenCalledWith({
      where: { id: 'club-1' },
      select: { settings: true },
    });
  });

  it('MEMBER_VIEW chưa liên kết member (memberId null) → Forbidden', async () => {
    const user = { role: 'MEMBER_VIEW', memberId: null, clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('CLB chưa cấu hình delegates (settings null) → Forbidden', async () => {
    prisma.club.findUnique.mockResolvedValue({ settings: null });
    const user = { role: 'MEMBER_VIEW', memberId: 'mem-A', clubId: 'club-1' };
    await expect(guard.canActivate(ctxFor(user, 'POST'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
