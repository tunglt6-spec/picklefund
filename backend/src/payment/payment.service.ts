import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private hermes: HermesService,
    private audit: AuditLogsService,
  ) {}

  private fmtVnd(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(v) + 'đ';
  }

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

  /**
   * Admin/Treasurer XÁC NHẬN đã nhận tiền: PENDING → CONFIRMED.
   * An toàn giao dịch ($transaction): cập nhật payment + ghi/nhận khoản đóng góp COMMON
   * (member-report → tạo mới; QR admin gắn contribution → confirm cái có sẵn). Sau đó
   * invalidate số dư + audit + thông báo lại cho member. KHÔNG có đường nào để member tự PAID.
   */
  async confirm(paymentId: string, adminUserId: string, clubId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clubId },
      include: { member: { select: { id: true, fullName: true, userId: true } } },
    });
    if (!payment) throw new NotFoundException('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw new ForbiddenException('Giao dịch đã được xử lý');

    const updated = await this.prisma.$transaction(async (tx) => {
      const up = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedById: adminUserId,
          confirmedAt: new Date(),
        },
      });

      if (payment.reportedByMember) {
        // Member đã báo → tạo khoản đóng góp COMMON (đã xác nhận) để tính vào "đã nộp".
        // referenceType=CONTRIBUTION → referenceId là fundPeriodId của khoản dues.
        const fundPeriodId =
          payment.referenceType === 'CONTRIBUTION' ? payment.referenceId : null;
        await tx.fundContribution.create({
          data: {
            clubId,
            fundPeriodId: fundPeriodId ?? undefined,
            memberId: payment.memberId,
            fundSource: 'COMMON',
            amount: payment.amount,
            paymentDate: new Date(),
            paymentMethod: 'bank_transfer',
            isConfirmed: true,
            createdById: adminUserId,
          },
        });
      } else if (payment.referenceId) {
        // QR do admin tạo, gắn 1 contribution có sẵn → confirm nó.
        await tx.fundContribution.updateMany({
          where: { id: payment.referenceId, clubId, isConfirmed: false },
          data: { isConfirmed: true },
        });
      }
      return up;
    });

    await this.calculator.invalidateClosingBalances(clubId);

    void this.audit.log({
      userId: adminUserId,
      clubId,
      action: 'CONFIRM',
      resource: 'Payment',
      resourceId: paymentId,
      detail: `Xác nhận đã nhận ${this.fmtVnd(Number(payment.amount))} từ ${payment.member?.fullName ?? 'thành viên'}`,
    });

    if (payment.member?.userId) {
      await this.hermes
        .dispatch({
          eventType: 'payment_confirmed_member',
          clubId,
          targetUserId: payment.member.userId,
          title: 'Đã xác nhận nộp quỹ',
          body: `Khoản ${this.fmtVnd(Number(payment.amount))} của bạn đã được xác nhận. Cảm ơn bạn!`,
          metadata: { link: '/member/contributions', paymentId },
        })
        .catch(() => undefined);
    }

    return updated;
  }

  /**
   * Admin YÊU CẦU KIỂM TRA LẠI: PENDING → CANCELLED + recheckNote (giữ lịch sử lần báo).
   * Member nhận thông báo và có thể báo nộp lại (tạo dòng mới). KHÔNG xóa dữ liệu.
   */
  async requestRecheck(
    paymentId: string,
    adminUserId: string,
    clubId: string,
    note?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clubId },
      include: { member: { select: { fullName: true, userId: true } } },
    });
    if (!payment) throw new NotFoundException('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw new ForbiddenException('Giao dịch đã được xử lý');

    const reason = (note ?? '').trim().slice(0, 500) || 'Cần kiểm tra lại';
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', recheckNote: reason },
    });

    void this.audit.log({
      userId: adminUserId,
      clubId,
      action: 'RECHECK',
      resource: 'Payment',
      resourceId: paymentId,
      detail: `Yêu cầu kiểm tra lại khoản báo nộp của ${payment.member?.fullName ?? 'thành viên'}: ${reason}`,
    });

    if (payment.member?.userId) {
      await this.hermes
        .dispatch({
          eventType: 'payment_recheck',
          clubId,
          targetUserId: payment.member.userId,
          title: 'Cần kiểm tra lại khoản nộp quỹ',
          body: reason,
          metadata: { link: '/member/contributions', paymentId },
        })
        .catch(() => undefined);
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
