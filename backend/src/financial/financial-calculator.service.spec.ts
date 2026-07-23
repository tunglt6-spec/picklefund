import { Test, TestingModule } from '@nestjs/testing';
import { FinancialCalculatorService } from './financial-calculator.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Canonical cost-category formula (BUG-REPORT-COST-CATEGORY-001, CLB B32 baseline).
 * Nguồn phân loại = LivingExpense.allocationRule (KHÔNG dùng AttendanceSession.courtFee):
 *  - CHI PHÍ SÂN  = allocationRule 'EQUAL'                    → chia đều /memberCount
 *  - SINH HOẠT    = allocationRule 'PRESENT_ONLY' | 'ATTENDANCE' → chia theo attendance
 *  - FUND_ONLY    = tính vào totalCommonExpense, KHÔNG phân bổ vào member bill
 *
 * COMMON expenses lấy qua prisma.livingExpense.groupBy(by: ['allocationRule']).
 * MINI expense vẫn qua prisma.livingExpense.aggregate (1 lần).
 * AttendanceSession.courtFee KHÔNG còn được truy vấn/tính.
 */

const FUND_PERIOD_ID = 'fp-1';
const CLUB_ID = 'club-1';

function buildPrismaMock() {
  return {
    fundContribution: {
      aggregate: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    attendanceSession: {
      aggregate: jest.fn(), // không còn được gọi (court từ LivingExpense EQUAL)
      findMany: jest.fn().mockResolvedValue([]),
    },
    fundPeriod: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ billedMemberCount: null }),
    },
    livingExpense: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }), // MINI
      groupBy: jest.fn().mockResolvedValue([]), // COMMON theo allocationRule
    },
    attendanceRecord: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    member: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

async function makeService(prisma: ReturnType<typeof buildPrismaMock>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      FinancialCalculatorService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return module.get<FinancialCalculatorService>(FinancialCalculatorService);
}

