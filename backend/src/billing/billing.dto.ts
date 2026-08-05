import { IsEnum, IsObject, IsOptional } from 'class-validator';
import type { BillingCycle, ServicePlan } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum({ STARTER: 'STARTER', PRO: 'PRO', CLUB_PLUS: 'CLUB_PLUS' })
  planTier!: ServicePlan;

  @IsEnum({ MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' })
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsObject()
  billingInfo?: Record<string, unknown>;
}
