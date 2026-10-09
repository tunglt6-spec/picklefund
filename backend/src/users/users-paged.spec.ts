import { UsersService } from './users.service';

describe('UsersService — phân trang & tổng hợp (Super Admin)', () => {
  const mk = () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1' }]),
        count: jest.fn().mockResolvedValue(68),
        groupBy: jest.fn().mockResolvedValue([{ role: 'CLUB_ADMIN', _count: { _all: 14 } }, { role: 'MEMBER_VIEW', _count: { _all: 50 } }]),
      },
    };
    return { svc: new UsersService(prisma, { onNewAccount: jest.fn() } as any), prisma };
  };

  it('chặn limit tối đa 100, mặc định 25, page ≥ 1, role lạ bị bỏ', async () => {
    const { svc, prisma } = mk();
    const r = await svc.findPaged({ page: -3, limit: 99999, role: 'HACKER' });
    const arg = prisma.user.findMany.mock.calls[0][0];
    expect(arg.take).toBe(100);
    expect(arg.skip).toBe(0);
    expect(arg.where.role).toBeUndefined();
    expect(r).toMatchObject({ total: 68, page: 1, limit: 100 });
    const d = await svc.findPaged({});
    expect(prisma.user.findMany.mock.calls[1][0].take).toBe(25);
    expect(d.limit).toBe(25);
  });

  it('tìm kiếm không phân biệt hoa thường trên tài khoản/email/họ tên/CLB; lọc vai trò hợp lệ', async () => {
    const { svc, prisma } = mk();
    await svc.findPaged({ page: 2, limit: 10, search: ' abc ', role: 'CLUB_ADMIN' });
    const arg = prisma.user.findMany.mock.calls[0][0];
    expect(arg.skip).toBe(10);
    expect(arg.where.role).toBe('CLUB_ADMIN');
    expect(arg.where.OR).toHaveLength(4);
    expect(arg.where.OR[0].username.contains).toBe('abc');
  });

  it('summary: tổng, hoạt động, bị khóa, theo vai trò', async () => {
    const { svc, prisma } = mk();
    prisma.user.count.mockResolvedValueOnce(68).mockResolvedValueOnce(60);
    prisma.user.findMany.mockResolvedValue([{ clubId: 'a' }, { clubId: 'b' }]);
    const s = await svc.summary();
    expect(s).toMatchObject({ total: 68, active: 60, inactive: 8, clubs: 2 });
    expect(s.byRole.CLUB_ADMIN).toBe(14);
    expect(s.byRole.SUPER_ADMIN).toBe(0);
  });
});
