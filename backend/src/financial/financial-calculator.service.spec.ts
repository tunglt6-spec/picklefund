import { Test, TestingModule } from '@nestjs/testing';
import { FinancialCalculatorService } from './financial-calculator.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Pattern A — Court tracked in sessions only, NOT in LivingExpense.
 * (totalLiving > 0 but does not include court.)
 *
 * 5 members: A, B, C, D, E
 * 4 sessions, courtFee=450,000 each → totalCourt=1,800,000
 * LivingExpenses COMMON (non-court): 200k + 300k → totalLiving=500,000
 *
 * totalCommonExpense = totalLiving = 500,000
 * (Court from sessions is for allocation proportions only; LivingExpense is the ledger.)
 *
 * Attendance (PRESENT):
 *   Session1: A,B,C,D,E → 5
 *   Session2: A,B,C     → 3
 *   Session3: A,D,E     → 3
 *   Session4: B,C,D,E   → 4
 *   totalAttendance = 15
 *
 * Each member attended 3 sessions → ratio = 3/15 = 0.2
 * allocationBase = totalLiving = 500,000
 * courtBase = min(totalCourt, totalLiving) = min(1,800,000, 500,000) = 500,000
 * courtFee per member  = round(0.2 * 500,000) = 100,000
 * livingFee per member = memberTotalCost - courtFee = 100,000 - 100,000 = 0
 * totalCost per member = 100,000
 *
 * Contributions (confirmed COMMON):
 *   A=1,000,000  B=1,000,000  C=700,000  D=500,000  E=0
 *
 * Balances (paidAmount - totalCost):
 *   A: +900,000  B: +900,000  C: +600,000  D: +400,000  E: -100,000
 */

const FUND_PERIOD_ID = 'fp-1';
const CLUB_ID = 'club-1';

const MEMBERS = [
  { id: 'A', fullName: 'Alice' },
  { id: 'B', fullName: 'Bob' },
  { id: 'C', fullName: 'Carol' },
  { id: 'D', fullName: 'Dave' },
  { id: 'E', fullName: 'Eve' },
];

// 4 sessions, each courtFee=450,000. Attendance counts per session: 5,3,3,4
const SESSIONS = [
  { id: 's1', _count: { attendanceRecords: 5 } },
  { id: 's2', _count: { attendanceRecords: 3 } },
  { id: 's3', _count: { attendanceRecords: 3 } },
  { id: 's4', _count: { attendanceRecords: 4 } },
];

// groupBy attendance: each member attended 3 sessions
const ATTENDANCE_COUNTS = MEMBERS.map((m) => ({
  memberId: m.id,
  _count: { id: 3 },
}));

// Paid amounts per member (confirmed COMMON)
const PAID_AMOUNTS = [
  { memberId: 'A', _sum: { amount: 1_000_000 } },
  { memberId: 'B', _sum: { amount: 1_000_000 } },
  { memberId: 'C', _sum: { amount: 700_000 } },
  { memberId: 'D', _sum: { amount: 500_000 } },
  // E has no entry → defaults to 0
];

