import { ScoringService } from './scoring.service';
import {
  DEFAULT_SCORING_RULES,
  classifyScore,
} from './scoring-rules.constant';

/** Mock PrismaService — chỉ các model/method ScoringService dùng. */
function createMockPrisma() {
  return {
    scoringRule: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'r1' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    club: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    member: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    memberScoreEvent: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'ev1' }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn(),
    },
    memberScoreSnapshot: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    attendanceSession: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    attendanceRecord: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    fundPeriod: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    fundContribution: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('ScoringService (chấm điểm thành viên động — Phase 1)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let svc: ScoringService;

  beforeEach(() => {
    prisma = createMockPrisma();
    svc = new ScoringService(prisma as never);
  });

  describe('computeMemberScore', () => {
    it('baseline 100 khi không có event', async () => {
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(100);
      expect(r.classification).toBe('Xuất sắc');
    });

    it('100 + (+2 +3 -5) = 100, clamp không vượt trần', async () => {
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: 0 },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(100);
    });

    it('nhiều delta âm → clamp không dưới 0', async () => {
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: -250 },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(0);
      expect(r.classification).toBe('Xem xét tư cách thành viên');
    });

    it('giá trị giữa: tổng -25 → 75 → Đạt', async () => {
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: -25 },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(75);
      expect(r.classification).toBe('Đạt');
    });
  });

  describe('classifyScore biên', () => {
    it.each([
      [100, 'Xuất sắc'],
      [95, 'Xuất sắc'],
      [94, 'Tốt'],
      [85, 'Tốt'],
      [84, 'Đạt'],
      [70, 'Đạt'],
      [69, 'Cần cải thiện'],
      [50, 'Cần cải thiện'],
      [49, 'Xem xét tư cách thành viên'],
      [0, 'Xem xét tư cách thành viên'],
    ])('score %i → %s', (score, expected) => {
      expect(classifyScore(score)).toBe(expected);
    });
  });

  describe('seedDefaultRules (idempotent)', () => {
    it('club chưa có rule → created=21, skipped=0', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue(null);
      const r = await svc.seedDefaultRules('c1');
      expect(r.created).toBe(DEFAULT_SCORING_RULES.length);
      expect(r.created).toBe(21);
      expect(r.skipped).toBe(0);
      expect(prisma.scoringRule.create).toHaveBeenCalledTimes(21);
    });

    it('chạy lần 2 (đã có) → created=0, skipped=21', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue({ id: 'existing' });
      const r = await svc.seedDefaultRules('c1');
      expect(r.created).toBe(0);
      expect(r.skipped).toBe(21);
      expect(prisma.scoringRule.create).not.toHaveBeenCalled();
    });
  });

  describe('getPeriodScores', () => {
    it('member A tổng -10 → 90 Tốt, member B không event → 100 Xuất sắc', async () => {
      prisma.member.findMany.mockResolvedValue([
        { id: 'A', fullName: 'An' },
        { id: 'B', fullName: 'Bình' },
      ]);
      prisma.memberScoreEvent.groupBy.mockResolvedValue([
        { memberId: 'A', _sum: { delta: -10 } },
      ]);

      const rows = await svc.getPeriodScores('c1', '2026-07');
      const a = rows.find((r) => r.memberId === 'A')!;
      const b = rows.find((r) => r.memberId === 'B')!;

      expect(a.total).toBe(90);
      expect(a.classification).toBe('Tốt');
      expect(a.memberName).toBe('An');
      expect(b.total).toBe(100);
      expect(b.classification).toBe('Xuất sắc');
    });
  });

  // ── Phase 2 ────────────────────────────────────────────────────────────

  describe('createRule', () => {
    it('tạo rule MANUAL active, validate ok', async () => {
      await svc.createRule('c1', {
        category: 'CONDUCT',
        label: 'Fair play',
        delta: 3,
      });
      expect(prisma.scoringRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'c1',
            category: 'CONDUCT',
            label: 'Fair play',
            delta: 3,
            source: 'MANUAL',
            active: true,
          }),
        }),
      );
    });

    it('category lạ → BadRequest', async () => {
      await expect(
        svc.createRule('c1', {
          category: 'HACK' as never,
          label: 'x',
          delta: 1,
        }),
      ).rejects.toThrow('Danh mục');
    });

    it('delta không nguyên/ngoài range → BadRequest', async () => {
      await expect(
        svc.createRule('c1', { category: 'BONUS', label: 'x', delta: 999 }),
      ).rejects.toThrow('delta');
    });
  });

  describe('updateRule (scope clubId)', () => {
    it('rule khác club → NotFound', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue(null);
      await expect(
        svc.updateRule('c1', 'r-other', { label: 'x' }),
      ).rejects.toThrow('không tồn tại');
    });

    it('rule thuộc club → update field cho phép', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.scoringRule.update.mockResolvedValue({ id: 'r1' });
      await svc.updateRule('c1', 'r1', { delta: 5, active: false });
      expect(prisma.scoringRule.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { delta: 5, active: false },
      });
    });
  });

  describe('deleteRule (scope clubId)', () => {
    it('rule khác club → NotFound', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue(null);
      await expect(svc.deleteRule('c1', 'r-other')).rejects.toThrow(
        'không tồn tại',
      );
    });

    it('rule thuộc club → delete', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue({ id: 'r1' });
      await svc.deleteRule('c1', 'r1');
      expect(prisma.scoringRule.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });
  });

  describe('addManualEvent', () => {
    it('member không thuộc club → BadRequest', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(
        svc.addManualEvent(
          'c1',
          { memberId: 'm-other', category: 'BONUS', label: 'x', delta: 5 },
          'admin',
        ),
      ).rejects.toThrow('không thuộc CLB');
    });

    it('có ruleId → ưu tiên category/label/delta từ rule khi dto không truyền', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.scoringRule.findFirst.mockResolvedValue({
        id: 'r1',
        category: 'DISCIPLINE',
        label: 'Gian lận thi đấu',
        delta: -10,
      });
      await svc.addManualEvent(
        'c1',
        { memberId: 'm1', ruleId: 'r1', periodMonth: '2026-07' },
        'admin',
      );
      expect(prisma.memberScoreEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'm1',
            ruleId: 'r1',
            category: 'DISCIPLINE',
            label: 'Gian lận thi đấu',
            delta: -10,
            source: 'MANUAL',
            refId: null,
            periodMonth: '2026-07',
          }),
        }),
      );
    });
  });

  describe('finalizePeriod', () => {
    it('upsert snapshot cho mọi member active', async () => {
      prisma.member.findMany.mockResolvedValue([
        { id: 'A', fullName: 'An' },
        { id: 'B', fullName: 'Bình' },
      ]);
      prisma.memberScoreEvent.groupBy.mockResolvedValue([
        { memberId: 'A', _sum: { delta: -10 } },
      ]);
      const r = await svc.finalizePeriod('c1', '2026-07', 'admin');
      expect(r.finalized).toBe(2);
      expect(prisma.memberScoreSnapshot.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.memberScoreSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId_periodMonth: { memberId: 'A', periodMonth: '2026-07' } },
        }),
      );
    });
  });

  describe('runAutoScoring', () => {
    it('2 buổi PRESENT → 2 event điểm danh +2; đúng hạn +2 / nợ quá hạn -10; createMany skipDuplicates', async () => {
      // Rule điểm danh (khớp qua systemKey)
      prisma.scoringRule.findFirst.mockResolvedValue({
        id: 'ra',
        systemKey: 'PARTICIPATION_ON_TIME',
        label: 'Tham gia đúng giờ',
        delta: 2,
      });
      // Rule tài chính (khớp qua systemKey, không phụ thuộc label)
      prisma.scoringRule.findMany.mockResolvedValue([
        { id: 'rf1', systemKey: 'FINANCE_ON_TIME', label: 'Đóng quỹ đúng hạn', delta: 2 },
        { id: 'rf2', systemKey: 'FINANCE_LATE', label: 'Đóng quỹ trễ hạn', delta: -5 },
        { id: 'rf3', systemKey: 'FINANCE_OVERDUE', label: 'Nợ quỹ quá hạn', delta: -10 },
      ]);
      // 1 buổi trong tháng, 2 record PRESENT
      prisma.attendanceSession.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { memberId: 'm1', attendanceSessionId: 's1' },
        { memberId: 'm2', attendanceSessionId: 's1' },
      ]);
      // 1 kỳ quỹ endDate trong tháng (quá hạn so với hôm nay 2026-07)
      prisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'fp1', endDate: new Date('2020-01-31') },
      ]);
      prisma.member.findMany.mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
      ]);
      // m1 đã đóng đúng hạn (batch findMany trả list), m2 chưa đóng (không có trong list)
      prisma.fundContribution.findMany.mockResolvedValue([
        { fundPeriodId: 'fp1', memberId: 'm1', paymentDate: new Date('2020-01-15') },
      ]);

      const r = await svc.runAutoScoring('c1', '2020-01');
      expect(r.attendanceEvents).toBe(2);
      expect(r.financeEvents).toBe(2); // m1 đúng hạn, m2 nợ quá hạn

      const call = prisma.memberScoreEvent.createMany.mock.calls[0][0];
      expect(call.skipDuplicates).toBe(true);
      const deltas = call.data.map((e: { delta: number }) => e.delta).sort();
      // [-10, +2, +2, +2] → điểm danh m1/m2 (+2,+2), đúng hạn m1 (+2), nợ m2 (-10)
      expect(deltas).toEqual([-10, 2, 2, 2]);
    });

    it('không có rule điểm danh active → bỏ nhánh điểm danh', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue(null);
      prisma.scoringRule.findMany.mockResolvedValue([]);
      const r = await svc.runAutoScoring('c1', '2026-07');
      expect(r.attendanceEvents).toBe(0);
      expect(r.financeEvents).toBe(0);
    });

    it('khớp rule qua systemKey kể cả khi CLB ĐỔI LABEL (bền vững)', async () => {
      // Rule điểm danh label đã bị đổi tùy ý nhưng systemKey giữ nguyên → vẫn khớp.
      prisma.scoringRule.findFirst.mockResolvedValue({
        id: 'ra',
        systemKey: 'PARTICIPATION_ON_TIME',
        label: 'Đi tập chuyên cần (CLB tự đặt)',
        delta: 2,
      });
      prisma.scoringRule.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { memberId: 'm1', attendanceSessionId: 's1' },
      ]);
      prisma.fundPeriod.findMany.mockResolvedValue([]);
      const r = await svc.runAutoScoring('c1', '2026-07');
      expect(r.attendanceEvents).toBe(1); // khớp dù label khác mặc định
    });
  });
});
