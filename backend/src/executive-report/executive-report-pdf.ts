import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadFontsBase64 } from './export-fonts';
import {
  COLORS,
  CONTENT_W,
  PAGE,
  SPACE,
  TYPE,
  hexToRgb,
  makeBrand,
  vndCompact,
} from './export-tokens';
import { buildExecModel, deltaText, healthTone, toneOfValue, type NumTone } from './executive-report-model';

/**
 * Fallback jsPDF của Báo cáo điều hành (khi không có Chromium). CÙNG ngôn ngữ thiết kế SINH ĐỘNG với bản Chrome:
 * dùng chung token (export-tokens.ts) + view-model (executive-report-model.ts) → cùng bìa/masthead nền ĐẶC brandDeep,
 * thứ tự mục 01–12, số liệu xanh/đỏ/tím đậm, header bảng nền brand chữ trắng, chữ ≥ 7pt,
 * footer "CLB · Tên TL · Mã TL" | "Trang x / y". Font BeVietnamPro (tiếng Việt có dấu). Trả Buffer, hoặc null nếu không có font.
 */
export interface ExecPdfOpts {
  logoDataUri?: string | null;
  brandColor?: string | null;
  now?: Date;
}

const L = PAGE.left;
const R = PAGE.w - PAGE.right;
const LIMIT_Y = PAGE.h - PAGE.bottom; // vùng nội dung kết thúc (chừa footer)
const WHITE = '#FFFFFF';

