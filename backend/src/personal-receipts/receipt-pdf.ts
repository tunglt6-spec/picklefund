import { existsSync } from 'fs';
import { join } from 'path';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { loadFontsBase64 } from '../executive-report/export-fonts';

/** Dữ liệu 1 phiếu — cùng shape ReceiptData của frontend (exportReceiptPDF) để dùng ĐÚNG mẫu phiếu của app. */
export interface ReceiptPdfRow {
  memberName: string;
  loginName?: string;
  attendedSessions: number;
  totalSessions: number;
  courtCost: number;
  livingCost: number;
  totalCost: number;
  amountPaid: number;
  balance: number;
  needToPay: number;
  paymentDate?: string;
  isConfirmed: boolean;
}

export interface ReceiptPdfMeta {
  clubName: string;
  periodName: string;
  /** dd/mm/yyyy */
  startDate: string;
  endDate: string;
  contributionAmount: number;
  totalCourtFee?: number;
  totalOtherFee?: number;
  memberCountForSplit?: number;
  generatedAt: Date;
}

type CoreModule = { buildPersonalReceiptPDF: (a: unknown) => { output: (t: 'arraybuffer') => ArrayBuffer } };
let core: CoreModule | null = null;

/** Lõi PDF vector của app (bản CJS sinh từ frontend/src/lib bằng `npm run sync:pdf-core`). */
function loadCore(): CoreModule | null {
  if (core) return core;
  const dirs = [
    join(__dirname, '..', 'assets', 'pdf-core'), // dist/assets/pdf-core (prod) | src/assets/pdf-core (jest)
    join(process.cwd(), 'dist', 'assets', 'pdf-core'),
    join(process.cwd(), 'src', 'assets', 'pdf-core'),
  ];
  for (const d of dirs) {
    const f = join(d, 'pdf-report-core.js');
    if (existsSync(f)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      core = require(f) as CoreModule;
      return core;
    }
  }
  return null;
}

/** "dd/MM/yyyy" và "HH:mm:ss dd/MM/yyyy" theo giờ Việt Nam. */
function vnParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('day')}/${g('month')}/${g('year')}`, full: `${hh}:${g('minute')}:${g('second')} ${g('day')}/${g('month')}/${g('year')}` };
}

/** 1 phiếu thu cá nhân theo ĐÚNG mẫu PDF của app (masthead + hero số tiền + chi tiết + chữ ký). */
export function buildReceiptPdf(meta: ReceiptPdfMeta, r: ReceiptPdfRow): Buffer | null {
  const fonts = loadFontsBase64();
  const c = loadCore();
  if (!fonts || !c) return null;
  const now = vnParts(meta.generatedAt);
  const doc = c.buildPersonalReceiptPDF({
    jsPDF,
    fonts,
    branding: { name: meta.clubName, footer: meta.clubName, logo: null, primaryColor: undefined },
    receipt: {
      memberName: r.memberName,
      loginName: r.loginName,
      periodName: meta.periodName,
      periodStartDate: meta.startDate,
      periodEndDate: meta.endDate,
      contributionAmount: meta.contributionAmount,
      clubName: meta.clubName,
      amountPaid: r.amountPaid,
      paymentDate: r.paymentDate ?? '',
      attendedSessions: r.attendedSessions,
      totalSessions: r.totalSessions,
      totalCourtFee: meta.totalCourtFee,
      memberCountForSplit: meta.memberCountForSplit,
      courtCost: r.courtCost,
      totalOtherFee: meta.totalOtherFee,
      livingCost: r.livingCost,
      totalCost: r.totalCost,
      balance: r.balance,
      isConfirmed: r.isConfirmed,
      printedDateText: now.date,
      printedAtText: now.full,
    },
  });
  return Buffer.from(doc.output('arraybuffer'));
}

/** Gộp nhiều phiếu (mỗi thành viên 1 trang theo mẫu app) thành 1 file PDF. */
export async function buildReceiptsPdf(meta: ReceiptPdfMeta, rows: ReceiptPdfRow[]): Promise<Buffer | null> {
  if (rows.length === 0) return null;
  const singles = rows.map((r) => buildReceiptPdf(meta, r));
  if (singles.some((b) => !b)) return null;
  if (singles.length === 1) return singles[0];
  const out = await PDFDocument.create();
  for (const buf of singles as Buffer[]) {
    const src = await PDFDocument.load(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return Buffer.from(await out.save());
}
