import { RetrievalEngine } from './retrieval.service';
import { IndexManager } from './index-manager';
import { NoopSemanticSearchProvider } from './noop-semantic-search.provider';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';

describe('RetrievalEngine (deterministic, derived index, noop semantic)', () => {
  let clubMemory: ClubMemoryService;
  let engine: RetrievalEngine;

  beforeEach(() => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    engine = new RetrievalEngine(
      clubMemory,
      new IndexManager(),
      new NoopSemanticSearchProvider(),
    );
  });

  it('semantic provider is noop at Epic 2.3', () => {
    expect(engine.semanticProviderName()).toBe('noop');
  });

  it('retrieves by keyword from club memory', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'Sân ngoài trời ưu tiên',
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'Quy định khách mời',
    });
    const r = await engine.retrieve('club-1', { text: 'khách' });
    expect(r).toHaveLength(1);
    expect(r[0].snippet).toContain('khách');
  });

  it('retrieval is club-scoped (no cross-club)', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court info',
    });
    await clubMemory.save('club-2', 'u2', {
      type: ClubMemoryType.FACT,
      content: 'court info',
    });
    const r = await engine.retrieve('club-1', { text: 'court' });
    expect(r).toHaveLength(1);
    expect(r[0].clubId).toBe('club-1');
  });

  it('reflects deletes (index rebuilt from source each retrieve)', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court info',
    });
    expect(await engine.retrieve('club-1', { text: 'court' })).toHaveLength(1);
    await clubMemory.delete('club-1', m.memoryId);
    expect(await engine.retrieve('club-1', { text: 'court' })).toHaveLength(0);
  });

  it('retrieves by tag', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'x',
      tags: ['policy'],
    });
    const r = await engine.retrieve('club-1', { tags: ['policy'] });
    expect(r).toHaveLength(1);
  });

  it('metadata retrieval: exact match + club isolation', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'x',
      metadata: { region: 'north' },
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'y',
      metadata: { region: 'south' },
    });
    await clubMemory.save('club-2', 'u2', {
      type: ClubMemoryType.FACT,
      content: 'z',
      metadata: { region: 'north' },
    });
    const r = await engine.retrieve('club-1', {
      metadata: { region: 'north' },
    });
    expect(r).toHaveLength(1); // chỉ club-1 + region=north (no cross-club)
    expect(r[0].clubId).toBe('club-1');
  });

  it('metadata retrieval reflects update + delete (index rebuilt from source)', async () => {
    const m = await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'x',
      metadata: { region: 'north' },
    });
    expect(
      await engine.retrieve('club-1', { metadata: { region: 'north' } }),
    ).toHaveLength(1);
    // update metadata → query cũ không khớp, query mới khớp
    await clubMemory.update('club-1', 'u1', m.memoryId, {
      metadata: { region: 'south' },
    });
    expect(
      await engine.retrieve('club-1', { metadata: { region: 'north' } }),
    ).toHaveLength(0);
    expect(
      await engine.retrieve('club-1', { metadata: { region: 'south' } }),
    ).toHaveLength(1);
    // delete → không còn
    await clubMemory.delete('club-1', m.memoryId);
    expect(
      await engine.retrieve('club-1', { metadata: { region: 'south' } }),
    ).toHaveLength(0);
  });

  it('respects explicit text + topK', async () => {
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court a',
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court b',
    });
    const r = await engine.retrieve('club-1', { text: 'court', topK: 1 });
    expect(r).toHaveLength(1);
  });
});
