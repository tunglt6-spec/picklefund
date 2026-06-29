import { UserMemoryController } from './user-memory.controller';
import type { JwtUser } from '../../common/decorators';

const u1: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'u1',
  memberId: null,
};

describe('UserMemoryController (tenant scope = JWT clubId:userId)', () => {
  let svc: {
    getProfile: jest.Mock;
    saveProfile: jest.Mock;
    getPreference: jest.Mock;
    savePreference: jest.Mock;
    getBehavior: jest.Mock;
    saveBehavior: jest.Mock;
  };
  let ctrl: UserMemoryController;

  beforeEach(() => {
    svc = {
      getProfile: jest.fn().mockResolvedValue(null),
      saveProfile: jest.fn().mockResolvedValue({}),
      getPreference: jest.fn().mockResolvedValue(null),
      savePreference: jest.fn().mockResolvedValue({}),
      getBehavior: jest.fn().mockResolvedValue(null),
      saveBehavior: jest.fn().mockResolvedValue({}),
    };
    ctrl = new UserMemoryController(svc as never);
  });

  it('profile get/put pass clubId + userId from JWT', async () => {
    await ctrl.getProfile(u1);
    await ctrl.putProfile({ nickname: 'Tung' }, u1);
    expect(svc.getProfile).toHaveBeenCalledWith('club-1', 'u1');
    expect(svc.saveProfile).toHaveBeenCalledWith('club-1', 'u1', {
      nickname: 'Tung',
    });
  });

  it('preference get/put pass clubId + userId from JWT', async () => {
    await ctrl.getPreference(u1);
    await ctrl.putPreference({ favoriteModel: 'x' }, u1);
    expect(svc.getPreference).toHaveBeenCalledWith('club-1', 'u1');
    expect(svc.savePreference).toHaveBeenCalledWith('club-1', 'u1', {
      favoriteModel: 'x',
    });
  });

  it('behavior get/put pass clubId + userId from JWT', async () => {
    await ctrl.getBehavior(u1);
    await ctrl.putBehavior({ interactionCount: 1 }, u1);
    expect(svc.getBehavior).toHaveBeenCalledWith('club-1', 'u1');
    expect(svc.saveBehavior).toHaveBeenCalledWith('club-1', 'u1', {
      interactionCount: 1,
    });
  });

  it('uses clubId from JWT, NOT any client-supplied value (DTO has no clubId field)', async () => {
    // DTO không có clubId; kể cả client nhồi clubId vào body, controller vẫn dùng JWT.
    await ctrl.putProfile({ nickname: 'x', clubId: 'club-HACK' } as never, u1);
    expect(svc.saveProfile).toHaveBeenCalledWith('club-1', 'u1', {
      nickname: 'x',
      clubId: 'club-HACK',
    });
    // service nhận clubId='club-1' (đối số 1) từ JWT — không phải 'club-HACK'.
    expect(svc.saveProfile.mock.calls[0][0]).toBe('club-1');
  });
});
