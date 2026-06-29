import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { MemoryManager } from './memory.service';
import { InMemoryMemoryRepository } from './memory.repository';
import { MemoryOwnerType, MemoryType } from './memory.types';

function configWith(values: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string, def?: string) => values[key] ?? def,
  } as unknown as ConfigService;
}

describe('MemoryManager', () => {
  let repo: InMemoryMemoryRepository;
  let mgr: MemoryManager;

  const base = {
    ownerType: MemoryOwnerType.USER,
    ownerId: 'u1',
    memoryType: MemoryType.USER,
    content: 'hello',
  };

  beforeEach(() => {
    repo = new InMemoryMemoryRepository();
    mgr = new MemoryManager(repo, configWith());
  });

  it('save creates an immutable, frozen memory with ids/timestamps', async () => {
    const m = await mgr.save(base);
    expect(m.memoryId).toBeTruthy();
    expect(m.createdAt).toBeInstanceOf(Date);
    expect(m.updatedAt).toBeInstanceOf(Date);
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.tags)).toBe(true);
    expect(Object.isFrozen(m.metadata)).toBe(true);
    expect(() => {
      (m as { content: string }).content = 'mutated';
    }).toThrow();
  });

  it('deep-freezes nested metadata (not just shallow)', async () => {
    const saved = await mgr.save({
      ...base,
      metadata: { nested: { value: 1 } },
    });
    expect(Object.isFrozen(saved.metadata)).toBe(true);
    const nested = (saved.metadata as { nested: object }).nested;
    expect(Object.isFrozen(nested)).toBe(true);
    expect(() => {
      (saved.metadata as { nested: { value: number } }).nested.value = 999;
    }).toThrow();
  });

  it('mutating input metadata.nested after save does NOT affect stored memory', async () => {
    const input = { ...base, metadata: { nested: { value: 1 } } };
    const saved = await mgr.save(input);
    input.metadata.nested.value = 999; // mutate caller's original
    const reloaded = await mgr.load(saved.memoryId);
    expect(
      (reloaded?.metadata as { nested: { value: number } }).nested.value,
    ).toBe(1);
  });

  it('mutating input tags array after save does NOT affect stored memory', async () => {
    const tags = ['a'];
    const saved = await mgr.save({ ...base, tags });
    tags.push('b');
    const reloaded = await mgr.load(saved.memoryId);
    expect(reloaded?.tags).toEqual(['a']);
  });

  it('update does NOT mutate the old object', async () => {
    const saved = await mgr.save({ ...base, content: 'old' });
    const updated = await mgr.update(saved.memoryId, { content: 'new' });
    expect(saved.content).toBe('old');
    expect(updated.content).toBe('new');
  });

  it('loaded object cannot be mutated to affect repository state', async () => {
    const saved = await mgr.save(base);
    const loaded = await mgr.load(saved.memoryId);
    expect(() => {
      (loaded as { content: string }).content = 'hacked';
    }).toThrow();
    expect((await mgr.load(saved.memoryId))?.content).toBe('hello');
  });

  it('load returns saved memory; null for missing', async () => {
    const m = await mgr.save(base);
    expect((await mgr.load(m.memoryId))?.content).toBe('hello');
    expect(await mgr.load('nope')).toBeNull();
  });

  it('update creates a NEW object (immutable), keeps id+createdAt, bumps updatedAt', async () => {
    const m = await mgr.save(base);
    const updated = await mgr.update(m.memoryId, {
      content: 'changed',
      tags: ['t'],
    });
    expect(updated.memoryId).toBe(m.memoryId);
    expect(updated.createdAt.getTime()).toBe(m.createdAt.getTime());
    expect(updated.content).toBe('changed');
    expect(updated.tags).toEqual(['t']);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      m.updatedAt.getTime(),
    );
    expect(updated).not.toBe(m);
  });

  it('update throws NotFound for missing id', async () => {
    await expect(mgr.update('nope', { content: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delete removes the memory', async () => {
    const m = await mgr.save(base);
    expect(await mgr.delete(m.memoryId)).toBe(true);
    expect(await mgr.load(m.memoryId)).toBeNull();
  });

  it('list / search filter by type and text', async () => {
    await mgr.save({
      ...base,
      content: 'Pickle court fee note',
      memoryType: MemoryType.USER,
    });
    await mgr.save({ ...base, content: 'random', memoryType: MemoryType.TEMP });
    expect(await mgr.list({ memoryType: MemoryType.USER })).toHaveLength(1);
    const found = await mgr.search({ text: 'pickle' });
    expect(found).toHaveLength(1);
    expect(found[0].content).toContain('Pickle');
  });

  it('isExpired honors TTL from updatedAt; load lazily drops expired', async () => {
    // Insert directly with an old updatedAt + short ttl.
    const old = await repo.create(
      Object.freeze({
        memoryId: 'exp',
        ownerType: MemoryOwnerType.USER,
        ownerId: 'u1',
        memoryType: MemoryType.TEMP,
        createdAt: new Date(Date.now() - 10_000),
        updatedAt: new Date(Date.now() - 10_000),
        ttl: 1,
        tags: [],
        content: 'temp',
        metadata: {},
      }),
    );
    expect(mgr.isExpired(old)).toBe(true);
    expect(await mgr.load('exp')).toBeNull();
    expect(await repo.findById('exp')).toBeNull(); // lazily deleted
  });

  it('ttl null never expires', async () => {
    const m = await mgr.save({ ...base, ttl: null });
    expect(mgr.isExpired(m)).toBe(false);
  });

  it('default TTL comes from config when not provided', async () => {
    const m = new MemoryManager(
      repo,
      configWith({ MEMORY_DEFAULT_TTL_SECONDS: '3600' }),
    );
    const saved = await m.save(base);
    expect(saved.ttl).toBe(3600);
  });

  it('rejects content exceeding max length', async () => {
    const m = new MemoryManager(
      repo,
      configWith({ MEMORY_MAX_CONTENT_LENGTH: '5' }),
    );
    await expect(m.save({ ...base, content: 'toolong' })).rejects.toThrow(
      'max length',
    );
  });

  it('update rejects content exceeding max length', async () => {
    const m = new MemoryManager(
      repo,
      configWith({ MEMORY_MAX_CONTENT_LENGTH: '5' }),
    );
    const saved = await m.save({ ...base, content: 'ok' });
    await expect(
      m.update(saved.memoryId, { content: 'toolong' }),
    ).rejects.toThrow('max length');
  });

  it('update without content keeps existing content', async () => {
    const saved = await mgr.save({ ...base, content: 'orig' });
    const u = await mgr.update(saved.memoryId, { tags: ['z'] });
    expect(u.content).toBe('orig');
  });

  it('list with no argument returns all non-expired', async () => {
    await mgr.save(base);
    expect(await mgr.list()).toHaveLength(1);
  });

  it('update keeps existing tags/metadata/ttl when patch omits them', async () => {
    const saved = await mgr.save({
      ...base,
      tags: ['keep'],
      ttl: 10,
      metadata: { a: 1 },
    });
    const updated = await mgr.update(saved.memoryId, { content: 'new only' });
    expect(updated.tags).toEqual(['keep']);
    expect(updated.metadata).toEqual({ a: 1 });
    expect(updated.ttl).toBe(10);
  });

  it('list hides expired unless includeExpired', async () => {
    await repo.create(
      Object.freeze({
        memoryId: 'e2',
        ownerType: MemoryOwnerType.USER,
        ownerId: 'u1',
        memoryType: MemoryType.TEMP,
        createdAt: new Date(Date.now() - 10_000),
        updatedAt: new Date(Date.now() - 10_000),
        ttl: 1,
        tags: [],
        content: 'temp',
        metadata: {},
      }),
    );
    expect(await mgr.list({})).toHaveLength(0);
    expect(await mgr.list({ includeExpired: true })).toHaveLength(1);
  });
});
