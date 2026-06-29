/**
 * Memory Core Foundation — abstractions (Sprint 2, Epic 2.1).
 *
 * Repository ở đây CHỈ là abstraction. KHÔNG triển khai SQLite / Postgres / Qdrant
 * (deferred — xem Sprint2 Architecture). Một in-memory default (volatile) được cung
 * cấp riêng để module chạy được + test; nó KHÔNG phải persistence backend.
 */
import { MemoryObject, MemoryOwnerType, MemoryType } from './memory.types';

/** Input tạo memory (MemoryManager.save). */
export interface CreateMemoryInput {
  ownerType: MemoryOwnerType;
  ownerId: string;
  memoryType: MemoryType;
  content: string;
  tags?: string[];
  ttl?: number | null;
  metadata?: Record<string, unknown>;
}

/** Input cập nhật memory (MemoryManager.update) — chỉ các trường cho phép đổi. */
export interface UpdateMemoryInput {
  content?: string;
  tags?: string[];
  ttl?: number | null;
  metadata?: Record<string, unknown>;
}

/** Bộ lọc cho list()/search() — KHÔNG phải semantic; chỉ metadata/tag/text. */
export interface MemoryQuery {
  ownerType?: MemoryOwnerType;
  ownerId?: string;
  memoryType?: MemoryType;
  tags?: string[];
  /** So khớp chuỗi con trên content (case-insensitive). */
  text?: string;
  /** Mặc định false: ẩn memory đã hết hạn TTL. */
  includeExpired?: boolean;
}

/**
 * Abstraction cho lưu trữ Memory Object. KHÔNG biết Vector DB.
 * Triển khai cụ thể (in-memory default / persistence sau này) gắn qua token dưới đây.
 */
export interface IMemoryRepository {
  create(obj: MemoryObject): Promise<MemoryObject>;
  findById(memoryId: string): Promise<MemoryObject | null>;
  replace(obj: MemoryObject): Promise<MemoryObject>;
  deleteById(memoryId: string): Promise<boolean>;
  query(q: MemoryQuery): Promise<MemoryObject[]>;
  clear(): Promise<void>;
}

/** DI token cho repository abstraction. */
export const MEMORY_REPOSITORY = 'MEMORY_REPOSITORY';