function buildPrismaMock() {
  return {
    fundContribution: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    attendanceSession: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    fundPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    livingExpense: {
      aggregate: jest.fn(),
    },
    attendanceRecord: {
      groupBy: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
  };
}

describe('FinancialCalculatorService', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinancialCalculatorService>(FinancialCalculatorService);

    // --- Setup Promise.all mocks (order matches service implementation) ---
    // 1. commonIncomeAgg  → confirmed COMMON contributions total = 3,200,000
    // 2. miniIncomeAgg    → 300,000
    // 3. courtAgg         → courtFee sum = 1,800,000
    // 4. commonLivingAgg  → COMMON living expenses = 500,000 (non-court only)
    // 5. miniExpenseAgg   → 200,000
    // 6. sessions findMany
    // 7. members findMany

    let aggregateCallCount = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      aggregateCallCount++;
      if (aggregateCallCount === 1)
        return Promise.resolve({ _sum: { amount: 3_200_000 } });
      return Promise.resolve({ _sum: { amount: 300_000 } });
    });

    let sessionAggCallCount = 0;
    (prisma.attendanceSession.aggregate as jest.Mock).mockImplementation(() => {
      sessionAggCallCount++;
      if (sessionAggCallCount === 1)
        return Promise.resolve({ _sum: { courtFee: 1_800_000 } });
      return Promise.resolve({ _sum: { courtFee: 0 } });
    });

    let livingAggCallCount = 0;
    (prisma.livingExpense.aggregate as jest.Mock).mockImplementation(() => {
      livingAggCallCount++;
      if (livingAggCallCount === 1)
        return Promise.resolve({ _sum: { amount: 500_000 } });
      return Promise.resolve({ _sum: { amount: 200_000 } });
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue(SESSIONS);
    (prisma.member.findMany as jest.Mock).mockResolvedValue(MEMBERS);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue(ATTENDANCE_COUNTS);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue(PAID_AMOUNTS);
  });

  it('should use totalLiving as totalExpense when LivingExpense records exist', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    expect(result.commonFund.totalIncome).toBe(3_200_000);
    // totalExpense = totalLiving (not totalCourt + totalLiving)
    expect(result.commonFund.totalExpense).toBe(500_000);
    expect(result.commonFund.totalCourt).toBe(1_800_000);
    expect(result.commonFund.totalLiving).toBe(500_000);
    expect(result.commonFund.balance).toBe(2_700_000); // 3,200,000 - 500,000
  });

  it('should calculate correct attendance totals', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    expect(result.totalSessions).toBe(4);
    expect(result.totalAttendance).toBe(15); // 5+3+3+4
    expect(result.costPerAttendance).toBe(Math.round(500_000 / 15)); // 33,333
  });

  it('should calculate mini fund from confirmed income and approved or paid expenses only', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    expect(result.miniFund.totalIncome).toBe(300_000);
    expect(result.miniFund.totalExpense).toBe(200_000);
    expect(result.miniFund.balance).toBe(100_000);
    expect(prisma.fundContribution.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          fundPeriodId: FUND_PERIOD_ID,
          clubId: CLUB_ID,
          fundSource: 'MINI',
          isConfirmed: true,
        }),
      }),
    );
    expect(prisma.livingExpense.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          fundPeriodId: FUND_PERIOD_ID,
          clubId: CLUB_ID,
          fundSource: 'MINI',
          status: { in: ['approved', 'paid'] },
        }),
      }),
    );
  });

  it('should allocate member costs proportionally using totalLiving as base', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    // allocationBase = totalLiving = 500,000
    // courtBase = min(totalCourt=1,800,000, totalLiving=500,000) = 500,000
    const expectedTotalCost  = Math.round((3 / 15) * 500_000);  // 100,000
    const expectedCourtFee   = Math.round((3 / 15) * 500_000);  // 100,000 (courtBase capped to living)
    const expectedLivingFee  = expectedTotalCost - expectedCourtFee; // 0

    for (const m of result.members) {
      expect(m.courtFee).toBe(expectedCourtFee);
      expect(m.livingFee).toBe(expectedLivingFee);
      expect(m.totalCost).toBe(expectedTotalCost);
    }
  });

  it('should calculate correct per-member balances', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    const byId = Object.fromEntries(result.members.map((m) => [m.memberId, m]));
    const cost = Math.round((3 / 15) * 500_000); // 100,000

    expect(byId['A'].paidAmount).toBe(1_000_000);
    expect(byId['A'].balance).toBe(900_000); // 1,000,000 - 100,000
    expect(byId['A'].status).toBe('OVERPAID');

    expect(byId['B'].paidAmount).toBe(1_000_000);
    expect(byId['B'].balance).toBe(900_000);
    expect(byId['B'].status).toBe('OVERPAID');

    expect(byId['C'].paidAmount).toBe(700_000);
    expect(byId['C'].balance).toBe(600_000); // 700,000 - 100,000
    expect(byId['C'].status).toBe('OVERPAID');

    expect(byId['D'].paidAmount).toBe(500_000);
    expect(byId['D'].balance).toBe(400_000); // 500,000 - 100,000
    expect(byId['D'].status).toBe('OVERPAID');

    expect(byId['E'].paidAmount).toBe(0);
    expect(byId['E'].balance).toBe(-cost); // 0 - 100,000
    expect(byId['E'].status).toBe('UNPAID');
  });

  it('should return 5 member summaries', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.members).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Pattern B — Court tracked in BOTH sessions AND LivingExpense (Q2 scenario).
