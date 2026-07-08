import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { ScoringCategory } from '@prisma/client';

const CATEGORY_VALUES = [
  'PARTICIPATION',
  'CONDUCT',
  'CONTRIBUTION',
  'DISCIPLINE',
  'FINANCE',
  'BONUS',
] as const;

const SOURCE_VALUES = ['AUTO_ATTENDANCE', 'AUTO_FINANCE', 'MANUAL'] as const;

const CATEGORY_ENUM = Object.fromEntries(CATEGORY_VALUES.map((v) => [v, v]));
const SOURCE_ENUM = Object.fromEntries(SOURCE_VALUES.map((v) => [v, v]));

export class CreateScoringRuleDto {
  @IsEnum(CATEGORY_ENUM, { message: 'Danh mục chấm điểm không hợp lệ' })
  category: ScoringCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;

  @IsInt()
  @Min(-100)
  @Max(100)
  delta: number;

  @IsOptional()
  @IsEnum(SOURCE_ENUM, { message: 'Nguồn chấm điểm không hợp lệ' })
  source?: (typeof SOURCE_VALUES)[number];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateScoringRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  delta?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class AddScoreEventDto {
  @IsString()
  @MinLength(1)
  memberId: string;

  @IsOptional()
  @IsString()
  ruleId?: string;

  @IsOptional()
  @IsEnum(CATEGORY_ENUM, { message: 'Danh mục chấm điểm không hợp lệ' })
  category?: ScoringCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  delta?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Tháng phải có định dạng YYYY-MM' })
  periodMonth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
