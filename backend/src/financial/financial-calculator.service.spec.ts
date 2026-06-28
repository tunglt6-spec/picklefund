import { Test, TestingModule } from '@nestjs/testing';
import { FinancialCalculatorService } from './financial-calculator.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test dataset:
 * 5 members: A, B, C, D, E
 * 4 sessions, courtFee=450,000 each → totalCourt=1,800,000
 * LivingExpenses COMMON: 200k + 300k → totalLiving=500,000
 * Total common expense = 2,300,000
 *
 * Attendance (PRESENT):
 *   Session1: A,B,C,D,E → 5
 *   Session2: A,B,C     → 3
 *   Session3: A,D,E     → 3
 *   Session4: B,C,D,E   → 4
 *   totalAttendance = 15
 *
 * Each member attended 3 sessions → ratio = 3/15 = 0.2
 * courtFee per member = 0.2 * 1,800,000 = 360,000
 * livingFee per member = 0.2 * 500,000  = 100,000
 * totalCost per member = 460,000
 *
 * Contributions (confirmed COMMON):
 *   A=1,000,000  B=1,000,000  C=700,000  D=500,000  E=0
 *
 * Balances:
 *   A: +540,000  B: +540,000  C: +240,000  D: +40,000  E: -460,000
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
    // 2. miniIncomeAgg    → 0
    // 3. courtAgg         → courtFee sum = 1,800,000
    // 4. commonLivingAgg  → COMMON living expenses = 500,000
    // 5. miniExpenseAgg   → 0
    // 6. sessions findMany
    // 7. members findMany

    let aggregateCallCount = 0;
    (prisma.fundContribution.aggregate as jest.Mock).mockImplementation(() => {
      aggregateCallCount++;
      // Call 1 = common income (confirmed COMMON)
      if (aggregateCallCount === 1)
        return Promise.resolve({ _sum: { amount: 3_200_000 } });
      // Call 2 = mini income
      return Promise.resolve({ _sum: { amount: 300_000 } });
    });

    let sessionAggCallCount = 0;
    (prisma.attendanceSession.aggregate as jest.Mock).mockImplementation(() => {
      sessionAggCallCount++;
      // Call 1 = courtFee sum
      if (sessionAggCallCount === 1)
        return Promise.resolve({ _sum: { courtFee: 1_800_000 } });
      return Promise.resolve({ _sum: { courtFee: 0 } });
    });

    let livingAggCallCount = 0;
    (prisma.livingExpense.aggregate as jest.Mock).mockImplementation(() => {
      livingAggCallCount++;
      // Call 1 = COMMON living expenses
      if (livingAggCallCount === 1)
        return Promise.resolve({ _sum: { amount: 500_000 } });
      // Call 2 = MINI living expenses
      return Promise.resolve({ _sum: { amount: 200_000 } });
    });

    (prisma.attendanceSession.findMany as jest.Mock).mockResolvedValue(SESSIONS);
    (prisma.member.findMany as jest.Mock).mockResolvedValue(MEMBERS);
    (prisma.attendanceRecord.groupBy as jest.Mock).mockResolvedValue(ATTENDANCE_COUNTS);
    (prisma.fundContribution.groupBy as jest.Mock).mockResolvedValue(PAID_AMOUNTS);
  });

  it('should calculate correct commonFund totals', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    expect(result.commonFund.totalIncome).toBe(3_200_000);
    expect(result.commonFund.totalExpense).toBe(2_300_000);
    expect(result.commonFund.totalCourt).toBe(1_800_000);
    expect(result.commonFund.totalLiving).toBe(500_000);
    expect(result.commonFund.balance).toBe(900_000);
  });

  it('should calculate correct attendance totals', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    expect(result.totalSessions).toBe(4);
    expect(result.totalAttendance).toBe(15); // 5+3+3+4
    expect(result.costPerAttendance).toBe(Math.round(2_300_000 / 15)); // 153,333
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

  it('should calculate correct per-member costs (all attended 3/15 sessions)', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    const expectedCourtFee = Math.round((3 / 15) * 1_800_000); // 360,000
    const expectedLivingFee = Math.round((3 / 15) * 500_000);  // 100,000
    const expectedTotalCost = expectedCourtFee + expectedLivingFee; // 460,000

    for (const m of result.members) {
      expect(m.courtFee).toBe(expectedCourtFee);
      expect(m.livingFee).toBe(expectedLivingFee);
      expect(m.totalCost).toBe(expectedTotalCost);
    }
  });

  it('should calculate correct per-member balances', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);

    const byId = Object.fromEntries(result.members.map((m) => [m.memberId, m]));

    expect(byId['A'].paidAmount).toBe(1_000_000);
    expect(byId['A'].balance).toBe(540_000);
    expect(byId['A'].status).toBe('OVERPAID');

    expect(byId['B'].paidAmount).toBe(1_000_000);
    expect(byId['B'].balance).toBe(540_000);
    expect(byId['B'].status).toBe('OVERPAID');

    expect(byId['C'].paidAmount).toBe(700_000);
    expect(byId['C'].balance).toBe(240_000);
    expect(byId['C'].status).toBe('OVERPAID');

    expect(byId['D'].paidAmount).toBe(500_000);
    expect(byId['D'].balance).toBe(40_000);
    // balance=40,000 > 100 → OVERPAID (paid more than owed)
    expect(byId['D'].status).toBe('OVERPAID');

    expect(byId['E'].paidAmount).toBe(0);
    expect(byId['E'].balance).toBe(-460_000);
    expect(byId['E'].status).toBe('UNPAID');
  });

  it('should return 5 member summaries', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.members).toHaveLength(5);
  });
});
