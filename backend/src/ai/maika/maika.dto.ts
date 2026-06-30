import { IsString, MaxLength } from 'class-validator';

/** Đầu vào cho Maika.understand — chỉ là câu hỏi/ngữ cảnh (read-only). */
export class UnderstandDto {
  @IsString()
  @MaxLength(2_000)
  query: string;
}
