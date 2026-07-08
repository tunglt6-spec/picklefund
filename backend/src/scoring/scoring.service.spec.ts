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
      create: jest.fn().mockResolvedValue({ id: 'r1' }),
    },
    club: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    member: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    memberScoreEvent: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
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
});
