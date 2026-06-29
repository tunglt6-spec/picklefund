/**
 * Memory Core Foundation — types (Sprint 2, Epic 2.1).
 *
 * SCOPE: chỉ Memory Core. KHÔNG embedding / vector / semantic / RAG.
 * Memory KHÔNG lưu số liệu tài chính — tài chính chỉ lấy từ Finance Engine RC1.
 */

/**
 * Hard cap kỹ thuật cho độ dài content (an toàn DoS), KHÔNG phải limit nghiệp vụ.
 * Limit nghiệp vụ thực tế là MEMORY_MAX_CONTENT_LENGTH (ConfigService, runtime source
 * of truth) và phải <= hard cap này. DTO dùng hằng số này để chặn payload bất thường.
 */
export const MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH = 1_000_000;

/**
 * Deep freeze đệ quy: object root + array + nested object/array.
 * Bảo đảm Memory Object IMMUTABLE ở mọi cấp (không chỉ shallow).
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/** Loại memory (Sprint 2 Epic 2.1). */
export enum MemoryType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  CLUB = 'CLUB',
  SESSION = 'SESSION',
  TEMP = 'TEMP',
  LONG_TERM = 'LONG_TERM',
}

/** Chủ sở hữu memory — dùng để cách ly (tenant isolation). */
export enum MemoryOwnerType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  CLUB = 'CLUB',
  SESSION = 'SESSION',
}

/**
 * Memory Object — IMMUTABLE.
 * Mọi cập nhật tạo ra object mới (xem MemoryManager.update); không mutate tại chỗ.
 */
export interface MemoryObject {
  readonly memoryId: string;
  readonly ownerType: MemoryOwnerType;
  readonly ownerId: string;
  readonly memoryType: MemoryType;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** TTL tính bằng giây kể từ updatedAt; null = không hết hạn. */
  readonly ttl: number | null;
  readonly tags: readonly string[];
  readonly content: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
