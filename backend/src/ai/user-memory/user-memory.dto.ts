import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ProfileDto {
  @IsOptional() @IsString() @MaxLength(200) nickname?: string;
  @IsOptional() @IsString() @MaxLength(200) displayName?: string;
  @IsOptional() @IsString() @MaxLength(20) language?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

export class PreferenceDto {
  @IsOptional() @IsString() @MaxLength(100) favoriteModel?: string;
  @IsOptional() @IsString() @MaxLength(100) uiPreference?: string;
  @IsOptional() @IsString() @MaxLength(100) responseStyle?: string;
  @IsOptional() @IsString() @MaxLength(100) notificationPreference?: string;
}

export class BehaviorDto {
  @IsOptional() @IsInt() @Min(0) interactionCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentTopics?: string[];

  @IsOptional() @IsString() @MaxLength(100) preferredPromptStyle?: string;

  @IsOptional() @IsObject() usageStatistics?: Record<string, unknown>;
}
