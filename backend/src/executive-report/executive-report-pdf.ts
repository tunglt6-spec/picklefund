import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadFontsBase64 } from './export-fonts';
import {
  AIR,
  COLORS,
  CONTENT_W,
  CONTENT_H,
  GLASS,
  PAGE,
  SPACE,
  TYPE,
  hexToRgb,
  makeBrand,
  makeGlassPalette,
  mix,
  orbAlphaFor,
  vndCompact,
  washColors,
} from './export-tokens';
import { buildExecModel, deltaText, healthTone, toneOfValue, type NumTone } from './executive-report-model';

/**
 * Fallback jsPDF của Báo cáo điều hành (khi không có Chromium). CÙNG ngôn ngữ LIQUID GLASS với bản Chrome:
 * dùng chung token (export-tokens.ts) + view-model (executive-report-model.ts) → nền wash + orb, tấm kính (GState opacity:
 * nền trắng bán trong, viền ngoài trắng, viền trong brand, highlight cạnh trên, bóng bậc thang), băng bìa/masthead gradient dải mịn,
 * thứ tự mục 01–12, số liệu xanh/đỏ/tím đậm, header bảng kính chữ trắng, chữ ≥ 7pt,
 * footer "CLB · Tên TL · Mã TL" | "Trang x / y". Font BeVietnamPro (tiếng Việt có dấu). Trả Buffer, hoặc null nếu không có font.
 */
export interface ExecPdfOpts {
  logoDataUri?: string | null;
  brandColor?: string | null;
  now?: Date;
  /** Ra: độ lấp (%) vùng nội dung của từng trang (đáy nội dung thực dùng / vùng khả dụng) — phục vụ kiểm thử. */
  metrics?: { pages: number[] };
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
  doc.setLineHeightFactor(AIR.lineHeight); // line-height thân ≥ 1.5 (cùng token bản Chrome)
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

