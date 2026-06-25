import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { FundSource, MiniIncomeType } from '@prisma/client';

export class CreateContributionDto {
  @IsEnum(['COMMON', 'MINI'])
  fundSource: FundSource;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  fundPeriodId?: string;

  @IsOptional()
  @IsEnum(['REGISTRATION_FEE', 'TOURNAMENT_INCOME', 'SPONSORSHIP', 'OTHER'])
  miniIncomeType?: MiniIncomeType;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsString()
  relatedMinigameId?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportRowDto {
  @IsString()
  @IsNotEmpty()
  memberName: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportContributionsDto {
  @IsString()
  @IsNotEmpty()
  fundPeriodId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];
}

export class UpdateContributionDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
