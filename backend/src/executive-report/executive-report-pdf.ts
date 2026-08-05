import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Sinh PDF Báo cáo điều hành ĐẦY ĐỦ ở phía SERVER (để đính kèm email cron/gửi-thử).
 * Dùng jsPDF + jspdf-autotable + font BeVietnamPro (tiếng Việt có dấu). Trả Buffer.
 *
 * Font .ttf được nest-cli copy từ src/assets/fonts → dist/assets/fonts (nest-cli.json assets).
 * Thử nhiều đường dẫn để chạy được cả prod (dist) lẫn test/dev (src, ts-jest).
 */

const PRIMARY: [number, number, number] = [109, 93, 251]; // #6D5DFB
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [136, 136, 136];

let cachedFonts: { regular: string; bold: string } | null = null;

function loadFonts(): { regular: string; bold: string } | null {
  if (cachedFonts) return cachedFonts;
  const dirs = [
    join(__dirname, '..', 'assets', 'fonts'), // dist/assets/fonts (prod)
    join(__dirname, 'assets', 'fonts'),
    join(process.cwd(), 'dist', 'assets', 'fonts'),
    join(process.cwd(), 'src', 'assets', 'fonts'), // dev / ts-jest
  ];
  for (const d of dirs) {
    const reg = join(d, 'BeVietnamPro-Regular.ttf');
    const bold = join(d, 'BeVietnamPro-Bold.ttf');
    if (existsSync(reg) && existsSync(bold)) {
      cachedFonts = {
        regular: readFileSync(reg).toString('base64'),
        bold: readFileSync(bold).toString('base64'),
      };
      return cachedFonts;
    }
  }
  return null; // không tìm thấy font → caller bỏ qua đính kèm (không chặn gửi email)
}

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';

function healthColor(v: number): [number, number, number] {
  if (v >= 80) return [5, 150, 105];
  if (v >= 65) return [14, 165, 233];
  if (v >= 50) return [245, 158, 11];
  return [225, 29, 72];
}

