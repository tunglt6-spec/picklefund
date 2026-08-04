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
      groupBy: jest.fn().mockResolvedValue([]),
    },
    fundPeriod: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    fundContribution: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    // $transaction(array) — chạy như Promise.all (finalizePeriod gom upsert vào 1 transaction).
    $transaction: jest.fn((ops: unknown) =>
      Array.isArray(ops) ? Promise.all(ops) : (ops as (p: unknown) => unknown)(undefined),
    ),
  };
}

describe('ScoringService (chấm điểm thành viên động — Phase 1)', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let svc: ScoringService;

  beforeEach(() => {
    prisma = createMockPrisma();
    svc = new ScoringService(prisma as never);
  });

  describe('computeMemberScore (LIVE, chỉ giảm)', () => {
    /** Mock 3 AUTO rule mặc định (vắng -5, trễ -5, nợ -10). */
    function mockAutoRules() {
      prisma.scoringRule.findMany.mockResolvedValue([
        { systemKey: 'ATTENDANCE_ABSENT', delta: -5 },
        { systemKey: 'FINANCE_LATE', delta: -5 },
        { systemKey: 'FINANCE_OVERDUE', delta: -10 },
      ]);
    }

    it('0 vắng + đóng đủ → 100 Xuất sắc', async () => {
      mockAutoRules();
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(100);
      expect(r.classification).toBe('Xuất sắc');
    });

    /**
     * Mock 2 lần groupBy của attendanceRecord (model MỚI):
     *  - by ['attendanceSessionId'] → buổi ĐÃ điểm danh (mẫu số TB).
     *  - by ['memberId'] status ABSENT → số buổi vắng / member.
     */
    function mockAttendance(
      attendedIds: string[],
      absent: Array<{ memberId: string; count: number }>,
    ) {
      prisma.attendanceRecord.groupBy.mockImplementation((args: any) =>
        Promise.resolve(
          args?.by?.includes('attendanceSessionId')
            ? attendedIds.map((id) => ({
                attendanceSessionId: id,
                _count: { _all: 1 },
              }))
            : absent.map((a) => ({
                memberId: a.memberId,
                _count: { _all: a.count },
              })),
        ),
      );
    }

    it('vắng 1/4 buổi (đi 75%) → 75 Đạt', async () => {
      mockAutoRules();
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      mockAttendance(
        ['s1', 's2', 's3', 's4'],
        [{ memberId: 'm1', count: 1 }],
      );
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      // đi 3/4 = 75%
      expect(r.total).toBe(75);
      expect(r.classification).toBe('Đạt');
    });

    it('vắng 1/4 (đi 75%) + 1 kỳ nợ (-10) → 65 Cần cải thiện', async () => {
      mockAutoRules();
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      mockAttendance(
        ['s1', 's2', 's3', 's4'],
        [{ memberId: 'm1', count: 1 }],
      );
      prisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'fp1', endDate: new Date('2020-01-31') }, // quá hạn
      ]);
      prisma.member.findMany.mockResolvedValue([{ id: 'm1' }]);
      prisma.fundContribution.findMany.mockResolvedValue([]); // chưa đóng → nợ
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2020-01');
      // 75 (đi 75%) − 10 (nợ 1 kỳ) = 65
      expect(r.total).toBe(65);
      expect(r.classification).toBe('Cần cải thiện');
    });

    it('vắng 2/4 (đi 50%) + manual -100 → clamp ≥ 0', async () => {
      mockAutoRules();
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      mockAttendance(
        ['s1', 's2', 's3', 's4'],
        [{ memberId: 'm1', count: 2 }],
      ); // đi 50%
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: -100 },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2026-07');
      expect(r.total).toBe(0);
      expect(r.classification).toBe('Xem xét tư cách thành viên');
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
    it('club chưa có rule → created=13, skipped=0', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue(null);
      const r = await svc.seedDefaultRules('c1');
      expect(r.created).toBe(DEFAULT_SCORING_RULES.length);
      expect(r.created).toBe(13);
      expect(r.skipped).toBe(0);
      expect(prisma.scoringRule.create).toHaveBeenCalledTimes(13);
    });

    it('chạy lần 2 (đã có) → created=0, skipped=13', async () => {
      prisma.scoringRule.findFirst.mockResolvedValue({ id: 'existing' });
      const r = await svc.seedDefaultRules('c1');
      expect(r.created).toBe(0);
      expect(r.skipped).toBe(DEFAULT_SCORING_RULES.length);
      expect(prisma.scoringRule.create).not.toHaveBeenCalled();
    });
  });

  describe('getPeriodScores (LIVE, sắp theo điểm)', () => {
    it('A vắng 2/4 → 50, B sạch → 100; sắp B trước A', async () => {
      prisma.scoringRule.findMany.mockResolvedValue([
        { systemKey: 'ATTENDANCE_ABSENT', delta: -5 },
        { systemKey: 'FINANCE_LATE', delta: -5 },
        { systemKey: 'FINANCE_OVERDUE', delta: -10 },
      ]);
      prisma.member.findMany.mockResolvedValue([
        { id: 'A', fullName: 'An' },
        { id: 'B', fullName: 'Bình' },
      ]);
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      prisma.attendanceRecord.groupBy.mockImplementation((args: any) =>
        Promise.resolve(
          args?.by?.includes('attendanceSessionId')
            ? [
                { attendanceSessionId: 's1', _count: { _all: 1 } },
                { attendanceSessionId: 's2', _count: { _all: 1 } },
                { attendanceSessionId: 's3', _count: { _all: 1 } },
                { attendanceSessionId: 's4', _count: { _all: 1 } },
              ]
            : [{ memberId: 'A', _count: { _all: 2 } }],
        ),
      );
      prisma.memberScoreEvent.groupBy.mockResolvedValue([]);

      const rows = await svc.getPeriodScores('c1', '2026-07');
      const a = rows.find((r) => r.memberId === 'A')!;
      const b = rows.find((r) => r.memberId === 'B')!;

      expect(a.total).toBe(50); // đi 2/4 = 50%
      expect(a.classification).toBe('Cần cải thiện');
      expect(a.memberName).toBe('An');
      expect(b.total).toBe(100);
      // (1) sắp theo điểm giảm dần → B (100) trước A (50)
      expect(rows[0].memberId).toBe('B');
      expect(rows[1].memberId).toBe('A');
    });
  });

  describe('getMemberDetail (LIVE autoLines)', () => {
    it('autoLines phản ánh "Vắng N buổi" và "Nợ M kỳ"', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', fullName: 'An' });
      prisma.scoringRule.findMany.mockResolvedValue([
        { systemKey: 'ATTENDANCE_ABSENT', delta: -5 },
        { systemKey: 'FINANCE_LATE', delta: -5 },
        { systemKey: 'FINANCE_OVERDUE', delta: -10 },
      ]);
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      prisma.attendanceRecord.groupBy.mockImplementation((args: any) =>
        Promise.resolve(
          args?.by?.includes('attendanceSessionId')
            ? [
                { attendanceSessionId: 's1', _count: { _all: 1 } },
                { attendanceSessionId: 's2', _count: { _all: 1 } },
                { attendanceSessionId: 's3', _count: { _all: 1 } },
                { attendanceSessionId: 's4', _count: { _all: 1 } },
              ]
            : [{ memberId: 'm1', _count: { _all: 1 } }],
        ),
      );
      prisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'fp1', endDate: new Date('2020-01-31') },
      ]);
      prisma.member.findMany.mockResolvedValue([{ id: 'm1' }]);
      prisma.fundContribution.findMany.mockResolvedValue([]); // nợ
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      prisma.memberScoreEvent.findMany.mockResolvedValue([]);

      const d = await svc.getMemberDetail('c1', 'm1', '2020-01');
      // đi 3/4 = 75 (vắng 1/4, -25) + nợ 1 kỳ (-10) → 65
      expect(d.total).toBe(65);
      expect(d.autoLines).toEqual(
        expect.arrayContaining([
          { label: 'Vắng 1/4 buổi (đi 75%)', delta: -25 },
          { label: 'Nợ 1 kỳ', delta: -10 },
        ]),
      );
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

  describe('FINANCE rule thiếu/inactive → phần tài chính = 0', () => {
    it('không có FINANCE rule → nợ không trừ (điểm danh % vẫn tính)', async () => {
      prisma.scoringRule.findMany.mockResolvedValue([]); // không rule finance
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      // 4 buổi đã điểm danh, KHÔNG vắng → đi 100%
      prisma.attendanceRecord.groupBy.mockImplementation((args: any) =>
        Promise.resolve(
          args?.by?.includes('attendanceSessionId')
            ? [
                { attendanceSessionId: 's1', _count: { _all: 1 } },
                { attendanceSessionId: 's2', _count: { _all: 1 } },
                { attendanceSessionId: 's3', _count: { _all: 1 } },
                { attendanceSessionId: 's4', _count: { _all: 1 } },
              ]
            : [],
        ),
      );
      // Có kỳ nợ quá hạn nhưng rule delta thiếu → finance = 0.
      prisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'fp1', endDate: new Date('2020-01-31') },
      ]);
      prisma.member.findMany.mockResolvedValue([{ id: 'm1' }]);
      prisma.fundContribution.findMany.mockResolvedValue([]); // nợ
      prisma.memberScoreEvent.aggregate.mockResolvedValue({
        _sum: { delta: null },
      });
      const r = await svc.computeMemberScore('c1', 'm1', '2020-01');
      expect(r.total).toBe(100); // đi 100%, finance rule thiếu → 0
    });
  });
});
