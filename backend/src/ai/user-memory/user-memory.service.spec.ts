import { BadRequestException } from '@nestjs/common';
import { UserMemoryService } from './user-memory.service';
import { InMemoryUserMemoryRepository } from './user-memory.repository';

describe('UserMemoryService (tenant scope clubId:userId)', () => {
  let repo: InMemoryUserMemoryRepository;
  let svc: UserMemoryService;

  beforeEach(() => {
    repo = new InMemoryUserMemoryRepository();
    svc = new UserMemoryService(repo);
  });

  it('saves and reads Profile; immutable + ownerKey = clubId:userId', async () => {
    const p = await svc.saveProfile('club-1', 'u1', {
      nickname: 'Tung',
      language: 'vi',
    });
    expect(p.clubId).toBe('club-1');
    expect(p.userId).toBe('u1');
    expect(p.ownerKey).toBe('club-1:u1');
    expect(p.nickname).toBe('Tung');
    expect(Object.isFrozen(p)).toBe(true);
    expect((await svc.getProfile('club-1', 'u1'))?.nickname).toBe('Tung');
  });

  it('Profile save merges with previous within same tenant', async () => {
    await svc.saveProfile('club-1', 'u1', { nickname: 'Tung', language: 'vi' });
    const p = await svc.saveProfile('club-1', 'u1', {
      displayName: 'Le Thanh Tung',
    });
    expect(p.nickname).toBe('Tung');
    expect(p.displayName).toBe('Le Thanh Tung');
  });

  // ── TENANT ISOLATION (Codex blocker) ───────────────────────────────────────
  it('same userId, DIFFERENT clubId are isolated (Profile)', async () => {
    await svc.saveProfile('club-1', 'u1', { nickname: 'InClub1' });
    await svc.saveProfile('club-2', 'u1', { nickname: 'InClub2' });
    expect((await svc.getProfile('club-1', 'u1'))?.nickname).toBe('InClub1');
    expect((await svc.getProfile('club-2', 'u1'))?.nickname).toBe('InClub2');
  });

  it('same clubId, DIFFERENT userId are isolated (Profile)', async () => {
    await svc.saveProfile('club-1', 'u1', { nickname: 'User1' });
    await svc.saveProfile('club-1', 'u2', { nickname: 'User2' });
    expect((await svc.getProfile('club-1', 'u1'))?.nickname).toBe('User1');
    expect((await svc.getProfile('club-1', 'u2'))?.nickname).toBe('User2');
  });

  it('Preference + Behavior are also isolated by clubId:userId', async () => {
    await svc.savePreference('club-1', 'u1', { favoriteModel: 'a' });
    await svc.savePreference('club-2', 'u1', { favoriteModel: 'b' });
    expect((await svc.getPreference('club-1', 'u1'))?.favoriteModel).toBe('a');
    expect((await svc.getPreference('club-2', 'u1'))?.favoriteModel).toBe('b');

    await svc.saveBehavior('club-1', 'u1', { interactionCount: 1 });
    await svc.saveBehavior('club-2', 'u1', { interactionCount: 9 });
    expect((await svc.getBehavior('club-1', 'u1'))?.interactionCount).toBe(1);
    expect((await svc.getBehavior('club-2', 'u1'))?.interactionCount).toBe(9);
  });

  it('Behavior clones arrays/objects + defaults; merges within tenant', async () => {
    const topics = ['finance'];
    const stats = { calls: 3 };
    const b = await svc.saveBehavior('club-1', 'u1', {
      interactionCount: 5,
      recentTopics: topics,
      usageStatistics: stats,
    });
    topics.push('x');
    stats.calls = 999;
    const reloaded = await svc.getBehavior('club-1', 'u1');
    expect(reloaded?.recentTopics).toEqual(['finance']);
    expect((reloaded?.usageStatistics as { calls: number }).calls).toBe(3);
    expect(b.interactionCount).toBe(5);

    const b2 = await svc.saveBehavior('club-1', 'u1', {
      preferredPromptStyle: 'bullet',
    });
    expect(b2.interactionCount).toBe(5); // kept
    expect(b2.preferredPromptStyle).toBe('bullet');
  });

  it('three kinds are independent (no mixing)', async () => {
    await svc.saveProfile('club-1', 'u1', { nickname: 'Tung' });
    expect(await svc.getPreference('club-1', 'u1')).toBeNull();
    expect(await svc.getBehavior('club-1', 'u1')).toBeNull();
  });

  it('rejects when clubId missing (no global user memory)', async () => {
    await expect(svc.getProfile(null, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.saveProfile(null, 'u1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.savePreference(null, 'u1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.saveBehavior(null, 'u1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
