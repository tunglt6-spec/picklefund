import { Test } from '@nestjs/testing';
import { DataQualityService } from './data-quality.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DataQualityService', () => {
  const members = [
    { fullName: 'Nguyễn Văn A', phone: '0900000001', email: 'a@x.vn', status: 'active' },
    { fullName: 'Nguyễn Văn A', phone: '0900000001', email: null, status: 'active' }, // trùng SĐT + trùng tên
    { fullName: 'Trần B', phone: null, email: null, status: 'active' }, // thiếu liên hệ
    { fullName: 'Đã Nghỉ', phone: null, email: null, status: 'left' }, // không tính (không active)
  ];

  const prisma = {
    member: { findMany: jest.fn().mockResolvedValue(members) },
    fundPeriod: { count: jest.fn() },
    attendanceSession: { count: jest.fn().mockResolvedValue(12) },
  };

  let svc: DataQualityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.fundPeriod.count
      .mockResolvedValueOnce(1) // activeChung
      .mockResolvedValueOnce(30); // totalPeriods
    const mod = await Test.createTestingModule({
      providers: [
        DataQualityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(DataQualityService);
  });

  it('phát hiện trùng SĐT / trùng tên / thiếu liên hệ, chỉ tính member active', async () => {
    const r = await svc.analyze('club-1');
    const byKey = Object.fromEntries(r.checks.map((c) => [c.key, c]));

    expect(byKey.DUP_PHONE.count).toBe(1);
    expect(byKey.DUP_PHONE.level).toBe('warning');
    expect(byKey.DUP_NAME.count).toBe(1);
    expect(byKey.MISSING_CONTACT.count).toBe(1); // chỉ "Trần B" active; "Đã Nghỉ" bị loại
    expect(byKey.MISSING_CONTACT.items).toContain('Trần B');

    expect(r.totals.members).toBe(4);
    expect(r.totals.activeMembers).toBe(3);
    expect(r.totals.sessions).toBe(12);
  });

  it('kỳ Quỹ Chính đang mở = 1 → ok; >1 → warning', async () => {
    const r1 = await svc.analyze('club-1');
    expect(r1.checks.find((c) => c.key === 'ACTIVE_CHUNG')!.level).toBe('ok');

    prisma.fundPeriod.count.mockReset();
    prisma.fundPeriod.count.mockResolvedValueOnce(2).mockResolvedValueOnce(30);
    const r2 = await svc.analyze('club-1');
    const chk = r2.checks.find((c) => c.key === 'ACTIVE_CHUNG')!;
    expect(chk.level).toBe('warning');
    expect(chk.count).toBe(2);
  });
});