// This is the production bug: totalCourt=5,850,000 was being added to
// totalLiving=9,184,000 yielding 15,034,000 instead of the correct 9,184,000.
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — Q2 double-count fix', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  /**
   * Q2 dataset:
   * LivingExpenses COMMON (includes "Tiền thuê sân"):
   *   Tiền thuê sân Quý 2:          5,850,000
   *   Tiền nước uống sinh hoạt:       630,000
   *   Tiền mua bóng:                  259,000
   *   Liên hoan CLB:                1,485,000
   *   Xé vé 2 buổi sân B32:          960,000
   *   → totalLiving = 9,184,000
   *
   * Sessions courtFee sum:
   *   → totalCourt = 5,850,000  (same amount as "Tiền thuê sân" above)
   *
   * OLD (bug): totalExpense = 5,850,000 + 9,184,000 = 15,034,000
   * NEW (fix): totalExpense = totalLiving = 9,184,000
   *
   * 3 members (A, B, C), totalAttendance = 15
   * A attended 5, B attended 5, C attended 5
   * Ratio each = 5/15 = 1/3
   *
   * allocationBase = 9,184,000
   * courtBase = min(5,850,000, 9,184,000) = 5,850,000
   * memberTotalCost = round(1/3 * 9,184,000) = 3,061,333
   * memberCourtFee  = round(1/3 * 5,850,000) = 1,950,000
   * memberLivingFee = 3,061,333 - 1,950,000 = 1,111,333
   */
  const Q2_MEMBERS = [
    { id: 'A', fullName: 'Alice' },
    { id: 'B', fullName: 'Bob' },
    { id: 'C', fullName: 'Carol' },
  ];

  const Q2_SESSIONS = [
    { id: 's1', _count: { attendanceRecords: 5 } },
    { id: 's2', _count: { attendanceRecords: 5 } },
    { id: 's3', _count: { attendanceRecords: 5 } },
  ]; // totalAttendance = 15

  const Q2_ATTENDANCE = Q2_MEMBERS.map((m) => ({
    memberId: m.id,
    _count: { id: 5 },
  }));

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinancialCalculatorService>(FinancialCalculatorService);

    let fcAgg = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 12_000_000 } }); // common income
      return Promise.resolve({ _sum: { amount: 0 } }); // mini income
    });

    (prisma.attendanceSession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { courtFee: 5_850_000 },
    });

    let leAgg = 0;
    (prisma.livingExpense.aggregate as jest.Mock).mockImplementation(() => {
      leAgg++;
      if (leAgg === 1) return Promise.resolve({ _sum: { amount: 9_184_000 } }); // COMMON (includes court)
      return Promise.resolve({ _sum: { amount: 0 } }); // MINI
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue(Q2_SESSIONS);
    (prisma.member.findMany as jest.Mock).mockResolvedValue(Q2_MEMBERS);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue(Q2_ATTENDANCE);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('Q2: totalExpense must equal totalLiving (9,184,000), not totalCourt+totalLiving (15,034,000)', async () => {
    const result = await service.calculate('fp-q2', 'club-q2');

    expect(result.commonFund.totalCourt).toBe(5_850_000);
    expect(result.commonFund.totalLiving).toBe(9_184_000);
    // THE FIX: must NOT be 15,034,000
    expect(result.commonFund.totalExpense).toBe(9_184_000);
    expect(result.commonFund.totalExpense).not.toBe(15_034_000);
    expect(result.commonFund.balance).toBe(12_000_000 - 9_184_000); // 2,816,000
  });

  it('Q2: per-member totalCost must be based on 9,184,000, not 15,034,000', async () => {
    const result = await service.calculate('fp-q2', 'club-q2');

    // allocationBase = 9,184,000; courtBase = min(5,850,000, 9,184,000) = 5,850,000
    const expectedTotalCost = Math.round((5 / 15) * 9_184_000);   // 3,061,333
    const expectedCourtFee  = Math.round((5 / 15) * 5_850_000);   // 1,950,000
    const expectedLivingFee = expectedTotalCost - expectedCourtFee; // 1,111,333

    for (const m of result.members) {
      expect(m.totalCost).toBe(expectedTotalCost);
      expect(m.courtFee).toBe(expectedCourtFee);
      expect(m.livingFee).toBe(expectedLivingFee);
    }
  });

  it('Q2: Expense page total (9,184,000) matches Reports totalExpense', async () => {
    const result = await service.calculate('fp-q2', 'club-q2');
    // The Expense page sums LivingExpense directly → 9,184,000
    // Reports page uses fundSummary.totalExpenses = commonFund.totalExpense
    // Both must be equal after the fix.
    expect(result.commonFund.totalExpense).toBe(9_184_000);
  });
});

