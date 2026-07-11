import { MaikaService } from './maika.service';
import type { ClubSnapshot } from './maika.types';

/**
 * Regression: cảnh báo tài chính của Maika phải KHỚP Dashboard.
 * Bug cũ: "Quỹ âm" = commonBalance + miniBalance (gộp nhầm Quỹ Phụ) → lệch báo cáo.
 * Fix: Quỹ Chính (commonBalance) và Quỹ Phụ (miniBalance) là 2 cảnh báo ĐỘC LẬP;
 * totalAssets = Quỹ Chính (KHÔNG cộng Quỹ Phụ).
 */
describe('MaikaService — anomaly tài chính (Quỹ Chính vs Quỹ Phụ)', () => {
  // computeAnomaliesFromSnap là hàm thuần, không đụng dependency → instantiate rỗng.
  const service = new MaikaService(
    null as never,
    { get: () => undefined } as never,
    null as never,
  );
  const compute = (
    snap: Pick<
      ClubSnapshot,
      | 'commonBalance'
      | 'miniBalance'
      | 'activeMembers'
      | 'unpaidCount'
      | 'commonIncome'
      | 'commonExpense'
      | 'totalMembers'
    >,
  ) =>
    (
      service as unknown as {
        computeAnomaliesFromSnap: (s: typeof snap) => {
          type: string;
          description: string;
          severity: string;
        }[];
      }
    ).computeAnomaliesFromSnap(snap);

  const base = {
    commonBalance: 0,
    miniBalance: 0,
    activeMembers: 5,
    unpaidCount: 0,
    commonIncome: 1_000_000,
    commonExpense: 0,
    totalMembers: 5,
  };

  it('Quỹ Chính âm → fund_negative theo ĐÚNG commonBalance (không cộng Quỹ Phụ)', () => {
    const anomalies = compute({
      ...base,
      commonBalance: -1_994_000,
      miniBalance: 500_000, // Quỹ Phụ dương KHÔNG bù trừ vào Quỹ Chính
    });
    const fund = anomalies.find((a) => a.type === 'fund_negative');
    expect(fund).toBeDefined();
    expect(fund?.severity).toBe('HIGH');
    expect(fund?.description).toContain('Quỹ Chính âm');
    expect(fund?.description).toContain('-1.994.000');
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')).toBeUndefined();
  });

  it('Quỹ Chính dương + Quỹ Phụ âm → CHỈ cảnh báo mini_fund_negative', () => {
    const anomalies = compute({ ...base, commonBalance: 800_000, miniBalance: -200_000 });
    expect(anomalies.find((a) => a.type === 'fund_negative')).toBeUndefined();
    const mini = anomalies.find((a) => a.type === 'mini_fund_negative');
    expect(mini).toBeDefined();
    expect(mini?.severity).toBe('MEDIUM');
    expect(mini?.description).toContain('Quỹ Phụ âm');
  });

  it('Cả hai âm → hai cảnh báo riêng biệt, không cộng gộp', () => {
    const anomalies = compute({ ...base, commonBalance: -1_000_000, miniBalance: -300_000 });
    expect(anomalies.find((a) => a.type === 'fund_negative')?.description).toContain('-1.000.000');
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')?.description).toContain('-300.000');
  });

  it('Cả hai dương → không cảnh báo quỹ âm', () => {
    const anomalies = compute({ ...base, commonBalance: 500_000, miniBalance: 100_000 });
    expect(anomalies.find((a) => a.type === 'fund_negative')).toBeUndefined();
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')).toBeUndefined();
  });
});

/**
 * getClubSnapshot: số dư quỹ phải theo KỲ ĐANG MỞ (khớp KPI Dashboard "Số dư Quỹ Chính"
 * / "Quỹ Phụ" — đều là số kỳ hiện tại), KHÔNG luỹ kế all-time và KHÔNG gộp Quỹ Phụ.
 */
describe('MaikaService.getClubSnapshot — scope theo kỳ đang mở', () => {
  const ACTIVE = 'P-ACTIVE';
  const PREV = 'P-PREV';

  const prisma = {
    club: { findUnique: async () => ({ name: 'THE PING' }) },
    member: {
      findMany: async () => [
        { id: 'm1', status: 'active' },
        { id: 'm2', status: 'active' },
      ],
    },
    fundContribution: {
      findMany: async (args: {
        select?: { memberId?: boolean };
      }) => {
        // Lần gọi đếm người đã đóng (select memberId) — trả 1 người đã đóng.
        if (args?.select?.memberId) return [{ memberId: 'm1' }];
        // Lần gọi snapshot: gồm cả kỳ trước (COMMON 1.000.000 — PHẢI bị loại) + kỳ hiện tại.
        return [
          { amount: 100_000, fundSource: 'COMMON', fundPeriodId: ACTIVE },
          { amount: 1_000_000, fundSource: 'COMMON', fundPeriodId: PREV },
          { amount: 50_000, fundSource: 'MINI', fundPeriodId: ACTIVE },
        ];
      },
    },
    livingExpense: {
      findMany: async () => [
        { amount: 300_000, fundSource: 'COMMON', fundPeriodId: ACTIVE },
        { amount: 20_000, fundSource: 'COMMON', fundPeriodId: PREV }, // kỳ trước — loại
        { amount: 80_000, fundSource: 'MINI', fundPeriodId: ACTIVE },
      ],
    },
    attendanceSession: { findMany: async () => [{ fundPeriodId: ACTIVE }] },
    fundPeriod: {
      findFirst: async () => ({ id: ACTIVE, name: 'Kỳ Quý 3' }),
    },
  };

  const service = new MaikaService(
    prisma as never,
    { get: () => undefined } as never,
    null as never,
  );

  it('commonBalance/miniBalance chỉ tính kỳ đang mở, không gộp nhau', async () => {
    const snap = await service.getClubSnapshot('club-1');
    // Quỹ Chính kỳ hiện tại = 100.000 - 300.000 = -200.000 (KHÔNG gồm 1.000.000 kỳ trước)
    expect(snap.commonBalance).toBe(-200_000);
    // Quỹ Phụ kỳ hiện tại = 50.000 - 80.000 = -30.000 (độc lập)
    expect(snap.miniBalance).toBe(-30_000);
    // Tổng tài sản (Maika) = Quỹ Chính, KHÔNG cộng Quỹ Phụ
    expect(snap.totalAssets).toBe(-200_000);
    // Hai cảnh báo độc lập
    expect(
      snap.recentAnomalies.find((a) => a.type === 'fund_negative')?.description,
    ).toContain('-200.000');
    expect(
      snap.recentAnomalies.find((a) => a.type === 'mini_fund_negative')
        ?.description,
    ).toContain('-30.000');
  });
});