// ---------------------------------------------------------------------------
// Canonical case: EQUAL (court) + ATTENDANCE (living) + FUND_ONLY.
// 8 members; EQUAL=520,000 → court 65,000/member; ATTENDANCE=480,000 → living theo
// attendance; FUND_ONLY=1,000,000 (vào tổng chi, không vào bill).
// 7 members attend 10 buổi, 1 member (H) attend 0. totalAttendance=70.
// Cases 1,2,3,4.
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — allocationRule canonical', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const MEMBERS = [
    { id: 'A', fullName: 'A' },
    { id: 'B', fullName: 'B' },
    { id: 'C', fullName: 'C' },
    { id: 'D', fullName: 'D' },
    { id: 'E', fullName: 'E' },
    { id: 'F', fullName: 'F' },
    { id: 'G', fullName: 'G' },
    { id: 'H', fullName: 'H' },
  ];
  // 7 sessions × 10 present = totalAttendance 70
  const SESSIONS = Array.from({ length: 7 }, (_, i) => ({
    id: `s${i + 1}`,
    _count: { attendanceRecords: 10 },
  }));
  // A..G attend 10 each (=70); H attends 0 (omitted)
  const ATTENDANCE_COUNTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => ({
    memberId: id,
    _count: { id: 10 },
  }));

  const COURT_TOTAL = 520_000;
  const LIVING_TOTAL = 480_000;
  const FUND_ONLY_TOTAL = 1_000_000;
  const TOTAL_ATTENDANCE = 70;
  const MEMBER_COUNT = 8;
  const eqCourt = Math.round(COURT_TOTAL / MEMBER_COUNT); // 65,000
  const livingFor = (attended: number) =>
    Math.round((attended / TOTAL_ATTENDANCE) * LIVING_TOTAL);

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await makeService(prisma);

    let fcAgg = 0;
    prisma.fundContribution.aggregate.mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 3_000_000 } }); // common income
      return Promise.resolve({ _sum: { amount: 0 } }); // mini income
    });
    // Case 4: session.courtFee có giá trị nhưng phải bị IGNORED.
    prisma.attendanceSession.aggregate.mockResolvedValue({
      _sum: { courtFee: 9_999_999 },
    });
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: COURT_TOTAL } },
      { costType: 'LIVING', allocationRule: 'ATTENDANCE', _sum: { amount: LIVING_TOTAL } },
      { costType: 'LIVING', allocationRule: 'FUND_ONLY', _sum: { amount: FUND_ONLY_TOTAL } },
    ]);
    prisma.livingExpense.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    }); // MINI
    prisma.attendanceSession.findMany.mockResolvedValue(SESSIONS);
    prisma.member.findMany.mockResolvedValue(MEMBERS);
    prisma.attendanceRecord.groupBy.mockResolvedValue(ATTENDANCE_COUNTS);
    prisma.fundContribution.groupBy.mockResolvedValue([]);
  });

  it('Case 1: court = SUM(EQUAL), chia đều /memberCount', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.commonFund.totalCourt).toBe(COURT_TOTAL);
    for (const m of result.members) {
      expect(m.courtFee).toBe(eqCourt); // 65,000 cho MỌI member (kể cả H attend 0)
    }
  });

  it('Case 2: living = SUM(ATTENDANCE/PRESENT_ONLY), chia theo attendance', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.commonFund.totalLiving).toBe(LIVING_TOTAL);
    const byId = Object.fromEntries(result.members.map((m) => [m.memberId, m]));
    expect(byId['A'].livingFee).toBe(livingFor(10)); // 68,571
    expect(byId['H'].livingFee).toBe(0); // attend 0 → living 0
  });

  it('Case 3: FUND_ONLY vào totalCommonExpense nhưng KHÔNG vào member bill', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    // total = court + living + fundOnly
    expect(result.commonFund.totalExpense).toBe(
      COURT_TOTAL + LIVING_TOTAL + FUND_ONLY_TOTAL,
    ); // 2,000,000
    // member totalCost = court + living (KHÔNG chứa FUND_ONLY)
    for (const m of result.members) {
      expect(m.totalCost).toBe(m.courtFee + m.livingFee);
    }
    const byId = Object.fromEntries(result.members.map((m) => [m.memberId, m]));
    expect(byId['A'].totalCost).toBe(eqCourt + livingFor(10)); // 133,571
    expect(byId['H'].totalCost).toBe(eqCourt); // 65,000 (chỉ court)
  });

  it('Case 4: AttendanceSession.courtFee bị IGNORED — court lấy từ EQUAL', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.commonFund.totalCourt).toBe(COURT_TOTAL); // 520,000, KHÔNG phải 9,999,999
    expect(result.commonFund.totalCourt).not.toBe(9_999_999);
  });

  it('balance = income - totalCommonExpense; attendance totals đúng', async () => {
    const result = await service.calculate(FUND_PERIOD_ID, CLUB_ID);
    expect(result.commonFund.totalIncome).toBe(3_000_000);
    expect(result.commonFund.balance).toBe(3_000_000 - 2_000_000); // 1,000,000
    expect(result.totalSessions).toBe(7);
    expect(result.totalAttendance).toBe(70);
    expect(result.members).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Case 5 — B32-style: chỉ có EQUAL (không PRESENT_ONLY/ATTENDANCE) → livingCost=0.
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — B32-style (no living expense)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const MEMBERS = [
    { id: 'A', fullName: 'A' },
    { id: 'B', fullName: 'B' },
    { id: 'C', fullName: 'C' },
    { id: 'D', fullName: 'D' },
  ];

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await makeService(prisma);

    let fcAgg = 0;
    prisma.fundContribution.aggregate.mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 2_000_000 } });
      return Promise.resolve({ _sum: { amount: 0 } });
    });
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: 400_000 } },
    ]);
    prisma.attendanceSession.findMany.mockResolvedValue([
      { id: 's1', _count: { attendanceRecords: 4 } },
    ]);
    prisma.member.findMany.mockResolvedValue(MEMBERS);
    prisma.attendanceRecord.groupBy.mockResolvedValue(
      MEMBERS.map((m) => ({ memberId: m.id, _count: { id: 1 } })),
    );
    prisma.fundContribution.groupBy.mockResolvedValue([]);
  });

  it('Case 5: living=0, court chia đều /memberCount', async () => {
    const result = await service.calculate('fp-b32', 'club-b32');
    expect(result.commonFund.totalCourt).toBe(400_000);
    expect(result.commonFund.totalLiving).toBe(0);
    expect(result.commonFund.totalExpense).toBe(400_000);
    for (const m of result.members) {
      expect(m.courtFee).toBe(100_000); // 400,000 / 4
      expect(m.livingFee).toBe(0);
      expect(m.totalCost).toBe(100_000);
    }
  });
});

