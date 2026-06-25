import { IsString, IsNumber, IsOptional, IsPositive, IsDateString, IsNotEmpty } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateAttendanceSessionDto {
  @IsString()
  @IsNotEmpty()
  fundPeriodId: string

  @IsDateString()
  sessionDate: string

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  courtFee: number

  @IsOptional()
  @IsString()
  courtName?: string

  @IsOptional()
  @IsString()
  startTime?: string

  @IsOptional()
  @IsString()
  endTime?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateAttendanceRecordDto {
  @IsString()
  @IsNotEmpty()
  memberId: string

  @IsString()
  status: 'PRESENT' | 'ABSENT'
}
