import { InMemoryMemoryRepository } from './memory.repository';
import { MemoryObject, MemoryOwnerType, MemoryType } from './memory.types';

function makeObj(over: Partial<MemoryObject> = {}): MemoryObject {
  const now = new Date();
  return {
    memoryId: over.memoryId ?? 'm1',
    ownerType: over.ownerType ?? MemoryOwnerType.USER,
    ownerId: over.ownerId ?? 'u1',
    memoryType: over.memoryType ?? MemoryType.USER,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
    ttl: over.ttl ?? null,
    tags: over.tags ?? [],
    content: over.content ?? 'hello world',
    metadata: over.metadata ?? {},
  };
}

describe('InMemoryMemoryRepository', () => {
  let repo: InMemoryMemoryRepository;

  beforeEach(() => {
    repo = new InMemoryMemoryRepository();
  });

  it('create + findById', async () => {
    await repo.create(makeObj({ memoryId: 'a' }));
    expect((await repo.findById('a'))?.memoryId).toBe('a');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('replace overwrites', async () => {
    await repo.create(makeObj({ memoryId: 'a', content: 'old' }));
    await repo.replace(makeObj({ memoryId: 'a', content: 'new' }));
    expect((await repo.findById('a'))?.content).toBe('new');
  });

  it('deleteById returns boolean', async () => {
    await repo.create(makeObj({ memoryId: 'a' }));
    expect(await repo.deleteById('a')).toBe(true);
    expect(await repo.deleteById('a')).toBe(false);
  });

  it('query filters by ownerType/ownerId/memoryType', async () => {
    await repo.create(
      makeObj({ memoryId: 'a', ownerId: 'u1', memoryType: MemoryType.USER }),
    );
    await repo.create(
      makeObj({
        memoryId: 'b',
        ownerId: 'u2',
        memoryType: MemoryType.SYSTEM,
        ownerType: MemoryOwnerType.SYSTEM,
      }),
    );
    const u1 = await repo.query({
      ownerType: MemoryOwnerType.USER,
      ownerId: 'u1',
    });
    expect(u1.map((m) => m.memoryId)).toEqual(['a']);
    const sys = await repo.query({ memoryType: MemoryType.SYSTEM });
    expect(sys.map((m) => m.memoryId)).toEqual(['b']);
  });

  it('query filters by tags (all must match) and text', async () => {
    await repo.create(
      makeObj({ memoryId: 'a', tags: ['x', 'y'], content: 'Pickle club' }),
    );
    await repo.create(
      makeObj({ memoryId: 'b', tags: ['x'], content: 'other' }),
    );
    expect(
      (await repo.query({ tags: ['x', 'y'] })).map((m) => m.memoryId),
    ).toEqual(['a']);
    expect(
      (await repo.query({ text: 'PICKLE' })).map((m) => m.memoryId),
    ).toEqual(['a']);
  });

  it('query sorts newest first by updatedAt', async () => {
    await repo.create(makeObj({ memoryId: 'old', updatedAt: new Date(1000) }));
    await repo.create(makeObj({ memoryId: 'new', updatedAt: new Date(9000) }));
    expect((await repo.query({})).map((m) => m.memoryId)).toEqual([
      'new',
      'old',
    ]);
  });

  it('clear empties the store', async () => {
    await repo.create(makeObj({ memoryId: 'a' }));
    await repo.clear();
    expect(await repo.query({})).toHaveLength(0);
  });
});
