import { InMemoryClubMemoryRepository } from './club-memory.repository';
import { ClubMemoryObject, ClubMemoryType } from './club-memory.types';

function obj(over: Partial<ClubMemoryObject> = {}): ClubMemoryObject {
  const now = new Date();
  return {
    memoryId: 'm1',
    clubId: 'club-1',
    type: ClubMemoryType.FACT,
    title: null,
    content: 'c',
    tags: [],
    metadata: {},
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('InMemoryClubMemoryRepository', () => {
  let repo: InMemoryClubMemoryRepository;
  beforeEach(() => {
    repo = new InMemoryClubMemoryRepository();
  });

  it('create/findById/replace/delete', async () => {
    await repo.create(obj({ memoryId: 'a', content: 'old' }));
    expect((await repo.findById('a'))?.content).toBe('old');
    await repo.replace(obj({ memoryId: 'a', content: 'new' }));
    expect((await repo.findById('a'))?.content).toBe('new');
    expect(await repo.deleteById('a')).toBe(true);
    expect(await repo.findById('a')).toBeNull();
  });

  it('listByClub filters by club, newest first', async () => {
    await repo.create(obj({ memoryId: 'old', updatedAt: new Date(1000) }));
    await repo.create(obj({ memoryId: 'new', updatedAt: new Date(9000) }));
    await repo.create(obj({ memoryId: 'other', clubId: 'club-2' }));
    expect((await repo.listByClub('club-1')).map((m) => m.memoryId)).toEqual([
      'new',
      'old',
    ]);
  });

  it('clear empties the store', async () => {
    await repo.create(obj({ memoryId: 'a' }));
    await repo.clear();
    expect(await repo.listByClub('club-1')).toHaveLength(0);
  });
});
