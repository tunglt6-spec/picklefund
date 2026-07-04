import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AiAgent, AiActionRisk } from '@prisma/client';

/** Tạo yêu cầu hành động AI. clubId/createdBy lấy từ JWT (không nhận từ body). */
export class CreateAiActionDto {
  @IsEnum(AiAgent)
  requestedByAi: AiAgent;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  actionType: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetModule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetEntityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetEntityId?: string;

  @IsEnum(AiActionRisk)
  riskLevel: AiActionRisk;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, unknown>;
}

/** Từ chối — lý do tuỳ chọn (được chấp nhận nếu có). */
export class RejectAiActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
