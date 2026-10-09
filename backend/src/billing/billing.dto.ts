import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { BillingCycle, ServicePlan } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum({ STARTER: 'STARTER', PRO: 'PRO', CLUB_PLUS: 'CLUB_PLUS' })
  planTier!: ServicePlan;

  @IsEnum({ MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' })
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;

  @IsOptional()
  @IsObject()
  billingInfo?: Record<string, unknown>;
}

export const MANUAL_METHODS = ['BANK_TRANSFER', 'CASH', 'EWALLET', 'OTHER'] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];

/** Super Admin ghi nhận thanh toán/gia hạn gói thủ công cho 1 CLB. */
export class RecordManualPaymentDto {
  @IsString() @MaxLength(64) clubId!: string;

  @IsEnum({ STARTER: 'STARTER', PRO: 'PRO', CLUB_PLUS: 'CLUB_PLUS' })
  planTier!: ServicePlan;

  /** Số tháng gia hạn (1–36). */
  @IsInt() @Min(1) @Max(36) months!: number;

  /** Số tiền thực thu (VND, ≥ 0). */
  @IsNumber() @Min(0) @Max(1_000_000_000) amount!: number;

  @IsIn([...MANUAL_METHODS]) method!: ManualMethod;

  /** Ngày thu thực tế (ISO yyyy-mm-dd); mặc định hôm nay. */
  @IsOptional() @IsString() @MaxLength(32) paidAt?: string;

  /** Mã giao dịch ngân hàng / số biên lai — chống ghi trùng. */
  @IsOptional() @IsString() @MaxLength(120) reference?: string;

  @IsOptional() @IsString() @MaxLength(500) note?: string;

  /** Gói đang "vô thời hạn" (hạn rỗng) → true để chuyển sang có hạn, tính từ hôm nay. */
  @IsOptional() @IsBoolean() resetExpiry?: boolean;
}

/** CLB Admin gửi yêu cầu xác nhận khoản đã chuyển khoản gia hạn gói (clubId lấy từ JWT, không nhận từ client). */
export class RequestManualPaymentDto {
  @IsEnum({ STARTER: 'STARTER', PRO: 'PRO', CLUB_PLUS: 'CLUB_PLUS' }) planTier!: ServicePlan;
  @IsInt() @Min(1) @Max(36) months!: number;
  @IsNumber() @Min(1) @Max(1_000_000_000) amount!: number;
  @IsIn([...MANUAL_METHODS]) method!: ManualMethod;
  @IsOptional() @IsString() @MaxLength(32) paidAt?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ConfirmManualPaymentDto {
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000_000) amount?: number;
}

export class RejectManualPaymentDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
