import { InMemoryUserMemoryRepository } from './user-memory.repository';
import { ProfileMemory } from './user-memory.types';

function profile(
  clubId: string,
  userId: string,
  nickname: string,
): ProfileMemory {
  return {
    clubId,
    userId,
    ownerKey: `${clubId}:${userId}`,
    nickname,
    displayName: null,
    language: null,
    timezone: null,
    updatedAt: new Date(),
  };
}

describe('InMemoryUserMemoryRepository (composite key isolation)', () => {
  let repo: InMemoryUserMemoryRepository;
  beforeEach(() => {
    repo = new InMemoryUserMemoryRepository();
  });

  it('isolates same userId across different clubs', async () => {
    await repo.saveProfile(profile('club-1', 'u1', 'A'));
    await repo.saveProfile(profile('club-2', 'u1', 'B'));
    expect((await repo.getProfile('club-1', 'u1'))?.nickname).toBe('A');
    expect((await repo.getProfile('club-2', 'u1'))?.nickname).toBe('B');
  });

  it('isolates different users within same club', async () => {
    await repo.saveProfile(profile('club-1', 'u1', 'A'));
    await repo.saveProfile(profile('club-1', 'u2', 'B'));
    expect((await repo.getProfile('club-1', 'u1'))?.nickname).toBe('A');
    expect((await repo.getProfile('club-1', 'u2'))?.nickname).toBe('B');
  });

  it('returns null for unknown tenant key and clears all', async () => {
    await repo.saveProfile(profile('club-1', 'u1', 'A'));
    expect(await repo.getProfile('club-9', 'u9')).toBeNull();
    await repo.clear();
    expect(await repo.getProfile('club-1', 'u1')).toBeNull();
  });

  it('stores preference + behavior independently per tenant', async () => {
    const now = new Date();
    await repo.savePreference({
      clubId: 'club-1',
      userId: 'u1',
      ownerKey: 'club-1:u1',
      favoriteModel: 'm',
      uiPreference: null,
      responseStyle: null,
      notificationPreference: null,
      updatedAt: now,
    });
    await repo.saveBehavior({
      clubId: 'club-1',
      userId: 'u1',
      ownerKey: 'club-1:u1',
      interactionCount: 2,
      recentTopics: [],
      preferredPromptStyle: null,
      usageStatistics: {},
      updatedAt: now,
    });
    expect((await repo.getPreference('club-1', 'u1'))?.favoriteModel).toBe('m');
    expect((await repo.getBehavior('club-1', 'u1'))?.interactionCount).toBe(2);
    expect(await repo.getPreference('club-2', 'u1')).toBeNull();
    expect(await repo.getBehavior('club-2', 'u1')).toBeNull();
  });
});