/** report = kết quả ExecutiveReportService.generate; aiText = tóm tắt AI. Trả Buffer PDF hoặc null. */
export function buildExecutiveReportPdf(
  report: any,
  aiText: string,
): Buffer | null {
  const fonts = loadFonts();
  if (!fonts) return null;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('BVP-Regular.ttf', fonts.regular);
  doc.addFileToVFS('BVP-Bold.ttf', fonts.bold);
  doc.addFont('BVP-Regular.ttf', 'BVP', 'normal');
  doc.addFont('BVP-Bold.ttf', 'BVP', 'bold');
  doc.setFont('BVP', 'normal');

  const pageW = 210;
  const M = 14; // lề
  const contentW = pageW - M * 2;
  const s = report.summary;
  const fin = report.finance;

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('BVP', 'normal');
  doc.setFontSize(10);
  doc.text('Báo cáo điều hành hằng tháng', M, 12);
  doc.setFont('BVP', 'bold');
  doc.setFontSize(18);
  doc.text(String(report.meta.clubName || 'CLB'), M, 22);
  doc.setFont('BVP', 'normal');
  doc.setFontSize(11);
  doc.text(String(report.meta.periodName || ''), M, 29);

  // ── Điểm sức khỏe (vòng tròn) ───────────────────────────────────────
  const cx = pageW - M - 16;
  const cy = 17;
  const hc = healthColor(s.clubHealthScore);
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 12, 'F');
  doc.setTextColor(...hc);
  doc.setFont('BVP', 'bold');
  doc.setFontSize(18);
  doc.text(String(s.clubHealthScore), cx, cy + 2, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('/100', cx, cy + 7, { align: 'center' });

  let y = 44;

  // ── KPI grid (autotable) ────────────────────────────────────────────
  const kpiRows = [
    [
      `Thành viên\n${s.activeMembers}/${s.totalMembers}`,
      `Tham gia\n${s.participationRate}%`,
      `Buổi chơi\n${s.completedSessions}`,
    ],
    [
      `Tổng thu\n${money(fin.totalIncome)}`,
      `Tổng chi\n${money(fin.totalExpense)}`,
      `Tổng tài sản\n${money(fin.clubAssets)}`,
    ],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: kpiRows,
    theme: 'grid',
    styles: { font: 'BVP', fontStyle: 'normal', fontSize: 10, cellPadding: 3, textColor: INK },
    columnStyles: { 0: { cellWidth: contentW / 3 }, 1: { cellWidth: contentW / 3 }, 2: { cellWidth: contentW / 3 } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Tóm tắt điều hành (AI) ──────────────────────────────────────────
  doc.setFont('BVP', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text('Tóm tắt điều hành (AI)', M, y);
  y += 5;
  doc.setFont('BVP', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(String(aiText || '').trim(), contentW);
  doc.text(lines, M, y);
  y += lines.length * 4.6 + 4;

  // ── Tài chính ───────────────────────────────────────────────────────
  const cmp = fin.compare;
  const dp = (v: number | null | undefined) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${v}%`;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Tài chính', 'Giá trị', 'So kỳ trước']],
    body: [
      ['Tổng thu', money(fin.totalIncome), dp(cmp?.incomeDeltaPct)],
      ['Tổng chi', money(fin.totalExpense), dp(cmp?.expenseDeltaPct)],
      ['Cân đối kỳ', money(fin.balance), dp(cmp?.balanceDeltaPct)],
      ['Quỹ đầu kỳ', money(fin.carryForward), ''],
      ['Tổng tài sản (cuối kỳ)', money(fin.clubAssets), ''],
      ['Thu bình quân / TV', money(fin.avgIncomePerMember), ''],
    ],
    theme: 'striped',
    styles: { font: 'BVP', fontSize: 9, cellPadding: 2, textColor: INK },
    headStyles: { font: 'BVP', fontStyle: 'bold', fillColor: PRIMARY, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Top 10 thành viên ───────────────────────────────────────────────
  doc.setFont('BVP', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Bảng xếp hạng thành viên (TB ${report.members.avgHealth}/100)`, M, y);
  y += 2;
  autoTable(doc, {
    startY: y + 1,
    margin: { left: M, right: M },
    head: [['#', 'Thành viên', 'Tham gia', 'Đóng quỹ', 'Hạnh kiểm', 'Sức khỏe']],
    body: (report.members.all || []).map((m: any, i: number) => [
      i + 1,
      m.name,
      `${m.participationRate}%`,
      m.paymentStatus === 'paid' ? 'Đã đóng' : m.paymentStatus === 'debt' ? 'Nợ' : '—',
      m.conductScore ?? '—',
      m.healthScore,
    ]),
    theme: 'striped',
    styles: { font: 'BVP', fontSize: 8.5, cellPadding: 1.6, textColor: INK },
    headStyles: { font: 'BVP', fontStyle: 'bold', fillColor: PRIMARY, textColor: [255, 255, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Hoạt động + Thi đấu + AI (bảng gộp) ─────────────────────────────
  const act = report.activity;
  const tour = report.tournament;
  const ai = report.ai;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Chỉ số vận hành', 'Giá trị']],
    body: [
      ['Buổi chơi (hoàn thành / hủy)', `${act.completed} / ${act.cancelled}`],
      ['TB người / buổi', String(act.avgPresentPerSession)],
      ['Giải · trận · đội', `${tour.tournamentsCount} · ${tour.matchesCount} · ${tour.teamsCount}`],
      ['AI: workflow (xong/tổng)', `${ai.hermes.completed}/${ai.hermes.runs}`],
      ['AI: tác vụ Mít Đặc · lỗi', `${ai.mitdac.executed} · ${ai.mitdac.failed}`],
      ['Thông báo đã gửi', `${ai.notification.sent} (email ${ai.notification.byChannel.EMAIL})`],
      ['Điểm tự động hóa AI', `${ai.automationScore.score}/100`],
      ['Dự báo tài sản +90 ngày', `${money(report.forecast.projected90)} (${report.forecast.trendLabel})`],
      ['Phong cách (Club DNA)', report.dna.archetype],
    ],
    theme: 'striped',
    styles: { font: 'BVP', fontSize: 9, cellPadding: 2, textColor: INK },
    headStyles: { font: 'BVP', fontStyle: 'bold', fillColor: PRIMARY, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Cảnh báo + Gợi ý ────────────────────────────────────────────────
  const block = (title: string, items: string[]) => {
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFont('BVP', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(title, M, y);
    y += 5;
    doc.setFont('BVP', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    if (items.length === 0) {
      doc.text('• (không có)', M, y);
      y += 5;
    } else {
      for (const it of items) {
        const wr = doc.splitTextToSize('• ' + it, contentW);
        doc.text(wr, M, y);
        y += wr.length * 4.4;
      }
      y += 2;
    }
  };
  block('Cảnh báo', (report.alerts || []).map((a: any) => a.message));
  block(
    'Gợi ý hành động',
    (report.recommendations || []).map((r: any) => `[${r.agent}] ${r.text}`),
  );

  // ── Footer mọi trang ────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('BVP', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      'PickleFund · AIDO Executive Report · mọi con số từ dữ liệu thật của CLB',
      M,
      291,
    );
    doc.text(`Trang ${p}/${pageCount}`, pageW - M, 291, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
