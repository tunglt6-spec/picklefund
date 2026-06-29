import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH,
  MemoryOwnerType,
  MemoryType,
} from './memory.types';

export class CreateMemoryDto {
  @IsEnum(MemoryType)
  memoryType: MemoryType;

  @IsOptional()
  @IsEnum(MemoryOwnerType)
  ownerType?: MemoryOwnerType;

  /** Bắt buộc cho ownerType=SESSION (server không suy ra được sessionId). */
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  @MaxLength(MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  ttl?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMemoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  ttl?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
