/**
 * User Memory — abstractions (Sprint 2, Epic 2.2).
 * Repository abstraction; in-memory default volatile (persistence deferred).
 */
import {
  BehaviorMemory,
  PreferenceMemory,
  ProfileMemory,
} from './user-memory.types';

export interface ProfileInput {
  nickname?: string | null;
  displayName?: string | null;
  language?: string | null;
  timezone?: string | null;
}

export interface PreferenceInput {
  favoriteModel?: string | null;
  uiPreference?: string | null;
  responseStyle?: string | null;
  notificationPreference?: string | null;
}

export interface BehaviorInput {
  interactionCount?: number;
  recentTopics?: string[];
  preferredPromptStyle?: string | null;
  usageStatistics?: Record<string, unknown>;
}

export interface IUserMemoryRepository {
  getProfile(clubId: string, userId: string): Promise<ProfileMemory | null>;
  saveProfile(profile: ProfileMemory): Promise<ProfileMemory>;
  getPreference(
    clubId: string,
    userId: string,
  ): Promise<PreferenceMemory | null>;
  savePreference(preference: PreferenceMemory): Promise<PreferenceMemory>;
  getBehavior(clubId: string, userId: string): Promise<BehaviorMemory | null>;
  saveBehavior(behavior: BehaviorMemory): Promise<BehaviorMemory>;
  clear(): Promise<void>;
}

export const USER_MEMORY_REPOSITORY = 'USER_MEMORY_REPOSITORY';
