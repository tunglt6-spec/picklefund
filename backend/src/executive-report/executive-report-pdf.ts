import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadFontsBase64 } from './export-fonts';
import {
  COLORS,
  CONTENT_W,
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
import { buildExecModel, deltaText, healthTone, parseAiBlocks, toneOfValue, type NumTone } from './executive-report-model';

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
  const toneOpts = (tc: { f: string }, barH = 0.9): GOpts => ({ tint: tc.f, tintA: GLASS.toneFill, ring: tc.f, ringA: GLASS.toneRing, bar: tc.f, barH });
  const accentOpts = (bar?: string, barH = 0.9): GOpts => ({ tint: B.brand, tintA: GLASS.accentFill, ring: B.brand, ringA: GLASS.accentBorder, bar, barH });
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

  let y = PAGE.top;
  const ensure = (h: number) => {
    if (y + h > LIMIT_Y) {
      doc.addPage();
      y = PAGE.top;
    }
  };

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

  // ── 1. BÌA: panel ĐẶC brandDeep (chữ trắng) / thẻ chỉ số / thông tin tài liệu ──
  const heroH = 150;
  mastBand(L, y, CONTENT_W, heroH, 4);
  // vòng kính trang trí góc dưới-phải (cùng hero bản Chrome)
  doc.saveGraphicsState();
  rrect(L, y, CONTENT_W, heroH, null as any, 4);
  (doc as any).clip();
  (doc as any).discardPath();
  fill(WHITE);
  alpha(0.06, () => doc.circle(R - 10, y + heroH + 8, 46, 'F'));
  stroke(WHITE);
  doc.setLineWidth(0.3);
  alpha(0.22, () => doc.circle(R - 10, y + heroH + 8, 46, 'S'));
  doc.restoreGraphicsState();
  drawLogo(L + SPACE.s5, y + SPACE.s5, 18);
  font(TYPE.h2, true, WHITE);
  doc.text(m.brandLabel, L + SPACE.s5 + 18 + SPACE.s3, y + SPACE.s5 + 10.4);
  {
    const tag = 'EXECUTIVE REPORT';
    font(TYPE.label, true, WHITE);
    const tw = doc.getTextWidth(tag) + 8;
    bandChip(R - SPACE.s5 - tw, y + SPACE.s5 + 5.2, tw, 5.6);
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
      glassCard(cx, sy, sw, 32, toneOpts(tc, 1.2));
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
  glassCard(L, docY - 2, CONTENT_W, 25);
  font(TYPE.label, true, B.brandInk);
  doc.text(up('Thông tin tài liệu'), L + SPACE.s3, docY + 3.5);
  const dcx = [L + SPACE.s3, L + CONTENT_W * 0.37, L + CONTENT_W * 0.62];
  [
    ['Mã tài liệu', m.code],
    ['Ngày xuất', m.exportedAt],
    ['Phân loại', 'Tài liệu nội bộ · Ban quản trị CLB'],
  ].forEach(([l, v], i) => {
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(l), dcx[i], docY + 10);
    font(TYPE.table, false, COLORS.ink);
    doc.text(v, dcx[i], docY + 15);
  });

  // ── 2. MASTHEAD trang 2: băng ĐẶC brandDeep + gauge trong ô trắng ─────
  doc.addPage();
  y = PAGE.top;
  const mastH = 26;
  mastBand(L, y, CONTENT_W, mastH, GLASS.radius);
  drawLogo(L + SPACE.s3, y + 7, 12);
  const mtx = L + SPACE.s3 + 12 + SPACE.s3;
  font(TYPE.label, true, WHITE);
  doc.text(m.brandLabel, mtx, y + 8.6);
  font(TYPE.h1, true, WHITE);
  doc.text('Báo cáo điều hành', mtx, y + 14.6);
  font(TYPE.body, false, WHITE);
  {
    const subTxt = `Kỳ: ${m.periodName} · Xuất lúc ${m.exportedAt}`;
    const sw = doc.getTextWidth(subTxt) + 5;
    bandChip(mtx, y + 16.2, sw, 5.2);
    doc.text(subTxt, mtx + 2.5, y + 19.8);
  }
  // gauge: ô trắng + track hairline + cung màu theo mức điểm
  {
    const tone = m.tone;
    const chipW = 54;
    const chipH = 21;
    const chipX = R - SPACE.s3 + 1 - chipW;
    const chipY = y + (mastH - chipH) / 2;
    softShadowBox(chipX, chipY, chipW, chipH, GLASS.radius, 1, 2);
    fill(WHITE);
    alpha(0.92, () => rrect(chipX, chipY, chipW, chipH, 'F', GLASS.radius));
    stroke(WHITE);
    doc.setLineWidth(GLASS.rimW);
    alpha(GLASS.rimOuter, () => rrect(chipX, chipY, chipW, chipH, 'S', GLASS.radius));
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
    glassCard(x, yy, w, DIM_H, { r: 2.4 });
    font(TYPE.table, true, COLORS.ink2);
    doc.text(label, x + 2.5, yy + 3.8);
    font(TYPE.body, true, t ? t.vivid : COLORS.muted);
    doc.text(score == null ? '—' : String(score), x + w - 2.5, yy + 3.8, { align: 'right' });
    fill(B.brand);
    alpha(GLASS.track, () => rrect(x + 2.5, yy + 5.3, w - 5, 2.2, 'F', 1.1));
    if (t && score! > 0) {
      fill(t.fill);
      const bw = Math.max(2.2, ((w - 5) * Math.min(100, score!)) / 100);
      rrect(x + 2.5, yy + 5.3, bw, 2.2, 'F', 1.1);
      fill(WHITE);
      alpha(0.35, () => rrect(x + 2.7, yy + 5.45, Math.max(1.8, bw - 0.4), 0.8, 'F', 0.4));
    }
    return DIM_STEP;
  };
  const KPI_H = 19;
  const kpiCard = (x: number, yy: number, w: number, k: { l: string; v: string; s?: string; accent?: boolean; tone: NumTone }) => {
    const tc = tcol(k.tone, k.v);
    if (k.accent) glassCard(x, yy, w, KPI_H, accentOpts(tc.f));
    else glassCard(x, yy, w, KPI_H, toneOpts(tc));
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
    glassCard(x, yy, w, TILE_H, toneOpts(tc));
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
    // Parse markdown thô → tiêu đề (đậm) / bullet (chấm tròn, thụt lề) / đoạn thường.
    const AI_LH = 3.7;
    const AI_INDENT = 3.6;
    const AI_W = CONTENT_W - SPACE.s3 * 2 - 2;
    const aiItems = parseAiBlocks(m.aiText).map((b, idx) => {
      font(TYPE.body, b.kind === 'heading', COLORS.ink);
      const lines: string[] = doc.splitTextToSize(b.text, b.kind === 'bullet' ? AI_W - AI_INDENT : AI_W);
      const gapBefore = b.kind === 'heading' && idx > 0 ? 1.2 : 0;
      const gapAfter = b.kind === 'heading' ? 0.3 : b.kind === 'bullet' ? 0.5 : 0.8;
      return { b, lines, gapBefore, gapAfter, h: gapBefore + lines.length * AI_LH + gapAfter };
    });
    const aiBodyH = aiItems.reduce((a, it) => a + it.h, 0);
    const h = SPACE.s2 + 6 + aiBodyH + SPACE.s2;
    ensure(h + SPACE.s3);
    glassCard(L, y, CONTENT_W, h, accentOpts());
    doc.saveGraphicsState();
    rrect(L, y, CONTENT_W, h, null as any);
    (doc as any).clip();
    (doc as any).discardPath();
    fill(B.brand);
    doc.rect(L, y, 1.4, h, 'F');
    doc.restoreGraphicsState();
    font(TYPE.h2, true, B.brandInk);
    doc.text(up('Tóm tắt điều hành (AI)'), L + SPACE.s3 + 1, y + SPACE.s2 + 3.2);
    {
      let ty = y + SPACE.s2 + 9.2;
      const tx = L + SPACE.s3 + 1;
      for (const it of aiItems) {
        ty += it.gapBefore;
        font(TYPE.body, it.b.kind === 'heading', COLORS.ink);
        if (it.b.kind === 'bullet') {
          fill(B.brand);
          doc.circle(tx + 1.1, ty - 0.9, 0.55, 'F');
          doc.text(it.lines, tx + AI_INDENT, ty);
        } else {
          doc.text(it.lines, tx, ty);
        }
        ty += it.lines.length * AI_LH + it.gapAfter;
      }
    }
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
      glassCard(cx, cy, cw3, cellH, toneOpts(tc));
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
          glassChip(cx + 2.8 + vw + 2.5, cy + 8.2, tw, 4.6, good ? COLORS.posFill : COLORS.negFill);
          ink(good ? COLORS.pos : COLORS.neg);
          doc.text(txt, cx + 2.8 + vw + 2.5 + tw / 2, cy + 11.5, { align: 'center' });
        }
      }
    });
    y += stripH + SPACE.s3;
    glassCard(L, y - 3, CONTENT_W, m.trends.length ? 8 + 3 + plotH + 13 : 22);
    font(TYPE.label, true, COLORS.ink2);
    doc.text(up('Thu · Chi theo kỳ quỹ'), L + SPACE.s3, y + 2);
    fill(COLORS.posFill);
    doc.rect(R - SPACE.s3 - 17.6, y + 0.6, 1.8, 1.8, 'F');
    font(TYPE.caption, false, COLORS.ink2);
    doc.text('Thu', R - SPACE.s3 - 15, y + 2.2);
    fill(COLORS.negFill);
    doc.rect(R - SPACE.s3 - 8.6, y + 0.6, 1.8, 1.8, 'F');
    doc.text('Chi', R - SPACE.s3 - 6, y + 2.2);
    y += 8;
    if (!m.trends.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có dữ liệu kỳ trước.', L, y + 6);
      y += 10;
    } else {
      const px = L + 18 + SPACE.s3 - 4;
      const pw = CONTENT_W - 18 - (SPACE.s3 - 4) * 2 - 4;
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
    glassCard(L, y, CONTENT_W, 19, accentOpts());
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
      headStyles: { font: 'BVP', fontStyle: 'bold', fontSize: TYPE.label, fillColor: false as any, textColor: hexToRgb(WHITE), cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 } },
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
          if (d.row.index % 2 === 1) {
            fill(B.brand);
            alpha(GLASS.zebra + 0.03, () => doc.rect(c.x, c.y, c.width, c.height, 'F'));
          }
        }
      },
      didDrawCell: (d) => {
        const c = d.cell;
        if (d.section !== 'body') return;
        stroke(WHITE);
        doc.setLineWidth(PAGE.hair);
        alpha(GLASS.rowLine, () => doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height));
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
          const px = c.x + c.width - 2.5 - pw;
          glassChip(px, cy - 2.1, pw, 4.2, t.fill);
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
          glassChip(x, yy + h - 0.2, 5, 5, B.brand);
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
      glassCard(ax, y, w, 25, { bar: a.accent, barH: 1.2 });
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
            glassCard(x, yy + h, w, ah, { tint: COLORS.warnFill, tintA: GLASS.chipFill, ring: COLORS.warnFill, ringA: GLASS.chipBorder, flat: true, r: 2 });
            doc.saveGraphicsState();
            rrect(x, yy + h, w, ah, null as any, 2);
            (doc as any).clip();
            (doc as any).discardPath();
            fill(COLORS.warnFill);
            doc.rect(x, yy + h, 1, ah, 'F');
            doc.restoreGraphicsState();
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
          glassChip(x, yy + h, tw, 4.2, B.brand);
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
