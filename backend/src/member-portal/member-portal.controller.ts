import { Body, Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberPortalService } from './member-portal.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';

/** User từ JWT — chỉ các field controller member-portal dùng (KHÔNG tin client). */
interface RequestUser {
  userId: string;
  clubId: string;
  memberId: string | null;
  role: string;
}

/** Body đăng ký / hủy đăng ký buổi chơi (self-scope). */
class SelfRegistrationDto {
  @IsBoolean() register!: boolean;
}

/** Body "Tôi đã chuyển khoản" — báo đã nộp quỹ (self-scope). */
class ReportPaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // Chỉ cho phép link http(s) — chặn javascript:/data: (stored XSS ở màn Admin).
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^https?:\/\//i, { message: 'Link chứng từ phải bắt đầu bằng http:// hoặc https://' })
  proofUrl?: string;
}

/**
 * Member self-view (AUTH-IMPL-01) — READ-ONLY, chỉ MEMBER_VIEW.
 * Phạm vi dữ liệu lấy từ JWT (memberId/clubId/userId), KHÔNG nhận memberId/clubId từ body/query.
 */
@ApiTags('Member Portal')
@ApiBearerAuth()
@Controller('member')
@Roles('MEMBER_VIEW')
export class MemberPortalController {
  constructor(private svc: MemberPortalService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getMe(user.memberId, user.clubId));
  }

  @Get('me/attendance')
  async attendance(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getAttendance(user.memberId, user.clubId));
  }

  @Get('me/finance')
  async finance(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getFinance(user.memberId, user.clubId));
  }

  @Get('me/contributions')
  async contributions(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getContributions(user.memberId, user.clubId));
  }

  @Get('me/personal-receipt')
  async personalReceipt(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getPersonalReceipts(user.memberId, user.clubId));
  }

  @Get('me/minigame')
  async minigame(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getMinigames(user.memberId, user.clubId));
  }

  @Get('me/bank-info')
  async bankInfo(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getBankInfo(user.memberId, user.clubId));
  }

  /** Member tự đăng ký / hủy đăng ký 1 buổi chơi (idempotent). */
  @Put('me/sessions/:sessionId/registration')
  async selfRegister(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: SelfRegistrationDto,
  ) {
    return ok(
      await this.svc.selfRegister(
        user.memberId,
        user.clubId,
        sessionId,
        body.register,
      ),
      body.register ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký',
    );
  }

  /** Member tự check-in PRESENT vào buổi chơi (idempotent). */
  @Put('me/sessions/:sessionId/checkin')
  async selfCheckin(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.selfCheckin(user.memberId, user.clubId, sessionId),
      'Đã check-in',
    );
  }

  // ─── Scope 1: Báo đã nộp quỹ ──────────────────────────────────────────────

  /** Bối cảnh báo nộp: số cần nộp, NH, nội dung CK, QR, trạng thái chờ duyệt. */
  @Get('me/payment-context')
  async paymentContext(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getPaymentContext(user.memberId, user.clubId));
  }

  /** Lịch sử báo nộp của chính member. */
  @Get('me/payments')
  async myPayments(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.listMyPayments(user.memberId, user.clubId));
  }

  /** Proxy ảnh QR VietQR (same-origin) — tránh lỗi tải ảnh cross-origin trên PWA/mobile. */
  @Get('me/payment-qr')
  async paymentQr(
    @CurrentUser() user: RequestUser,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    const url = await this.svc.getPaymentQrUrl(user.memberId, user.clubId, Number(amount) || 0);
    if (!url) {
      res.status(404).end();
      return;
    }
    try {
      const r = await fetch(url);
      if (!r.ok) {
        res.status(502).end();
        return;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', r.headers.get('content-type') || 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  }

  /** Member xác nhận "Tôi đã chuyển khoản" → tạo báo nộp PENDING (idempotent). */
  @Post('me/payments/report')
  async reportPayment(
    @CurrentUser() user: RequestUser,
    @Body() body: ReportPaymentDto,
  ) {
    return ok(
      await this.svc.reportPayment(user.memberId, user.clubId, body),
      'Đã gửi báo nộp quỹ, chờ Admin xác nhận',
    );
  }

  @Get('me/notifications')
  async notifications(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getNotifications(user.userId, user.clubId));
  }
}
