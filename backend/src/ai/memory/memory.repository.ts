/**
 * In-memory Memory Repository — VOLATILE default cho Sprint 2 Epic 2.1.
 *
 * Đây KHÔNG phải persistence backend. SQLite / Postgres / Qdrant được deferred
 * (xem Sprint2 Architecture + ADR-S2-IMPL-01). Mục đích: cho module chạy được và
 * test được mà không phụ thuộc DB. Mất dữ liệu khi restart — chấp nhận ở foundation,
 * nhất quán với pattern in-memory của Sprint 1 (telemetry / token accounting).
 */
import { Injectable } from '@nestjs/common';
import { IMemoryRepository, MemoryQuery } from './memory.interfaces';
import { MemoryObject } from './memory.types';

@Injectable()
export class InMemoryMemoryRepository implements IMemoryRepository {
  private readonly store = new Map<string, MemoryObject>();

  create(obj: MemoryObject): Promise<MemoryObject> {
    this.store.set(obj.memoryId, obj);
    return Promise.resolve(obj);
  }

  findById(memoryId: string): Promise<MemoryObject | null> {
    return Promise.resolve(this.store.get(memoryId) ?? null);
  }

  replace(obj: MemoryObject): Promise<MemoryObject> {
    this.store.set(obj.memoryId, obj);
    return Promise.resolve(obj);
  }

  deleteById(memoryId: string): Promise<boolean> {
    return Promise.resolve(this.store.delete(memoryId));
  }

  query(q: MemoryQuery): Promise<MemoryObject[]> {
    const text = q.text?.toLowerCase();
    const result = [...this.store.values()].filter((m) => {
      if (q.ownerType && m.ownerType !== q.ownerType) return false;
      if (q.ownerId && m.ownerId !== q.ownerId) return false;
      if (q.memoryType && m.memoryType !== q.memoryType) return false;
      if (q.tags && q.tags.length > 0) {
        const hasAll = q.tags.every((t) => m.tags.includes(t));
        if (!hasAll) return false;
      }
      if (text && !m.content.toLowerCase().includes(text)) return false;
      return true;
    });
    // Mới nhất trước.
    result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return Promise.resolve(result);
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
