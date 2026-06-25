/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = {
  payment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  fundContribution: { updateMany: jest.fn() },
  member: { findFirst: jest.fn() },
  systemSetting: { findMany: jest.fn() },
};

const baseMember = {
  id: 'mem-1',
  clubId: 'club-1',
  fullName: 'Nguyễn Văn A',
  isDeleted: false,
};

const basePayment = {
  id: 'pay-1',
  clubId: 'club-1',
  memberId: 'mem-1',
  amount: new Decimal(300000),
  description: 'Đóng quỹ tháng 3',
  referenceType: 'CONTRIBUTION',
  referenceId: 'contrib-1',
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
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
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

    it('auto-confirms linked FundContribution when payment confirmed', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment); // has referenceId: 'contrib-1'
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

    it('does NOT call updateMany when payment has no referenceId', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, referenceId: null });
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, referenceId: null, status: 'CONFIRMED' });

      await service.confirm('pay-1', 'admin-1', 'club-1');
      expect(mockPrisma.fundContribution.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for cross-tenant payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.confirm('pay-1', 'admin-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when payment is already CONFIRMED', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      await expect(service.confirm('pay-1', 'admin-1', 'club-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when payment is CANCELLED', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, status: 'CANCELLED' });
      await expect(service.confirm('pay-1', 'admin-1', 'club-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not fail if fundContribution.updateMany throws (non-fatal)', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(basePayment);
      mockPrisma.payment.update.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      mockPrisma.fundContribution.updateMany.mockRejectedValue(new Error('DB error'));

      // Should not throw — the catch() makes it non-fatal
      await expect(service.confirm('pay-1', 'admin-1', 'club-1')).resolves.not.toThrow();
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

    it('throws ForbiddenException when payment is already processed', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...basePayment, status: 'CONFIRMED' });
      await expect(service.cancel('pay-1', 'admin-1', 'club-1')).rejects.toBeInstanceOf(ForbiddenException);
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
