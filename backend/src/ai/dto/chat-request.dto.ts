import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Providers the gateway knows about — provider override must be one of these. */
export const KNOWN_PROVIDERS = ['litellm', 'openrouter', 'ollama'] as const;

export class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  @MaxLength(100_000)
  content: string;
}

export class ChatOptionsDto {
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32_000)
  @Type(() => Number)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  topP?: number;
}

export class ChatRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatOptionsDto)
  options?: ChatOptionsDto;

  /** Force a specific provider — validated against the known provider list. */
  @IsOptional()
  @IsIn(KNOWN_PROVIDERS)
  providerOverride?: (typeof KNOWN_PROVIDERS)[number];
}
