/**
 * In-memory User Memory Repository — VOLATILE default (Epic 2.2).
 * Ba store tách biệt cho Profile / Preference / Behavior. Persistence deferred.
 */
import { Injectable } from '@nestjs/common';
import { IUserMemoryRepository } from './user-memory.interfaces';
import {
  BehaviorMemory,
  PreferenceMemory,
  ProfileMemory,
  userMemoryOwnerKey,
} from './user-memory.types';

@Injectable()
export class InMemoryUserMemoryRepository implements IUserMemoryRepository {
  // Key = composite tenant key `${clubId}:${userId}` → cùng userId khác club tách biệt.
  private readonly profiles = new Map<string, ProfileMemory>();
  private readonly preferences = new Map<string, PreferenceMemory>();
  private readonly behaviors = new Map<string, BehaviorMemory>();

  getProfile(clubId: string, userId: string): Promise<ProfileMemory | null> {
    return Promise.resolve(
      this.profiles.get(userMemoryOwnerKey(clubId, userId)) ?? null,
    );
  }
  saveProfile(profile: ProfileMemory): Promise<ProfileMemory> {
    this.profiles.set(profile.ownerKey, profile);
    return Promise.resolve(profile);
  }

  getPreference(
    clubId: string,
    userId: string,
  ): Promise<PreferenceMemory | null> {
    return Promise.resolve(
      this.preferences.get(userMemoryOwnerKey(clubId, userId)) ?? null,
    );
  }
  savePreference(preference: PreferenceMemory): Promise<PreferenceMemory> {
    this.preferences.set(preference.ownerKey, preference);
    return Promise.resolve(preference);
  }

  getBehavior(clubId: string, userId: string): Promise<BehaviorMemory | null> {
    return Promise.resolve(
      this.behaviors.get(userMemoryOwnerKey(clubId, userId)) ?? null,
    );
  }
  saveBehavior(behavior: BehaviorMemory): Promise<BehaviorMemory> {
    this.behaviors.set(behavior.ownerKey, behavior);
    return Promise.resolve(behavior);
  }

  clear(): Promise<void> {
    this.profiles.clear();
    this.preferences.clear();
    this.behaviors.clear();
    return Promise.resolve();
  }
}
