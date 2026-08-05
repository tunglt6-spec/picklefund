import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
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
