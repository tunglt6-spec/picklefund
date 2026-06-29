/**
 * MemoryManager (Sprint 2, Epic 2.1).
 *
 * Quản lý Memory Objects: save/load/delete/update/list/search.
 * - KHÔNG biết Vector DB; chỉ làm việc qua IMemoryRepository abstraction.
 * - KHÔNG tính nghiệp vụ; KHÔNG cache số liệu tài chính (Finance Engine RC1 ONLY).
 * - Memory Object IMMUTABLE: update() tạo object mới, không mutate.
 * - Config từ ConfigService (.env), không hardcode.
 */
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  CreateMemoryInput,
  MEMORY_REPOSITORY,
  MemoryQuery,
  UpdateMemoryInput,
} from './memory.interfaces';
import type { IMemoryRepository } from './memory.interfaces';
import { MemoryObject, deepFreeze } from './memory.types';

export interface MemoryConfig {
  /** TTL mặc định (giây); 0/không đặt = không hết hạn (null). */
  defaultTtlSeconds: number | null;
  /** Độ dài content tối đa. */
  maxContentLength: number;
}

@Injectable()
export class MemoryManager {
  private readonly logger = new Logger(MemoryManager.name);

  constructor(
    @Inject(MEMORY_REPOSITORY) private readonly repo: IMemoryRepository,
    private readonly config: ConfigService,
  ) {}

  getConfig(): MemoryConfig {
    const ttlRaw = Number(this.config.get('MEMORY_DEFAULT_TTL_SECONDS', '0'));
    return {
      defaultTtlSeconds: ttlRaw > 0 ? ttlRaw : null,
      maxContentLength: Number(
        this.config.get('MEMORY_MAX_CONTENT_LENGTH', '100000'),
      ),
    };
  }

  async save(input: CreateMemoryInput): Promise<MemoryObject> {
    const cfg = this.getConfig();
    if (input.content.length > cfg.maxContentLength) {
      throw new Error(
        `Memory content exceeds max length (${cfg.maxContentLength})`,
      );
    }
    const now = new Date();
    const obj = this.freeze({
      memoryId: randomUUID(),
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      memoryType: input.memoryType,
      createdAt: now,
      updatedAt: now,
      ttl: input.ttl === undefined ? cfg.defaultTtlSeconds : input.ttl,
      // Deep clone input để caller không giữ tham chiếu vào state đã lưu.
      tags: this.clone([...(input.tags ?? [])]),
      content: input.content,
      metadata: this.clone({ ...(input.metadata ?? {}) }),
    });
    return this.repo.create(obj);
  }

  async load(memoryId: string): Promise<MemoryObject | null> {
    const obj = await this.repo.findById(memoryId);
    if (!obj) return null;
    if (this.isExpired(obj)) {
      // Lazy cleanup: bỏ memory đã hết hạn.
      await this.repo.deleteById(memoryId);
      return null;
    }
    return obj;
  }

  async update(
    memoryId: string,
    patch: UpdateMemoryInput,
  ): Promise<MemoryObject> {
    const existing = await this.load(memoryId);
    if (!existing) throw new NotFoundException('Memory không tồn tại');

    const cfg = this.getConfig();
    const nextContent = patch.content ?? existing.content;
    if (nextContent.length > cfg.maxContentLength) {
      throw new Error(
        `Memory content exceeds max length (${cfg.maxContentLength})`,
      );
    }

    // Immutable: KHÔNG mutate object cũ — tạo object mới (giữ memoryId + createdAt,
    // làm mới updatedAt), deep clone + deep freeze để không chia sẻ tham chiếu nested.
    const updated = this.freeze({
      memoryId: existing.memoryId,
      ownerType: existing.ownerType,
      ownerId: existing.ownerId,
      memoryType: existing.memoryType,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      ttl: patch.ttl === undefined ? existing.ttl : patch.ttl,
      tags: this.clone(patch.tags ? [...patch.tags] : [...existing.tags]),
      content: nextContent,
      metadata: this.clone(
        patch.metadata ? { ...patch.metadata } : { ...existing.metadata },
      ),
    });
    return this.repo.replace(updated);
  }

  async delete(memoryId: string): Promise<boolean> {
    return this.repo.deleteById(memoryId);
  }

  async list(query: MemoryQuery = {}): Promise<MemoryObject[]> {
    const items = await this.repo.query(query);
    return query.includeExpired
      ? items
      : items.filter((m) => !this.isExpired(m));
  }

  /**
   * search() = lọc theo metadata/tag/text (KHÔNG semantic, KHÔNG embedding).
   * Tái dùng list() với cùng bộ lọc.
   */
  async search(query: MemoryQuery): Promise<MemoryObject[]> {
    return this.list(query);
  }

  isExpired(obj: MemoryObject, at: Date = new Date()): boolean {
    if (obj.ttl === null) return false;
    const ageMs = at.getTime() - obj.updatedAt.getTime();
    return ageMs > obj.ttl * 1000;
  }

  /** Deep freeze toàn bộ (root + tags + metadata + nested) — IMMUTABLE mọi cấp. */
  private freeze(obj: MemoryObject): MemoryObject {
    return deepFreeze(obj);
  }

  /** Deep clone giá trị (cắt mọi tham chiếu chia sẻ với caller / state cũ). */
  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
