import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Đầu vào evaluate/preview approval — read-only.
 * KHÔNG nhận clubId/role/userId từ body (lấy từ JWT).
 */
export class ApprovalRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionProposalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionType?: string;

  @IsOptional()
  @IsIn(RISK_LEVELS)
  riskLevel?: (typeof RISK_LEVELS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  objective?: string;
}