// ---------------------------------------------------------------------------
// Case 6 — THE PING-style: sinh hoạt là PRESENT_ONLY → KHÔNG bị đưa vào court.
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — THE PING-style (living not in court)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const MEMBERS = [
    { id: 'A', fullName: 'A' },
    { id: 'B', fullName: 'B' },
    { id: 'C', fullName: 'C' },
    { id: 'D', fullName: 'D' },
  ];

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await makeService(prisma);

    let fcAgg = 0;
    prisma.fundContribution.aggregate.mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 2_000_000 } });
      return Promise.resolve({ _sum: { amount: 0 } });
    });
    // court=EQUAL 300k; sinh hoạt=PRESENT_ONLY 600k (bug cũ sẽ gộp vào court)
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: 300_000 } },
      { costType: 'LIVING', allocationRule: 'PRESENT_ONLY', _sum: { amount: 600_000 } },
    ]);
    prisma.attendanceSession.findMany.mockResolvedValue([
      { id: 's1', _count: { attendanceRecords: 4 } },
    ]);
    prisma.member.findMany.mockResolvedValue(MEMBERS);
    prisma.attendanceRecord.groupBy.mockResolvedValue(
      MEMBERS.map((m) => ({ memberId: m.id, _count: { id: 1 } })),
    );
    prisma.fundContribution.groupBy.mockResolvedValue([]);
  });

  it('Case 6: PRESENT_ONLY vào living, KHÔNG vào court', async () => {
    const result = await service.calculate('fp-ping', 'club-ping');
    expect(result.commonFund.totalCourt).toBe(300_000); // chỉ EQUAL
    expect(result.commonFund.totalLiving).toBe(600_000); // PRESENT_ONLY
    // court KHÔNG bị cộng sinh hoạt
    expect(result.commonFund.totalCourt).not.toBe(900_000);
    for (const m of result.members) {
      expect(m.courtFee).toBe(75_000); // 300,000 / 4 (đều)
      expect(m.livingFee).toBe(150_000); // 600,000 * (1/4 attendance)
    }
  });

  // Luật Quỹ (case B32 23/7/2026): SINH HOẠT cũng có thể CHIA ĐỀU — phải vào cột
  // Sinh hoạt (không gộp vào Chi phí sân như proxy allocationRule cũ), và tổng
  // mỗi người KHÔNG đổi so với gộp chung chia đều.
  it('Case 7 (luật Quỹ): sinh hoạt chia đều vào cột Sinh hoạt, tổng/người không đổi', async () => {
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: 2_000_000 } },
      { costType: 'LIVING', allocationRule: 'EQUAL', _sum: { amount: 545_000 } },
    ]);
    const result = await service.calculate('fp-ping', 'club-ping');
    expect(result.commonFund.totalCourt).toBe(2_000_000);
    expect(result.commonFund.totalLiving).toBe(545_000); // KHÔNG còn 0 như bug cũ
    for (const m of result.members) {
      expect(m.courtFee).toBe(500_000); // 2.000.000 / 4 (luôn chia đều)
      expect(m.livingFee).toBe(136_250); // 545.000 / 4 (sinh hoạt chia đều)
      expect(m.totalCost).toBe(636_250); // = (2.000.000+545.000)/4 — tổng không đổi
    }
  });
});

