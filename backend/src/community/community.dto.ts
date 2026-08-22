import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export type PostKind = 'GENERAL' | 'SESSION' | 'TOURNAMENT';
export type ReactionTarget = 'POST' | 'COMMENT';
export type Emoji = 'THUMBS_UP' | 'HEART' | 'CLAP' | 'FIRE';

const KINDS: PostKind[] = ['GENERAL', 'SESSION', 'TOURNAMENT'];
const EMOJIS: Emoji[] = ['THUMBS_UP', 'HEART', 'CLAP', 'FIRE'];

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsIn(KINDS)
  kind?: PostKind;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  minigameId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class ReactionDto {
  @IsIn(['POST', 'COMMENT'])
  targetType!: ReactionTarget;

  @IsString()
  @MaxLength(64)
  targetId!: string;

  /** null/absent = bỏ reaction. */
  @IsOptional()
  @IsIn(EMOJIS)
  emoji?: Emoji | null;
}

export class ReportDto {
  @IsIn(['POST', 'COMMENT'])
  targetType!: ReactionTarget;

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ResolveReportDto {
  @IsIn(['resolve', 'dismiss'])
  action!: 'resolve' | 'dismiss';

  @IsOptional()
  @IsBoolean()
  deleteContent?: boolean;
}

export class CreateMatchmakingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  sport!: string;

  @IsDateString()
  playDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  format?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  neededCount!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  skillLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
