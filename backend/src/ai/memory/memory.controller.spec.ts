import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryObject, MemoryOwnerType, MemoryType } from './memory.types';
import type { JwtUser } from '../../common/decorators';

function mem(over: Partial<MemoryObject>): MemoryObject {
  const now = new Date();
  return {
    memoryId: 'm1',
    ownerType: MemoryOwnerType.USER,
    ownerId: 'u1',
    memoryType: MemoryType.USER,
    createdAt: now,
    updatedAt: now,
    ttl: null,
    tags: [],
    content: 'c',
    metadata: {},
    ...over,
  };
}

const userU1: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'u1',
  memberId: null,
};
const superAdmin: JwtUser = {
  userId: 'sa',
  clubId: null,
  role: 'SUPER_ADMIN',
  username: 'sa',
  memberId: null,
};
const userNoClub: JwtUser = {
  userId: 'u2',
  clubId: null,
  role: 'CLUB_ADMIN',
  username: 'u2',
  memberId: null,
};

describe('MemoryController', () => {
  let manager: {
    save: jest.Mock;
    load: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    list: jest.Mock;
  };
  let ctrl: MemoryController;

  beforeEach(() => {
    manager = {
      save: jest.fn(),
      load: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    };
    ctrl = new MemoryController(manager as never);
  });

  it('create defaults ownerType=USER and forces ownerId from principal', async () => {
    manager.save.mockResolvedValue(mem({}));
    await ctrl.create({ memoryType: MemoryType.USER, content: 'hi' }, userU1);
    expect(manager.save.mock.calls[0][0]).toMatchObject({
      ownerType: MemoryOwnerType.USER,
      ownerId: 'u1',
    });
  });

  it('create CLUB uses principal clubId', async () => {
    manager.save.mockResolvedValue(mem({}));
    await ctrl.create(
      {
        memoryType: MemoryType.CLUB,
        ownerType: MemoryOwnerType.CLUB,
        content: 'hi',
      },
      userU1,
    );
    expect(manager.save.mock.calls[0][0].ownerId).toBe('club-1');
  });

  it('create CLUB without clubId → BadRequest', async () => {
    await expect(
      ctrl.create(
        {
          memoryType: MemoryType.CLUB,
          ownerType: MemoryOwnerType.CLUB,
          content: 'x',
        },
        userNoClub,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('list CLUB scope without clubId → Forbidden', async () => {
    await expect(
      ctrl.list(
        userNoClub,
        MemoryOwnerType.CLUB,
        undefined,
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create SESSION binds composite ownerId (club:user:session)', async () => {
    manager.save.mockResolvedValue(mem({}));
    await ctrl.create(
      {
        memoryType: MemoryType.SESSION,
        ownerType: MemoryOwnerType.SESSION,
        sessionId: 'sess-9',
        content: 'x',
      },
      userU1,
    );
    // club-1 + u1 + sess-9 → không user/club khác trùng được.
    expect(manager.save.mock.calls[0][0].ownerId).toBe('club-1:u1:sess-9');
  });

  it('delete on missing memory still returns flag without access error', async () => {
    manager.load.mockResolvedValue(null);
    manager.delete.mockResolvedValue(false);
    const res = await ctrl.remove('gone', userU1);
    expect(res.data.deleted).toBe(false);
  });

  it('create SESSION without sessionId → BadRequest', async () => {
    await expect(
      ctrl.create(
        {
          memoryType: MemoryType.SESSION,
          ownerType: MemoryOwnerType.SESSION,
          content: 'x',
        },
        userU1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create SYSTEM by non-superadmin → Forbidden', async () => {
    await expect(
      ctrl.create(
        {
          memoryType: MemoryType.SYSTEM,
          ownerType: MemoryOwnerType.SYSTEM,
          content: 'x',
        },
        userU1,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create SYSTEM by superadmin → ownerId system', async () => {
    manager.save.mockResolvedValue(mem({}));
    await ctrl.create(
      {
        memoryType: MemoryType.SYSTEM,
        ownerType: MemoryOwnerType.SYSTEM,
        content: 'x',
      },
      superAdmin,
    );
    expect(manager.save.mock.calls[0][0].ownerId).toBe('system');
  });

  it('list forces USER scope for non-superadmin', async () => {
    manager.list.mockResolvedValue([]);
    await ctrl.list(userU1, undefined, undefined, undefined, undefined);
    expect(manager.list.mock.calls[0][0]).toMatchObject({
      ownerType: MemoryOwnerType.USER,
      ownerId: 'u1',
    });
  });

  it('list CLUB scope for non-superadmin uses clubId', async () => {
    manager.list.mockResolvedValue([]);
    await ctrl.list(userU1, MemoryOwnerType.CLUB, undefined, 'a,b', 'q');
    const q = manager.list.mock.calls[0][0];
    expect(q.ownerType).toBe(MemoryOwnerType.CLUB);
    expect(q.ownerId).toBe('club-1');
    expect(q.tags).toEqual(['a', 'b']);
    expect(q.text).toBe('q');
  });

  it('list lets superadmin pass ownerType through', async () => {
    manager.list.mockResolvedValue([]);
    await ctrl.list(
      superAdmin,
      MemoryOwnerType.SYSTEM,
      undefined,
      undefined,
      undefined,
    );
    expect(manager.list.mock.calls[0][0].ownerType).toBe(
      MemoryOwnerType.SYSTEM,
    );
  });

  it('load denies access to another users memory', async () => {
    manager.load.mockResolvedValue(mem({ ownerId: 'other' }));
    await expect(ctrl.load('m1', userU1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('load returns own memory', async () => {
    manager.load.mockResolvedValue(mem({ ownerId: 'u1' }));
    const res = await ctrl.load('m1', userU1);
    expect(res.data?.memoryId).toBe('m1');
  });

  it('load null when missing', async () => {
    manager.load.mockResolvedValue(null);
    expect((await ctrl.load('x', userU1)).data).toBeNull();
  });

  it('allows access to own CLUB memory', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.CLUB, ownerId: 'club-1' }),
    );
    expect((await ctrl.load('m1', userU1)).data?.memoryId).toBe('m1');
  });

  it('SESSION: owner (same club+user) can read', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.SESSION, ownerId: 'club-1:u1:sess-1' }),
    );
    expect((await ctrl.load('m1', userU1)).data?.memoryId).toBe('m1');
  });

  it('SESSION: user A cannot read user B session memory', async () => {
    manager.load.mockResolvedValue(
      mem({
        ownerType: MemoryOwnerType.SESSION,
        ownerId: 'club-1:other:sess-1',
      }),
    );
    await expect(ctrl.load('m1', userU1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('SESSION: club A cannot read club B session memory', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.SESSION, ownerId: 'club-2:u1:sess-1' }),
    );
    await expect(ctrl.load('m1', userU1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('SESSION: update blocked for non-owner', async () => {
    manager.load.mockResolvedValue(
      mem({
        ownerType: MemoryOwnerType.SESSION,
        ownerId: 'club-1:other:sess-1',
      }),
    );
    await expect(
      ctrl.update('m1', { content: 'x' }, userU1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('SESSION: delete blocked for non-owner', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.SESSION, ownerId: 'club-2:u1:sess-1' }),
    );
    await expect(ctrl.remove('m1', userU1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('SESSION: owner can update/delete own session memory', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.SESSION, ownerId: 'club-1:u1:sess-1' }),
    );
    manager.update.mockResolvedValue(mem({ content: 'new' }));
    manager.delete.mockResolvedValue(true);
    expect(
      (await ctrl.update('m1', { content: 'new' }, userU1)).data.content,
    ).toBe('new');
    expect((await ctrl.remove('m1', userU1)).data.deleted).toBe(true);
  });

  it('list SESSION requires sessionId then scopes to composite owner', async () => {
    manager.list.mockResolvedValue([]);
    await ctrl.list(
      userU1,
      MemoryOwnerType.SESSION,
      undefined,
      undefined,
      undefined,
      'sess-1',
    );
    expect(manager.list.mock.calls[0][0].ownerId).toBe('club-1:u1:sess-1');
  });

  it('list SESSION without sessionId → BadRequest', async () => {
    await expect(
      ctrl.list(
        userU1,
        MemoryOwnerType.SESSION,
        undefined,
        undefined,
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('SESSION composite uses "none" when user has no club', async () => {
    manager.save.mockResolvedValue(mem({}));
    await ctrl.create(
      {
        memoryType: MemoryType.SESSION,
        ownerType: MemoryOwnerType.SESSION,
        sessionId: 's1',
        content: 'x',
      },
      userNoClub,
    );
    expect(manager.save.mock.calls[0][0].ownerId).toBe('none:u2:s1');
  });

  it('SESSION owner with no club can access own session memory', async () => {
    manager.load.mockResolvedValue(
      mem({ ownerType: MemoryOwnerType.SESSION, ownerId: 'none:u2:s1' }),
    );
    expect((await ctrl.load('m1', userNoClub)).data?.memoryId).toBe('m1');
  });

  it('superadmin can access any memory', async () => {
    manager.load.mockResolvedValue(mem({ ownerId: 'someone-else' }));
    expect((await ctrl.load('m1', superAdmin)).data?.memoryId).toBe('m1');
  });

  it('update enforces access then delegates', async () => {
    manager.load.mockResolvedValue(mem({ ownerId: 'u1' }));
    manager.update.mockResolvedValue(mem({ content: 'new' }));
    const res = await ctrl.update('m1', { content: 'new' }, userU1);
    expect(res.data.content).toBe('new');
  });

  it('update missing → Forbidden', async () => {
    manager.load.mockResolvedValue(null);
    await expect(
      ctrl.update('m1', { content: 'x' }, userU1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delete enforces access and returns deleted flag', async () => {
    manager.load.mockResolvedValue(mem({ ownerId: 'u1' }));
    manager.delete.mockResolvedValue(true);
    const res = await ctrl.remove('m1', userU1);
    expect(res.data.deleted).toBe(true);
  });
});