// ---------------------------------------------------------------------------
// Fund separation (Q3) — Quỹ Phụ KHÔNG cộng vào Tổng tài sản CLB.
// COMMON expense 560,000 nay lấy qua groupBy.
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — fund separation (Q3)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await makeService(prisma);

    let fcAgg = 0;
    prisma.fundContribution.aggregate.mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 0 } }); // common income
      return Promise.resolve({ _sum: { amount: 700_000 } }); // mini income
    });
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: 560_000 } }, // common expense
    ]);
    prisma.livingExpense.aggregate.mockResolvedValue({
      _sum: { amount: 0 }, // mini expense
    });
    prisma.attendanceSession.findMany.mockResolvedValue([]);
    prisma.member.findMany.mockResolvedValue([]);
    prisma.attendanceRecord.groupBy.mockResolvedValue([]);
    prisma.fundContribution.groupBy.mockResolvedValue([]);
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

  it('Q3: clubAssets.balance = -560,000 (KHÔNG cộng Quỹ Mini)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.clubAssets.balance).toBe(-560_000);
    expect(result.clubAssets.balance).not.toBe(140_000);
    expect(result.clubAssets.balance).toBe(result.commonFund.balance);
  });

  it('Q3: clubAssets income/expense = commonFund only', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.clubAssets.totalIncome).toBe(result.commonFund.totalIncome);
    expect(result.clubAssets.totalExpense).toBe(result.commonFund.totalExpense);
  });

  it('Q3: carryForward.balance = 0 khi không có kỳ trước', async () => {
    const result = await service.calculate('fp-q3', 'club-q3');
    expect(result.carryForward.balance).toBe(0);
    expect(result.carryForward.previousPeriodId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CarryForward — clubAssets = Quỹ Chính + carryForward (KHÔNG cộng Quỹ Phụ).
// ---------------------------------------------------------------------------
describe('FinancialCalculatorService — carryForward (Q3 with previous period)', () => {
  let service: FinancialCalculatorService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await makeService(prisma);

    let fcAgg = 0;
    prisma.fundContribution.aggregate.mockImplementation(() => {
      fcAgg++;
      if (fcAgg === 1) return Promise.resolve({ _sum: { amount: 0 } });
      return Promise.resolve({ _sum: { amount: 700_000 } });
    });
    prisma.livingExpense.groupBy.mockResolvedValue([
      { costType: 'COURT', allocationRule: 'EQUAL', _sum: { amount: 560_000 } },
    ]);
    prisma.livingExpense.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    prisma.attendanceSession.findMany.mockResolvedValue([]);
    prisma.member.findMany.mockResolvedValue([]);
    prisma.attendanceRecord.groupBy.mockResolvedValue([]);
    prisma.fundContribution.groupBy.mockResolvedValue([]);
  });

  it('Q3+CF: clubAssets.balance = -420,000 (Quỹ Chính -560k + chuyển kỳ +140k)', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', {
      carryForwardBalance: 140_000,
      previousPeriodId: 'fp-q2',
      previousPeriodName: 'Q2',
    });
    expect(result.carryForward.balance).toBe(140_000);
    expect(result.commonFund.balance).toBe(-560_000);
    expect(result.clubAssets.balance).toBe(-420_000);
    expect(result.clubAssets.balance).not.toBe(140_000);
    expect(result.clubAssets.balance).not.toBe(-560_000);
    expect(result.clubAssets.balance).not.toBe(840_000);
    expect(result.clubAssets.balance).not.toBe(280_000);
  });

  it('Q3+CF: Quỹ Phụ không cộng vào clubAssets dù carryForward dương', async () => {
    const result = await service.calculate('fp-q3', 'club-q3', {
      carryForwardBalance: 140_000,
    });
    expect(result.clubAssets.balance).toBe(-420_000);
    expect(result.miniFund.balance).toBe(700_000);
  });

  it('Q3+CF: carryForward metadata đúng', async () => {
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
    const result = await service.calculate('fp-q3', 'club-q3', {
      carryForwardBalance: 140_000,
    });
    expect(result.clubAssets.formula).toBe(
      'commonFund.balance + carryForward.balance',
    );
  });
});
