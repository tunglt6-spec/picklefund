import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttendanceSessionDto {
  @IsString()
  @IsNotEmpty()
  fundPeriodId: string;

  @IsDateString()
  sessionDate: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  courtFee: number;

  @IsOptional()
  @IsString()
  courtName?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Cập nhật buổi chơi — PARTIAL: mọi field optional. KHÔNG bắt buộc `fundPeriodId`
 * (buổi chơi có thể không thuộc kỳ quỹ nào; sửa giờ/tiền sân không nên đòi kỳ quỹ).
 * Service.update chỉ ghi field được gửi -> giữ nguyên kỳ quỹ hiện tại khi bỏ trống.
 */
export class UpdateAttendanceSessionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fundPeriodId?: string;

  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  courtFee?: number;

  @IsOptional()
  @IsString()
  courtName?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAttendanceRecordDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  status: 'PRESENT' | 'ABSENT';
}

/** RSVP — set toàn bộ danh sách member đăng ký 1 buổi chơi. */
export class SetRegistrationsDto {
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}
