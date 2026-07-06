import { Test, TestingModule } from '@nestjs/testing';
import { OperationalAlertsService } from './operational-alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FundPeriodsService } from '../../fund-periods/fund-periods.service';

const mockPrisma = { fundPeriod: { findFirst: jest.fn() } };
const mockFund = { summary: jest.fn() };

const baseSummary = {
  balance: 500000,
  miniBalance: 100000,
  unpaidCount: 0,
  lowAttendanceCount: 0,
};

describe('OperationalAlertsService', () => {
  let service: OperationalAlertsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalAlertsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FundPeriodsService, useValue: mockFund },
      ],
    }).compile();
    service = module.get(OperationalAlertsService);
  });

  it('clubId rỗng → không cảnh báo', async () => {
    expect(await service.analyze('')).toEqual([]);
    expect(mockPrisma.fundPeriod.findFirst).not.toHaveBeenCalled();
  });

  it('không có kỳ đang mở → OPS_NO_ACTIVE_PERIOD', async () => {
    mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
    const r = await service.analyze('club-1');
    expect(r.map((s) => s.code)).toEqual(['OPS_NO_ACTIVE_PERIOD']);
    expect(mockFund.summary).not.toHaveBeenCalled();
  });

  it('quỹ âm + công nợ + chuyên cần thấp → cảnh báo tương ứng', async () => {
    mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 3' });
    mockFund.summary.mockResolvedValue({
      ...baseSummary,
      balance: -20000,
      unpaidCount: 4,
      lowAttendanceCount: 2,
    });
    const codes = (await service.analyze('club-1')).map((s) => s.code);
    expect(codes).toContain('OPS_FUND_NEGATIVE');
    expect(codes).toContain('OPS_UNPAID_MEMBERS');
    expect(codes).toContain('OPS_LOW_ATTENDANCE');
    expect(codes).not.toContain('OPS_HEALTHY');
  });

  it('đọc số từ Finance Engine (summary), không tự tính', async () => {
    mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 3' });
    mockFund.summary.mockResolvedValue(baseSummary);
    await service.analyze('club-1');
    expect(mockFund.summary).toHaveBeenCalledWith('p1', 'club-1');
  });

  it('mọi chỉ số ổn → OPS_HEALTHY', async () => {
    mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 3' });
    mockFund.summary.mockResolvedValue(baseSummary);
    const codes = (await service.analyze('club-1')).map((s) => s.code);
    expect(codes).toEqual(['OPS_HEALTHY']);
  });
});
