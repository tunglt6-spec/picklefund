import { NotFoundException } from '@nestjs/common';
import { ClubMemoryController } from './club-memory.controller';
import { ClubMemoryType } from './club-memory.types';
import type { JwtUser } from '../../common/decorators';

const u1: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'u1',
  memberId: null,
};

describe('ClubMemoryController (clubId+userId from JWT)', () => {
  let svc: {
    save: jest.Mock;
    listByClub: jest.Mock;
    load: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let ctrl: ClubMemoryController;

  beforeEach(() => {
    svc = {
      save: jest.fn().mockResolvedValue({ memoryId: 'm1' }),
      listByClub: jest.fn().mockResolvedValue([]),
      load: jest.fn().mockResolvedValue({ memoryId: 'm1' }),
      update: jest.fn().mockResolvedValue({ memoryId: 'm1' }),
      delete: jest.fn().mockResolvedValue(true),
    };
    ctrl = new ClubMemoryController(svc as never);
  });

  it('create passes clubId + userId from JWT', async () => {
    await ctrl.create({ type: ClubMemoryType.FACT, content: 'c' }, u1);
    expect(svc.save).toHaveBeenCalledWith('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'c',
    });
  });

  it('list passes clubId from JWT', async () => {
    await ctrl.list(u1);
    expect(svc.listByClub).toHaveBeenCalledWith('club-1');
  });

  it('load passes clubId from JWT', async () => {
    await ctrl.load('m1', u1);
    expect(svc.load).toHaveBeenCalledWith('club-1', 'm1');
  });

  it('update passes clubId + userId from JWT', async () => {
    await ctrl.update('m1', { content: 'x' }, u1);
    expect(svc.update).toHaveBeenCalledWith('club-1', 'u1', 'm1', {
      content: 'x',
    });
  });

  it('delete returns flag; NotFound when nothing deleted', async () => {
    expect((await ctrl.remove('m1', u1)).data.deleted).toBe(true);
    svc.delete.mockResolvedValue(false);
    await expect(ctrl.remove('m1', u1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
