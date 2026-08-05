import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  BillingCycle,
  PaymentGateway,
  PaymentOrder,
  Prisma,
  ServicePlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProviderFactory } from './provider/provider.factory';
import { PLAN_CONFIGS, computeDiscount } from './billing.types';
import { ReferralsService } from '../referrals/referrals.service';

/**
 * Luồng tự-thanh-toán (Phase 1 nền):
 *   chọn gói → tạo PaymentOrder (backend TÍNH GIÁ) → checkoutUrl → người dùng trả tiền →
 *   webhook cổng (đã xác minh chữ ký) → kích hoạt gói (ghi Club.plan/planExpiresAt) → hoá đơn.
 * Nguyên tắc: KHÔNG tin số tiền từ client; chỉ webhook signatureVerified mới kích hoạt; idempotent.
 */
@Injectable()
export class BillingCheckoutService {
  private readonly logger = new Logger(BillingCheckoutService.name);
  private readonly appUrl =
    process.env.APP_PUBLIC_URL || process.env.APP_URL || 'https://app.picklefund.uk';
  private readonly apiUrl =
    process.env.API_PUBLIC_URL || process.env.API_URL || 'https://api.picklefund.uk';

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogsService,
    private providers: ProviderFactory,
    private referrals: ReferralsService,
  ) {}

  private planPrice(tier: ServicePlan, cycle: BillingCycle): number | null {
    const cfg = PLAN_CONFIGS[tier];
    return cycle === 'YEARLY' ? cfg.priceYearly : cfg.priceMonthly;
  }

  private addCycle(base: Date, cycle: BillingCycle): Date {
    const d = new Date(base);
    if (cycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
  }

  private genOrderCode(): string {
    const now = new Date();
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    const ts = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `PF${ts}${rand}`;
  }

  // ── Tạo đơn thanh toán ──────────────────────────────────────────────────────
  async createOrder(input: {
    clubId: string;
    userId?: string;
    planTier: ServicePlan;
    billingCycle: BillingCycle;
    promoCode?: string;
    billingInfo?: Record<string, unknown>;
  }): Promise<{
    orderCode: string;
    checkoutUrl: string;
    amount: number;
    discount: number;
    gateway: PaymentGateway;
  }> {
    const { clubId, userId, planTier, billingCycle, promoCode, billingInfo } = input;
    if (planTier === 'STARTER') throw new BadRequestException('Gói Starter miễn phí, không cần thanh toán.');
    const base = this.planPrice(planTier, billingCycle);
    if (base == null) {
      throw new BadRequestException('Gói này liên hệ tư vấn — chưa bán tự động.');
    }
    if (base <= 0) throw new BadRequestException('Số tiền không hợp lệ.');
    // Giảm giá do BACKEND tính (không tin client). Số tiền cuối = giá - giảm.
    const { discount, promo } = computeDiscount(promoCode, base);
    const amount = Math.max(0, base - discount);
    if (amount <= 0) throw new BadRequestException('Số tiền sau giảm không hợp lệ.');

    const provider = this.providers.resolveActive();
    const orderCode = this.genOrderCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // đơn hết hạn sau 30 phút

    const order = await this.prisma.paymentOrder.create({
      data: {
        clubId,
        orderCode,
        planTier,
        billingCycle,
        amount, // đã trừ giảm giá — BACKEND tính, không nhận từ client
        discountAmount: discount,
        promoCode: promo?.code ?? null,
        billingInfo: (billingInfo ?? undefined) as Prisma.InputJsonValue | undefined,
        currency: 'VND',
        gateway: provider.name as PaymentGateway,
        status: 'PENDING',
        expiresAt,
        createdById: userId ?? null,
      },
    });

    const ctx = {
      returnUrl: `${this.appUrl}/he-thong?tab=billing&order=${orderCode}`,
      ipnUrl: `${this.apiUrl}/billing/webhook/${provider.name.toLowerCase()}`,
    };
    let checkoutUrl: string;
    try {
      const r = await provider.createCheckout(order, ctx);
      checkoutUrl = r.checkoutUrl;
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { checkoutUrl, providerTxnId: r.providerRef ?? null },
      });
    } catch (e) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Không tạo được phiên thanh toán.',
      );
    }

    if (userId) {
      void this.audit.log({
        userId,
        clubId,
        action: 'CREATE',
        resource: 'PaymentOrder',
        resourceId: orderCode,
        detail: `Tạo đơn nâng cấp ${planTier} (${billingCycle}) — ${amount.toLocaleString('vi-VN')}đ${discount > 0 ? ` (giảm ${discount.toLocaleString('vi-VN')}đ · ${promo?.code})` : ''} qua ${provider.name}`,
      });
    }
    return { orderCode, checkoutUrl, amount, discount, gateway: provider.name as PaymentGateway };
  }

  /** Kiểm mã ưu đãi (preview cho UI) — trả số giảm tính trên giá gói+chu kỳ. */
  validatePromo(code: string, planTier: ServicePlan, billingCycle: BillingCycle) {
    const base = this.planPrice(planTier, billingCycle);
    if (base == null || base <= 0) return { valid: false as const };
    const { discount, promo } = computeDiscount(code, base);
    if (!promo) return { valid: false as const };
    return {
      valid: true as const,
      code: promo.code,
      label: promo.label,
      discount,
      finalAmount: Math.max(0, base - discount),
    };
  }

  /** Hủy gia hạn — giữ quyền dùng đến hết hạn; chỉ đánh dấu không tự gia hạn. */
  async cancelSubscription(clubId: string, userId?: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { plan: true, planExpiresAt: true },
    });
    if (!club) throw new NotFoundException('CLB không tồn tại.');
    if (!club.planExpiresAt) {
      throw new BadRequestException('Gói không có hạn (Admin cấp) — không cần hủy gia hạn.');
    }
    await this.prisma.subscription.updateMany({
      where: { clubId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', autoRenew: false, cancelledAt: new Date() },
    });
    if (userId) {
      void this.audit.log({
        userId,
        clubId,
        action: 'UPDATE',
        resource: 'Subscription',
        resourceId: clubId,
        detail: `Hủy gia hạn — vẫn dùng đến ${club.planExpiresAt.toLocaleDateString('vi-VN')}`,
      });
    }
    return { ok: true, activeUntil: club.planExpiresAt.toISOString() };
  }

  // ── Webhook/IPN — NGUỒN kích hoạt có thẩm quyền ─────────────────────────────
  async handleWebhook(
    gateway: PaymentGateway,
    payload: Record<string, unknown>,
    headers: Record<string, unknown> = {},
  ): Promise<{ ok: boolean; reason?: string }> {
    const provider = this.providers.byGateway(gateway);
    const verdict = provider.verifyWebhook(payload, headers);
    if (!verdict.orderCode) return { ok: false, reason: 'no_order_code' };

    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderCode: verdict.orderCode },
    });
    if (!order) return { ok: false, reason: 'order_not_found' };
    // Webhook PHẢI đến từ đúng cổng đã tạo đơn (chặn forge mock-webhook lên đơn MoMo).
    if (order.gateway !== gateway) return { ok: false, reason: 'gateway_mismatch' };

    // Luôn lưu payload thô + trạng thái chữ ký để đối soát.
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        rawPayload: verdict.raw as Prisma.InputJsonValue,
        providerTxnId: verdict.providerTxnId || order.providerTxnId,
        signatureVerified: verdict.signatureVerified,
      },
    });

    if (!verdict.signatureVerified) {
      this.logger.warn(`Webhook ${gateway} order ${order.orderCode}: chữ ký KHÔNG hợp lệ — bỏ qua.`);
      return { ok: false, reason: 'bad_signature' };
    }
    if (order.status === 'PAID') return { ok: true, reason: 'already_paid' }; // idempotent
    if (!verdict.success) {
      await this.prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      return { ok: false, reason: 'payment_failed' };
    }

    await this.activate(order);
    return { ok: true };
  }

  // ── Giả lập thanh toán (chỉ gateway MOCK, sandbox) ──────────────────────────
  async simulatePayment(clubId: string, orderCode: string, userId?: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { orderCode } });
    if (!order || order.clubId !== clubId) throw new NotFoundException('Không tìm thấy đơn.');
    if (order.gateway !== 'MOCK') {
      throw new BadRequestException('Chỉ giả lập được đơn ở chế độ SANDBOX (MOCK).');
    }
    const mock = this.providers.mockProvider;
    const providerTxnId = `MOCK${Date.now()}`;
    const payload: Record<string, unknown> = {
      orderCode,
      providerTxnId,
      success: true,
      signature: mock.sign(orderCode, providerTxnId, true),
    };
    if (userId) {
      void this.audit.log({
        userId,
        clubId,
        action: 'UPDATE',
        resource: 'PaymentOrder',
        resourceId: orderCode,
        detail: 'Giả lập thanh toán thành công (SANDBOX)',
      });
    }
    return this.handleWebhook('MOCK', payload);
  }

  // ── Kích hoạt/gia hạn gói (ghi Club.plan để mọi gate hiện có nhận) ──────────
  private async activate(order: PaymentOrder): Promise<void> {
    const club = await this.prisma.club.findUnique({
      where: { id: order.clubId },
      select: { plan: true, planExpiresAt: true },
    });
    const now = new Date();
    // Gói VÔ HẠN do Admin cấp (đúng gói + planExpiresAt=null) → GIỮ vô hạn, không "đóng khung"
    // thành có hạn; vẫn ghi order/invoice/subscription để lưu vết. Ngược lại: gia hạn (còn hạn
    // cộng tiếp vào ngày hết hạn; hết hạn/khác gói → tính từ now).
    const adminUnlimited = club?.plan === order.planTier && club?.planExpiresAt == null;
    let expiresAt: Date | null;
    if (adminUnlimited) {
      expiresAt = null;
    } else {
      const sameActive =
        club?.plan === order.planTier && club?.planExpiresAt && club.planExpiresAt > now;
      const base = sameActive ? club!.planExpiresAt! : now;
      expiresAt = this.addCycle(base, order.billingCycle);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: now },
      });
      // Gói hiệu lực THẬT (member-limit + scheduler đọc đây).
      await tx.club.update({
        where: { id: order.clubId },
        data: { plan: order.planTier, planExpiresAt: expiresAt },
      });
      await tx.subscription.upsert({
        where: { clubId: order.clubId },
        create: {
          clubId: order.clubId,
          planTier: order.planTier,
          status: 'ACTIVE',
          billingCycle: order.billingCycle,
          startedAt: now,
          expiresAt,
        },
        update: {
          planTier: order.planTier,
          status: 'ACTIVE',
          billingCycle: order.billingCycle,
          expiresAt,
          cancelledAt: null,
        },
      });
      await tx.invoice.create({
        data: {
          clubId: order.clubId,
          paymentOrderId: order.id,
          invoiceNumber: `INV-${order.orderCode}`,
          amount: order.amount,
          billingInfo: (order.billingInfo ?? undefined) as Prisma.InputJsonValue | undefined,
          status: 'ISSUED',
        },
      });
    });

    const expLabel = expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'vô thời hạn (Admin cấp)';
    if (order.createdById) {
      void this.audit.log({
        clubId: order.clubId,
        userId: order.createdById,
        action: 'UPDATE',
        resource: 'Club',
        resourceId: order.clubId,
        detail: `Kích hoạt gói ${order.planTier} (${order.billingCycle}) đến ${expLabel} — đơn ${order.orderCode}`,
      });
    }
    this.logger.log(`Kích hoạt ${order.planTier} cho CLB ${order.clubId} — hạn: ${expiresAt ? expiresAt.toISOString() : 'null (vô hạn)'}`);

    // Referral: CLB được-giới-thiệu lên Pro (thanh toán thật) → thưởng +1 tháng cho cả hai.
    // Best-effort: lỗi referral KHÔNG được làm hỏng việc kích hoạt gói đã thanh toán.
    if (order.planTier === 'PRO') {
      try {
        await this.referrals.rewardForReferredClub(order.clubId);
      } catch (e) {
        this.logger.warn(`Referral reward lỗi (bỏ qua): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Lịch sử ─────────────────────────────────────────────────────────────────
  getOrders(clubId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getInvoices(clubId: string) {
    return this.prisma.invoice.findMany({
      where: { clubId },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
  }

  getOrder(clubId: string, orderCode: string) {
    return this.prisma.paymentOrder.findFirst({ where: { clubId, orderCode } });
  }

  /** Trạng thái cổng thanh toán (super-admin xác nhận cắm khoá MoMo). */
  gatewayStatus() {
    return this.providers.status();
  }
}
