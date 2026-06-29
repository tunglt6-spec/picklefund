/**
 * User Memory — types (Sprint 2, Epic 2.2).
 * Ba loại TÁCH BIỆT (không trộn vào một object): Profile / Preference / Behavior.
 * Tất cả immutable, scope theo TENANT = `${clubId}:${userId}` (KHÔNG global).
 */

/** Owner key của User Memory = composite tenant key. KHÔNG dùng userId đơn lẻ. */
export function userMemoryOwnerKey(clubId: string, userId: string): string {
  return `${clubId}:${userId}`;
}

export interface ProfileMemory {
  readonly clubId: string;
  readonly userId: string;
  readonly ownerKey: string;
  readonly nickname: string | null;
  readonly displayName: string | null;
  readonly language: string | null;
  readonly timezone: string | null;
  readonly updatedAt: Date;
}

export interface PreferenceMemory {
  readonly clubId: string;
  readonly userId: string;
  readonly ownerKey: string;
  readonly favoriteModel: string | null;
  readonly uiPreference: string | null;
  readonly responseStyle: string | null;
  readonly notificationPreference: string | null;
  readonly updatedAt: Date;
}

export interface BehaviorMemory {
  readonly clubId: string;
  readonly userId: string;
  readonly ownerKey: string;
  readonly interactionCount: number;
  readonly recentTopics: readonly string[];
  readonly preferredPromptStyle: string | null;
  readonly usageStatistics: Readonly<Record<string, unknown>>;
  readonly updatedAt: Date;
}
