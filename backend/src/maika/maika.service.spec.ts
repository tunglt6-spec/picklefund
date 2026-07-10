import { MaikaService } from './maika.service';
import type { ClubSnapshot } from './maika.types';

/**
 * Regression: cảnh báo tài chính của Maika phải KHỚP Dashboard.
 * Bug cũ: "Quỹ âm" = commonBalance + miniBalance (gộp nhầm Quỹ Phụ) → lệch báo cáo.
 * Fix: Quỹ Chính (commonBalance) và Quỹ Phụ (miniBalance) là 2 cảnh báo ĐỘC LẬP,
 * số liệu lấy từ Finance Engine (khớp KPI "Số dư Quỹ Chính" / "Quỹ Phụ").
 */
describe('MaikaService — anomaly tài chính (Quỹ Chính vs Quỹ Phụ)', () => {
  // computeAnomaliesFromSnap là hàm thuần, không đụng dependency → instantiate rỗng.
  const service = new MaikaService(
    null as never,
    { get: () => undefined } as never,
    null as never,
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
  ) => (service as unknown as {
    computeAnomaliesFromSnap: (s: typeof snap) => {
      type: string;
      description: string;
      severity: string;
    }[];
  }).computeAnomaliesFromSnap(snap);

  const base = {
    commonBalance: 0,
    miniBalance: 0,
    activeMembers: 5,
    unpaidCount: 0,
    commonIncome: 1_000_000,
    commonExpense: 0,
    totalMembers: 5,
  };

  it('Quỹ Chính âm → cảnh báo fund_negative theo ĐÚNG commonBalance (không cộng Quỹ Phụ)', () => {
    const anomalies = compute({
      ...base,
      commonBalance: -1_994_000,
      miniBalance: 500_000, // Quỹ Phụ dương KHÔNG được bù trừ vào Quỹ Chính
    });
    const fund = anomalies.find((a) => a.type === 'fund_negative');
    expect(fund).toBeDefined();
    expect(fund?.severity).toBe('HIGH');
    expect(fund?.description).toContain('Quỹ Chính âm');
    expect(fund?.description).toContain('-1.994.000');
    // Quỹ Phụ dương → KHÔNG có cảnh báo mini
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')).toBeUndefined();
  });

  it('Quỹ Chính dương + Quỹ Phụ âm → CHỈ cảnh báo mini_fund_negative (không báo Quỹ Chính âm)', () => {
    const anomalies = compute({
      ...base,
      commonBalance: 800_000,
      miniBalance: -200_000,
    });
    expect(anomalies.find((a) => a.type === 'fund_negative')).toBeUndefined();
    const mini = anomalies.find((a) => a.type === 'mini_fund_negative');
    expect(mini).toBeDefined();
    expect(mini?.severity).toBe('MEDIUM');
    expect(mini?.description).toContain('Quỹ Phụ âm');
  });

  it('Cả hai âm → hai cảnh báo riêng biệt, không bị cộng gộp', () => {
    const anomalies = compute({
      ...base,
      commonBalance: -1_000_000,
      miniBalance: -300_000,
    });
    expect(anomalies.find((a) => a.type === 'fund_negative')?.description).toContain('-1.000.000');
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')?.description).toContain('-300.000');
  });

  it('Cả hai dương → không có cảnh báo quỹ âm', () => {
    const anomalies = compute({ ...base, commonBalance: 500_000, miniBalance: 100_000 });
    expect(anomalies.find((a) => a.type === 'fund_negative')).toBeUndefined();
    expect(anomalies.find((a) => a.type === 'mini_fund_negative')).toBeUndefined();
  });
});
