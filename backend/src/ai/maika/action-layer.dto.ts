import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Đầu vào dry-run/validate action — read-only.
 * KHÔNG nhận clubId/role/userId từ body (lấy từ JWT).
 */
export class ActionRequestDto {
  @IsString()
  @MaxLength(100)
  actionType: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourcePlanId?: string;
}
