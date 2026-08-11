import { MinigameService } from './minigame.service';

/** Test THUẦN LOGIC buildDoubleElimPlan (không đụng DB) — chứng minh cấu trúc WB/LB/GF + routing. */
describe('double-elimination plan', () => {
  const svc = new MinigameService(null as never, null as never);
  const plan = (teams: string[]) => (svc as unknown as { buildDoubleElimPlan(t: string[]): any[] }).buildDoubleElimPlan(teams);

  it('4 đội → 6 trận (WB:3, LB:2, GF:1) + routing đúng', () => {
    const slots = plan(['t1', 't2', 't3', 't4']);
    expect(slots).toHaveLength(6);
    const wb = slots.filter((s) => s.bracket === 'WB');
    const lb = slots.filter((s) => s.bracket === 'LB');
    const gf = slots.filter((s) => s.bracket === 'GF');
    expect(wb).toHaveLength(3);
    expect(lb).toHaveLength(2);
    expect(gf).toHaveLength(1);

    const byId = Object.fromEntries(slots.map((s) => [s.id, s]));
    // WB vòng 1 có team seed sẵn (không nguồn), WB2 lấy 2 winner WB1.
    expect(byId['WB1_0'].a).toBeTruthy();
    expect(byId['WB2_0'].aFrom).toEqual({ slot: 'WB1_0', take: 'W' });
    expect(byId['WB2_0'].bFrom).toEqual({ slot: 'WB1_1', take: 'W' });
    // LB vòng 1 = 2 LOSER của WB vòng 1.
    expect(byId['LB1_0'].aFrom).toEqual({ slot: 'WB1_0', take: 'L' });
    expect(byId['LB1_0'].bFrom).toEqual({ slot: 'WB1_1', take: 'L' });
    // LB2 = winner LB1 vs LOSER WB2 (major).
    expect(byId['LB2_0'].aFrom).toEqual({ slot: 'LB1_0', take: 'W' });
    expect(byId['LB2_0'].bFrom).toEqual({ slot: 'WB2_0', take: 'L' });
    // GF = winner WB final vs winner LB final.
    expect(byId['GF'].aFrom).toEqual({ slot: 'WB2_0', take: 'W' });
    expect(byId['GF'].bFrom).toEqual({ slot: 'LB2_0', take: 'W' });
  });

  it('8 đội → 14 trận (WB:7, LB:6, GF:1)', () => {
    const slots = plan(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(slots).toHaveLength(14);
    expect(slots.filter((s) => s.bracket === 'WB')).toHaveLength(7);
    expect(slots.filter((s) => s.bracket === 'LB')).toHaveLength(6);
    expect(slots.filter((s) => s.bracket === 'GF')).toHaveLength(1);
    // Mọi slot không phải WB vòng 1 đều có ĐỦ 2 nguồn (aFrom + bFrom).
    for (const s of slots) {
      if (s.bracket === 'WB' && s.roundNo === 1) { expect(s.a && s.b).toBeTruthy(); }
      else { expect(s.aFrom && s.bFrom).toBeTruthy(); }
    }
    // GF nối từ WB final + LB final.
    const gf = slots.find((s) => s.id === 'GF')!;
    expect(gf.aFrom.take).toBe('W');
    expect(gf.bFrom.take).toBe('W');
  });
});

describe('splitIntoGroups (chia bảng entrant — dùng cho cả cặp lẫn người)', () => {
  const svc = new MinigameService(null as never, null as never);
  const split = (n: number, size: number) => {
    const keys = Array.from({ length: n }, (_, i) => `k${i}`);
    return (svc as unknown as { splitIntoGroups(k: string[], s: number): Array<{ memberKeys: string[] }> }).splitIntoGroups(keys, size);
  };

  it('8 entrant / bảng 4 → 2 bảng, mỗi bảng 4', () => {
    const g = split(8, 4);
    expect(g).toHaveLength(2);
    expect(g.map((x) => x.memberKeys.length)).toEqual([4, 4]);
  });
  it('6 entrant / bảng 4 → 2 bảng 4-2 (fill-first: đủ 4 mới sang bảng kế)', () => {
    const g = split(6, 4);
    expect(g).toHaveLength(2);
    expect(g.map((x) => x.memberKeys.length)).toEqual([4, 2]);
  });
  it('5 entrant / bảng 2 → 3 bảng 2-2-1 (dư dồn bảng đầu)', () => {
    const g = split(5, 2);
    expect(g).toHaveLength(3);
    expect(g.map((x) => x.memberKeys.length)).toEqual([2, 2, 1]);
  });
  it('không trùng entrant giữa các bảng', () => {
    const g = split(8, 4);
    const all = g.flatMap((x) => x.memberKeys);
    expect(new Set(all).size).toBe(8);
  });
});
