import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
  IsEnum,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  FundSource,
  AllocationRule,
  MiniExpenseType,
} from '@prisma/client';

export class CreateExpenseDto {
  @IsEnum(['COMMON', 'MINI'])
  fundSource: FundSource;

  @IsOptional()
  @IsString()
  fundPeriodId?: string;

  @IsOptional()
  @IsString()
  attendanceSessionId?: string;

  @IsOptional()
  @IsEnum(['ATTENDANCE', 'EQUAL', 'PRESENT_ONLY', 'FUND_ONLY'])
  allocationRule?: AllocationRule;

  @IsOptional()
  @IsBoolean()
  allocationEnabled?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['PRIZE', 'EQUIPMENT', 'FOOD', 'VENUE', 'OTHER'])
  miniExpenseType?: MiniExpenseType;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  relatedMinigameId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsUrl()
  receiptUrl?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['ATTENDANCE', 'EQUAL', 'PRESENT_ONLY', 'FUND_ONLY'])
  allocationRule?: AllocationRule;

  @IsOptional()
  @IsBoolean()
  allocationEnabled?: boolean;
}
