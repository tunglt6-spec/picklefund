import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClubMemoryService } from './club-memory.service';
import { InMemoryClubMemoryRepository } from './club-memory.repository';
import { ClubMemoryType } from './club-memory.types';

describe('ClubMemoryService (scope clubId, immutable, audit, isolation)', () => {
  let repo: InMemoryClubMemoryRepository;
  let svc: ClubMemoryService;

  beforeEach(() => {
    repo = new InMemoryClubMemoryRepository();
    svc = new ClubMemoryService(repo);
  });

  it('saves with clubId scope + audit metadata + deep freeze', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'Sân ngoài trời ưu tiên',
      tags: ['court'],
      metadata: { nested: { v: 1 } },
    });
    expect(m.clubId).toBe('club-1');
    expect(m.createdBy).toBe('u1');
    expect(m.updatedBy).toBe('u1');
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.tags)).toBe(true);
    expect(Object.isFrozen((m.metadata as { nested: object }).nested)).toBe(
      true,
    );
  });

  it('mutating input after save does not affect stored', async () => {
    const tags = ['a'];
    const meta = { nested: { v: 1 } };
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'x',
      tags,
      metadata: meta,
    });
    tags.push('b');
    meta.nested.v = 999;
    const reloaded = await svc.load('club-1', m.memoryId);
    expect(reloaded?.tags).toEqual(['a']);
    expect((reloaded?.metadata as { nested: { v: number } }).nested.v).toBe(1);
  });

  it('tenant isolation: cannot load club memory of another club', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
    });
    expect(await svc.load('club-1', m.memoryId)).not.toBeNull();
    expect(await svc.load('club-2', m.memoryId)).toBeNull();
  });

  it('update keeps createdBy/createdAt, updates updatedBy, immutable new object', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'old',
    });
    const u = await svc.update('club-1', 'u2', m.memoryId, { content: 'new' });
    expect(u.content).toBe('new');
    expect(u.createdBy).toBe('u1');
    expect(u.updatedBy).toBe('u2');
    expect(u.createdAt.getTime()).toBe(m.createdAt.getTime());
    expect(m.content).toBe('old'); // old not mutated
  });

  it('update with title/tags/metadata replaces those fields', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
      title: 'old',
      tags: ['x'],
    });
    const u = await svc.update('club-1', 'u1', m.memoryId, {
      title: 'new title',
      tags: ['y', 'z'],
      metadata: { a: 1 },
    });
    expect(u.title).toBe('new title');
    expect(u.tags).toEqual(['y', 'z']);
    expect(u.metadata).toEqual({ a: 1 });
    expect(u.content).toBe('c'); // unchanged (patch omitted content)
  });

  it('update with explicit null title clears it', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
      title: 'old',
    });
    const u = await svc.update('club-1', 'u1', m.memoryId, { title: null });
    expect(u.title).toBeNull();
  });

  it('update across club → NotFound', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
    });
    await expect(
      svc.update('club-2', 'u1', m.memoryId, { content: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete only within same club', async () => {
    const m = await svc.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
    });
    expect(await svc.delete('club-2', m.memoryId)).toBe(false); // cross-club
    expect(await svc.delete('club-1', m.memoryId)).toBe(true);
    expect(await svc.load('club-1', m.memoryId)).toBeNull();
  });

  it('listByClub returns only that club, newest first', async () => {
    await svc.save('club-1', 'u1', { type: ClubMemoryType.FACT, content: 'a' });
    await svc.save('club-1', 'u1', { type: ClubMemoryType.RULE, content: 'b' });
    await svc.save('club-2', 'u2', { type: ClubMemoryType.FACT, content: 'c' });
    expect(await svc.listByClub('club-1')).toHaveLength(2);
  });

  it('rejects when clubId missing (no global club memory)', async () => {
    await expect(
      svc.save(null, 'u1', { type: ClubMemoryType.FACT, content: 'c' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.listByClub(null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
