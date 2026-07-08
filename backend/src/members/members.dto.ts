import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Form gửi chuỗi rỗng cho field không bắt buộc → coi như bỏ trống (tránh fail @IsEmail trên ''). */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** '' hoặc null → undefined; số dạng chuỗi → number (skill level nhập từ form). */
const emptyToUndefinedNum = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? undefined : n;
};

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsDateString()
  joinDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @Transform(emptyToUndefinedNum)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  skillLevel?: number;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @Transform(emptyToUndefinedNum)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  skillLevel?: number;
}
