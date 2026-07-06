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
