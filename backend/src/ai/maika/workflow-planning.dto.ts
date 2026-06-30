import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkflowTemplateId } from './workflow-planning.types';

/** Đầu vào preview workflow — read-only (KHÔNG persist, KHÔNG thực thi). */
export class PreviewWorkflowDto {
  @IsOptional()
  @IsEnum(WorkflowTemplateId)
  templateId?: WorkflowTemplateId;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  objective?: string;
}
