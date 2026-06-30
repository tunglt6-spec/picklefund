/**
 * In-memory Vector Store (Epic 2.4 default, VOLATILE).
 *
 * Derived view; mất khi restart → rebuild từ Memory Objects. KHÔNG persistence
 * (PGVector/Qdrant/… là plug-in swap). Cosine similarity, scope clubId.
 */
import { Injectable } from '@nestjs/common';
import { IVectorStoreProvider } from './vector-store.interface';
import {
  VectorQueryHit,
  VectorQueryOptions,
  VectorRecord,
} from './vector.types';

@Injectable()
export class InMemoryVectorStoreProvider implements IVectorStoreProvider {
  readonly name = 'in-memory';
  // clubId → (id → record). Tenant isolation: query chỉ trong 1 club.
  private readonly store = new Map<string, Map<string, VectorRecord>>();

  upsert(records: VectorRecord[]): Promise<void> {
    for (const r of records) {
      const club = this.store.get(r.clubId) ?? new Map<string, VectorRecord>();
      club.set(r.id, r);
      this.store.set(r.clubId, club);
    }
    return Promise.resolve();
  }

  query(
    clubId: string,
    vector: number[],
    options: VectorQueryOptions,
  ): Promise<VectorQueryHit[]> {
    const club = this.store.get(clubId);
    if (!club) return Promise.resolve([]);
    const threshold = options.threshold ?? -Infinity;
    const hits: VectorQueryHit[] = [];
    for (const r of club.values()) {
      const score = InMemoryVectorStoreProvider.cosine(vector, r.vector);
      if (score >= threshold) hits.push({ id: r.id, score });
    }
    // Deterministic: score ↓, rồi id ↑.
    hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const topK = options.topK > 0 ? options.topK : 10;
    return Promise.resolve(hits.slice(0, topK));
  }

  deleteByIds(clubId: string, ids: string[]): Promise<void> {
    const club = this.store.get(clubId);
    if (club) for (const id of ids) club.delete(id);
    return Promise.resolve();
  }

  deleteByClub(clubId: string): Promise<void> {
    this.store.delete(clubId);
    return Promise.resolve();
  }

  size(clubId: string): Promise<number> {
    return Promise.resolve(this.store.get(clubId)?.size ?? 0);
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }

  /** Cosine similarity; trả 0 nếu vector rỗng/độ dài lệch/zero-norm. */
  static cosine(a: number[], b: number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
