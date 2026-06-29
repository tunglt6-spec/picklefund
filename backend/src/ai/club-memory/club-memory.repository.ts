/**
 * In-memory Club Memory Repository — VOLATILE default (Epic 2.3).
 * KHÔNG persistence (deferred Epic 2.4). Source of Truth = ClubMemoryObject.
 */
import { Injectable } from '@nestjs/common';
import { IClubMemoryRepository } from './club-memory.interfaces';
import { ClubMemoryObject } from './club-memory.types';

@Injectable()
export class InMemoryClubMemoryRepository implements IClubMemoryRepository {
  private readonly store = new Map<string, ClubMemoryObject>();

  create(obj: ClubMemoryObject): Promise<ClubMemoryObject> {
    this.store.set(obj.memoryId, obj);
    return Promise.resolve(obj);
  }

  findById(memoryId: string): Promise<ClubMemoryObject | null> {
    return Promise.resolve(this.store.get(memoryId) ?? null);
  }

  replace(obj: ClubMemoryObject): Promise<ClubMemoryObject> {
    this.store.set(obj.memoryId, obj);
    return Promise.resolve(obj);
  }

  deleteById(memoryId: string): Promise<boolean> {
    return Promise.resolve(this.store.delete(memoryId));
  }

  listByClub(clubId: string): Promise<ClubMemoryObject[]> {
    const result = [...this.store.values()]
      .filter((m) => m.clubId === clubId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return Promise.resolve(result);
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
