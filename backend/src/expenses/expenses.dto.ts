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
import type { FundSource, AllocationRule } from '@prisma/client';
// Import RUNTIME enum (không phải type) để @IsEnum lấy đúng danh sách giá trị từ Prisma —
// tránh lệch với schema (bug cũ: hardcode ['PRIZE','EQUIPMENT',...] không khớp DB).
import { MiniExpenseType } from '@prisma/client';

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

  /** Loại chi (luật Quỹ): COURT = tiền thuê sân (luôn chia đều) / LIVING = sinh hoạt. */
  @IsOptional()
  @IsEnum(['COURT', 'LIVING'])
  costType?: 'COURT' | 'LIVING';

  @IsOptional()
  @IsBoolean()
  allocationEnabled?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(MiniExpenseType)
  miniExpenseType?: MiniExpenseType;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  relatedMinigameId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

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

  /** Loại chi (luật Quỹ): COURT = tiền thuê sân (luôn chia đều) / LIVING = sinh hoạt. */
  @IsOptional()
  @IsEnum(['COURT', 'LIVING'])
  costType?: 'COURT' | 'LIVING';

  @IsOptional()
  @IsBoolean()
  allocationEnabled?: boolean;

  // Các trường FE gửi khi SỬA khoản chi + service.update đã xử lý. Thiếu ở đây +
  // ValidationPipe forbidNonWhitelisted → sửa chi Quỹ Phụ (miniExpenseType) hoặc chi có
  // danh mục (categoryId) sẽ bị 400. enum lấy từ Prisma để không lệch schema.
  @IsOptional()
  @IsEnum(MiniExpenseType)
  miniExpenseType?: MiniExpenseType;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  fundPeriodId?: string;

  @IsOptional()
  @IsString()
  attendanceSessionId?: string;

  @IsOptional()
  @IsString()
  relatedMinigameId?: string;
}
