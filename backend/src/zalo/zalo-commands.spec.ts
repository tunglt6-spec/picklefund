import { BadRequestException } from '@nestjs/common';
import { parseZaloCommand } from './zalo-commands';
import { rankPlayers, rankTeamRows, zaloStandingsText } from './zalo-standings';
import { parseIntake, parseVnAmount } from './zalo-intake.parser';
import { ZaloCommandService } from './zalo-commands.service';

describe('parseZaloCommand', () => {
  it('nhận lệnh sau @mention và tham số số', () => {
    expect(parseZaloCommand('@Bot /quy')).toEqual({ name: 'quy', index: undefined });
    expect(parseZaloCommand('/dangky 2')).toEqual({ name: 'dangky', index: 2 });
    expect(parseZaloCommand('/HuyDangKy')).toEqual({ name: 'huy', index: undefined });
  });
  it('bỏ qua chat thường và lệnh không nằm cuối', () => {
    expect(parseZaloCommand('hôm nay /quy nhé các bạn')).toBeNull();
    expect(parseZaloCommand('/abc')).toBeNull();
    expect(parseZaloCommand('xin chào')).toBeNull();
  });
});

describe('xếp hạng', () => {
  it('đội: điểm → thắng → tên', () => {
    const r = rankTeamRows([
      { name: 'B', wins: 1, losses: 1, points: 3 },
      { name: 'A', wins: 2, losses: 0, points: 3 },
      { name: 'C', wins: 0, losses: 2, points: 6 },
    ]);
    expect(r.map((x) => x.name)).toEqual(['C', 'A', 'B']);
  });
  it('cá nhân: thắng → hiệu số', () => {
    const r = rankPlayers([
      { scoreA: 11, scoreB: 5, winnerIsA: true, teamA: ['An', 'Bình'], teamB: ['Cường', 'Dũng'] },
      { scoreA: 11, scoreB: 9, winnerIsA: false, teamA: ['An', 'Cường'], teamB: ['Bình', 'Dũng'] },
    ]);
    expect(r[0].name).toBe('Bình');
    expect(r.find((x) => x.name === 'An')!.won).toBe(1);
    expect(
      zaloStandingsText({ clubName: 'CLB', title: 'Giải', subtitle: 's', rows: r, updatedAt: '', logo: null }),
    ).toContain('1. Bình');
  });
});

describe('parseVnAmount', () => {
  it.each([
    ['300k', 300000],
    ['300 nghìn', 300000],
    ['300.000', 300000],
    ['1tr', 1000000],
    ['1,5tr', 1500000],
    ['1tr5', 1500000],
    ['2 triệu', 2000000],
    ['450000đ', 450000],
  ])('%s', (t, v) => expect(parseVnAmount(t)?.amount).toBe(v));
  it('không đoán số trần nhỏ', () => expect(parseVnAmount('300')).toBeNull());
});

describe('parseIntake tự nhiên', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  it('thu: tên + số tiền + hôm nay mặc định', () => {
    const r = parseIntake('@Bot /thu Nguyễn Văn A đóng 300k')!;
    expect(r.kind).toBe('INCOME');
    expect(r.payload).toMatchObject({ amount: 300000, description: 'Nguyễn Văn A', fundSource: 'COMMON', date: today });
  });
  it('quỹ phụ + ngày tương đối', () => {
    const r = parseIntake('/thu Lan nộp 1tr5 quỹ phụ hôm qua')!;
    expect(r.payload.fundSource).toBe('MINI');
    expect(r.payload.amount).toBe(1500000);
    expect(r.payload.date < today).toBe(true);
  });
  it('chi: giữ nội dung', () => {
    const r = parseIntake('/chi tiền sân 600.000 ngày 01/01/2026')!;
    expect(r.kind).toBe('EXPENSE');
    expect(r.payload).toMatchObject({ amount: 600000, description: 'tiền sân', date: '2026-01-01' });
  });
  it('thiếu số tiền / thiếu tên → từ chối', () => {
    expect(() => parseIntake('/thu Nguyễn Văn A')).toThrow(BadRequestException);
    expect(() => parseIntake('/thu 300k')).toThrow(BadRequestException);
  });
  it('cú pháp cũ vẫn chạy', () => {
    expect(parseIntake('/thu 450000 | A | quỹ chính | 01/01/2026')!.payload.amount).toBe(450000);
  });
});

