import { jsPDF } from 'jspdf';
import { loadFontsBase64 } from '../executive-report/export-fonts';

export interface ReceiptPdfRow {
  memberName: string;
  attendedSessions: number;
  totalSessions: number;
  courtCost: number;
  livingCost: number;
  totalCost: number;
  amountPaid: number;
  balance: number;
  needToPay: number;
}

export interface ReceiptPdfMeta {
  clubName: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const d = (x: Date) =>
  `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}`;

/** PDF phiếu thu cá nhân — mỗi thành viên 1 trang A4. Trả null nếu thiếu font hoặc không có dòng. */
export function buildReceiptsPdf(meta: ReceiptPdfMeta, rows: ReceiptPdfRow[]): Buffer | null {
  const fonts = loadFontsBase64();
  if (!fonts || rows.length === 0) return null;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('BVP-Regular.ttf', fonts.regular);
  doc.addFileToVFS('BVP-Bold.ttf', fonts.bold);
  doc.addFont('BVP-Regular.ttf', 'BVP', 'normal');
  doc.addFont('BVP-Bold.ttf', 'BVP', 'bold');

  const W = 210;
  const L = 20;
  const R = W - 20;
  const font = (size: number, bold = false, rgb: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('BVP', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...rgb);
  };

  rows.forEach((r, i) => {
    if (i > 0) doc.addPage();
    doc.setFillColor(109, 93, 251);
    doc.rect(0, 0, W, 34, 'F');
    font(11, false, [233, 230, 255]);
    doc.text(meta.clubName.toUpperCase(), L, 14);
    font(20, true, [255, 255, 255]);
    doc.text('PHIẾU THU CÁ NHÂN', L, 26);

    font(10, false, [100, 116, 139]);
    doc.text('Thành viên', L, 48);
    doc.text('Kỳ quỹ', L, 58);
    doc.text('Thời gian', L, 68);
    font(12, true);
    doc.text(r.memberName, L + 32, 48);
    doc.text(meta.periodName, L + 32, 58);
    font(11, false);
    doc.text(`${d(meta.startDate)} – ${d(meta.endDate)}`, L + 32, 68);

    const lines: [string, string][] = [
      ['Số buổi tham dự', `${r.attendedSessions}/${r.totalSessions} buổi`],
      ['Chi phí sân', vnd(r.courtCost)],
      ['Chi phí sinh hoạt', vnd(r.livingCost)],
      ['Tổng chi phí', vnd(r.totalCost)],
      ['Đã đóng', vnd(r.amountPaid)],
    ];
    let y = 86;
    lines.forEach(([k, v], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(246, 245, 255);
        doc.rect(L - 3, y - 6, R - L + 6, 11, 'F');
      }
      font(11, false);
      doc.text(k, L, y);
      font(11, true);
      doc.text(v, R, y, { align: 'right' });
      y += 11;
    });

    y += 6;
    const owes = r.needToPay > 0;
    if (owes) doc.setFillColor(254, 242, 242);
    else doc.setFillColor(236, 253, 245);
    doc.roundedRect(L - 3, y - 8, R - L + 6, 26, 4, 4, 'F');
    font(10, false, [100, 116, 139]);
    doc.text(owes ? 'CẦN ĐÓNG THÊM' : r.balance > 0 ? 'SỐ DƯ CÒN LẠI' : 'ĐÃ ĐỦ — KHÔNG PHẢI ĐÓNG THÊM', L + 2, y);
    font(20, true, owes ? [220, 38, 38] : [5, 150, 105]);
    doc.text(owes ? vnd(r.needToPay) : vnd(Math.max(r.balance, 0)), L + 2, y + 12);

    font(8.5, false, [148, 163, 184]);
    doc.text(
      `Phiếu chốt số liệu lúc ${meta.generatedAt.toLocaleString('vi-VN')} · Tạo tự động bởi PickleFund`,
      L,
      285,
    );
  });

  return Buffer.from(doc.output('arraybuffer'));
}
