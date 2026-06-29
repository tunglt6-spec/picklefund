import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ClubMemoryType } from './club-memory.types';

export class CreateClubMemoryDto {
  @IsEnum(ClubMemoryType)
  type: ClubMemoryType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsString()
  @MaxLength(100_000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateClubMemoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