describe('ZaloCommandService', () => {
  const conn = { version: 'v1', chatId: 'g1', commandsEnabled: true };
  const msg = (text: string, type = 'GROUP', id = 'u1') => ({
    text,
    from: { id },
    chat: { id: type === 'GROUP' ? 'g1' : id, chat_type: type },
  });
  const report = async () => ({
    report: { clubName: 'CLB', periodName: 'K1', balance: 1000, carry: 0, income: 1500, expense: 500, mini: 200 } as any,
  });
  const mk = (over: any = {}) => {
    const prisma: any = {
      zaloIdentity: { findFirst: jest.fn().mockResolvedValue(over.identity ?? null) },
      fundPeriod: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p', name: 'K1', contributionAmount: 100000, dueDate: null }),
      },
      member: {
        findMany: jest.fn().mockResolvedValue([{ id: 'm1', fullName: 'An' }, { id: 'm2', fullName: 'Bình' }]),
        findFirst: jest.fn().mockResolvedValue(over.member ?? null),
      },
      fundContribution: { findMany: jest.fn().mockResolvedValue([{ memberId: 'm1', isConfirmed: true }]) },
      attendanceSession: { findMany: jest.fn().mockResolvedValue(over.sessions ?? []) },
      sessionRegistration: { upsert: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(1) },
      auditLog: { create: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ role: over.role ?? 'MEMBER_VIEW', isActive: true }) },
    };
    return { prisma, svc: new ZaloCommandService(prisma) };
  };
  it('tắt cờ → im lặng', async () => {
    const { svc } = mk();
    expect(await svc.handle('c', { ...conn, commandsEnabled: false }, msg('/quy'), report)).toBeNull();
  });
  it('/quy trong nhóm', async () => {
    const { svc } = mk();
    expect(await svc.handle('c', conn, msg('/quy'), report)).toContain('Quỹ chính: 1.000');
  });
  it('/congno trong nhóm không lộ tên', async () => {
    const { svc } = mk();
    const t = (await svc.handle('c', conn, msg('/congno'), report))!;
    expect(t).toContain('1/2');
    expect(t).not.toContain('Bình');
  });
  it('/congno chat riêng của thủ quỹ có tên', async () => {
    const { svc } = mk({ identity: { userId: 'u', zaloUserId: 'z' }, role: 'CLUB_TREASURER' });
    expect(await svc.handle('c', conn, msg('/congno', 'PRIVATE', 'z'), report)).toContain('Bình');
  });
  it('chat riêng người lạ → null', async () => {
    const { svc } = mk();
    expect(await svc.handle('c', conn, msg('/quy', 'PRIVATE', 'x'), report)).toBeNull();
  });
  it('nhóm khác → null', async () => {
    const { svc } = mk();
    const m = { ...msg('/quy'), chat: { id: 'other', chat_type: 'GROUP' } };
    expect(await svc.handle('c', conn, m, report)).toBeNull();
  });
  it('/dangky cần liên kết', async () => {
    const { svc } = mk();
    expect(await svc.handle('c', conn, msg('/dangky'), report)).toContain('chưa liên kết');
  });
  it('/dangky ghi đăng ký + audit cho thành viên đã liên kết', async () => {
    const s = {
      id: 's1',
      sessionDate: new Date('2099-01-01T00:00:00Z'),
      startTime: '08:00',
      endTime: '10:00',
      courtName: 'Sân A',
      _count: { registrations: 0 },
    };
    const { svc, prisma } = mk({
      identity: { userId: 'u', zaloUserId: 'u1' },
      member: { id: 'm1', fullName: 'An' },
      sessions: [s],
    });
    expect(await svc.handle('c', conn, msg('/dangky'), report)).toContain('Đã đăng ký');
    expect(prisma.sessionRegistration.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
  it('throttle 15s theo lệnh', async () => {
    const { svc } = mk();
    await svc.handle('c', conn, msg('/lich'), report);
    expect(await svc.handle('c', conn, msg('/lich'), report)).toBeNull();
  });
});
