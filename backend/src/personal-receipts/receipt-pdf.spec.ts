import { buildReceiptPdf, buildReceiptsPdf } from './receipt-pdf';
import { generate, OUT } from '../../scripts/sync-pdf-core.cjs';
import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { join } from 'path';

const meta = {
  clubName: 'The Ping', periodName: 'ThePing_Quý 4', startDate: '03/10/2026', endDate: '26/12/2026',
  contributionAmount: 1000000, totalCourtFee: 4365000, totalOtherFee: 100000, memberCountForSplit: 11, generatedAt: new Date(),
};
const row = {
  memberName: 'Mrs Hằng', loginName: 'mrshang2', attendedSessions: 1, totalSessions: 1, courtCost: 396818, livingCost: 14286,
  totalCost: 411104, amountPaid: 1000000, balance: 588896, needToPay: 0, paymentDate: '26/09/2026', isConfirmed: true,
};

describe('phiếu thu PDF theo mẫu app', () => {
  it('1 phiếu: PDF hợp lệ', () => {
    const buf = buildReceiptPdf(meta, row);
    expect(buf).not.toBeNull();
    expect(buf!.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('gộp 2 phiếu → 2 trang', async () => {
    const buf = await buildReceiptsPdf(meta, [row, { ...row, memberName: 'B' }]);
    expect((await PDFDocument.load(buf!)).getPageCount()).toBe(2);
  });

  it('không có dòng → null', async () => {
    expect(await buildReceiptsPdf(meta, [])).toBeNull();
  });

  it('bản CJS pdf-core còn khớp nguồn frontend (chạy npm run sync:pdf-core nếu lỗi)', () => {
    for (const [file, code] of Object.entries(generate())) {
      expect(readFileSync(join(OUT, file), 'utf8')).toBe(code);
    }
  });
});
