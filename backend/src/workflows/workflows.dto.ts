import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Epic 9: lịch tự động — MANUAL không bao giờ được scheduler tự dispatch. */
const SCHEDULE_TYPE_VALUES = ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'];

/** clubId/createdBy lấy từ JWT (không nhận từ body). */
export class CreateWorkflowRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  triggerType: string;

  /** Phase 1 dedup: phạm vi nghiệp vụ. Bỏ trống = rule club-wide (canonical). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  scopeKey?: string;

  /** Xác nhận tạo bản mới dù đã có rule cùng (clubId+triggerType+scopeKey). Mặc định chặn. */
  @IsOptional()
  @IsBoolean()
  allowDuplicate?: boolean;

  @IsOptional()
  @IsObject()
  conditionsJson?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  actionsJson?: unknown[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsIn(SCHEDULE_TYPE_VALUES)
  scheduleType?: string;
}

export class UpdateWorkflowRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  triggerType?: string;

  @IsOptional()
  @IsObject()
  conditionsJson?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  actionsJson?: unknown[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsIn(SCHEDULE_TYPE_VALUES)
  scheduleType?: string;
}

/** Ngữ cảnh test thủ công (tuỳ chọn) — dùng để đánh giá điều kiện. */
export class TestTriggerDto {
  @IsOptional()
  @IsObject()
  contextJson?: Record<string, unknown>;
}

/** Dispatch-test runtime (Epic 6): context + idempotencyKey tuỳ chọn. clubId từ JWT. */
export class DispatchTestDto {
  @IsOptional()
  @IsObject()
  contextJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey?: string;
}
