import { buildReceiptsPdf } from './receipt-pdf';

describe('buildReceiptsPdf', () => {
  const meta = { clubName: 'The Ping', periodName: 'Quý 4', startDate: new Date('2026-10-03'), endDate: new Date('2026-12-26'), generatedAt: new Date() };
  const row = { memberName: 'Nguyễn Văn Ánh', attendedSessions: 8, totalSessions: 10, courtCost: 400000, livingCost: 100000, totalCost: 500000, amountPaid: 300000, balance: -200000, needToPay: 200000 };

  it('tạo PDF hợp lệ, mỗi thành viên 1 trang', () => {
    const buf = buildReceiptsPdf(meta, [row, { ...row, memberName: 'B', needToPay: 0, balance: 5000 }]);
    expect(buf).not.toBeNull();
    expect(buf!.subarray(0, 5).toString()).toBe('%PDF-');
    expect((buf!.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(2);
  });

  it('không có dòng → null', () => {
    expect(buildReceiptsPdf(meta, [])).toBeNull();
  });
});
