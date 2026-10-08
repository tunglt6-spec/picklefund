import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { RecordManualPaymentDto } from './billing.dto';

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản', CASH: 'Tiền mặt', EWALLET: 'Ví điện tử', OTHER: 'Khác',
};

/** Cộng `months` tháng, giữ nguyên ngày trong tháng (30/1 + 1 tháng → cuối tháng 2, không nhảy sang tháng 3). */
export function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/**
 * Super Admin ghi nhận thanh toán/gia hạn gói NGOÀI cổng (chuyển khoản, tiền mặt…).
 * Dùng chung hạ tầng sẵn có: tạo PaymentOrder(PAID, gateway=MANUAL) + Invoice + cập nhật Club.plan/planExpiresAt
 * + Subscription → mọi báo cáo doanh thu (Command Center đọc PaymentOrder PAID) tự cộng, CLB thấy trong Lịch sử thanh toán.
 */
@Injectable()
export class BillingManualService {
  constructor(private prisma: PrismaService, private audit: AuditLogsService) {}

  private genOrderCode(): string {
    const n = new Date();
    const p = (v: number, w = 2) => String(v).padStart(w, '0');
    const ts = `${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}${p(n.getMilliseconds(), 3)}`;
    return `MN${ts}${Math.floor(Math.random() * 90000 + 10000)}`;
  }

