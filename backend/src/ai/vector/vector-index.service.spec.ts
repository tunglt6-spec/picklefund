import { ConfigService } from '@nestjs/config';
import { VectorIndexService } from './vector-index.service';
import { EmbeddingService } from './embedding.service';
import { LocalHashEmbeddingProvider } from './local-hash-embedding.provider';
import { InMemoryVectorStoreProvider } from './in-memory-vector-store.provider';
import { VectorObservabilityService } from './vector-observability.service';
import { VectorContentPolicyService } from './vector-content-policy.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';

function cfg(): ConfigService {
  return { get: (_k: string, d?: string) => d } as unknown as ConfigService;
}

describe('VectorIndexService (derived view, rebuildable)', () => {
  let clubMemory: ClubMemoryService;
  let store: InMemoryVectorStoreProvider;
  let index: VectorIndexService;

  beforeEach(() => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    store = new InMemoryVectorStoreProvider();
    const embedding = new EmbeddingService(
      new LocalHashEmbeddingProvider(16),
      cfg(),
      new VectorObservabilityService(),
    );
    index = new VectorIndexService(
      clubMemory,
      embedding,
      store,
      new VectorContentPolicyService(),
      new VectorObservabilityService(),
    );
  });

  it('rebuildClub derives index from Club Memory (Source of Truth)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'a',
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'b',
    });
    expect(await index.rebuildClub('club-1')).toBe(2);
    expect(await store.size('club-1')).toBe(2);
  });

  it('empty club → rebuild returns 0', async () => {
    expect(await index.rebuildClub('club-empty')).toBe(0);
  });

  it('rebuild reflects deletes (derived from current source)', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'a',
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'b',
    });
    await index.rebuildClub('club-1');
    expect(await store.size('club-1')).toBe(2);
    await clubMemory.delete('club-1', m.memoryId);
    await index.rebuildClub('club-1');
    expect(await store.size('club-1')).toBe(1);
  });

  it('indexes a memory that has a title', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      title: 'Court rules',
      content: 'no smoking',
    });
    await index.upsertOne(m);
    expect(await store.size('club-1')).toBe(1);
  });

  it('SKIPS finance memory with amount (never embedded)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'Thu quỹ tháng này 500k',
    });
    expect(await index.rebuildClub('club-1')).toBe(0);
    expect(await store.size('club-1')).toBe(0);
  });

  it('SKIPS finance memory with finance term (no amount)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'Quy định về số dư quỹ chính cuối kỳ',
    });
    expect(await index.rebuildClub('club-1')).toBe(0);
  });

  it('vector metadata snippet is sanitized (no raw PII), never raw content', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.KNOWLEDGE,
      content: 'Liên hệ ban tổ chức qua email admin@club.vn để biết lịch sân',
    });
    const spy = jest.spyOn(store, 'upsert');
    await index.upsertOne(m);
    const record = spy.mock.calls[0][0][0];
    expect(record.metadata.snippet).not.toContain('admin@club.vn');
    expect(record.metadata.snippet).toContain('[redacted-email]');
    expect(record.metadata.snippet).not.toBe(m.content);
  });

  it('blocked content removes stale vector for that memoryId', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'Sân chính giờ vàng',
    });
    await index.upsertOne(m);
    expect(await store.size('club-1')).toBe(1);
    // Cập nhật thành nội dung tài chính → upsertOne phải gỡ vector cũ.
    const updated = await clubMemory.update('club-1', 'u1', m.memoryId, {
      content: 'Tổng tài sản CLB hiện tại',
    });
    await index.upsertOne(updated);
    expect(await store.size('club-1')).toBe(0);
  });

  it('incremental upsertOne / removeOne', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'a',
    });
    await index.upsertOne(m);
    expect(await store.size('club-1')).toBe(1);
    await index.removeOne('club-1', m.memoryId);
    expect(await store.size('club-1')).toBe(0);
  });
});