  // ── LIQUID GLASS: độ trong suốt bằng GState (cùng alpha token với bản Chrome) ──
  const GS: any = (doc as any).GState;
  const alpha = (a: number, fn: () => void) => {
    doc.saveGraphicsState();
    doc.setGState(new GS({ opacity: a, 'stroke-opacity': a }));
    fn();
    doc.restoreGraphicsState();
  };
  const GP = makeGlassPalette(B);
  const WSH = washColors(B);
  /** Nền wash: dải ngang mịn (a → b → c) + 2 orb (brand / cyan) bằng vòng tròn đồng tâm alpha thấp; lặp mỗi trang. */
  const drawWash = () => {
    const N = 64;
    const stripH = PAGE.h / N;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      fill(t < 0.52 ? mix(WSH.a, WSH.b, t / 0.52) : mix(WSH.b, WSH.c, (t - 0.52) / 0.48));
      doc.rect(0, i * stripH, PAGE.w, stripH + 0.3, 'F');
    }
    const orb = (cx: number, cy: number, r: number, hex: string) => {
      const steps = 14;
      for (let k = 0; k < steps; k++) {
        const rr = r * (1 - k / steps);
        fill(hex);
        alpha((orbAlphaFor(B) * 1.6) / steps, () => doc.circle(cx, cy, rr, 'F'));
      }
    };
    orb(PAGE.w * 0.86, PAGE.h * 0.1, 62, B.brand);
    orb(PAGE.w * 0.12, PAGE.h * 0.9, 58, COLORS.infoFill);
  };
  /** Bóng mềm bậc thang (3 lớp offset, alpha thấp) dưới tấm kính. */
  const softShadowBox = (x: number, yy: number, w: number, h: number, r: number, k = 1, aMul = 1) => {
    fill(B.brandDeep);
    [1, 2, 3].forEach((i) =>
      alpha((GLASS.shadowA * aMul) / (i * 0.9), () => rrect(x, yy + GLASS.shadowDy * i * k, w, h, 'F', r)),
    );
  };
  interface GOpts {
    tint?: string;
    tintA?: number;
    ring?: string;
    ringA?: number;
    bar?: string;
    barH?: number;
    r?: number;
    flat?: boolean;
  }
  /** Tấm kính: bóng → nền trắng α.70 (+tint) → viền ngoài trắng → viền trong → highlight cạnh trên → vạch tông. */
  const glassCard = (x: number, yy: number, w: number, h: number, o: GOpts = {}) => {
    const r = o.r ?? GLASS.radius;
    if (!o.flat) softShadowBox(x, yy, w, h, r);
    fill(WHITE);
    alpha(GLASS.panel, () => rrect(x, yy, w, h, 'F', r));
    if (o.tint) {
      fill(o.tint);
      alpha(o.tintA ?? GLASS.toneFill, () => rrect(x, yy, w, h, 'F', r));
    }
    if (o.bar) {
      fill(o.bar);
      const bh = o.barH ?? 0.9;
      alpha(1, () => {
        doc.saveGraphicsState();
        rrect(x, yy, w, h, null as any, r);
        (doc as any).clip();
        (doc as any).discardPath();
        doc.rect(x, yy, w, bh, 'F');
        doc.restoreGraphicsState();
      });
    }
    stroke(o.ring ?? B.brand);
    doc.setLineWidth(0.2);
    alpha(o.ring ? (o.ringA ?? GLASS.toneRing) : GLASS.rimInner, () => rrect(x + 0.2, yy + 0.2, w - 0.4, h - 0.4, 'S', Math.max(0, r - 0.2)));
    stroke(WHITE);
    doc.setLineWidth(GLASS.rimW);
    alpha(GLASS.rimOuter, () => rrect(x, yy, w, h, 'S', r));
    doc.setLineWidth(0.3);
    alpha(GLASS.highlight, () => doc.line(x + r, yy + 0.45, x + w - r, yy + 0.45));
  };
  // MỘT lớp viền nổi bật/thẻ (vòng tông α.4); không vạch màu trên (giảm nhiễu, cùng bản Chrome).
  const toneOpts = (tc: { f: string }): GOpts => ({ tint: tc.f, tintA: GLASS.toneFill, ring: tc.f, ringA: GLASS.toneRing });
  const accentOpts = (): GOpts => ({ tint: B.brand, tintA: GLASS.accentFill, ring: B.brand, ringA: GLASS.accentBorder });
  /** Viên trạng thái kính (nền màu α.08 + viền màu α.35). */
  const glassChip = (x: number, yy: number, w: number, h: number, hex: string) => {
    fill(hex);
    alpha(GLASS.chipFill, () => rrect(x, yy, w, h, 'F', h / 2));
    stroke(hex);
    doc.setLineWidth(0.2);
    alpha(GLASS.chipBorder, () => rrect(x, yy, w, h, 'S', h / 2));
  };
  /** Băng kính chuyển sắc chéo (dải dọc mịn mastFrom → mastMid → mastTo) + bóng loáng elip + viền trắng + bóng. */
  const mastBand = (x: number, yy: number, w: number, h: number, r: number) => {
    softShadowBox(x, yy, w, h, r, 1.6, 4);
    doc.saveGraphicsState();
    rrect(x, yy, w, h, null as any, r);
    (doc as any).clip();
    (doc as any).discardPath();
    const N = 56;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      fill(t < 0.52 ? mix(GP.mastFrom, GP.mastMid, t / 0.52) : mix(GP.mastMid, GP.mastTo, (t - 0.52) / 0.48));
      doc.rect(x + (w * i) / N, yy, w / N + 0.3, h, 'F');
    }
    // bóng loáng: elip trắng chồng dần tại góc trên-trái
    const gl = 32;
    fill(WHITE);
    for (let k = 0; k < gl; k++) {
      const f = 1 - k / gl;
      alpha((GLASS.gloss + 0.04) / gl, () => (doc as any).ellipse(x + w * 0.2, yy, w * 0.85 * f, h * 0.85 * f, 'F'));
    }
    doc.restoreGraphicsState();
    stroke(WHITE);
    doc.setLineWidth(GLASS.rimW);
    alpha(GLASS.mastRim, () => rrect(x, yy, w, h, 'S', r));
  };
  /** Chip kính trên băng (trắng α.12 + viền trắng α.4). */
  const bandChip = (x: number, yy: number, w: number, h: number) => {
    fill(WHITE);
    alpha(GLASS.mastChip, () => rrect(x, yy, w, h, 'F', h / 2));
    stroke(WHITE);
    doc.setLineWidth(0.25);
    alpha(GLASS.mastChipBorder, () => rrect(x, yy, w, h, 'S', h / 2));
  };
  drawWash();
  const origAddPage = doc.addPage.bind(doc);
  (doc as any).addPage = (...a: any[]) => {
    const res = (origAddPage as any)(...a);
    drawWash();
    return res;
  };

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

  let y: number = PAGE.top;

  // ── logo / monogram (tròn trắng, nổi trên băng brand) ─────────────────
  const drawLogo = (x: number, yy: number, size: number) => {
    fill(B.brandDeep);
    alpha(0.12, () => doc.circle(x + size / 2, yy + size / 2 + 0.6, size / 2 + 0.1, 'F'));
    fill(WHITE);
    alpha(0.94, () => doc.circle(x + size / 2, yy + size / 2, size / 2 - 0.1, 'F'));
    stroke(WHITE);
    doc.setLineWidth(GLASS.rimW);
    alpha(GLASS.rimOuter, () => doc.circle(x + size / 2, yy + size / 2, size / 2 - 0.1, 'S'));
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

  // ── helper khối ────────────────────────────────────────────────────
  /** Bước dòng (mm) của chữ cỡ `size` pt theo line-height token. */
  const LH = (size: number) => (size * AIR.lineHeight * 25.4) / 72;
  /** Mỗi trang: đáy nội dung thực dùng (mm) — phục vụ đo độ lấp + test. */
  const pageEnds: number[] = [PAGE.top];
  let pageNo = 1;
  const mark = () => {
    pageEnds[pageNo - 1] = Math.max(pageEnds[pageNo - 1] ?? PAGE.top, y);
  };
  const newPage = () => {
    doc.addPage();
    pageNo += 1;
    y = PAGE.top;
    pageEnds[pageNo - 1] = PAGE.top;
  };
  /** Chừa chỗ h mm cho một khối KHÔNG được ngắt; không đủ → sang trang mới (nội dung chảy liên tục, không ép trang). */
  const ensure = (h: number) => {
    if (y + h > LIMIT_Y + 0.01) newPage();
  };
  /** Kết thúc khối: ghi đáy nội dung, cộng khoảng cách mục. */
  const endBlock = (gap: number = AIR.section) => {
    mark();
    y += gap;
  };
  /** Tiêu đề khối: vạch brand trái + nhãn xám + tiêu đề HOA đậm brandInk (maxW>0: cột hẹp, co chữ để không xuống dòng). */
  const headBlock = (x: number, yy: number, num: string, eyebrow: string, title: string, maxW = 0) => {
    fill(B.brand);
    doc.rect(x, yy, 1.2, 9, 'F');
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(`${num} · ${eyebrow}`), x + 3.5, yy + 2.6);
    let sz: number = maxW ? 9.5 : TYPE.h2;
    font(sz, true, B.brandInk);
    while (maxW && sz > 8 && doc.getTextWidth(up(title)) > maxW - 4) {
      sz -= 0.25;
      doc.setFontSize(sz);
    }
    doc.text(up(title), x + 3.5, yy + 7.6);
  };
  const HEAD_H = 10.5 + AIR.head;
  /** Tiêu đề mục (toàn bề rộng, hoặc cột hẹp khi w < CONTENT_W). */
  const sectionHead = (num: string, eyebrow: string, title: string, note = '', x: number = L, w: number = CONTENT_W) => {
    headBlock(x, y, num, eyebrow, title, w < CONTENT_W ? w : 0);
    if (note) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(note, x + w, y + 7.6, { align: 'right' });
    }
    hline(x, x + w, y + 10.5, B.brandBorder, PAGE.border);
    y += HEAD_H;
  };
  /** Thanh chiều sức khỏe trong thẻ kính (padding ngang 4.5mm); h giãn được để cân hai cột. */
  const BAR_BASE = 12.6;
  const DIM_H = 14.4;
  const bar = (x: number, yy: number, w: number, score: number | null, label: string, h = DIM_H) => {
    const t = score == null ? null : healthTone(score);
    const o = (h - BAR_BASE) / 2;
    glassCard(x, yy, w, h, { r: 2.4 });
    font(TYPE.table, true, COLORS.ink2);
    doc.text(label, x + AIR.pad, yy + 5.2 + o);
    font(TYPE.body, true, t ? t.vivid : COLORS.muted);
    doc.text(score == null ? '—' : String(score), x + w - AIR.pad, yy + 5.2 + o, { align: 'right' });
    fill(B.brand);
    alpha(GLASS.track, () => rrect(x + AIR.pad, yy + 8.2 + o, w - AIR.pad * 2, 2.2, 'F', 1.1));
    if (t && score! > 0) {
      fill(t.fill);
      const bw = Math.max(2.2, ((w - AIR.pad * 2) * Math.min(100, score!)) / 100);
      rrect(x + AIR.pad, yy + 8.2 + o, bw, 2.2, 'F', 1.1);
      fill(WHITE);
      alpha(0.35, () => rrect(x + AIR.pad + 0.2, yy + 8.35 + o, Math.max(1.8, bw - 0.4), 0.8, 'F', 0.4));
    }
  };
  const KPI_H = 24.3;
  const kpiCard = (x: number, yy: number, w: number, k: { l: string; v: string; s?: string; accent?: boolean; tone: NumTone }) => {
    const tc = tcol(k.tone, k.v);
    if (k.accent) glassCard(x, yy, w, KPI_H, accentOpts());
    else glassCard(x, yy, w, KPI_H, toneOpts(tc));
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(k.l), x + AIR.pad, yy + 8.3);
    let size: number = TYPE.kpi;
    font(size, true, tc.v);
    while (size > 10 && doc.getTextWidth(k.v) > w - AIR.pad * 2) {
      size -= 0.5;
      doc.setFontSize(size);
    }
    doc.text(k.v, x + AIR.pad, yy + 15.3);
    if (k.s) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(k.s, x + AIR.pad, yy + 19.8);
    }
  };
  /** Thẻ số liệu gọn: nhãn trên, số dưới; horizontal → nhãn trái, số phải (cột hẹp). Chiều cao tùy ý (giãn để cân hai cột). */
  const TILE_H = 18.6;
  const tileCard = (x: number, yy: number, w: number, t: { l: string; v: string; tone: NumTone }, h = TILE_H, horizontal = false) => {
    const tc = tcol(t.tone, t.v);
    glassCard(x, yy, w, h, toneOpts(tc));
    font(TYPE.label, true, COLORS.muted);
    if (horizontal) {
      doc.text(up(t.l), x + AIR.pad, yy + h / 2 + 1);
      let size: number = TYPE.h2;
      font(size, true, tc.v);
      while (size > TYPE.label && doc.getTextWidth(t.v) > w - AIR.pad * 2 - 20) {
        size -= 0.25;
        doc.setFontSize(size);
      }
      doc.text(t.v, x + w - AIR.pad, yy + h / 2 + 1.4, { align: 'right' });
      return;
    }
    const o = (h - TILE_H) / 2;
    doc.text(up(t.l), x + AIR.pad, yy + 7 + o);
    let size: number = TYPE.h2;
    font(size, true, tc.v);
    while (size > TYPE.label && doc.getTextWidth(t.v) > w - AIR.pad * 2) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    doc.text(t.v, x + AIR.pad, yy + 13.4 + o);
  };
  /** Lưới thẻ n cột (gutter/hàng theo token), vẽ tại (x0,y0) rộng w0; trả chiều cao tổng. */
  const cardGrid = <T,>(items: T[], cols: number, h: number, draw: (it: T, x: number, yy: number, w: number) => void, x0: number = L, w0: number = CONTENT_W, y0: number = y) => {
    const w = (w0 - AIR.gutter * (cols - 1)) / cols;
    items.forEach((it, i) => draw(it, x0 + (i % cols) * (w + AIR.gutter), y0 + Math.floor(i / cols) * (h + AIR.row), w));
    const rows = Math.max(1, Math.ceil(items.length / cols));
    return rows * h + (rows - 1) * AIR.row;
  };
  const para = (text: string, size: number, color: string, w: number, bold = false) => {
    font(size, bold, color);
    return doc.splitTextToSize(text, w) as string[];
  };
  const COLW = (CONTENT_W - AIR.section) / 2; // cột hẹp (86.5mm)
  const COLX2 = L + COLW + AIR.section;

  // ── 1. BÌA (nén): panel kính thấp ~40% + thẻ chỉ số + thông tin tài liệu; mục 01–02 chảy tiếp ngay dưới ──
  const heroH = 64;
  const y0 = y;
  mastBand(L, y, CONTENT_W, heroH, 4);
  doc.saveGraphicsState();
  rrect(L, y, CONTENT_W, heroH, null as any, 4);
  (doc as any).clip();
  (doc as any).discardPath();
  fill(WHITE);
  alpha(0.06, () => doc.circle(R - 10, y + heroH + 12, 42, 'F'));
  stroke(WHITE);
  doc.setLineWidth(0.3);
  alpha(0.22, () => doc.circle(R - 10, y + heroH + 12, 42, 'S'));
  doc.restoreGraphicsState();
  drawLogo(L + SPACE.s5, y + 8, 15);
  font(TYPE.h2, true, WHITE);
  doc.text(m.brandLabel, L + SPACE.s5 + 15 + SPACE.s3, y + 8 + 9);
  {
    const tag = 'EXECUTIVE REPORT';
    font(TYPE.label, true, WHITE);
    const tw = doc.getTextWidth(tag) + 8;
    bandChip(R - SPACE.s5 - tw, y + 8 + 4.7, tw, 5.6);
    doc.text(tag, R - SPACE.s5 - tw / 2, y + 8 + 8.5, { align: 'center' });
  }
  const ruleY = y + heroH - 9 - 1;
  fill(B.badge);
  doc.rect(L + SPACE.s5, ruleY, SPACE.s6, 1, 'F');
  const periodY = ruleY - 3.4;
  font(TYPE.h2, false, WHITE);
  doc.text(`Kỳ báo cáo: ${m.periodName}`, L + SPACE.s5, periodY);
  font(TYPE.cover, true, WHITE);
  const titleLines: string[] = doc.splitTextToSize(m.clubName || m.brandLabel, CONTENT_W - SPACE.s5 * 2 - 62);
  const titleY = periodY - 10 - (titleLines.length - 1) * 11;
  doc.setLineHeightFactor(1.15);
  doc.text(titleLines, L + SPACE.s5, titleY);
  doc.setLineHeightFactor(AIR.lineHeight);
  font(TYPE.label, true, WHITE);
  doc.text(up('Báo cáo điều hành · Executive Report'), L + SPACE.s5, titleY - 11.6 - (titleLines.length - 1) * 11);
  // gauge sức khỏe (ô trắng + vòng điểm) góc dưới-phải panel
  {
    const tone = m.tone;
    const chipW = 50;
    const chipH = 22;
    const chipX = R - SPACE.s5 + 2 - chipW;
    const chipY = y + heroH - 9 - chipH + 1;
    softShadowBox(chipX, chipY, chipW, chipH, GLASS.radius, 1, 2);
    fill(WHITE);
    alpha(0.92, () => rrect(chipX, chipY, chipW, chipH, 'F', GLASS.radius));
    stroke(WHITE);
    doc.setLineWidth(GLASS.rimW);
    alpha(GLASS.rimOuter, () => rrect(chipX, chipY, chipW, chipH, 'S', GLASS.radius));
    const gcx = chipX + 12;
    const gcy = chipY + chipH / 2;
    const gr = 7.2;
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
    doc.text(up(m.grade), gcx + gr + 4.5, gcy + 1.1, { align: 'left' });
  }
  y = y0 + heroH + AIR.row;
  // thẻ chỉ số
  {
    const sh = 22.8;
    const sw = (CONTENT_W - AIR.gutter * 2) / 3;
    m.coverStats.forEach((c, i) => {
      const tc = tcol(c.tone, c.v);
      const cx = L + i * (sw + AIR.gutter);
      glassCard(cx, y, sw, sh, toneOpts(tc));
      font(TYPE.label, true, COLORS.muted);
      doc.text(up(c.l), cx + SPACE.s3, y + 6.9);
      let vs: number = TYPE.display;
      font(vs, true, tc.v);
      while (vs > TYPE.h2 && doc.getTextWidth(c.v) > sw - SPACE.s3 * 2) {
        vs -= 0.5;
        doc.setFontSize(vs);
      }
      doc.text(c.v, cx + SPACE.s3, y + 15);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(c.s, cx + SPACE.s3, y + 19.8);
    });
    y += sh + AIR.row;
  }
  // thông tin tài liệu
  {
    const dh = 17.4;
    glassCard(L, y, CONTENT_W, dh);
    font(TYPE.label, true, B.brandInk);
    doc.text(up('Thông tin tài liệu'), L + SPACE.s3, y + 5.6);
    const dcx = [L + SPACE.s3, L + CONTENT_W * 0.37, L + CONTENT_W * 0.62];
    [
      ['Mã tài liệu', m.code],
      ['Ngày xuất', m.exportedAt],
      ['Phân loại', 'Tài liệu nội bộ · Ban quản trị CLB'],
    ].forEach(([l, v], i) => {
      font(TYPE.label, true, COLORS.muted);
      doc.text(up(l), dcx[i], y + 9.8);
      font(TYPE.table, false, COLORS.ink);
      doc.text(v, dcx[i], y + 14);
    });
    y += dh;
    endBlock();
  }

  // ── 01 sức khỏe + 02 chỉ số ───────────────────────────────────────
  {
    ensure(HEAD_H + 2 * DIM_H + AIR.row);
    sectionHead('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ');
    y += cardGrid(m.dims, 3, DIM_H, (d, x, yy, w) => bar(x, yy, w, d.score, d.label));
    endBlock();
  }
  {
    const rows = Math.ceil(m.kpis.length / 4);
    ensure(HEAD_H + rows * KPI_H + (rows - 1) * AIR.row);
    sectionHead('02', 'Tổng quan điều hành', 'Các chỉ số chính');
    y += cardGrid(m.kpis, 4, KPI_H, (k, x, yy, w) => kpiCard(x, yy, w, k));
    endBlock();
  }

  // ── Tóm tắt AI ─────────────────────────────────────────────────────
  {
    const lines = para(m.aiText, TYPE.body, COLORS.ink, CONTENT_W - SPACE.s3 * 2 - 2.5);
    const step = LH(TYPE.body);
    const h = 5 + 4.2 + AIR.head + Math.max(1, lines.length) * step + 3.2;
    ensure(h);
    glassCard(L, y, CONTENT_W, h, accentOpts());
    doc.saveGraphicsState();
    rrect(L, y, CONTENT_W, h, null as any);
    (doc as any).clip();
    (doc as any).discardPath();
    fill(B.brand);
    doc.rect(L, y, 1.4, h, 'F');
    doc.restoreGraphicsState();
    font(TYPE.h2, true, B.brandInk);
    doc.text(up('Tóm tắt điều hành (AI)'), L + SPACE.s3 + 1.5, y + 5 + 3.6);
    font(TYPE.body, false, COLORS.ink);
    doc.text(lines, L + SPACE.s3 + 1.5, y + 5 + 4.2 + AIR.head + 1.2);
    y += h;
    endBlock();
  }

  // ── 03 tài chính: dải KPI 3x2 + biểu đồ (một khối, không ngắt) ─────
  {
    const cellH = 20.5;
    const plotH = 38;
    const chartH = m.trends.length ? 5 + 5 + AIR.head + plotH + 12 : 24;
    const need = HEAD_H + (2 * cellH + AIR.row) + AIR.row + 2 + chartH;
    ensure(need);
    sectionHead('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)');
    const stripH = cardGrid(m.finRows, 3, cellH, (r, cx, cy, cw3) => {
      const tc = tcol(r.tone, r.value);
      glassCard(cx, cy, cw3, cellH, toneOpts(tc));
      font(TYPE.label, true, COLORS.muted);
      doc.text(up(r.label), cx + AIR.pad, cy + 7.4);
      font(TYPE.kpi, true, tc.v);
      const vy = cy + 14.6;
      doc.text(r.value, cx + AIR.pad, vy);
      if (r.delta !== undefined) {
        const vw = doc.getTextWidth(r.value);
        if (r.delta == null) {
          font(TYPE.caption, false, COLORS.muted);
          doc.text('—', cx + AIR.pad + vw + 2.5, vy);
        } else {
          const txt = deltaText(r.delta);
          const good = (r.delta >= 0) !== (r.label === 'Tổng chi');
          font(TYPE.caption, true, good ? COLORS.pos : COLORS.neg);
          const tw = doc.getTextWidth(txt) + 3.4;
          glassChip(cx + AIR.pad + vw + 2.5, vy - 3.8, tw, 4.6, good ? COLORS.posFill : COLORS.negFill);
          ink(good ? COLORS.pos : COLORS.neg);
          doc.text(txt, cx + AIR.pad + vw + 2.5 + tw / 2, vy - 0.5, { align: 'center' });
        }
      }
    });
    y += stripH + AIR.row + 2;
    glassCard(L, y, CONTENT_W, chartH);
    font(TYPE.label, true, COLORS.ink2);
    doc.text(up('Thu · Chi theo kỳ quỹ'), L + AIR.pad + 1, y + 8);
    fill(COLORS.posFill);
    doc.rect(R - AIR.pad - 1 - 17.6, y + 6.4, 1.8, 1.8, 'F');
    font(TYPE.caption, false, COLORS.ink2);
    doc.text('Thu', R - AIR.pad - 1 - 15, y + 8);
    fill(COLORS.negFill);
    doc.rect(R - AIR.pad - 1 - 8.6, y + 6.4, 1.8, 1.8, 'F');
    doc.text('Chi', R - AIR.pad - 1 - 6, y + 8);
    if (!m.trends.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có dữ liệu kỳ trước.', L + AIR.pad + 1, y + 17);
    } else {
      const px = L + AIR.pad + 1 + 18;
      const pw = CONTENT_W - (AIR.pad + 1) * 2 - 18;
      const baseY = y + 10 + AIR.head + plotH;
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
        fill(WHITE);
        alpha(0.28, () => {
          doc.rect(cx - barW - 0.75, baseY - hThu, 0.9, hThu, 'F');
          doc.rect(cx + 0.75, baseY - hChi, 0.9, hChi, 'F');
        });
        if (!dense) {
          font(TYPE.caption, true, COLORS.pos);
          doc.text(t.thuLabel, cx - barW / 2 - 0.75, baseY - hThu - 1, { align: 'center' });
          font(TYPE.caption, true, COLORS.neg);
          doc.text(t.chiLabel, cx + barW / 2 + 0.75, baseY - hChi - 1, { align: 'center' });
        }
        font(TYPE.caption, true, COLORS.ink2);
        doc.text(t.label, cx, baseY + 4.6, { align: 'center' });
      });
    }
    y += chartH;
    endBlock();
  }

  // ── 04 thành viên (bảng được ngắt hàng, không mồ côi < 3 hàng) ─────
  {
    const avgH = 24;
    const ROW_H = 10.7;
    const TBL_HEAD = 10;
    const minRows = Math.min(3, Math.max(1, m.members.length));
    ensure(HEAD_H + avgH + AIR.row + TBL_HEAD + minRows * ROW_H);
    sectionHead('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm');
    const at = healthTone(m.avgHealth);
    glassCard(L, y, CONTENT_W, avgH, accentOpts());
    font(TYPE.label, true, COLORS.muted);
    doc.text(up('Điểm sức khỏe TB'), L + SPACE.s4, y + 7.6);
    font(TYPE.display, true, at.vivid);
    doc.text(String(m.avgHealth), L + SPACE.s4, y + 16.6);
    const bw = doc.getTextWidth(String(m.avgHealth));
    font(TYPE.body, false, COLORS.muted);
    doc.text('/ 100', L + SPACE.s4 + bw + 1.5, y + 16.6);
    const dx0 = L + 58;
    const dw = (R - SPACE.s4 - dx0 - SPACE.s5) / 2;
    m.dist.forEach((d, i) => {
      const dx = dx0 + (i % 2) * (dw + SPACE.s5);
      const dy = y + 3.8 + Math.floor(i / 2) * 8.8;
      dot(dx + 1, dy + 1.8, 1, d.fill);
      font(TYPE.table, false, COLORS.ink2);
      doc.text(d.label, dx + 3.4, dy + 2.8);
      font(TYPE.table, true, COLORS.ink);
      doc.text(String(d.value), dx + dw, dy + 2.8, { align: 'right' });
      hline(dx, dx + dw, dy + 5.2);
    });
    y += avgH + AIR.row;

    const colW = [10, 54, 22, 25, 28, 22, 21];
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
      styles: { font: 'BVP', fontStyle: 'normal', fontSize: TYPE.table, cellPadding: { top: 3.3, bottom: 3.3, left: 3, right: 3 }, textColor: hexToRgb(COLORS.ink), lineWidth: 0, valign: 'middle' },
      headStyles: { font: 'BVP', fontStyle: 'bold', fontSize: TYPE.label, fillColor: false as any, textColor: hexToRgb(WHITE), cellPadding: { top: 3.4, bottom: 3.4, left: 3, right: 3 } },
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
          d.cell.styles.fillColor = false as any; // nền kính vẽ ở willDrawCell
          if (r && d.column.index === 0 && r.rank <= 3) d.cell.text = ['']; // vẽ huy hiệu tròn ở didDrawCell
        }
      },
      willDrawCell: (d) => {
        const c = d.cell;
        if (d.section === 'head') {
          // dải kính chuyển sắc bo góc: vẽ MỘT lần ở ô đầu, phủ toàn bề rộng bảng
          if (d.column.index === 0) {
            const bw = CONTENT_W;
            doc.saveGraphicsState();
            rrect(c.x, c.y, bw, c.height, null as any, GLASS.radius - 1);
            (doc as any).clip();
            (doc as any).discardPath();
            const N = 40;
            for (let i = 0; i < N; i++) {
              fill(mix(GP.mastMid, GP.mastTo, (i / (N - 1)) * 0.6));
              doc.rect(c.x + (bw * i) / N, c.y, bw / N + 0.3, c.height, 'F');
            }
            fill(WHITE);
            alpha(GLASS.gloss, () => doc.rect(c.x, c.y, bw, c.height * 0.45, 'F'));
            doc.restoreGraphicsState();
            stroke(WHITE);
            doc.setLineWidth(0.25);
            alpha(GLASS.mastRim, () => doc.line(c.x + GLASS.radius, c.y + 0.15, c.x + bw - GLASS.radius, c.y + 0.15));
          }
        } else if (d.section === 'body') {
          fill(WHITE);
          alpha(GLASS.rowAlpha, () => doc.rect(c.x, c.y, c.width, c.height, 'F'));
        }
      },
      didDrawCell: (d) => {
        const c = d.cell;
        if (d.section !== 'body') return;
        if (d.row.index < m.members.length - 1) {
          stroke(B.brandDeep);
          doc.setLineWidth(PAGE.hair);
          alpha(0.14, () => doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height));
        }
        const r = m.members[d.row.index];
        if (!r) return;
        const cx = c.x + c.width / 2;
        const cy = c.y + c.height / 2;
        if (d.column.index === 0 && r.rank <= 3) {
          dot(cx, cy, 2.5, B.brandDeep);
          fill(WHITE);
          alpha(GLASS.gloss, () => doc.circle(cx, cy - 0.7, 1.7, 'F'));
          font(TYPE.table, true, WHITE);
          doc.text(String(r.rank), cx, cy + 1, { align: 'center' });
        } else if (d.column.index === 3) {
          if (r.pay) {
            const ok = r.pay === 'paid';
            const txt = ok ? 'Đã đóng' : 'Nợ';
            font(TYPE.label, true, ok ? COLORS.pos : COLORS.neg);
            const tw = doc.getTextWidth(txt) + 7;
            glassChip(cx - tw / 2, cy - 2.4, tw, 4.8, ok ? COLORS.posFill : COLORS.negFill);
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
            if (i <= r.stars) dot(sx + 0.9, cy, 0.9, COLORS.warnFill);
            else {
              fill(B.brand);
              alpha(0.16, () => doc.circle(sx + 0.9, cy, 0.9, 'F'));
            }
            sx += 2.4;
          }
          doc.text(txt, sx + 0.4, cy + 0.9);
        } else if (d.column.index === 6) {
          const t = healthTone(r.health);
          const txt = String(r.health);
          font(TYPE.table, true, t.text);
          const pw = Math.max(8, doc.getTextWidth(txt) + 4);
          const px = c.x + c.width - 3 - pw;
          glassChip(px, cy - 2.1, pw, 4.2, t.fill);
          ink(t.text);
          doc.text(txt, px + pw / 2, cy + 1, { align: 'center' });
        }
      },
    });
    const pgBefore = pageNo;
    {
      const pgNow = (doc as any).internal.getNumberOfPages() as number;
      for (let k = pgBefore; k < pgNow; k++) pageEnds[k - 1] = LIMIT_Y;
      pageNo = pgNow;
      pageEnds[pageNo - 1] = Math.max(pageEnds[pageNo - 1] ?? PAGE.top, (doc as any).lastAutoTable.finalY);
      y = (doc as any).lastAutoTable.finalY;
      endBlock();
    }
  }

  // ── 05 dự báo | 06 Club DNA (2 cột 86.5mm, cao bằng nhau) ──────────
  {
    const traits = m.dna.traits;
    const callLines = para(`${m.forecast.callout} ${m.forecast.note}`, TYPE.table, COLORS.ink2, COLW);
    const cH = callLines.length * LH(TYPE.table);
    const leftNat = 3 * 16 + 2 * AIR.row + AIR.row + cH;
    const rightNat = Math.max(1, traits.length) * DIM_H + Math.max(0, traits.length - 1) * AIR.row;
    const body = Math.max(leftNat, rightNat);
    ensure(HEAD_H + body);
    const yy = y;
    sectionHead('05', 'Dự báo', 'Xu hướng 30–90 ngày', '', L, COLW);
    y = yy;
    sectionHead('06', 'Club DNA', m.dna.archetype, '', COLX2, COLW);
    const top = yy + HEAD_H;
    const area = body - cH - AIR.row;
    const th = (area - 2 * AIR.row) / 3;
    m.forecast.tiles.forEach((t, i) => tileCard(L, top + i * (th + AIR.row), COLW, t, th, true));
    font(TYPE.table, false, COLORS.ink2);
    doc.text(callLines, L, top + area + AIR.row + 3);
    const n = Math.max(1, traits.length);
    const bh = (body - (n - 1) * AIR.row) / n;
    traits.forEach((t, i) => bar(COLX2, top + i * (bh + AIR.row), COLW, t.score, t.label, bh));
    y = top + body;
    endBlock();
  }

  // ── 07 hoạt động | 08 thi đấu (2 cột) ──────────────────────────────
  {
    const txt = [m.activity.busiest ? `Đông nhất: ${m.activity.busiest}` : '', m.activity.emptiest ? `Ít nhất: ${m.activity.emptiest}` : '', 'Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).'].filter(Boolean);
    const callLines = para(txt.join('\n'), TYPE.table, COLORS.ink2, COLW);
    const cH = callLines.length * LH(TYPE.table);
    const PL_H = 8.6;
    const top3 = m.tournament.top;
    const leftNat = 2 * TILE_H + AIR.row + AIR.row + cH;
    const rightNat = TILE_H + AIR.row + (top3.length ? top3.length * PL_H + 6 : 6);
    const body = Math.max(leftNat, rightNat);
    ensure(HEAD_H + body);
    const yy = y;
    sectionHead('07', 'Hoạt động', 'Vận hành buổi chơi', '', L, COLW);
    y = yy;
    sectionHead('08', 'Thi đấu', 'Giải & Minigame', '', COLX2, COLW);
    const top = yy + HEAD_H;
    const area = body - cH - AIR.row;
    const th = (area - AIR.row) / 2;
    cardGrid(m.activity.kpis, 2, th, (k, x, y2, w) => tileCard(x, y2, w, k, th), L, COLW, top);
    font(TYPE.table, false, COLORS.ink2);
    doc.text(callLines, L, top + area + AIR.row + 3);
    // thi đấu: 3 thẻ + top 3
    const tileH = TILE_H + Math.max(0, body - rightNat);
    cardGrid(m.tournament.tiles, 3, tileH, (t, x, y2, w) => tileCard(x, y2, w, t, tileH), COLX2, COLW, top);
    let py = top + tileH + AIR.row;
    if (!top3.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có giải/minigame trong kỳ.', COLX2, py + 3);
    } else {
      top3.forEach((p) => {
        glassChip(COLX2, py + 1.8, 5, 5, B.brand);
        font(TYPE.table, true, B.brandInk);
        doc.text(String(p.rank), COLX2 + 2.5, py + 5.3, { align: 'center' });
        font(TYPE.table, true, COLORS.ink);
        doc.text(p.name, COLX2 + 8, py + 5.3);
        font(TYPE.caption, true, COLORS.ink2);
        doc.text(p.stat, COLX2 + COLW, py + 5.3, { align: 'right' });
        hline(COLX2, COLX2 + COLW, py + PL_H - 0.4);
        py += PL_H;
      });
      font(TYPE.caption, false, COLORS.muted);
      doc.text('Người dẫn đầu BXH (chưa có giải MVP chính thức).', COLX2, py + 3.4);
    }
    y = top + body;
    endBlock();
  }

  // ── 09 AIDO: 5 thẻ cùng rộng trên MỘT hàng ──────────────────────────
  {
    const n = Math.max(1, m.agents.length);
    const w = (CONTENT_W - AIR.gutter * (n - 1)) / n;
    font(TYPE.caption, false, COLORS.muted);
    const dl = m.agents.map((a) => doc.splitTextToSize(a.detail, w - AIR.pad * 2) as string[]);
    const maxLines = Math.max(1, ...dl.map((l) => l.length));
    const AG_H = 27.4 + maxLines * LH(TYPE.caption);
    ensure(HEAD_H + AG_H);
    sectionHead('09', 'Văn phòng AI (AIDO)', 'Hiệu suất tự động hóa', m.agentsHeading);
    m.agents.forEach((a, i) => {
      const ax = L + i * (w + AIR.gutter);
      glassCard(ax, y, w, AG_H);
      font(TYPE.table, true, COLORS.ink);
      doc.text(a.name, ax + AIR.pad, y + 9);
      font(TYPE.kpi, true, a.accent === B.brand ? B.brandInk : a.accent);
      doc.text(a.value, ax + AIR.pad, y + 15.8);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(a.unit, ax + AIR.pad, y + 19.6);
      hline(ax + AIR.pad, ax + w - AIR.pad, y + 22.2);
      doc.text(dl[i], ax + AIR.pad, y + 26.6);
    });
    y += AG_H;
    endBlock();
  }

  // ── 10 dòng thời gian (chảy, ngắt theo mục) ─────────────────────────
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
    const TL_X = L + 9.5;
    const TL_GAP = AIR.row + 4.2;
    const items = m.timeline.map((t) => {
      font(TYPE.table, true, COLORS.ink);
      const dw = doc.getTextWidth(t.date + '  ');
      const lines = tlLines(t.text, t.amount, CONTENT_W - 9.5 - dw);
      return { t, dw, lines, h: Math.max(1, lines.length) * LH(TYPE.table) };
    });
    const total = items.reduce((s2, it) => s2 + it.h, 0) + Math.max(0, items.length - 1) * TL_GAP;
    ensure(HEAD_H + (items.length ? Math.min(total, 3 * (LH(TYPE.table) + TL_GAP)) : 6));
    sectionHead('10', 'Dòng thời gian', 'Sự kiện nổi bật');
    if (!items.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có sự kiện nổi bật.', L, y + 3);
      y += 6;
    } else {
      let y0t = y;
      const flushLine = (yEnd: number) => {
        stroke(B.brandBorder);
        doc.setLineWidth(PAGE.border);
        doc.line(L + 1.5, y0t + 2, L + 1.5, yEnd - 1);
      };
      items.forEach((it) => {
        if (y + it.h > LIMIT_Y) {
          flushLine(y - TL_GAP);
          mark();
          newPage();
          y0t = y;
        }
        dot(L + 1.5, y + 2.4, 1.2, it.t.fill);
        font(TYPE.table, true, COLORS.ink);
        doc.text(it.t.date, TL_X, y + 3.2);
        font(TYPE.table, false, COLORS.ink);
        doc.text(it.lines, TL_X + it.dw, y + 3.2);
        y += it.h + TL_GAP;
      });
      y -= TL_GAP;
      flushLine(y);
    }
    endBlock();
  }

  // ── 11 cảnh báo ────────────────────────────────────────────────────
  {
    const lines = m.alerts.map((a) => para(a, TYPE.table, COLORS.ink, CONTENT_W - AIR.pad * 2));
    const hs = lines.map((l) => Math.max(1, l.length) * LH(TYPE.table) + 6.4);
    const allH = hs.reduce((a, b) => a + b, 0) + Math.max(0, hs.length - 1) * AIR.row;
    ensure(HEAD_H + (allH <= CONTENT_H / 2 ? allH : (hs[0] ?? 6)));
    sectionHead('11', 'Cảnh báo', 'Rủi ro cần lưu ý');
    if (!m.alerts.length) {
      font(TYPE.table, true, COLORS.pos);
      doc.text('Không có cảnh báo — CLB ổn định.', L, y + 3);
      y += 6;
    } else {
      lines.forEach((ls, i) => {
        ensure(hs[i]);
        glassCard(L, y, CONTENT_W, hs[i], { tint: COLORS.warnFill, tintA: GLASS.chipFill, ring: COLORS.warnFill, ringA: GLASS.chipBorder, r: GLASS.radius });
        font(TYPE.table, false, COLORS.ink);
        doc.text(ls, L + AIR.pad, y + 3.2 + 3);
        y += hs[i] + AIR.row;
      });
      y -= AIR.row;
    }
    endBlock();
  }

  // ── 12 khuyến nghị ─────────────────────────────────────────────────
  {
    const recItems = m.recs.map((r) => {
      font(TYPE.label, true, B.brandInk);
      const tw = doc.getTextWidth(r.agent) + 5;
      const lines = para(r.text, TYPE.table, COLORS.ink, CONTENT_W - AIR.pad * 2 - tw - 2.5);
      return { r, tw, lines, h: Math.max(LH(TYPE.table) * lines.length, 4.6) + 6 };
    });
    const allH = recItems.reduce((a, b) => a + b.h, 0) + Math.max(0, recItems.length - 1) * AIR.row;
    ensure(HEAD_H + (allH <= CONTENT_H / 2 ? allH : (recItems[0]?.h ?? 6)));
    sectionHead('12', 'Khuyến nghị', 'Gợi ý hành động');
    if (!recItems.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Không có đề xuất.', L, y + 3);
      y += 6;
    } else {
      recItems.forEach((it) => {
        ensure(it.h);
        glassCard(L, y, CONTENT_W, it.h);
        const cy = y + it.h / 2;
        glassChip(L + AIR.pad, cy - 2.3, it.tw, 4.6, B.brand);
        font(TYPE.label, true, B.brandInk);
        doc.text(it.r.agent, L + AIR.pad + it.tw / 2, cy + 1, { align: 'center' });
        font(TYPE.table, false, COLORS.ink);
        doc.text(it.lines, L + AIR.pad + it.tw + 2.5, cy + 1 - ((it.lines.length - 1) * LH(TYPE.table)) / 2);
        y += it.h + AIR.row;
      });
      y -= AIR.row;
    }
    endBlock(AIR.row);
  }
  font(TYPE.caption, false, COLORS.muted);
  ensure(8);
  hline(L, R, y + 0.5);
  doc.text('Ghi chú: AIDO Executive Report · mọi con số được lấy từ dữ liệu thật của CLB.', L, y + 5);
  y += 6;
  mark();

  if (opts.metrics) {
    opts.metrics.pages = pageEnds.map((e) => Math.round(((e - PAGE.top) / (LIMIT_Y - PAGE.top)) * 1000) / 10);
  }

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
