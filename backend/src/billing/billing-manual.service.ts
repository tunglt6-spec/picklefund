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

  /** Chỉ mục duy nhất theo mã tham chiếu (thủ công) chặn 2 request song song cùng mã → báo lỗi dễ hiểu. */
  private async guardDup<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Mã tham chiếu đã được ghi nhận.');
      }
      throw e;
    }
  }

  private parsePaidAt(paidAt: string | undefined, now: Date): Date {
    if (!paidAt) return now;
    const d = new Date(paidAt);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Ngày thu không hợp lệ');
    if (d.getTime() > now.getTime() + 86400000) throw new BadRequestException('Ngày thu không được ở tương lai');
    return d;
  }

  /** Gia hạn: cùng gói còn hạn → cộng tiếp từ ngày hết hạn; hết hạn/khác gói → từ hôm nay; gói vô hạn do Admin cấp → giữ vô hạn. */
  private expiryFor(club: { plan: string; planExpiresAt: Date | null }, planTier: string, months: number, now: Date, resetExpiry = false): Date | null {
    const unlimited = !resetExpiry && club.plan === planTier && club.planExpiresAt == null && planTier !== 'STARTER';
    if (unlimited) return null;
    const sameActive = club.plan === planTier && club.planExpiresAt && club.planExpiresAt > now;
    return addMonths(sameActive ? club.planExpiresAt! : now, months);
  }

  private async assertUniqueReference(reference: string | null) {
    if (!reference) return;
    const dup = await this.prisma.paymentOrder.findFirst({
      where: { gateway: 'MANUAL', reference, status: { in: ['PAID', 'PENDING'] } },
      select: { orderCode: true, club: { select: { name: true } } },
    });
    if (dup) throw new BadRequestException(`Mã tham chiếu đã được ghi nhận (${dup.club.name} · ${dup.orderCode}).`);
  }

  /** Áp khoản thu đã duyệt: cập nhật gói/hạn CLB, subscription, hóa đơn (trong transaction). */
  private async applyPaid(
    tx: Prisma.TransactionClient,
    o: { id: string; clubId: string; orderCode: string; planTier: any; billingCycle: any; amount: Prisma.Decimal },
    expiresAt: Date | null,
    now: Date,
  ) {
    await tx.club.update({ where: { id: o.clubId }, data: { plan: o.planTier, planExpiresAt: expiresAt } });
    await tx.subscription.upsert({
      where: { clubId: o.clubId },
      create: { clubId: o.clubId, planTier: o.planTier, status: 'ACTIVE', billingCycle: o.billingCycle, startedAt: now, expiresAt },
      update: { planTier: o.planTier, status: 'ACTIVE', billingCycle: o.billingCycle, expiresAt, cancelledAt: null },
    });
    await tx.invoice.create({ data: { clubId: o.clubId, paymentOrderId: o.id, invoiceNumber: `INV-${o.orderCode}`, amount: o.amount, status: 'ISSUED' } });
  }

  async record(actorId: string, dto: RecordManualPaymentDto) {
    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
      select: { id: true, name: true, plan: true, planExpiresAt: true },
    });
    if (!club) throw new NotFoundException('Không tìm thấy CLB');

    const reference = dto.reference?.trim() || null;
    await this.assertUniqueReference(reference);
    const now = new Date();
    const paidAt = this.parsePaidAt(dto.paidAt, now);
    const expiresAt = this.expiryFor(club, dto.planTier, dto.months, now, dto.resetExpiry === true);
    const billingCycle = dto.months >= 12 && dto.months % 12 === 0 ? 'YEARLY' : 'MONTHLY';
    const orderCode = this.genOrderCode();

    const order = await this.guardDup(() => this.prisma.$transaction(async (tx) => {
      const o = await tx.paymentOrder.create({
        data: {
          clubId: club.id, orderCode, planTier: dto.planTier, billingCycle, amount: new Prisma.Decimal(Math.round(dto.amount)),
          gateway: 'MANUAL', status: 'PAID', paidAt, createdById: actorId, signatureVerified: true,
          method: dto.method, months: dto.months, reference, note: dto.note?.trim() || null,
        },
      });
      await this.applyPaid(tx, o, expiresAt, now);
      return o;
    }));

    void this.audit.log({
      userId: actorId, clubId: club.id, action: 'CREATE', resource: 'PaymentOrder', resourceId: orderCode,
      detail: `Ghi nhận thanh toán gói ${dto.planTier} ${dto.months} tháng — ${Math.round(dto.amount).toLocaleString('vi-VN')}đ (${METHOD_LABEL[dto.method]}${reference ? ` · ${reference}` : ''}) · hạn mới ${expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'vô thời hạn'}`,
    });
    return { orderCode: order.orderCode, expiresAt, amount: Number(order.amount) };
  }

  /** CLB Admin gửi yêu cầu xác nhận khoản đã chuyển khoản gia hạn gói → PENDING; Super Admin xác nhận mới có hiệu lực (không tự kích hoạt). */
  async requestPayment(actorId: string, clubId: string, dto: Omit<RecordManualPaymentDto, 'clubId'>) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } });
    if (!club) throw new NotFoundException('Không tìm thấy CLB');
    if (dto.amount <= 0) throw new BadRequestException('Nhập số tiền đã chuyển');
    const pending = await this.prisma.paymentOrder.count({ where: { clubId, gateway: 'MANUAL', status: 'PENDING' } });
    if (pending >= 5) throw new BadRequestException('Đang có quá nhiều yêu cầu chờ xác nhận (tối đa 5). Vui lòng chờ Super Admin xử lý.');
    const reference = dto.reference?.trim() || null;
    await this.assertUniqueReference(reference);
    const now = new Date();
    const paidAt = this.parsePaidAt(dto.paidAt, now);
    const orderCode = this.genOrderCode();
    const o = await this.guardDup(() => this.prisma.paymentOrder.create({
      data: {
        clubId, orderCode, planTier: dto.planTier, billingCycle: dto.months >= 12 && dto.months % 12 === 0 ? 'YEARLY' : 'MONTHLY',
        amount: new Prisma.Decimal(Math.round(dto.amount)), gateway: 'MANUAL', status: 'PENDING', paidAt, createdById: actorId,
        method: dto.method, months: dto.months, reference, note: dto.note?.trim() || null,
      },
    }));
    void this.audit.log({
      userId: actorId, clubId, action: 'CREATE', resource: 'PaymentOrder', resourceId: orderCode,
      detail: `CLB gửi yêu cầu xác nhận thanh toán gói ${dto.planTier} ${dto.months} tháng — ${Math.round(dto.amount).toLocaleString('vi-VN')}đ (${METHOD_LABEL[dto.method]}${reference ? ` · ${reference}` : ''})`,
    });
    // Báo Super Admin qua chuông (best-effort — không làm hỏng việc gửi yêu cầu).
    try {
      const supers = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } });
      if (supers.length) {
        await this.prisma.notification.createMany({
          data: supers.map((u) => ({
            userId: u.id, clubId, eventType: 'plan_payment_request', priority: 'MEDIUM' as const, channel: 'IN_APP' as const,
            title: `${club.name}: yêu cầu xác nhận thanh toán gói`,
            body: `${Math.round(dto.amount).toLocaleString('vi-VN')}đ · gói ${dto.planTier} ${dto.months} tháng · ${METHOD_LABEL[dto.method]}. Vào Thanh toán gói để xác nhận.`,
            metadata: { orderCode }, status: 'SENT' as const, sentAt: new Date(),
          })),
        });
      }
    } catch { /* best-effort */ }
    return { orderCode: o.orderCode, status: 'PENDING' };
  }

  /** Super Admin xác nhận yêu cầu của CLB (có thể chỉnh số tiền thực nhận) → PAID + kích hoạt/gia hạn gói. */
  async confirmRequest(actorId: string, orderCode: string, amount?: number) {
    const o = await this.prisma.paymentOrder.findUnique({ where: { orderCode }, include: { club: { select: { id: true, name: true, plan: true, planExpiresAt: true } } } });
    if (!o || o.gateway !== 'MANUAL') throw new NotFoundException('Không tìm thấy yêu cầu');
    if (o.status !== 'PENDING') throw new BadRequestException('Yêu cầu đã được xử lý');
    const now = new Date();
    const months = o.months ?? (o.billingCycle === 'YEARLY' ? 12 : 1);
    const expiresAt = this.expiryFor(o.club, o.planTier, months, now);
    const finalAmount = amount != null && amount >= 0 ? new Prisma.Decimal(Math.round(amount)) : o.amount;
    await this.prisma.$transaction(async (tx) => {
      // Cập nhật có điều kiện status để chặn xác nhận trùng song song.
      const res = await tx.paymentOrder.updateMany({ where: { id: o.id, status: 'PENDING' }, data: { status: 'PAID', amount: finalAmount, signatureVerified: true } });
      if (res.count !== 1) throw new BadRequestException('Yêu cầu đã được xử lý');
      await this.applyPaid(tx, { ...o, amount: finalAmount }, expiresAt, now);
    });
    void this.audit.log({
      userId: actorId, clubId: o.clubId, action: 'UPDATE', resource: 'PaymentOrder', resourceId: orderCode,
      detail: `Xác nhận thanh toán gói ${o.planTier} ${months} tháng — ${Number(finalAmount).toLocaleString('vi-VN')}đ · hạn mới ${expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'vô thời hạn'}`,
    });
    return { orderCode, status: 'PAID', expiresAt };
  }

  async rejectRequest(actorId: string, orderCode: string, reason?: string) {
    const o = await this.prisma.paymentOrder.findUnique({ where: { orderCode } });
    if (!o || o.gateway !== 'MANUAL') throw new NotFoundException('Không tìm thấy yêu cầu');
    const res = await this.prisma.paymentOrder.updateMany({
      where: { id: o.id, status: 'PENDING' },
      data: { status: 'CANCELLED', note: [o.note, reason ? `Từ chối: ${reason.slice(0, 200)}` : 'Bị từ chối'].filter(Boolean).join(' · ') },
    });
    if (res.count !== 1) throw new BadRequestException('Yêu cầu đã được xử lý');
    void this.audit.log({ userId: actorId, clubId: o.clubId, action: 'UPDATE', resource: 'PaymentOrder', resourceId: orderCode, detail: `Từ chối yêu cầu thanh toán gói ${Number(o.amount).toLocaleString('vi-VN')}đ${reason ? ` — ${reason}` : ''}` });
    return { orderCode, status: 'CANCELLED' };
  }

  async listPending() {
    const items = await this.prisma.paymentOrder.findMany({
      where: { gateway: 'MANUAL', status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 200,
      include: { club: { select: { id: true, name: true, code: true } } },
    });
    return items.map((o) => ({
      orderCode: o.orderCode, club: o.club, planTier: o.planTier, months: o.months, amount: Number(o.amount),
      method: o.method, reference: o.reference, note: o.note, paidAt: o.paidAt, createdAt: o.createdAt,
    }));
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
      this.prisma.paymentOrder.aggregate({ where: { ...where, paidAt: { ...(range.lt ? { lt: range.lt } : {}), gte: range.gte && range.gte > monthStart ? range.gte : monthStart } }, _sum: { amount: true }, _count: true }),
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
