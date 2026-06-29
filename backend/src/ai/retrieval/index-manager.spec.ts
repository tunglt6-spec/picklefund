import { IndexManager } from './index-manager';
import {
  ClubMemoryObject,
  ClubMemoryType,
} from '../club-memory/club-memory.types';

function obj(over: Partial<ClubMemoryObject> = {}): ClubMemoryObject {
  const now = new Date();
  return {
    memoryId: 'm1',
    clubId: 'club-1',
    type: ClubMemoryType.FACT,
    title: null,
    content: 'Sân ngoài trời ưu tiên buổi tối',
    tags: ['court'],
    metadata: {},
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('IndexManager (derived, rebuildable, deterministic)', () => {
  let im: IndexManager;
  beforeEach(() => {
    im = new IndexManager();
  });

  it('tokenize lowercases and splits', () => {
    expect(IndexManager.tokenize('Hello, Court-A!')).toEqual([
      'hello',
      'court',
    ]);
  });

  it('rebuild derives index from source objects (scoped by club)', () => {
    const entries = im.rebuild('club-1', [
      obj({ memoryId: 'a' }),
      obj({ memoryId: 'b', clubId: 'club-2' }),
    ]);
    expect(entries.map((e) => e.memoryId)).toEqual(['a']);
    expect(im.getIndex('club-1')).toHaveLength(1);
  });

  it('rebuild after delete reflects removal (derived view)', () => {
    im.rebuild('club-1', [obj({ memoryId: 'a' }), obj({ memoryId: 'b' })]);
    im.rebuild('club-1', [obj({ memoryId: 'a' })]); // b deleted from source
    expect(im.getIndex('club-1').map((e) => e.memoryId)).toEqual(['a']);
  });

  it('upsert (update-safe) and remove (delete-safe) incremental', () => {
    im.rebuild('club-1', [obj({ memoryId: 'a' })]);
    im.upsert(obj({ memoryId: 'b', content: 'thêm ghi chú' }));
    expect(im.getIndex('club-1')).toHaveLength(2);
    im.remove('club-1', 'a');
    expect(im.getIndex('club-1').map((e) => e.memoryId)).toEqual(['b']);
  });

  it('remove on a club with no index is a no-op', () => {
    expect(() => im.remove('club-none', 'x')).not.toThrow();
    expect(im.getIndex('club-none')).toEqual([]);
  });

  it('upsert when no existing index creates the index', () => {
    im.upsert(obj({ memoryId: 'a' }));
    expect(im.getIndex('club-1').map((e) => e.memoryId)).toEqual(['a']);
  });

  it('search by keyword', () => {
    im.rebuild('club-1', [
      obj({ memoryId: 'a', content: 'Sân ngoài trời' }),
      obj({ memoryId: 'b', content: 'Quy định khách mời' }),
    ]);
    const r = im.search('club-1', { text: 'khách' });
    expect(r.map((m) => m.memoryId)).toEqual(['b']);
  });

  it('search by tag (all must match) and by type', () => {
    im.rebuild('club-1', [
      obj({ memoryId: 'a', tags: ['court', 'evening'] }),
      obj({ memoryId: 'b', tags: ['court'], type: ClubMemoryType.RULE }),
    ]);
    expect(
      im
        .search('club-1', { tags: ['court', 'evening'] })
        .map((m) => m.memoryId),
    ).toEqual(['a']);
    expect(
      im.search('club-1', { type: ClubMemoryType.RULE }).map((m) => m.memoryId),
    ).toEqual(['b']);
  });

  it('deterministic ordering by score then recency; respects topK', () => {
    im.rebuild('club-1', [
      obj({
        memoryId: 'low',
        content: 'court',
        tags: [],
        updatedAt: new Date(1000),
      }),
      obj({
        memoryId: 'high',
        content: 'court court',
        tags: ['court'],
        updatedAt: new Date(2000),
      }),
    ]);
    const r = im.search('club-1', { text: 'court', tags: ['court'] });
    expect(r[0].memoryId).toBe('high');
    expect(im.search('club-1', { text: 'court', topK: 1 })).toHaveLength(1);
  });

  it('metadata retrieval: exact match (positive) + negative', () => {
    im.rebuild('club-1', [
      obj({ memoryId: 'a', metadata: { region: 'north' } }),
      obj({ memoryId: 'b', metadata: { region: 'south' } }),
    ]);
    expect(
      im
        .search('club-1', { metadata: { region: 'north' } })
        .map((m) => m.memoryId),
    ).toEqual(['a']);
    expect(im.search('club-1', { metadata: { region: 'zzz' } })).toHaveLength(
      0,
    );
  });

  it('metadata multi-key uses AND logic', () => {
    im.rebuild('club-1', [
      obj({ memoryId: 'a', metadata: { region: 'north', tier: 'gold' } }),
      obj({ memoryId: 'b', metadata: { region: 'north', tier: 'silver' } }),
    ]);
    expect(
      im
        .search('club-1', { metadata: { region: 'north', tier: 'gold' } })
        .map((m) => m.memoryId),
    ).toEqual(['a']);
    // multi-key thiếu 1 khớp → loại
    expect(
      im.search('club-1', { metadata: { region: 'north', tier: 'bronze' } }),
    ).toHaveLength(0);
  });

  it('metadata supports number/boolean exact match', () => {
    im.rebuild('club-1', [
      obj({ memoryId: 'a', metadata: { priority: 1, active: true } }),
      obj({ memoryId: 'b', metadata: { priority: 2, active: false } }),
    ]);
    expect(
      im.search('club-1', { metadata: { priority: 1 } }).map((m) => m.memoryId),
    ).toEqual(['a']);
    expect(
      im
        .search('club-1', { metadata: { active: false } })
        .map((m) => m.memoryId),
    ).toEqual(['b']);
  });

  it('tie-break is 100% deterministic (score → updatedAt → memoryId)', () => {
    const ts = new Date(5000);
    im.rebuild('club-1', [
      obj({ memoryId: 'mB', content: 'court', updatedAt: ts }),
      obj({ memoryId: 'mA', content: 'court', updatedAt: ts }),
    ]);
    // cùng score + cùng updatedAt → sắp theo memoryId tăng dần
    expect(
      im.search('club-1', { text: 'court' }).map((m) => m.memoryId),
    ).toEqual(['mA', 'mB']);
  });

  it('text with no keyword match returns nothing', () => {
    im.rebuild('club-1', [obj({ memoryId: 'a', content: 'sân' })]);
    expect(im.search('club-1', { text: 'zzz' })).toHaveLength(0);
  });
});
