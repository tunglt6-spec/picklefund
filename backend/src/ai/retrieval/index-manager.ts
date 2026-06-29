/**
 * IndexManager (Sprint 2, Epic 2.3).
 *
 * Index là DERIVED VIEW (rebuild từ ClubMemoryObject — Source of Truth).
 * - rebuildable: `rebuild(clubId, objects)` tính lại toàn bộ.
 * - delete-safe / update-safe: `remove` / `upsert` incremental; hoặc rebuild.
 * KHÔNG embedding/vector. Keyword/tag/metadata only.
 */
import { Injectable } from '@nestjs/common';
import { ClubMemoryObject } from '../club-memory/club-memory.types';
import { IndexEntry, RetrievalMatch, RetrievalQuery } from './retrieval.types';

@Injectable()
export class IndexManager {
  private readonly indexes = new Map<string, IndexEntry[]>();

  /** Token hoá content/title thành keyword (lowercase, >=2 ký tự). Deterministic. */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9à-ỹ]+/i)
      .filter((t) => t.length >= 2);
  }

  static toEntry(obj: ClubMemoryObject): IndexEntry {
    return {
      memoryId: obj.memoryId,
      clubId: obj.clubId,
      type: obj.type,
      title: obj.title,
      content: obj.content,
      keywords: IndexManager.tokenize(`${obj.title ?? ''} ${obj.content}`),
      tags: [...obj.tags].map((t) => t.toLowerCase()),
      // Derived view của metadata (KHÔNG duplicate SoT — chỉ snapshot để index).
      metadata: { ...obj.metadata },
      updatedAt: obj.updatedAt,
    };
  }

  /** Rebuild toàn bộ index của club từ source objects (derived). */
  rebuild(clubId: string, objects: ClubMemoryObject[]): IndexEntry[] {
    const entries = objects
      .filter((o) => o.clubId === clubId)
      .map((o) => IndexManager.toEntry(o));
    this.indexes.set(clubId, entries);
    return entries;
  }

  getIndex(clubId: string): IndexEntry[] {
    return this.indexes.get(clubId) ?? [];
  }

  /** Incremental update-safe: thay/ thêm entry. */
  upsert(obj: ClubMemoryObject): void {
    const list = this.indexes.get(obj.clubId) ?? [];
    const next = list.filter((e) => e.memoryId !== obj.memoryId);
    next.push(IndexManager.toEntry(obj));
    this.indexes.set(obj.clubId, next);
  }

  /** Incremental delete-safe: gỡ entry khỏi index. */
  remove(clubId: string, memoryId: string): void {
    const list = this.indexes.get(clubId);
    if (!list) return;
    this.indexes.set(
      clubId,
      list.filter((e) => e.memoryId !== memoryId),
    );
  }

  /**
   * Tìm kiếm DETERMINISTIC trên index đã build:
   * - filter theo type + tags (tất cả tag phải khớp);
   * - nếu có text: yêu cầu khớp ≥1 keyword;
   * - score = keywordMatches*2 + tagMatches*3; tie-break theo updatedAt mới nhất.
   */
  search(clubId: string, query: RetrievalQuery): RetrievalMatch[] {
    const entries = this.getIndex(clubId);
    const qTokens = query.text ? IndexManager.tokenize(query.text) : [];
    const qTags = (query.tags ?? []).map((t) => t.toLowerCase());

    const metaKeys = query.metadata ? Object.keys(query.metadata) : [];

    const scored: RetrievalMatch[] = [];
    for (const e of entries) {
      if (query.type && e.type !== query.type) continue;
      if (qTags.length > 0 && !qTags.every((t) => e.tags.includes(t))) continue;

      // Metadata retrieval: exact match, AND logic (mọi key phải khớp). Không fuzzy.
      if (
        metaKeys.length > 0 &&
        !metaKeys.every((k) => e.metadata[k] === query.metadata![k])
      )
        continue;

      const keywordMatches = qTokens.filter((t) =>
        e.keywords.includes(t),
      ).length;
      if (qTokens.length > 0 && keywordMatches === 0) continue;

      const tagMatches = qTags.filter((t) => e.tags.includes(t)).length;
      const score = keywordMatches * 2 + tagMatches * 3;

      scored.push({
        memoryId: e.memoryId,
        clubId: e.clubId,
        type: e.type,
        title: e.title,
        snippet: e.content.slice(0, 200),
        score,
        tags: e.tags,
        updatedAt: e.updatedAt,
      });
    }

    // Tie-break 100% deterministic: score ↓ → updatedAt ↓ → memoryId ↑.
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        b.updatedAt.getTime() - a.updatedAt.getTime() ||
        a.memoryId.localeCompare(b.memoryId),
    );
    const topK = query.topK && query.topK > 0 ? query.topK : 20;
    return scored.slice(0, topK);
  }
}
