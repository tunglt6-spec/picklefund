import { IsString, IsNotEmpty, IsInt, Min, Max, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import type { PlanTier } from './billing.types'

const PLAN_TIERS: PlanTier[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']

export class UpgradePlanDto {
  @IsString()
  @IsNotEmpty()
  clubId: string

  @IsString()
  @IsIn(PLAN_TIERS)
  tier: PlanTier

  @IsInt()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  months: number
}
