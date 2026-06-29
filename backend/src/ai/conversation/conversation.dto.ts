import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MessageRole } from './conversation.types';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  systemPrompt?: string;
}

export class AppendMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  @MaxLength(100_000)
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
