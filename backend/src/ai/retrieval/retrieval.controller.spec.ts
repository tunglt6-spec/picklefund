import { RetrievalController } from './retrieval.controller';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import type { JwtUser } from '../../common/decorators';

const u1: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'u1',
  memberId: null,
};
const noClub: JwtUser = { ...u1, clubId: null };

describe('RetrievalController (clubId from JWT)', () => {
  let engine: { retrieve: jest.Mock };
  let ctrl: RetrievalController;

  beforeEach(() => {
    engine = { retrieve: jest.fn().mockResolvedValue([]) };
    ctrl = new RetrievalController(engine as never);
  });

  it('passes clubId from JWT and parses query', async () => {
    await ctrl.clubMemory(u1, 'sân', 'a,b', ClubMemoryType.FACT, '5');
    expect(engine.retrieve).toHaveBeenCalledWith('club-1', {
      text: 'sân',
      tags: ['a', 'b'],
      type: ClubMemoryType.FACT,
      topK: 5,
    });
  });

  it('parses query with only text (tags/type/topK undefined)', async () => {
    await ctrl.clubMemory(u1, 'sân', undefined, undefined, undefined);
    expect(engine.retrieve).toHaveBeenCalledWith('club-1', {
      text: 'sân',
      tags: undefined,
      type: undefined,
      topK: undefined,
    });
  });

  it('returns empty when user has no club (no retrieval call)', async () => {
    const res = await ctrl.clubMemory(
      noClub,
      'x',
      undefined,
      undefined,
      undefined,
    );
    expect(res.data).toEqual([]);
    expect(engine.retrieve).not.toHaveBeenCalled();
  });
});
