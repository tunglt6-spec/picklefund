/**
 * VectorIndexService (Sprint 2, Epic 2.4 + hotfix).
 *
 * Vector Index là DERIVED VIEW từ Club Memory (Source of Truth).
 * HOTFIX (Codex): mọi text đi qua VectorContentPolicyService TRƯỚC khi embed:
 *  - finance content → SKIP (không embed/cache/upsert), gỡ vector cũ nếu có;
 *  - PII → redact;
 *  - metadata KHÔNG chứa raw title/content/snippet — chỉ sanitizedSnippet + policyVersion.
 * Mất Vector DB → rebuild từ Memory Objects.
 */
import { Inject, Injectable } from '@nestjs/common';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { ClubMemoryObject } from '../club-memory/club-memory.types';
import { EmbeddingService } from './embedding.service';
import { VECTOR_STORE_PROVIDER } from './vector-store.interface';
import type { IVectorStoreProvider } from './vector-store.interface';
import { VectorRecord } from './vector.types';
import { VectorContentPolicyService } from './vector-content-policy.service';
import { VectorObservabilityService } from './vector-observability.service';

@Injectable()
export class VectorIndexService {
  constructor(
    private readonly clubMemory: ClubMemoryService,
    private readonly embedding: EmbeddingService,
    @Inject(VECTOR_STORE_PROVIDER)
    private readonly store: IVectorStoreProvider,
    private readonly policy: VectorContentPolicyService,
    private readonly obs: VectorObservabilityService,
  ) {}

  /** Rebuild index 1 club từ Source of Truth — bỏ qua memory bị policy chặn. */
  async rebuildClub(clubId: string): Promise<number> {
    const objects = await this.clubMemory.listByClub(clubId);
    await this.store.deleteByClub(clubId);

    const allowed: { obj: ClubMemoryObject; text: string; snippet: string }[] =
      [];
    for (const obj of objects) {
      const res = this.policy.sanitizeForEmbedding({
        title: obj.title ?? undefined,
        content: obj.content,
        memoryId: obj.memoryId,
        clubId: obj.clubId,
      });
      if (!res.allowed) {
        this.safeRecordSkip(res.blockedReasons);
        continue; // finance/blocked → KHÔNG embed (vector cũ đã bị deleteByClub gỡ)
      }
      if (res.redactedReasons.length > 0) this.safeRecordRedacted();
      allowed.push({
        obj,
        text: res.sanitizedText,
        snippet: res.sanitizedSnippet ?? '',
      });
    }

    if (allowed.length === 0) return 0;
    const vectors = await this.embedding.embed(allowed.map((a) => a.text));
    const records = allowed.map((a, i) =>
      this.toRecord(a.obj, vectors[i], a.snippet),
    );
    await this.store.upsert(records);
    return records.length;
  }

  /** Incremental: embed nếu được phép; nếu bị chặn → gỡ vector cũ (stale-safe). */
  async upsertOne(obj: ClubMemoryObject): Promise<void> {
    const res = this.policy.sanitizeForEmbedding({
      title: obj.title ?? undefined,
      content: obj.content,
      memoryId: obj.memoryId,
      clubId: obj.clubId,
    });
    if (!res.allowed) {
      this.safeRecordSkip(res.blockedReasons);
      await this.store.deleteByIds(obj.clubId, [obj.memoryId]); // gỡ vector cũ nếu có
      return;
    }
    if (res.redactedReasons.length > 0) this.safeRecordRedacted();
    const [vector] = await this.embedding.embed([res.sanitizedText]);
    await this.store.upsert([
      this.toRecord(obj, vector, res.sanitizedSnippet ?? ''),
    ]);
  }

  async removeOne(clubId: string, memoryId: string): Promise<void> {
    await this.store.deleteByIds(clubId, [memoryId]);
  }

  /** Metadata KHÔNG chứa raw content/title — chỉ sanitizedSnippet + policyVersion. */
  private toRecord(
    obj: ClubMemoryObject,
    vector: number[],
    sanitizedSnippet: string,
  ): VectorRecord {
    return {
      id: obj.memoryId,
      clubId: obj.clubId,
      vector,
      metadata: {
        type: obj.type,
        tags: [...obj.tags],
        snippet: sanitizedSnippet,
        updatedAt: obj.updatedAt.getTime(),
        embeddingVersion: `${this.embedding.version}|${this.policy.policyVersion}`,
      },
    };
  }

  // Metrics lỗi KHÔNG được làm vỡ indexing.
  private safeRecordSkip(blockedReasons: string[]): void {
    try {
      const finance = blockedReasons.some(
        (r) => r.startsWith('finance-term') || r === 'money-pattern',
      );
      this.obs.recordPolicySkipped(finance);
    } catch {
      /* noop */
    }
  }
  private safeRecordRedacted(): void {
    try {
      this.obs.recordPiiRedacted();
    } catch {
      /* noop */
    }
  }
}
