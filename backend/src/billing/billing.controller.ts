import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { PaymentGateway } from '@prisma/client';
import { BillingService } from './billing.service';
import { BillingCheckoutService } from './billing-checkout.service';
import { ConfirmManualPaymentDto, CreateOrderDto, RecordManualPaymentDto, RejectManualPaymentDto, RequestManualPaymentDto } from './billing.dto';
import { BillingManualService } from './billing-manual.service';
import { PlanRenewalReminderService } from './plan-renewal-reminder.service';
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
    private manual: BillingManualService,
    private renewal: PlanRenewalReminderService,
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

  /** Trạng thái cổng thanh toán — super-admin xác nhận đã cắm khoá MoMo. */
  @Roles('SUPER_ADMIN')
  @Get('gateway')
  gatewayStatus() {
    return ok(this.checkout.gatewayStatus());
  }

  /** SUPER_ADMIN: lịch sử thanh toán gói toàn nền tảng + tổng hợp. */
  @Roles('SUPER_ADMIN')
  @Get('manual-payments')
  async listPayments(@Query('clubId') clubId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('take') take?: string) {
    return ok(await this.manual.list({ clubId, from, to, take: Number(take) || undefined }));
  }

  /** SUPER_ADMIN: ghi nhận thanh toán/gia hạn gói thủ công cho 1 CLB. */
  @Roles('SUPER_ADMIN')
  @Post('manual-payments')
  async recordPayment(@CurrentUser() user: JwtUser, @Body() dto: RecordManualPaymentDto) {
    return ok(await this.manual.record(user.userId, dto), 'Đã ghi nhận thanh toán');
  }

  private clampMonths(v?: string): number {
    const n = Math.round(Number(v) || 1);
    return Math.min(Math.max(n, 1), 36);
  }

  /** CLB Admin: thông tin chuyển khoản gia hạn (tài khoản nhận của Super Admin + số tiền gợi ý + nội dung). */
  @Roles('CLUB_ADMIN')
  @Get('renewal-info')
  async renewalInfo(@CurrentUser() user: JwtUser, @Query('months') months?: string) {
    const info = await this.renewal.renewalInfo(user.clubId as string, this.clampMonths(months));
    return ok(info);
  }

  /** CLB Admin: ảnh QR chuyển khoản gia hạn (tạo ở máy chủ, cùng origin). */
  @Roles('CLUB_ADMIN')
  @Get('renewal-qr')
  async renewalQr(@CurrentUser() user: JwtUser, @Res() res: Response, @Query('months') months?: string) {
    const buf = await this.renewal.renewalQr(user.clubId as string, this.clampMonths(months));
    if (!buf) throw new NotFoundException('Chưa có thông tin tài khoản nhận hoặc không tạo được mã QR');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buf);
  }

  /** SUPER_ADMIN: chạy nhắc gia hạn ngay (toàn bộ CLB đến mốc, hoặc 1 CLB). Tôn trọng chống nhắc trùng theo mốc. */
  @Roles('SUPER_ADMIN')
  @Post('renewal-reminders/run')
  async runRenewal(@Body() body: { clubId?: string }) {
    if (body?.clubId !== undefined && typeof body.clubId !== 'string') throw new BadRequestException('clubId không hợp lệ');
    return ok(await this.renewal.run(body?.clubId || undefined));
  }

  /** CLB Admin: gửi yêu cầu xác nhận khoản đã chuyển khoản (chờ Super Admin duyệt mới có hiệu lực). */
  @Roles('CLUB_ADMIN')
  @Post('manual-requests')
  async requestPayment(@CurrentUser() user: JwtUser, @Body() dto: RequestManualPaymentDto) {
    return ok(await this.manual.requestPayment(user.userId, user.clubId as string, dto), 'Đã gửi yêu cầu, chờ Super Admin xác nhận');
  }

  @Roles('SUPER_ADMIN')
  @Get('manual-payments/pending')
  async listPending() {
    return ok(await this.manual.listPending());
  }

  @Roles('SUPER_ADMIN')
  @Post('manual-payments/:orderCode/confirm')
  async confirmRequest(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string, @Body() dto: ConfirmManualPaymentDto) {
    return ok(await this.manual.confirmRequest(user.userId, orderCode, dto.amount), 'Đã xác nhận thanh toán');
  }

  @Roles('SUPER_ADMIN')
  @Post('manual-payments/:orderCode/reject')
  async rejectRequest(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string, @Body() dto: RejectManualPaymentDto) {
    return ok(await this.manual.rejectRequest(user.userId, orderCode, dto.reason), 'Đã từ chối yêu cầu');
  }

  @Roles('SUPER_ADMIN')
  @Post('manual-payments/:orderCode/void')
  async voidPayment(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string) {
    return ok(await this.manual.voidPayment(user.userId, orderCode), 'Đã hủy ghi nhận');
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