// ---------------------------------------------------------------------------
// Edge case — No LivingExpense at all (fallback to court from sessions).
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — zero LivingExpense fallback', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinancialCalculatorService>(FinancialCalculatorService);

    let fcAgg = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 5_000_000 } });
      return Promise.resolve({ _sum: { amount: 0 } });
    });

    // Sessions have court fees but no LivingExpense has been entered yet
    (prisma.attendanceSession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { courtFee: 1_800_000 },
    });

    (prisma.livingExpense.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: null }, // no entries
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue([
      { id: 's1', _count: { attendanceRecords: 3 } },
    ]);
    (prisma.member.findMany as jest.Mock).mockResolvedValue([
      { id: 'A', fullName: 'Alice' },
    ]);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue([
      { memberId: 'A', _count: { id: 3 } },
    ]);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('falls back to totalCourt when totalLiving is zero', async () => {
    const result = await service.calculate('fp-zero', 'club-zero');

    // No LivingExpense → fallback to session court fees
    expect(result.commonFund.totalExpense).toBe(1_800_000);
    expect(result.commonFund.totalCourt).toBe(1_800_000);
    expect(result.commonFund.totalLiving).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fund Separation — Quỹ Phụ KHÔNG được cộng vào Tổng tài sản CLB.
//
// Dataset Q3 (no carryForward):
//   Quỹ Chính: Thu=0, Chi=560,000 → balance=-560,000
//   Quỹ Phụ:   Thu=700,000, Chi=0 → balance=+700,000
//   Số dư chuyển kỳ: 0 (không có kỳ trước)
//
// Expected:
//   commonFund.balance   = -560,000
//   miniFund.balance     = +700,000
//   clubAssets.balance   = -560,000 + 0 = -560,000  (KHÔNG phải 140,000)
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — fund separation (Q3)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinancialCalculatorService>(FinancialCalculatorService);

    let fcAgg = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 0 } });        // common income = 0
      return Promise.resolve({ _sum: { amount: 700_000 } });                   // mini income = 700,000
    });

    (prisma.attendanceSession.aggregate as jest.Mock).mockResolvedValue({
      _sum: { courtFee: 0 },
    });

    let leAgg = 0;
    (prisma.livingExpense.aggregate as jest.Mock).mockImplementation(() => {
      leAgg++;
      if (leAgg === 1) return Promise.resolve({ _sum: { amount: 560_000 } }); // common expense = 560,000
      return Promise.resolve({ _sum: { amount: 0 } });                         // mini expense = 0
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('Q3: commonFund.balance = -560,000 (thu=0 chi=560k)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.commonFund.totalIncome).toBe(0);
    expect(result.commonFund.totalExpense).toBe(560_000);
    expect(result.commonFund.balance).toBe(-560_000);
  });

  it('Q3: miniFund.balance = +700,000 (thu=700k chi=0)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.miniFund.totalIncome).toBe(700_000);
    expect(result.miniFund.totalExpense).toBe(0);
    expect(result.miniFund.balance).toBe(700_000);
  });

  it('Q3: clubAssets.balance = -560,000 (chỉ Quỹ Chung, KHÔNG cộng Quỹ Mini)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    // Must equal commonFund.balance, never commonFund.balance + miniFund.balance (140,000)
    expect(result.clubAssets.balance).toBe(-560_000);
    expect(result.clubAssets.balance).not.toBe(140_000);
    expect(result.clubAssets.balance).toBe(result.commonFund.balance);
  });

  it('Q3: clubAssets income/expense must match commonFund only', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.clubAssets.totalIncome).toBe(result.commonFund.totalIncome);
    expect(result.clubAssets.totalExpense).toBe(result.commonFund.totalExpense);
  });

  it('Q3: Quỹ Phụ không ảnh hưởng member cost (no members, cost=0)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    // Members are empty — verify no mini data leaks into member summaries
    expect(result.members).toHaveLength(0);
    // costPerAttendance is based on commonFund only
    expect(result.costPerAttendance).toBe(0);
  });

  it('Q3: carryForward.balance = 0 khi không có kỳ trước', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.carryForward.balance).toBe(0);
    expect(result.carryForward.previousPeriodId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Số dư chuyển kỳ (CarryForward) — clubAssets = Quỹ Chính + carryForward
//
// Dataset Q3 + carryForward:
//   Quỹ Chính: Thu=0, Chi=560,000 → balance=-560,000
//   Quỹ Phụ:  Thu=700,000, Chi=0 → balance=+700,000
//   Số dư chuyển kỳ (từ kỳ trước): +140,000
//
// Expected:
//   clubAssets.balance = -560,000 + 140,000 = -420,000
//   KHÔNG phải: 140,000 | -560,000 | 840,000 | 280,000
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — carryForward (Q3 with previous period)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinancialCalculatorService>(FinancialCalculatorService);

    let fcAgg = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 0 } });       // common income = 0
      return Promise.resolve({ _sum: { amount: 700_000 } });                  // mini income = 700,000
    });

    (prisma.attendanceSession.aggregate as jest.Mock).mockResolvedValue({ _sum: { courtFee: 0 } });

    let leAgg = 0;
    (prisma.livingExpense.aggregate as jest.Mock).mockImplementation(() => {
      leAgg++;
      if (leAgg === 1) return Promise.resolve({ _sum: { amount: 560_000 } }); // common expense = 560,000
      return Promise.resolve({ _sum: { amount: 0 } });                        // mini expense = 0
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('Q3+CF: clubAssets.balance = -420,000 (= Quỹ Chính -560k + chuyển kỳ +140k)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', {
      carryForwardBalance: 140_000,
      previousPeriodId: 'fp-q2',
      previousPeriodName: 'Q2',
    });
    expect(result.carryForward.balance).toBe(140_000);
    expect(result.commonFund.balance).toBe(-560_000);
    expect(result.clubAssets.balance).toBe(-420_000);
    // Ensure wrong formulas are rejected
    expect(result.clubAssets.balance).not.toBe(140_000);   // chỉ carry
    expect(result.clubAssets.balance).not.toBe(-560_000);  // chỉ common
    expect(result.clubAssets.balance).not.toBe(840_000);   // mini bị cộng vào
    expect(result.clubAssets.balance).not.toBe(280_000);   // common + mini + carry
  });

  it('Q3+CF: Quỹ Phụ không cộng vào clubAssets dù carryForward dương', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', { carryForwardBalance: 140_000 });
    // miniFund.balance = 700,000
    // Nếu Quỹ Phụ bị cộng: -560,000 + 700,000 + 140,000 = 280,000 → SAI
    expect(result.clubAssets.balance).toBe(-420_000);
    expect(result.miniFund.balance).toBe(700_000);
  });

  it('Q3+CF: carryForward metadata được lưu đúng', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', {
      carryForwardBalance: 140_000,
      previousPeriodId: 'fp-q2',
      previousPeriodName: 'Quý 2/2026',
    });
    expect(result.carryForward.balance).toBe(140_000);
    expect(result.carryForward.previousPeriodId).toBe('fp-q2');
    expect(result.carryForward.previousPeriodName).toBe('Quý 2/2026');
    expect(result.carryForward.source).toBe('previous_period');
  });

  it('Q3+CF: clubAssets.formula = "commonFund.balance + carryForward.balance"', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', { carryForwardBalance: 140_000 });
    expect(result.clubAssets.formula).toBe('commonFund.balance + carryForward.balance');
  });
});
