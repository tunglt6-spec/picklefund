/**
 * Club Memory — abstractions (Sprint 2, Epic 2.3).
 * Repository abstraction; in-memory default volatile (persistence deferred → Epic 2.4).
 */
import { ClubMemoryObject, ClubMemoryType } from './club-memory.types';

export interface CreateClubMemoryInput {
  type: ClubMemoryType;
  title?: string | null;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateClubMemoryInput {
  title?: string | null;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Bộ lọc list/retrieval — keyword/tag/metadata (KHÔNG semantic). */
export interface ClubMemoryQuery {
  type?: ClubMemoryType;
  tags?: string[];
  text?: string;
}

export interface IClubMemoryRepository {
  create(obj: ClubMemoryObject): Promise<ClubMemoryObject>;
  findById(memoryId: string): Promise<ClubMemoryObject | null>;
  replace(obj: ClubMemoryObject): Promise<ClubMemoryObject>;
  deleteById(memoryId: string): Promise<boolean>;
  listByClub(clubId: string): Promise<ClubMemoryObject[]>;
  clear(): Promise<void>;
}

export const CLUB_MEMORY_REPOSITORY = 'CLUB_MEMORY_REPOSITORY';
