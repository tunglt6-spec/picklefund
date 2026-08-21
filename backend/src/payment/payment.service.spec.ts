/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockCalculator = { invalidateClosingBalances: jest.fn() };
const mockHermes = { dispatch: jest.fn().mockResolvedValue({ dispatched: 1 }) };
const mockAudit = { log: jest.fn() };

const mockPrisma: any = {
  payment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  fundContribution: { updateMany: jest.fn(), create: jest.fn() },
  member: { findFirst: jest.fn() },
  systemSetting: { findMany: jest.fn() },
  // callback-form transaction → chạy callback với chính mockPrisma làm tx
  $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
};

const basePayment = {
  id: 'pay-1',
  clubId: 'club-1',
  memberId: 'mem-1',
  amount: new Decimal(300000),
  description: 'Đóng quỹ tháng 3',
  referenceType: 'CONTRIBUTION',
  referenceId: 'contrib-1',
  reportedByMember: false,
  memberNote: null,
  proofUrl: null,
  recheckNote: null,
  bankCode: 'MB',
  accountNumber: '123456789',
  accountName: 'CLB PICKLEBALL',
  qrImageUrl: 'https://img.vietqr.io/image/MB-123456789-compact2.jpg',
  status: 'PENDING',
  confirmedById: null,
  confirmedAt: null,
  expiredAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  updatedAt: new Date(),
  member: { id: 'mem-1', fullName: 'Nguyễn Văn A', userId: 'user-1' },
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialCalculatorService, useValue: mockCalculator },
        { provide: HermesService, useValue: mockHermes },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get<PaymentService>(PaymentService);
  });

  /* ── confirm ── */
  describe('confirm', () => {
    it('confirms a PENDING payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment);
      const confirmed = { ...basePayment, status: 'CONFIRMED', confirmedById: 'admin-1', confirmedAt: new Date() };
      mockPrisma.payment.update.mockResolvedValue(confirmed);
      mockPrisma.fundContribution.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.confirm('pay-1', 'admin-1', 'club-1');
      expect(result.status).toBe('CONFIRMED');
    });

    it('auto-confirms linked FundContribution for admin QR payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment); // reportedByMember:false, referenceId set
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      mockPrisma.fundContribution.updateMany.mockResolvedValue({ count: 1 });

      await service.confirm('pay-1', 'admin-1', 'club-1');

      expect(mockPrisma.fundContribution.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'contrib-1', clubId: 'club-1', isConfirmed: false }),
          data: { isConfirmed: true },
        }),
      );
    });

    it('CREATES a FundContribution when confirming a member-reported payment', async () => {
      const reported = { ...basePayment, reportedByMember: true, referenceType: 'CONTRIBUTION', referenceId: 'period-1' };
      mockPrisma.payment.findFirst.mockResolvedValue(reported);
      mockPrisma.payment.update.mockResolvedValue({ ...reported, status: 'CONFIRMED' });
      mockPrisma.fundContribution.create.mockResolvedValue({ id: 'new-contrib' });

      await service.confirm('pay-1', 'admin-1', 'club-1');

      expect(mockPrisma.fundContribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            memberId: 'mem-1',
            fundPeriodId: 'period-1',
            fundSource: 'COMMON',
            isConfirmed: true,
          }),
        }),
      );
      // Không đụng updateMany với luồng member-report
      expect(mockPrisma.fundContribution.updateMany).not.toHaveBeenCalled();
    });

    it('notifies the member on confirm', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment);
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      mockPrisma.fundContribution.updateMany.mockResolvedValue({ count: 1 });

      await service.confirm('pay-1', 'admin-1', 'club-1');
      expect(mockHermes.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment_confirmed_member', targetUserId: 'user-1' }),
      );
    });

    it('throws NotFoundException for cross-tenant payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.confirm('pay-1', 'admin-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when payment is already CONFIRMED', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      await expect(service.confirm('pay-1', 'admin-1', 'club-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  /* ── requestRecheck ── */
  describe('requestRecheck', () => {
    it('sets CANCELLED with recheckNote and notifies member (keeps history)', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment);
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, status: 'CANCELLED', recheckNote: 'Chưa thấy tiền' });

      const res = await service.requestRecheck('pay-1', 'admin-1', 'club-1', 'Chưa thấy tiền');
      expect(res.status).toBe('CANCELLED');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED', recheckNote: 'Chưa thấy tiền' }) }),
      );
      expect(mockHermes.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment_recheck', targetUserId: 'user-1' }),
      );
    });

    it('throws ForbiddenException when payment already processed', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      await expect(service.requestRecheck('pay-1', 'admin-1', 'club-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  /* ── cancel ── */
  describe('cancel', () => {
    it('cancels a PENDING payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment);
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, status: 'CANCELLED' });
      const result = await service.cancel('pay-1', 'admin-1', 'club-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws NotFoundException for cross-tenant cancel', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.cancel('pay-1', 'admin-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('scopes query to clubId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([basePayment]);
      mockPrisma.payment.count.mockResolvedValue(1);
      await service.findAll('club-1', {});
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: 'club-1' }) }),
      );
    });

    it('filters by status when provided', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);
      await service.findAll('club-1', { status: 'PENDING' });
      const call = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('PENDING');
    });
  });
});
