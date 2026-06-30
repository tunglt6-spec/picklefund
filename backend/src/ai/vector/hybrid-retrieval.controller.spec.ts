import { HybridRetrievalController } from './hybrid-retrieval.controller';
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

describe('HybridRetrievalController (clubId from JWT)', () => {
  let hybrid: { retrieve: jest.Mock };
  let index: { rebuildClub: jest.Mock };
  let obs: { snapshot: jest.Mock };
  let ctrl: HybridRetrievalController;

  beforeEach(() => {
    hybrid = { retrieve: jest.fn().mockResolvedValue([]) };
    index = { rebuildClub: jest.fn().mockResolvedValue(3) };
    obs = { snapshot: jest.fn().mockReturnValue({ embeddingCount: 0 }) };
    ctrl = new HybridRetrievalController(
      hybrid as never,
      index as never,
      obs as never,
    );
  });

  it('club-memory passes clubId + parsed query', async () => {
    await ctrl.clubMemory(u1, 'court', 'a,b', ClubMemoryType.FACT, '5');
    expect(hybrid.retrieve).toHaveBeenCalledWith('club-1', {
      text: 'court',
      tags: ['a', 'b'],
      type: ClubMemoryType.FACT,
      topK: 5,
    });
  });

  it('club-memory parses query with only text (tags/type/topK undefined)', async () => {
    await ctrl.clubMemory(u1, 'court', undefined, undefined, undefined);
    expect(hybrid.retrieve).toHaveBeenCalledWith('club-1', {
      text: 'court',
      tags: undefined,
      type: undefined,
      topK: undefined,
    });
  });

  it('club-memory returns [] when no club', async () => {
    const res = await ctrl.clubMemory(
      noClub,
      'x',
      undefined,
      undefined,
      undefined,
    );
    expect(res.data).toEqual([]);
    expect(hybrid.retrieve).not.toHaveBeenCalled();
  });

  it('reindex rebuilds club index; 0 when no club', async () => {
    expect((await ctrl.reindex(u1)).data.indexed).toBe(3);
    expect((await ctrl.reindex(noClub)).data.indexed).toBe(0);
  });

  it('metrics returns observability snapshot', () => {
    expect(ctrl.metrics().data).toEqual({ embeddingCount: 0 });
  });
});
