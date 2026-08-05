import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

class RegisterClubInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEmail()
  contactEmail?: string;
}

class RegisterAdminDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterClubDto {
  @ValidateNested()
  @Type(() => RegisterClubInfoDto)
  club: RegisterClubInfoDto;

  @ValidateNested()
  @Type(() => RegisterAdminDto)
  admin: RegisterAdminDto;

  /** Mã giới thiệu (từ link ?ref=) — tùy chọn; sai/thiếu KHÔNG chặn đăng ký. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