export function buildExecutiveReportPdf(
  report: any,
  aiText: string,
  opts: ExecPdfOpts = {},
): Buffer | null {
  const fonts = loadFontsBase64();
  if (!fonts) return null;

  const B = makeBrand(opts.brandColor);
  const m = buildExecModel(report, aiText, opts.now ?? new Date(), B.brand);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('BVP-Regular.ttf', fonts.regular);
  doc.addFileToVFS('BVP-Bold.ttf', fonts.bold);
  doc.addFont('BVP-Regular.ttf', 'BVP', 'normal');
  doc.addFont('BVP-Bold.ttf', 'BVP', 'bold');

  // ── helper vẽ (đọc token, không hard-code màu/cỡ) ────────────────────
  const fill = (hex: string) => doc.setFillColor(...hexToRgb(hex));
  const stroke = (hex: string) => doc.setDrawColor(...hexToRgb(hex));
  const ink = (hex: string) => doc.setTextColor(...hexToRgb(hex));
  const font = (size: number, bold = false, color: string = COLORS.ink) => {
    doc.setFont('BVP', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    ink(color);
  };
  const rrect = (x: number, y: number, w: number, h: number, style: 'F' | 'S' | 'FD', r: number = PAGE.radius) =>
    doc.roundedRect(x, y, w, h, r, r, style);
  const hline = (x1: number, x2: number, y: number, hex: string = COLORS.hairline, w: number = PAGE.hair) => {
    stroke(hex);
    doc.setLineWidth(w);
    doc.line(x1, y, x2, y);
  };
  const dot = (cx: number, cy: number, r: number, hex: string) => {
    fill(hex);
    doc.circle(cx, cy, r, 'F');
  };
  const up = (s: string) => s.toUpperCase();

  /** Tông số liệu → bộ màu (nền nhạt / viền / vạch / số đậm). Số âm luôn đỏ. */
  const TN: Record<NumTone, { t: string; b: string; f: string; v: string }> = {
    pos: { t: COLORS.posTint, b: COLORS.posBorder, f: COLORS.posFill, v: COLORS.posVivid },
    neg: { t: COLORS.negTint, b: COLORS.negBorder, f: COLORS.negFill, v: COLORS.negVivid },
    warn: { t: COLORS.warnTint, b: COLORS.warnBorder, f: COLORS.orange, v: COLORS.orange },
    info: { t: COLORS.infoTint, b: COLORS.infoBorder, f: COLORS.infoFill, v: COLORS.infoFill },
    brand: { t: B.brandSoft, b: B.brandBorder, f: B.brand, v: B.brandInk },
    ink: { t: COLORS.surface2, b: COLORS.hairline, f: COLORS.lineStrong, v: COLORS.ink },
  };
  const tcol = (t: NumTone, v = '') => TN[toneOfValue(v, t)];

  let y = PAGE.top;
  const ensure = (h: number) => {
    if (y + h > LIMIT_Y) {
      doc.addPage();
      y = PAGE.top;
    }
  };

  /** Thẻ có vạch màu ở trên (bo góc nhẹ). `bg`/`bd` = nền + viền; `bar` = màu vạch trên. */
  const topBarCard = (x: number, yy: number, w: number, h: number, bg: string, bd: string, bar: string, barH = 0.9) => {
    fill(bg);
    stroke(bd);
    doc.setLineWidth(PAGE.border);
    rrect(x, yy, w, h, 'FD');
    fill(bar);
    doc.rect(x + 0.7, yy, w - 1.4, barH, 'F');
  };

  // ── logo / monogram (tròn trắng, nổi trên băng brand) ─────────────────
  const drawLogo = (x: number, yy: number, size: number) => {
    fill(WHITE);
    stroke(B.brandBorder);
    doc.setLineWidth(PAGE.hair);
    doc.circle(x + size / 2, yy + size / 2, size / 2 - 0.1, 'FD');
    const uri = opts.logoDataUri;
    const fmt = typeof uri === 'string' ? /^data:image\/(png|jpe?g);base64,/i.exec(uri) : null;
    if (uri && fmt) {
      try {
        const props = doc.getImageProperties(uri);
        const box = size * 0.66;
        const k = Math.min(box / props.width, box / props.height);
        const w = props.width * k;
        const h = props.height * k;
        doc.addImage(uri, fmt[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG', x + (size - w) / 2, yy + (size - h) / 2, w, h);
        return;
      } catch {
        /* rơi xuống monogram */
      }
    }
    font(size >= 14 ? TYPE.h1 : TYPE.h2, true, B.brandDeep);
    doc.text(m.mono, x + size / 2, yy + size / 2 + (size >= 14 ? 2.2 : 1.4), { align: 'center' });
  };

  // ── 1. BÌA: panel ĐẶC brandDeep (chữ trắng) / thẻ chỉ số / thông tin tài liệu ──
  const heroH = 150;
  fill(B.brandDeep);
  rrect(L, y, CONTENT_W, heroH, 'F');
  drawLogo(L + SPACE.s5, y + SPACE.s5, 18);
  font(TYPE.h2, true, WHITE);
  doc.text(m.brandLabel, L + SPACE.s5 + 18 + SPACE.s3, y + SPACE.s5 + 10.4);
  {
    const tag = 'EXECUTIVE REPORT';
    font(TYPE.label, true, WHITE);
    const tw = doc.getTextWidth(tag) + 8;
    stroke(B.badge);
    doc.setLineWidth(PAGE.border);
    rrect(R - SPACE.s5 - tw, y + SPACE.s5 + 5.2, tw, 5.6, 'S', 2.8);
    doc.text(tag, R - SPACE.s5 - tw / 2, y + SPACE.s5 + 9, { align: 'center' });
  }
  const ruleY = y + heroH - SPACE.s6 - 1;
  fill(B.badge);
  doc.rect(L + SPACE.s5, ruleY, SPACE.s6, 1, 'F');
  const periodY = ruleY - 8;
  font(TYPE.h2, false, WHITE);
  doc.text(`Kỳ báo cáo: ${m.periodName}`, L + SPACE.s5, periodY);
  font(TYPE.cover, true, WHITE);
  const titleLines: string[] = doc.splitTextToSize(m.clubName || m.brandLabel, CONTENT_W - SPACE.s5 * 2);
  const titleY = periodY - 12 - (titleLines.length - 1) * 11;
  doc.text(titleLines, L + SPACE.s5, titleY);
  font(TYPE.label, true, WHITE);
  doc.text(up('Báo cáo điều hành · Executive Report'), L + SPACE.s5, titleY - 16);
  // thẻ chỉ số nhấn
  {
    const sy = y + heroH + 26;
    const sw = (CONTENT_W - SPACE.s3 * 2) / 3;
    m.coverStats.forEach((c, i) => {
      const tc = tcol(c.tone, c.v);
      const cx = L + i * (sw + SPACE.s3);
      topBarCard(cx, sy, sw, 32, tc.t, tc.b, tc.f, 1.2);
      font(TYPE.label, true, COLORS.muted);
      doc.text(up(c.l), cx + SPACE.s3, sy + 9);
      let vs: number = TYPE.display;
      font(vs, true, tc.v);
      while (vs > TYPE.h2 && doc.getTextWidth(c.v) > sw - SPACE.s3 * 2) {
        vs -= 0.5;
        doc.setFontSize(vs);
      }
      doc.text(c.v, cx + SPACE.s3, sy + 19);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(c.s, cx + SPACE.s3, sy + 26);
    });
  }
  // thông tin tài liệu (khối có chủ đích, không lặp footer)
  const docY = PAGE.top + 259 - 26;
  hline(L, R, docY, B.brandDeep, PAGE.strong);
  font(TYPE.label, true, B.brandInk);
  doc.text(up('Thông tin tài liệu'), L, docY + 5);
  const dcx = [L, L + CONTENT_W * 0.37, L + CONTENT_W * 0.62];
  [
    ['Mã tài liệu', m.code],
    ['Ngày xuất', m.exportedAt],
    ['Phân loại', 'Tài liệu nội bộ · Ban quản trị CLB'],
  ].forEach(([l, v], i) => {
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(l), dcx[i], docY + 11);
    font(TYPE.table, false, COLORS.ink);
    doc.text(v, dcx[i], docY + 16);
  });

  // ── 2. MASTHEAD trang 2: băng ĐẶC brandDeep + gauge trong ô trắng ─────
  doc.addPage();
  y = PAGE.top;
  const mastH = 26;
  fill(B.brandDeep);
  rrect(L, y, CONTENT_W, mastH, 'F');
  drawLogo(L + SPACE.s3, y + 7, 12);
  const mtx = L + SPACE.s3 + 12 + SPACE.s3;
  font(TYPE.label, true, WHITE);
  doc.text(m.brandLabel, mtx, y + 8.6);
  font(TYPE.h1, true, WHITE);
  doc.text('Báo cáo điều hành', mtx, y + 14.6);
  font(TYPE.body, false, WHITE);
  doc.text(`Kỳ: ${m.periodName} · Xuất lúc ${m.exportedAt}`, mtx, y + 19.8);
  // gauge: ô trắng + track hairline + cung màu theo mức điểm
  {
    const tone = m.tone;
    const chipW = 54;
    const chipH = 21;
    const chipX = R - SPACE.s3 + 1 - chipW;
    const chipY = y + (mastH - chipH) / 2;
    fill(WHITE);
    rrect(chipX, chipY, chipW, chipH, 'F');
    const gcx = chipX + 13;
    const gcy = chipY + chipH / 2;
    const gr = 7.6;
    stroke(COLORS.hairline);
    doc.setLineWidth(2);
    doc.circle(gcx, gcy, gr, 'S');
    const frac = Math.max(0, Math.min(100, m.health)) / 100;
    if (frac > 0) {
      stroke(tone.fill);
      doc.setLineCap('round');
      const steps = Math.max(2, Math.round(60 * frac));
      let prev: [number, number] | null = null;
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI / 2 + 2 * Math.PI * frac * (i / steps);
        const pt: [number, number] = [gcx + gr * Math.cos(a), gcy + gr * Math.sin(a)];
        if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
        prev = pt;
      }
      doc.setLineCap('butt');
    }
    font(TYPE.h1, true, tone.text);
    doc.text(String(m.health), gcx, gcy + 0.9, { align: 'center' });
    font(TYPE.caption, false, COLORS.muted);
    doc.text('/ 100', gcx, gcy + 4.4, { align: 'center' });
    font(TYPE.table, true, tone.text);
    doc.text(up(m.grade), gcx + gr + 5, gcy + 1.1, { align: 'left' });
  }
  y += mastH + SPACE.s3;

  // ── helper khối ────────────────────────────────────────────────────
  /** Tiêu đề khối: vạch brand trái + nhãn xám + tiêu đề HOA đậm brandInk. */
  const headBlock = (x: number, yy: number, num: string, eyebrow: string, title: string) => {
    fill(B.brand);
    doc.rect(x, yy, 1.2, 9, 'F');
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(`${num} · ${eyebrow}`), x + 3.5, yy + 2.6);
    font(TYPE.h2, true, B.brandInk);
    doc.text(up(title), x + 3.5, yy + 7.6);
  };
  const sectionHead = (num: string, eyebrow: string, title: string, note = '') => {
    headBlock(L, y, num, eyebrow, title);
    if (note) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(note, R, y + 7.6, { align: 'right' });
    }
    y += 10.5;
    hline(L, R, y, B.brandBorder, PAGE.border);
    y += SPACE.s2;
  };
  const subHead = (x: number, yy: number, num: string, eyebrow: string, title: string, dry: boolean) => {
    if (!dry) headBlock(x, yy, num, eyebrow, title);
    return 12;
  };
  /** Thanh chiều sức khỏe trong thẻ nhạt; trả chiều cao + khe. */
  const DIM_H = 8.6;
  const DIM_STEP = 9.8;
  const bar = (x: number, yy: number, w: number, score: number | null, label: string) => {
    const t = score == null ? null : healthTone(score);
    fill(COLORS.surface2);
    stroke(COLORS.hairline);
    doc.setLineWidth(PAGE.hair);
    rrect(x, yy, w, DIM_H, 'FD');
    font(TYPE.table, true, COLORS.ink2);
    doc.text(label, x + 2.5, yy + 3.8);
    font(TYPE.body, true, t ? t.vivid : COLORS.muted);
    doc.text(score == null ? '—' : String(score), x + w - 2.5, yy + 3.8, { align: 'right' });
    fill(COLORS.hairline);
    rrect(x + 2.5, yy + 5.3, w - 5, 2.2, 'F', 1.1);
    if (t && score! > 0) {
      fill(t.fill);
      rrect(x + 2.5, yy + 5.3, Math.max(2.2, ((w - 5) * Math.min(100, score!)) / 100), 2.2, 'F', 1.1);
    }
    return DIM_STEP;
  };
  const KPI_H = 19;
  const kpiCard = (x: number, yy: number, w: number, k: { l: string; v: string; s?: string; accent?: boolean; tone: NumTone }) => {
    const tc = tcol(k.tone, k.v);
    if (k.accent) topBarCard(x, yy, w, KPI_H, B.brandSoft, B.brandBorder, tc.f);
    else topBarCard(x, yy, w, KPI_H, WHITE, COLORS.hairline, tc.f);
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(k.l), x + 2.8, yy + 6);
    let size: number = TYPE.kpi;
    font(size, true, tc.v);
    while (size > 10 && doc.getTextWidth(k.v) > w - 5) {
      size -= 0.5;
      doc.setFontSize(size);
    }
    doc.text(k.v, x + 2.8, yy + 12.4);
    if (k.s) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(k.s, x + 2.8, yy + 16.4);
    }
  };
  const TILE_H = 14;
  const tileCard = (x: number, yy: number, w: number, t: { l: string; v: string; tone: NumTone }) => {
    const tc = tcol(t.tone, t.v);
    topBarCard(x, yy, w, TILE_H, WHITE, COLORS.hairline, tc.f);
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(t.l), x + 2.5, yy + 5.6);
    let size: number = TYPE.h2;
    font(size, true, tc.v);
    while (size > TYPE.label && doc.getTextWidth(t.v) > w - 4) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    doc.text(t.v, x + 2.5, yy + 11.2);
  };

  // 01 sức khỏe
  ensure(10.5 + SPACE.s2 + Math.ceil(m.dims.length / 3) * DIM_STEP + SPACE.s3);
  sectionHead('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ');
  {
    const w = (CONTENT_W - SPACE.s3 * 2) / 3;
    m.dims.forEach((d, i) => bar(L + (i % 3) * (w + SPACE.s3), y + Math.floor(i / 3) * DIM_STEP, w, d.score, d.label));
    y += Math.max(1, Math.ceil(m.dims.length / 3)) * DIM_STEP + SPACE.s3 - 1;
  }

  // 02 KPI
  ensure(10.5 + SPACE.s2 + (KPI_H + SPACE.s2) * 2 + SPACE.s3);
  sectionHead('02', 'Tổng quan điều hành', 'Các chỉ số chính');
  {
    const w = (CONTENT_W - SPACE.s2 * 3) / 4;
    m.kpis.forEach((k, i) => kpiCard(L + (i % 4) * (w + SPACE.s2), y + Math.floor(i / 4) * (KPI_H + SPACE.s2), w, k));
    y += Math.ceil(m.kpis.length / 4) * (KPI_H + SPACE.s2) + SPACE.s1;
  }

  // AI summary: nền brandSoft + viền brandBorder + vạch brand trái
  {
    font(TYPE.body, false, COLORS.ink);
    const lines: string[] = doc.splitTextToSize(m.aiText, CONTENT_W - SPACE.s3 * 2 - 2);
    const h = SPACE.s2 + 6 + lines.length * 3.7 + SPACE.s2;
    ensure(h + SPACE.s3);
    fill(B.brandSoft);
    stroke(B.brandBorder);
    doc.setLineWidth(PAGE.border);
    rrect(L, y, CONTENT_W, h, 'FD');
    fill(B.brand);
    doc.rect(L, y, 1.4, h, 'F');
    font(TYPE.h2, true, B.brandInk);
    doc.text(up('Tóm tắt điều hành (AI)'), L + SPACE.s3 + 1, y + SPACE.s2 + 3.2);
    font(TYPE.body, false, COLORS.ink);
    doc.text(lines, L + SPACE.s3 + 1, y + SPACE.s2 + 9.2);
    y += h + SPACE.s3;
  }

  // 03 tài chính: dải KPI 3x2 (thẻ tông màu) + biểu đồ toàn bề rộng (lưới mảnh + nhãn trục)
  {
    const cellH = 15;
    const stripH = 2 * cellH + SPACE.s2;
    const plotH = 36;
    ensure(10.5 + SPACE.s2 + stripH + 6 + 6 + plotH + 12 + SPACE.s3);
    sectionHead('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)');
    const cw3 = (CONTENT_W - SPACE.s3 * 2) / 3;
    m.finRows.forEach((r, i) => {
      const cx = L + (i % 3) * (cw3 + SPACE.s3);
      const cy = y + Math.floor(i / 3) * (cellH + SPACE.s2);
      const tc = tcol(r.tone, r.value);
      topBarCard(cx, cy, cw3, cellH, tc.t, tc.b, tc.f);
      font(TYPE.label, true, COLORS.muted);
      doc.text(up(r.label), cx + 2.8, cy + 5.8);
      font(TYPE.kpi, true, tc.v);
      doc.text(r.value, cx + 2.8, cy + 12);
      if (r.delta !== undefined) {
        const vw = doc.getTextWidth(r.value);
        if (r.delta == null) {
          font(TYPE.caption, false, COLORS.muted);
          doc.text('—', cx + 2.8 + vw + 2.5, cy + 12);
        } else {
          const txt = deltaText(r.delta);
          const good = (r.delta >= 0) !== (r.label === 'Tổng chi');
          font(TYPE.caption, true, good ? COLORS.pos : COLORS.neg);
          const tw = doc.getTextWidth(txt) + 3.4;
          fill(WHITE);
          stroke(good ? COLORS.posBorder : COLORS.negBorder);
          doc.setLineWidth(PAGE.hair);
          rrect(cx + 2.8 + vw + 2.5, cy + 8.2, tw, 4.6, 'FD');
          ink(good ? COLORS.pos : COLORS.neg);
          doc.text(txt, cx + 2.8 + vw + 2.5 + tw / 2, cy + 11.5, { align: 'center' });
        }
      }
    });
    y += stripH + SPACE.s3;
    font(TYPE.label, true, COLORS.ink2);
    doc.text(up('Thu · Chi theo kỳ quỹ'), L, y + 2);
    fill(COLORS.posFill);
    doc.rect(R - 17.6, y + 0.6, 1.8, 1.8, 'F');
    font(TYPE.caption, false, COLORS.ink2);
    doc.text('Thu', R - 15, y + 2.2);
    fill(COLORS.negFill);
    doc.rect(R - 8.6, y + 0.6, 1.8, 1.8, 'F');
    doc.text('Chi', R - 6, y + 2.2);
    y += 8;
    if (!m.trends.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có dữ liệu kỳ trước.', L, y + 6);
      y += 10;
    } else {
      const px = L + 18;
      const pw = CONTENT_W - 18;
      const baseY = y + plotH;
      const max = Math.max(1, ...m.trends.flatMap((t) => [t.thu, t.chi]));
      const maxBarH = plotH * 0.85;
      [[1, max], [0.5, max / 2]].forEach(([f, val]) => {
        hline(px, px + pw, baseY - maxBarH * f);
        font(TYPE.caption, false, COLORS.muted);
        doc.text(vndCompact(val, true), px - 2, baseY - maxBarH * f + 0.9, { align: 'right' });
      });
      hline(px, px + pw, baseY, COLORS.lineStrong, PAGE.strong);
      font(TYPE.caption, false, COLORS.muted);
      doc.text('0', px - 2, baseY + 0.9, { align: 'right' });
      const colW = Math.min(34, pw / m.trends.length);
      const startX = px + (pw - colW * m.trends.length) / 2;
      const dense = m.trends.length > 7;
      m.trends.forEach((t, i) => {
        const cx = startX + i * colW + colW / 2;
        const barW = Math.min(10, colW * 0.4);
        const hThu = Math.max(0.6, (t.thu / max) * maxBarH);
        const hChi = Math.max(0.6, (t.chi / max) * maxBarH);
        fill(COLORS.posFill);
        doc.rect(cx - barW - 0.75, baseY - hThu, barW, hThu, 'F');
        fill(COLORS.negFill);
        doc.rect(cx + 0.75, baseY - hChi, barW, hChi, 'F');
        if (!dense) {
          font(TYPE.caption, true, COLORS.pos);
          doc.text(t.thuLabel, cx - barW / 2 - 0.75, baseY - hThu - 1, { align: 'center' });
          font(TYPE.caption, true, COLORS.neg);
          doc.text(t.chiLabel, cx + barW / 2 + 0.75, baseY - hChi - 1, { align: 'center' });
        }
        font(TYPE.caption, true, COLORS.ink2);
        doc.text(t.label, cx, baseY + 4.2, { align: 'center' });
      });
      y = baseY + 12;
    }
    y += SPACE.s1;
  }

  // 04 thành viên
  {
    ensure(10.5 + SPACE.s2 + 24 + 8 + 14);
    sectionHead('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm');
    const at = healthTone(m.avgHealth);
    fill(WHITE);
    stroke(B.brandBorder);
    doc.setLineWidth(PAGE.border);
    rrect(L, y, CONTENT_W, 19, 'FD');
    font(TYPE.label, true, COLORS.muted);
    doc.text(up('Điểm sức khỏe TB'), L + SPACE.s3, y + 6);
    font(TYPE.display, true, at.vivid);
    doc.text(String(m.avgHealth), L + SPACE.s3, y + 14.4);
    const bw = doc.getTextWidth(String(m.avgHealth));
    font(TYPE.body, false, COLORS.muted);
    doc.text('/ 100', L + SPACE.s3 + bw + 1.5, y + 14.4);
    const dx0 = L + 52;
    const dw = (R - SPACE.s3 - dx0 - SPACE.s3) / 2;
    m.dist.forEach((d, i) => {
      const dx = dx0 + (i % 2) * (dw + SPACE.s3);
      const dy = y + 3 + Math.floor(i / 2) * 8;
      dot(dx + 1, dy + 1.4, 1, d.fill);
      font(TYPE.table, false, COLORS.ink2);
      doc.text(d.label, dx + 3.4, dy + 2.4);
      font(TYPE.table, true, COLORS.ink);
      doc.text(String(d.value), dx + dw, dy + 2.4, { align: 'right' });
      hline(dx, dx + dw, dy + 4.2);
    });
    y += 19 + SPACE.s2;

    const colW = [10, 52, 21, 24, 27, 22, 22];
    const body = m.members.length
      ? m.members.map((r) => [String(r.rank), r.name, r.rate, '', '', r.conduct, ''])
      : [[{ content: 'Chưa có thành viên trong kỳ này.', colSpan: 7, styles: { halign: 'center', textColor: hexToRgb(COLORS.muted), cellPadding: 6 } }]];
    autoTable(doc, {
      startY: y,
      margin: { left: L, right: PAGE.right, top: PAGE.top, bottom: PAGE.bottom },
      tableWidth: CONTENT_W,
      theme: 'plain',
      showHead: 'everyPage',
      head: [['#', 'Thành viên', 'Tham gia', 'Đóng quỹ', 'Đánh giá', 'Hạnh kiểm', 'Sức khỏe'].map(up)],
      body: body as any,
      styles: { font: 'BVP', fontStyle: 'normal', fontSize: TYPE.table, cellPadding: { top: 1.6, bottom: 1.6, left: 2.5, right: 2.5 }, textColor: hexToRgb(COLORS.ink), lineWidth: 0, valign: 'middle' },
      headStyles: { font: 'BVP', fontStyle: 'bold', fontSize: TYPE.label, fillColor: hexToRgb(B.brandDeep), textColor: hexToRgb(WHITE), cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 } },
      columnStyles: {
        0: { halign: 'center', cellWidth: colW[0], textColor: hexToRgb(COLORS.muted) },
        1: { cellWidth: colW[1], fontStyle: 'bold' },
        2: { halign: 'right', cellWidth: colW[2] },
        3: { halign: 'center', cellWidth: colW[3] },
        4: { halign: 'center', cellWidth: colW[4] },
        5: { halign: 'right', cellWidth: colW[5] },
        6: { halign: 'right', cellWidth: colW[6] },
      },
      didParseCell: (d) => {
        if (d.section === 'head') {
          const ha = [ 'center', 'left', 'right', 'center', 'center', 'right', 'right' ][d.column.index] as any;
          d.cell.styles.halign = ha;
        } else if (d.section === 'body') {
          const r = m.members[d.row.index];
          if (r && d.row.index % 2 === 1) d.cell.styles.fillColor = hexToRgb(COLORS.surface2);
          if (r && d.column.index === 0 && r.rank <= 3) d.cell.text = ['']; // vẽ huy hiệu tròn ở didDrawCell
        }
      },
      didDrawCell: (d) => {
        const c = d.cell;
        if (d.section !== 'body') return;
        hline(c.x, c.x + c.width, c.y + c.height);
        const r = m.members[d.row.index];
        if (!r) return;
        const cx = c.x + c.width / 2;
        const cy = c.y + c.height / 2;
        if (d.column.index === 0 && r.rank <= 3) {
          dot(cx, cy, 2.5, B.brandDeep);
          font(TYPE.table, true, WHITE);
          doc.text(String(r.rank), cx, cy + 1, { align: 'center' });
        } else if (d.column.index === 3) {
          if (r.pay) {
            const ok = r.pay === 'paid';
            const txt = ok ? 'Đã đóng' : 'Nợ';
            font(TYPE.label, true, ok ? COLORS.pos : COLORS.neg);
            const tw = doc.getTextWidth(txt) + 7;
            fill(ok ? COLORS.posTint : COLORS.negTint);
            stroke(ok ? COLORS.posBorder : COLORS.negBorder);
            doc.setLineWidth(PAGE.hair);
            rrect(cx - tw / 2, cy - 2.4, tw, 4.8, 'FD', 2.4);
            dot(cx - tw / 2 + 2.3, cy, 0.8, ok ? COLORS.posFill : COLORS.negFill);
            ink(ok ? COLORS.pos : COLORS.neg);
            doc.text(txt, cx - tw / 2 + 4, cy + 0.9);
          } else {
            font(TYPE.table, false, COLORS.muted);
            doc.text('—', cx, cy + 1, { align: 'center' });
          }
        } else if (d.column.index === 4) {
          font(TYPE.caption, false, COLORS.muted);
          const txt = `${r.stars}/5`;
          const gw = 5 * 1.8 + 4 * 0.6 + 1.6 + doc.getTextWidth(txt);
          let sx = cx - gw / 2;
          for (let i = 1; i <= 5; i++) {
            dot(sx + 0.9, cy, 0.9, i <= r.stars ? COLORS.warnFill : COLORS.hairline);
            sx += 2.4;
          }
          doc.text(txt, sx + 0.4, cy + 0.9);
        } else if (d.column.index === 6) {
          const t = healthTone(r.health);
          const txt = String(r.health);
          font(TYPE.table, true, t.text);
          const pw = Math.max(8, doc.getTextWidth(txt) + 4);
          const px = c.x + c.width - 2.5 - pw;
          fill(t.tint);
          rrect(px, cy - 2.1, pw, 4.2, 'F');
          ink(t.text);
          doc.text(txt, px + pw / 2, cy + 1, { align: 'center' });
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + SPACE.s3;
  }

  // helper: 2 cột (đo trước để không tách trang)
  const twoCols = (left: (x: number, yy: number, w: number, dry: boolean) => number, right: (x: number, yy: number, w: number, dry: boolean) => number) => {
    const w = (CONTENT_W - SPACE.s4) / 2;
    const h = Math.max(left(L, 0, w, true), right(L + w + SPACE.s4, 0, w, true));
    ensure(h + SPACE.s3);
    left(L, y, w, false);
    right(L + w + SPACE.s4, y, w, false);
    y += h + SPACE.s3;
  };

  // 05 dự báo | 06 Club DNA
  twoCols(
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '05', 'Dự báo', 'Xu hướng 30–90 ngày', dry);
      const tw = (w - SPACE.s2 * 2) / 3;
      if (!dry) m.forecast.tiles.forEach((t, i) => tileCard(x + i * (tw + SPACE.s2), yy + h, tw, t));
      h += TILE_H + SPACE.s2;
      font(TYPE.table, false, COLORS.ink2);
      const lines: string[] = doc.splitTextToSize(`${m.forecast.callout} ${m.forecast.note}`, w);
      if (!dry) doc.text(lines, x, yy + h + 3);
      return h + lines.length * 4.3 + 1;
    },
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '06', 'Club DNA', m.dna.archetype, dry);
      m.dna.traits.forEach((t) => {
        if (!dry) bar(x, yy + h, w, t.score, t.label);
        h += DIM_STEP;
      });
      return h;
    },
  );

  // 07 hoạt động | 08 thi đấu
  twoCols(
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '07', 'Hoạt động', 'Vận hành buổi chơi', dry);
      const kw = (w - SPACE.s2) / 2;
      const rowH = 14 + SPACE.s2;
      if (!dry) m.activity.kpis.forEach((k, i) => tileCard(x + (i % 2) * (kw + SPACE.s2), yy + h + Math.floor(i / 2) * rowH, kw, k));
      h += rowH * 2;
      font(TYPE.table, false, COLORS.ink2);
      const txt = [m.activity.busiest ? `Đông nhất: ${m.activity.busiest}` : '', m.activity.emptiest ? `Ít nhất: ${m.activity.emptiest}` : '', 'Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).'].filter(Boolean);
      const lines: string[] = doc.splitTextToSize(txt.join('\n'), w);
      if (!dry) doc.text(lines, x, yy + h + 1);
      return h + lines.length * 4.3 + 1;
    },
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '08', 'Thi đấu', 'Giải & Minigame', dry);
      const tw = (w - SPACE.s2 * 2) / 3;
      if (!dry) m.tournament.tiles.forEach((t, i) => tileCard(x + i * (tw + SPACE.s2), yy + h, tw, t));
      h += TILE_H + SPACE.s2;
      if (!m.tournament.top.length) {
        if (!dry) {
          font(TYPE.table, false, COLORS.muted);
          doc.text('Chưa có giải/minigame trong kỳ.', x, yy + h + 3);
        }
        return h + 5;
      }
      m.tournament.top.forEach((p) => {
        if (!dry) {
          fill(B.brandSoft);
          stroke(B.brandBorder);
          doc.setLineWidth(PAGE.hair);
          doc.circle(x + 2.5, yy + h + 2.3, 2.5, 'FD');
          font(TYPE.table, true, B.brandInk);
          doc.text(String(p.rank), x + 2.5, yy + h + 3.3, { align: 'center' });
          font(TYPE.table, true, COLORS.ink);
          doc.text(p.name, x + 7, yy + h + 3.3);
          font(TYPE.caption, true, COLORS.ink2);
          doc.text(p.stat, x + w, yy + h + 3.3, { align: 'right' });
          hline(x, x + w, yy + h + 5.8);
        }
        h += 7;
      });
      return h + 6;
    },
  );

  // 09 AI
  {
    ensure(10.5 + SPACE.s2 + 26 + SPACE.s3);
    sectionHead('09', 'Văn phòng AI (AIDO)', 'Hiệu suất tự động hóa', m.agentsHeading);
    const w = (CONTENT_W - SPACE.s2 * 4) / 5;
    m.agents.forEach((a, i) => {
      const ax = L + i * (w + SPACE.s2);
      topBarCard(ax, y, w, 25, WHITE, COLORS.hairline, a.accent, 1.2);
      font(TYPE.table, true, COLORS.ink);
      doc.text(a.name, ax + 2.8, y + 6.4);
      font(TYPE.kpi, true, a.accent === B.brand ? B.brandInk : a.accent);
      doc.text(a.value, ax + 2.8, y + 12.8);
      const vw = doc.getTextWidth(a.value);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(a.unit, ax + 2.8 + vw + 1, y + 12.8);
      hline(ax + 2.8, ax + w - 2.8, y + 15);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(doc.splitTextToSize(a.detail, w - 5.6) as string[], ax + 2.8, y + 19);
    });
    y += 25 + SPACE.s3;
  }

  // 10 dòng thời gian | 11 cảnh báo | 12 khuyến nghị
  // Ngắt dòng không tách số tiền: nếu không vừa cuối dòng thì cả "280.000 đ" xuống dòng mới.
  const tlLines = (text: string, amount: string | null, maxW: number): string[] => {
    font(TYPE.table, false, COLORS.ink);
    const ls: string[] = doc.splitTextToSize(text, maxW);
    if (!amount) return ls;
    const last = ls[ls.length - 1] ?? '';
    if (last && doc.getTextWidth(`${last} ${amount}`) <= maxW) ls[ls.length - 1] = `${last} ${amount}`;
    else ls.push(amount);
    return ls;
  };
  {
    const unit = (CONTENT_W - SPACE.s3 * 2) / 3.1;
    const cw = [unit * 1.1, unit, unit];
    const xs = [L, L + cw[0] + SPACE.s3, L + cw[0] + cw[1] + SPACE.s3 * 2];
    const col = (idx: number, dry: boolean) => {
      const x = xs[idx];
      const w = cw[idx];
      const yy = dry ? 0 : y;
      let h = 0;
      if (idx === 0) {
        h = subHead(x, yy, '10', 'Dòng thời gian', 'Sự kiện nổi bật', dry);
        if (!m.timeline.length) {
          if (!dry) { font(TYPE.table, false, COLORS.muted); doc.text('Chưa có sự kiện nổi bật.', x, yy + h + 3); }
          return h + 5;
        }
        const t0 = h;
        m.timeline.forEach((t) => {
          font(TYPE.table, false, COLORS.ink);
          const lines = tlLines(t.text, t.amount, w - 5 - doc.getTextWidth(t.date + '  '));
          if (!dry) {
            dot(x + 1.2, yy + h + 2.4, 1.2, t.fill);
            font(TYPE.table, true, COLORS.ink);
            doc.text(t.date, x + 4.4, yy + h + 3.2);
            const dw = doc.getTextWidth(t.date + '  ');
            font(TYPE.table, false, COLORS.ink);
            const rest = tlLines(t.text, t.amount, w - 5 - dw);
            doc.text(rest, x + 4.4 + dw, yy + h + 3.2);
            h += Math.max(1, rest.length) * 4 + 2;
          } else {
            h += Math.max(1, lines.length) * 4 + 2;
          }
        });
        if (!dry) {
          stroke(B.brandBorder);
          doc.setLineWidth(PAGE.border);
          doc.line(x + 1.2, yy + t0 + 3.6, x + 1.2, yy + h - 2);
        }
        return h;
      }
      if (idx === 1) {
        h = subHead(x, yy, '11', 'Cảnh báo', 'Rủi ro cần lưu ý', dry);
        if (!m.alerts.length) {
          if (!dry) { font(TYPE.table, true, COLORS.pos); doc.text('Không có cảnh báo — CLB ổn định.', x, yy + h + 3); }
          return h + 5;
        }
        font(TYPE.table, false, COLORS.ink);
        m.alerts.forEach((a) => {
          const lines: string[] = doc.splitTextToSize(a, w - 7);
          const ah = lines.length * 4 + 3;
          if (!dry) {
            fill(COLORS.warnTint);
            stroke(COLORS.warnBorder);
            doc.setLineWidth(PAGE.hair);
            rrect(x, yy + h, w, ah, 'FD');
            fill(COLORS.warnFill);
            doc.rect(x, yy + h, 1, ah, 'F');
            font(TYPE.table, false, COLORS.ink);
            doc.text(lines, x + 3.6, yy + h + 4);
          }
          h += ah + 1.5;
        });
        return h;
      }
      h = subHead(x, yy, '12', 'Khuyến nghị', 'Gợi ý hành động', dry);
      if (!m.recs.length) {
        if (!dry) { font(TYPE.table, false, COLORS.muted); doc.text('Không có đề xuất.', x, yy + h + 3); }
        return h + 5;
      }
      m.recs.forEach((r) => {
        font(TYPE.label, true, B.brandInk);
        const tw = doc.getTextWidth(r.agent) + 4;
        font(TYPE.table, false, COLORS.ink);
        const lines: string[] = doc.splitTextToSize(r.text, w);
        if (!dry) {
          fill(B.brandSoft);
          stroke(B.brandBorder);
          doc.setLineWidth(PAGE.hair);
          rrect(x, yy + h, tw, 4.2, 'FD');
          font(TYPE.label, true, B.brandInk);
          doc.text(r.agent, x + tw / 2, yy + h + 3, { align: 'center' });
          font(TYPE.table, false, COLORS.ink);
          doc.text(lines, x, yy + h + 8);
        }
        h += 5 + lines.length * 4 + 2.5;
      });
      return h;
    };
    const h = Math.max(col(0, true), col(1, true), col(2, true));
    ensure(h + SPACE.s3);
    col(0, false);
    col(1, false);
    col(2, false);
    y += h + SPACE.s3;
  }
  font(TYPE.caption, false, COLORS.muted);
  ensure(7);
  hline(L, R, y + 0.5);
  doc.text('Ghi chú: AIDO Executive Report · mọi con số được lấy từ dữ liệu thật của CLB.', L, y + 4.2);

  // ── Footer mọi trang: cùng chuỗi bản Chrome ─────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = PAGE.h - PAGE.bottom + SPACE.s1;
    hline(L, R, fy);
    font(TYPE.caption, false, COLORS.muted);
    doc.text(m.footerLeft, L, fy + 4);
    doc.text(`Trang ${p} / ${pageCount}`, R, fy + 4, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
