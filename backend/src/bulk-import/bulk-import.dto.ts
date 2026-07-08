import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

const MAX_ROWS = 5000;

export class ImportMemberRow {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  joinDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportPeriodRow {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(['chung', 'game'])
  type?: 'chung' | 'game';

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsNumber()
  @Type(() => Number)
  contributionAmount: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSessions?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportSessionRow {
  @IsString()
  @IsNotEmpty()
  periodName: string;

  @IsString()
  sessionDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsNumber()
  @Type(() => Number)
  courtFee: number;

  @IsOptional()
  @IsString()
  courtName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportRegistrationRow {
  @IsString()
  @IsNotEmpty()
  periodName: string;

  @IsString()
  sessionDate: string;

  @IsString()
  @IsNotEmpty()
  memberName: string;
}

export class ImportAttendanceRow {
  @IsString()
  @IsNotEmpty()
  periodName: string;

  @IsString()
  sessionDate: string;

  @IsString()
  @IsNotEmpty()
  memberName: string;

  @IsEnum(['PRESENT', 'ABSENT'])
  status: 'PRESENT' | 'ABSENT';
}

export class ImportContributionRow {
  @IsString()
  @IsNotEmpty()
  periodName: string;

  @IsString()
  @IsNotEmpty()
  memberName: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  paidAt: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isConfirmed?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportExpenseRow {
  @IsString()
  @IsNotEmpty()
  periodName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  expenseDate: string;

  @IsOptional()
  @IsEnum(['ATTENDANCE', 'EQUAL', 'PRESENT_ONLY', 'FUND_ONLY'])
  allocationRule?: 'ATTENDANCE' | 'EQUAL' | 'PRESENT_ONLY' | 'FUND_ONLY';

  @IsOptional()
  @IsEnum(['pending', 'approved', 'paid', 'rejected'])
  status?: 'pending' | 'approved' | 'paid' | 'rejected';
}

export class BulkImportDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportMemberRow)
  members?: ImportMemberRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportPeriodRow)
  fundPeriods?: ImportPeriodRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportSessionRow)
  sessions?: ImportSessionRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportRegistrationRow)
  registrations?: ImportRegistrationRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportAttendanceRow)
  attendance?: ImportAttendanceRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportContributionRow)
  contributions?: ImportContributionRow[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportExpenseRow)
  expenses?: ImportExpenseRow[];
}

export interface BulkImportSectionResult {
  created: number;
  matched?: number;
  errors: { row: number; error: string }[];
}

export interface BulkImportResult {
  members: BulkImportSectionResult;
  fundPeriods: BulkImportSectionResult;
  sessions: BulkImportSectionResult;
  registrations: BulkImportSectionResult;
  attendance: BulkImportSectionResult;
  contributions: BulkImportSectionResult;
  expenses: BulkImportSectionResult;
}
