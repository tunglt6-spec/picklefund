import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function buildVietQRUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
}): string {
  const base = `https://img.vietqr.io/image/${params.bankCode}-${params.accountNumber}-compact2.jpg`;
  const qs = new URLSearchParams({
    amount: String(params.amount),
    addInfo: params.description,
    accountName: params.accountName,
  });
  return `${base}?${qs.toString()}`;
}

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createQR(
    clubId: string,
    adminUserId: string,
    dto: {
      memberId: string;
      amount: number;
      description: string;
      referenceType: 'CONTRIBUTION' | 'EXPENSE' | 'MANUAL';
      referenceId?: string;
    },
  ) {
    // Get club bank info from system settings
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: ['bank_code', 'bank_account_number', 'bank_account_name'] },
      },
    });
    const settingsMap = Object.fromEntries(
      settings.map((s) => [s.key, s.value]),
    );

    const bankCode = settingsMap['bank_code'] || 'MB';
    const accountNumber = settingsMap['bank_account_number'] || '0000000000';
    const accountName = settingsMap['bank_account_name'] || 'CLB PICKLEBALL';

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, clubId, isDeleted: false },
    });
    if (!member) throw new NotFoundException('Thành viên không tồn tại');

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    const qrImageUrl = buildVietQRUrl({
      bankCode,
      accountNumber,
      accountName,
      amount: dto.amount,
      description: dto.description,
    });

    return this.prisma.payment.create({
      data: {
        clubId,
        memberId: dto.memberId,
        amount: dto.amount,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        bankCode,
        accountNumber,
        accountName,
        qrImageUrl,
        expiredAt,
      },
      include: { member: { select: { fullName: true } } },
    });
  }

  async confirm(paymentId: string, adminUserId: string, clubId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clubId },
    });
    if (!payment) throw new NotFoundException('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw new ForbiddenException('Giao dịch đã được xử lý');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CONFIRMED',
        confirmedById: adminUserId,
        confirmedAt: new Date(),
      },
    });

    // Auto-confirm the linked contribution (if any)
    if (payment.referenceId) {
      await this.prisma.fundContribution.updateMany({
        where: { id: payment.referenceId, clubId, isConfirmed: false },
        data: { isConfirmed: true },
      }).catch(() => { /* non-fatal */ });
    }

    return updated;
  }

  async cancel(paymentId: string, adminUserId: string, clubId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clubId },
    });
    if (!payment) throw new NotFoundException('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw new ForbiddenException('Giao dịch đã được xử lý');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED' },
    });
  }

  async findAll(
    clubId: string,
    opts: { status?: string; memberId?: string; page?: number; limit?: number },
  ) {
    const where: any = { clubId };
    if (opts.status) where.status = opts.status;
    if (opts.memberId) where.memberId = opts.memberId;

    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          member: { select: { fullName: true, phone: true } },
          confirmedBy: { select: { username: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(paymentId: string, clubId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clubId },
      include: {
        member: { select: { fullName: true, phone: true } },
        confirmedBy: { select: { username: true } },
      },
    });
    if (!payment) throw new NotFoundException('Giao dịch không tồn tại');
    return payment;
  }

  async getStats(clubId: string) {
    const [pending, confirmed, total] = await Promise.all([
      this.prisma.payment.count({ where: { clubId, status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { clubId, status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.count({ where: { clubId } }),
    ]);
    return {
      pendingCount: pending,
      confirmedCount: confirmed._count,
      confirmedAmount: confirmed._sum.amount ?? 0,
      totalCount: total,
    };
  }
}
