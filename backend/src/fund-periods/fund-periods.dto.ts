import { IsString, IsNumber, IsOptional, IsPositive, IsDateString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateFundPeriodDto {
  @IsString()
  name: string

  @IsDateString()
  startDate: string

  @IsDateString()
  endDate: string

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  contributionAmount: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSessions?: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  type?: string
}

export class UpdateFundPeriodStatusDto {
  @IsString()
  status: 'draft' | 'active' | 'closed'
}

export class UpdateFundPeriodDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  contributionAmount?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSessions?: number

  @IsOptional()
  @IsString()
  notes?: string
}