  async record(actorId: string, dto: RecordManualPaymentDto) {
    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
      select: { id: true, name: true, plan: true, planExpiresAt: true },
    });
    if (!club) throw new NotFoundException('Không tìm thấy CLB');

    const reference = dto.reference?.trim() || null;
    if (reference) {
      const dup = await this.prisma.paymentOrder.findFirst({
        where: { gateway: 'MANUAL', reference, status: 'PAID' },
        select: { orderCode: true, club: { select: { name: true } } },
      });
      if (dup) throw new BadRequestException(`Mã tham chiếu đã được ghi nhận (${dup.club.name} · ${dup.orderCode}).`);
    }

    const now = new Date();
    let paidAt = now;
    if (dto.paidAt) {
      const d = new Date(dto.paidAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Ngày thu không hợp lệ');
      if (d.getTime() > now.getTime() + 86400000) throw new BadRequestException('Ngày thu không được ở tương lai');
      paidAt = d;
    }

    // Gia hạn: cùng gói còn hạn → cộng tiếp từ ngày hết hạn; hết hạn/khác gói → tính từ hôm nay. Gói vô hạn do Admin cấp → giữ vô hạn.
    const unlimited = club.plan === dto.planTier && club.planExpiresAt == null && dto.planTier !== 'STARTER';
    const sameActive = club.plan === dto.planTier && club.planExpiresAt && club.planExpiresAt > now;
    const expiresAt = unlimited ? null : addMonths(sameActive ? club.planExpiresAt! : now, dto.months);
    const billingCycle = dto.months >= 12 && dto.months % 12 === 0 ? 'YEARLY' : 'MONTHLY';
    const orderCode = this.genOrderCode();

    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.paymentOrder.create({
        data: {
          clubId: club.id, orderCode, planTier: dto.planTier, billingCycle, amount: new Prisma.Decimal(Math.round(dto.amount)),
          gateway: 'MANUAL', status: 'PAID', paidAt, createdById: actorId, signatureVerified: true,
          method: dto.method, months: dto.months, reference, note: dto.note?.trim() || null,
        },
      });
      await tx.club.update({ where: { id: club.id }, data: { plan: dto.planTier, planExpiresAt: expiresAt } });
      await tx.subscription.upsert({
        where: { clubId: club.id },
        create: { clubId: club.id, planTier: dto.planTier, status: 'ACTIVE', billingCycle, startedAt: now, expiresAt },
        update: { planTier: dto.planTier, status: 'ACTIVE', billingCycle, expiresAt, cancelledAt: null },
      });
      await tx.invoice.create({
        data: { clubId: club.id, paymentOrderId: o.id, invoiceNumber: `INV-${orderCode}`, amount: o.amount, status: 'ISSUED' },
      });
      return o;
    });

    void this.audit.log({
      userId: actorId, clubId: club.id, action: 'CREATE', resource: 'PaymentOrder', resourceId: orderCode,
      detail: `Ghi nhận thanh toán gói ${dto.planTier} ${dto.months} tháng — ${Math.round(dto.amount).toLocaleString('vi-VN')}đ (${METHOD_LABEL[dto.method]}${reference ? ` · ${reference}` : ''}) · hạn mới ${expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'vô thời hạn'}`,
    });
    return { orderCode: order.orderCode, expiresAt, amount: Number(order.amount) };
  }

  /** Hủy bản ghi nhập nhầm (chỉ MANUAL): loại khỏi doanh thu + hóa đơn VOID. KHÔNG tự lùi hạn gói — Super Admin chỉnh hạn ở màn CLB. */
  async voidPayment(actorId: string, orderCode: string) {
    const o = await this.prisma.paymentOrder.findUnique({ where: { orderCode } });
    if (!o || o.gateway !== 'MANUAL') throw new NotFoundException('Không tìm thấy bản ghi thủ công');
    if (o.status !== 'PAID') throw new BadRequestException('Bản ghi đã được hủy trước đó');
    await this.prisma.$transaction([
      this.prisma.paymentOrder.update({ where: { id: o.id }, data: { status: 'CANCELLED' } }),
      this.prisma.invoice.updateMany({ where: { paymentOrderId: o.id }, data: { status: 'VOID' } }),
    ]);
    void this.audit.log({
      userId: actorId, clubId: o.clubId, action: 'DELETE', resource: 'PaymentOrder', resourceId: orderCode,
      detail: `Hủy ghi nhận thanh toán ${Number(o.amount).toLocaleString('vi-VN')}đ (gói ${o.planTier}) — hạn gói không tự đổi`,
    });
    return { orderCode, status: 'CANCELLED' };
  }


  /** Lịch sử thanh toán gói toàn nền tảng (mọi cổng + thủ công) kèm tổng hợp, lọc theo CLB/khoảng ngày. */
  async list(q: { clubId?: string; from?: string; to?: string; take?: number }) {
    const where: Prisma.PaymentOrderWhereInput = { status: 'PAID' };
    if (q.clubId) where.clubId = q.clubId;
    const range: Prisma.DateTimeFilter = {};
    if (q.from && !Number.isNaN(new Date(q.from).getTime())) range.gte = new Date(q.from);
    if (q.to && !Number.isNaN(new Date(q.to).getTime())) range.lt = new Date(new Date(q.to).getTime() + 86400000);
    if (range.gte || range.lt) where.paidAt = range;
    const take = Math.min(Math.max(Number(q.take) || 200, 1), 500);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [items, agg, byGateway, thisMonth] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where, orderBy: { paidAt: 'desc' }, take,
        include: { club: { select: { id: true, name: true, code: true } }, invoice: { select: { invoiceNumber: true } } },
      }),
      this.prisma.paymentOrder.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.paymentOrder.groupBy({ by: ['gateway'], where, _sum: { amount: true }, _count: true }),
      this.prisma.paymentOrder.aggregate({ where: { ...where, paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    ]);
    return {
      items: items.map((o) => ({
        orderCode: o.orderCode, club: o.club, planTier: o.planTier, billingCycle: o.billingCycle, months: o.months,
        amount: Number(o.amount), gateway: o.gateway, method: o.method, reference: o.reference, note: o.note,
        paidAt: o.paidAt, invoiceNumber: o.invoice?.invoiceNumber ?? null,
      })),
      summary: {
        total: Number(agg._sum.amount ?? 0), count: agg._count,
        thisMonthTotal: Number(thisMonth._sum.amount ?? 0), thisMonthCount: thisMonth._count,
        byGateway: byGateway.map((g) => ({ gateway: g.gateway, total: Number(g._sum.amount ?? 0), count: g._count })),
      },
    };
  }
}
