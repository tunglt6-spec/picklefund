import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFundPeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  contributionAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSessions?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  type?: string;

  // FUND-IMPL-01: sao chép roster thành viên từ kỳ quỹ gần nhất cùng loại (chủ yếu
  // dùng cho Quỹ Phụ/giải đấu) sang kỳ mới. Default false — giữ nguyên behavior cũ.
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  copyMembersFromPreviousPeriod?: boolean;
}

export class UpdateFundPeriodStatusDto {
  @IsString()
  status: 'draft' | 'active' | 'closed';
}

export class UpdateFundPeriodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  contributionAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSessions?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
