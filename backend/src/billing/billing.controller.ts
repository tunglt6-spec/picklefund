import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { PaymentGateway } from '@prisma/client';
import { BillingService } from './billing.service';
import { BillingCheckoutService } from './billing-checkout.service';
import { CreateOrderDto } from './billing.dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';

@SkipThrottle()
@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private svc: BillingService,
    private checkout: BillingCheckoutService,
  ) {}

  @Get('plans')
  getPlans() {
    return ok(this.svc.getPlans());
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('subscription')
  async getSubscription(@CurrentUser() user: JwtUser, @Query('clubId') queryClubId?: string) {
    const clubId = user.role === 'SUPER_ADMIN' && queryClubId ? queryClubId : user.clubId;
    return ok(await this.svc.getSubscription(clubId as string));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('ai-usage')
  async getAiUsage(@CurrentUser() user: JwtUser, @Query('clubId') queryClubId?: string) {
    const clubId = user.role === 'SUPER_ADMIN' && queryClubId ? queryClubId : user.clubId;
    return ok(await this.svc.getAiUsage(clubId as string));
  }

  // ── Self-service checkout (Phase 1) ────────────────────────────────────────
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('orders')
  async createOrder(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return ok(
      await this.checkout.createOrder({
        clubId: user.clubId as string,
        userId: user.userId,
        planTier: dto.planTier,
        billingCycle: dto.billingCycle,
        promoCode: dto.promoCode,
        billingInfo: dto.billingInfo,
      }),
    );
  }

  /** Kiểm mã ưu đãi (preview) trước khi thanh toán. */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('promo/:code')
  validatePromo(
    @Param('code') code: string,
    @Query('planTier') planTier?: string,
    @Query('billingCycle') billingCycle?: string,
  ) {
    return ok(
      this.checkout.validatePromo(
        code,
        (planTier || 'PRO') as import('@prisma/client').ServicePlan,
        (billingCycle || 'MONTHLY') as import('@prisma/client').BillingCycle,
      ),
    );
  }

  /** Hủy gia hạn — vẫn dùng đến hết hạn. */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('subscription/cancel')
  async cancel(@CurrentUser() user: JwtUser) {
    return ok(await this.checkout.cancelSubscription(user.clubId as string, user.userId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('orders')
  async getOrders(@CurrentUser() user: JwtUser) {
    return ok(await this.checkout.getOrders(user.clubId as string));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('invoices')
  async getInvoices(@CurrentUser() user: JwtUser) {
    return ok(await this.checkout.getInvoices(user.clubId as string));
  }

  /** Giả lập thanh toán thành công — CHỈ đơn SANDBOX (gateway MOCK). */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('orders/:orderCode/simulate')
  async simulate(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string) {
    return ok(await this.checkout.simulatePayment(user.clubId as string, orderCode, user.userId));
  }

  /** Webhook/IPN từ cổng — PUBLIC, nguồn kích hoạt có thẩm quyền (xác minh chữ ký). */
  @Public()
  @Post('webhook/:gateway')
  async webhook(@Param('gateway') gateway: string, @Body() payload: Record<string, unknown>) {
    const gw = gateway.toUpperCase() as PaymentGateway;
    return ok(await this.checkout.handleWebhook(gw, payload ?? {}));
  }
}
