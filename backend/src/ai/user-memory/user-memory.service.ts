/**
 * UserMemoryService (Sprint 2, Epic 2.2).
 * Quản lý 3 loại memory TÁCH BIỆT (Profile/Preference/Behavior), immutable.
 * TENANT SCOPE bắt buộc `${clubId}:${userId}` — KHÔNG global user memory.
 * Save = merge field mới với bản cũ, làm mới updatedAt, deep freeze.
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { deepFreeze } from '../memory/memory.types';
import {
  BehaviorInput,
  PreferenceInput,
  ProfileInput,
  USER_MEMORY_REPOSITORY,
} from './user-memory.interfaces';
import type { IUserMemoryRepository } from './user-memory.interfaces';
import {
  BehaviorMemory,
  PreferenceMemory,
  ProfileMemory,
  userMemoryOwnerKey,
} from './user-memory.types';

@Injectable()
export class UserMemoryService {
  constructor(
    @Inject(USER_MEMORY_REPOSITORY)
    private readonly repo: IUserMemoryRepository,
  ) {}

  async getProfile(
    clubId: string | null,
    userId: string,
  ): Promise<ProfileMemory | null> {
    return this.repo.getProfile(this.requireClub(clubId), userId);
  }

  async saveProfile(
    clubId: string | null,
    userId: string,
    input: ProfileInput,
  ): Promise<ProfileMemory> {
    const club = this.requireClub(clubId);
    const prev = await this.repo.getProfile(club, userId);
    return this.repo.saveProfile(
      deepFreeze({
        clubId: club,
        userId,
        ownerKey: userMemoryOwnerKey(club, userId),
        nickname: this.pick(input.nickname, prev?.nickname),
        displayName: this.pick(input.displayName, prev?.displayName),
        language: this.pick(input.language, prev?.language),
        timezone: this.pick(input.timezone, prev?.timezone),
        updatedAt: new Date(),
      }),
    );
  }

  async getPreference(
    clubId: string | null,
    userId: string,
  ): Promise<PreferenceMemory | null> {
    return this.repo.getPreference(this.requireClub(clubId), userId);
  }

  async savePreference(
    clubId: string | null,
    userId: string,
    input: PreferenceInput,
  ): Promise<PreferenceMemory> {
    const club = this.requireClub(clubId);
    const prev = await this.repo.getPreference(club, userId);
    return this.repo.savePreference(
      deepFreeze({
        clubId: club,
        userId,
        ownerKey: userMemoryOwnerKey(club, userId),
        favoriteModel: this.pick(input.favoriteModel, prev?.favoriteModel),
        uiPreference: this.pick(input.uiPreference, prev?.uiPreference),
        responseStyle: this.pick(input.responseStyle, prev?.responseStyle),
        notificationPreference: this.pick(
          input.notificationPreference,
          prev?.notificationPreference,
        ),
        updatedAt: new Date(),
      }),
    );
  }

  async getBehavior(
    clubId: string | null,
    userId: string,
  ): Promise<BehaviorMemory | null> {
    return this.repo.getBehavior(this.requireClub(clubId), userId);
  }

  async saveBehavior(
    clubId: string | null,
    userId: string,
    input: BehaviorInput,
  ): Promise<BehaviorMemory> {
    const club = this.requireClub(clubId);
    const prev = await this.repo.getBehavior(club, userId);
    return this.repo.saveBehavior(
      deepFreeze({
        clubId: club,
        userId,
        ownerKey: userMemoryOwnerKey(club, userId),
        interactionCount: input.interactionCount ?? prev?.interactionCount ?? 0,
        recentTopics: structuredClone(
          input.recentTopics ?? [...(prev?.recentTopics ?? [])],
        ),
        preferredPromptStyle: this.pick(
          input.preferredPromptStyle,
          prev?.preferredPromptStyle,
        ),
        usageStatistics: structuredClone(
          input.usageStatistics ?? { ...(prev?.usageStatistics ?? {}) },
        ),
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * User Memory bắt buộc tenant scope `${clubId}:${userId}` — KHÔNG global.
   * Thiếu clubId → reject (không fallback sang global user memory).
   */
  private requireClub(clubId: string | null): string {
    if (!clubId) {
      throw new BadRequestException(
        'User Memory yêu cầu club context (tài khoản chưa gắn CLB)',
      );
    }
    return clubId;
  }

  /** Lấy giá trị mới nếu được cung cấp (kể cả null tường minh), nếu không giữ cũ. */
  private pick<T>(next: T | undefined, prev: T | null | undefined): T | null {
    if (next !== undefined) return next;
    return prev ?? null;
  }
}
