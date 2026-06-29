/**
 * ClubMemoryService (Sprint 2, Epic 2.3).
 * Scope clubId · immutable (deep clone + deep freeze) · audit metadata · tenant isolation.
 * KHÔNG cache số liệu tài chính — Finance Engine RC1 ONLY.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { deepFreeze } from '../memory/memory.types';
import {
  CLUB_MEMORY_REPOSITORY,
  CreateClubMemoryInput,
  UpdateClubMemoryInput,
} from './club-memory.interfaces';
import type { IClubMemoryRepository } from './club-memory.interfaces';
import { ClubMemoryObject } from './club-memory.types';

@Injectable()
export class ClubMemoryService {
  constructor(
    @Inject(CLUB_MEMORY_REPOSITORY)
    private readonly repo: IClubMemoryRepository,
  ) {}

  async save(
    clubId: string | null,
    userId: string,
    input: CreateClubMemoryInput,
  ): Promise<ClubMemoryObject> {
    const club = this.requireClub(clubId);
    const now = new Date();
    return this.repo.create(
      deepFreeze({
        memoryId: randomUUID(),
        clubId: club,
        type: input.type,
        title: input.title ?? null,
        content: input.content,
        tags: structuredClone([...(input.tags ?? [])]),
        metadata: structuredClone({ ...(input.metadata ?? {}) }),
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  /** Đọc 1 memory — chỉ trả về nếu thuộc club (tenant isolation, no cross-club). */
  async load(
    clubId: string | null,
    memoryId: string,
  ): Promise<ClubMemoryObject | null> {
    const club = this.requireClub(clubId);
    const obj = await this.repo.findById(memoryId);
    if (!obj || obj.clubId !== club) return null;
    return obj;
  }

  async listByClub(clubId: string | null): Promise<ClubMemoryObject[]> {
    return this.repo.listByClub(this.requireClub(clubId));
  }

  async update(
    clubId: string | null,
    userId: string,
    memoryId: string,
    patch: UpdateClubMemoryInput,
  ): Promise<ClubMemoryObject> {
    const existing = await this.load(clubId, memoryId);
    if (!existing) throw new NotFoundException('Club memory không tồn tại');
    // Immutable: tạo object mới, giữ memoryId/clubId/createdAt/createdBy.
    return this.repo.replace(
      deepFreeze({
        memoryId: existing.memoryId,
        clubId: existing.clubId,
        type: existing.type,
        title: patch.title === undefined ? existing.title : patch.title,
        content: patch.content ?? existing.content,
        tags: structuredClone(
          patch.tags ? [...patch.tags] : [...existing.tags],
        ),
        metadata: structuredClone(
          patch.metadata ? { ...patch.metadata } : { ...existing.metadata },
        ),
        createdBy: existing.createdBy,
        updatedBy: userId,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      }),
    );
  }

  async delete(clubId: string | null, memoryId: string): Promise<boolean> {
    const existing = await this.load(clubId, memoryId);
    if (!existing) return false;
    return this.repo.deleteById(memoryId);
  }

  /** Club Memory bắt buộc club context — thiếu clubId → reject (no global). */
  private requireClub(clubId: string | null): string {
    if (!clubId) {
      throw new BadRequestException(
        'Club Memory yêu cầu club context (clubId)',
      );
    }
    return clubId;
  }
}
