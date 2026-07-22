import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Giới hạn cứng cho trường `metadata` (Record<string, unknown>) của Memory/Conversation.
 * Metadata chỉ để chứa gợi ý/nhãn nhỏ, KHÔNG phải payload — chặn phồng bộ nhớ (in-memory store)
 * và JSON lồng sâu gây tốn CPU khi duyệt.
 */
export const MAX_METADATA_BYTES = 4096; // ~4KB sau JSON.stringify (UTF-8)
export const MAX_METADATA_DEPTH = 5; // độ sâu lồng tối đa

/** Độ sâu lồng của object/array (giá trị nguyên thuỷ = độ sâu 0). */
function depthOf(value: unknown, current = 0): number {
  if (value === null || typeof value !== 'object') return current;
  if (current >= MAX_METADATA_DEPTH) return current + 1; // dừng sớm, coi như vượt ngưỡng
  let max = current;
  for (const v of Object.values(value as Record<string, unknown>)) {
    const d = depthOf(v, current + 1);
    if (d > max) max = d;
  }
  return max;
}

@ValidatorConstraint({ name: 'boundedMetadata', async: false })
export class BoundedMetadataConstraint implements ValidatorConstraintInterface {
  private reason = '';

  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true; // để @IsOptional lo
    if (typeof value !== 'object' || Array.isArray(value)) {
      this.reason = 'metadata phải là object';
      return false;
    }
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      this.reason = 'metadata không tuần tự hoá được (có thể vòng lặp tham chiếu)';
      return false;
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
      this.reason = `metadata vượt giới hạn ${MAX_METADATA_BYTES} bytes`;
      return false;
    }
    if (depthOf(value) > MAX_METADATA_DEPTH) {
      this.reason = `metadata lồng quá sâu (tối đa ${MAX_METADATA_DEPTH} cấp)`;
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return this.reason || 'metadata không hợp lệ';
  }
}

/** Áp giới hạn kích thước + độ sâu cho trường metadata. */
export function IsBoundedMetadata(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: BoundedMetadataConstraint,
    });
  };
}
