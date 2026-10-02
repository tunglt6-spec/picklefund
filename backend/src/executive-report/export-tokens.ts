/**
 * Token thiết kế "Luxury SaaS" cho PDF phía SERVER (Chrome HTML→PDF + fallback jsPDF).
 * BẢN SAO có CÙNG giá trị với spec xuất tài liệu của FE (ink/ink2/muted/hairline/semantic/brand mặc định);
 * export-tokens.spec.ts khoá giá trị + tương phản WCAG ≥ 4.5 cho mọi cặp chữ/nền dùng thật.
 * Luật: màu chủ đạo = màu CLB (mặc định tím app); LIQUID GLASS = tấm kính (gradient + rgba + viền + bóng mềm) CHỈ dùng
 * đúng palette app ở các độ trong suốt khác nhau (không thêm màu mới); CHỮ luôn đặc, tương phản ≥ 4.5:1 so với nền xấu nhất
 * sau lớp kính (số đậm cỡ lớn ≥ 3:1), số liệu dùng màu SINH ĐỘNG (xanh thu / đỏ chi), chữ ≥ 7pt, không emoji,
 * đơn vị pt/mm sinh từ token.
 */

// ── Màu cố định (hex) ───────────────────────────────────────────────────
export const COLORS = {
  ink: '#1E293B', // chữ thân, số liệu
  ink2: '#475569', // chữ phụ, nhãn cột
  muted: '#5A6678', // chú thích, footer (AA trên #FFF 5.82, trên #F8FAFC 5.57)
  hairline: '#E2E8F0', // đường kẻ (trang trí, không phải chữ)
  lineStrong: '#CBD5E1',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  // semantic CHỮ (bản đậm AA)
  pos: '#15803D',
  neg: '#B91C1C',
  warn: '#B45309',
  info: '#0E7490',
  // semantic FILL (chấm/thanh/vạch — không dùng làm màu chữ)
  posFill: '#16A34A',
  negFill: '#EF4444',
  warnFill: '#D97706',
  infoFill: '#0891B2',
  // semantic SINH ĐỘNG cho SỐ/TIÊU ĐỀ ĐẬM cỡ lớn (≥ 8.5pt bold; ≥ 3:1 trên trắng) — KHÔNG dùng cho chữ thường nhỏ
  posVivid: '#16A34A',
  negVivid: '#DC2626',
  orange: '#EA580C',
  gray: '#64748B', // chữ phụ trên nền TRẮNG (AA 4.76); trên nền màu dùng muted
  // nền nhấn trạng thái
  posTint: '#F0FDF4',
  negTint: '#FEF2F2',
  warnTint: '#FFFBEB',
  infoTint: '#ECFEFF',
  // viền nhấn trạng thái
  posBorder: '#BBF7D0',
  negBorder: '#FECACA',
  warnBorder: '#FDE68A',
  infoBorder: '#A5F3FC',
} as const;

export const DEFAULT_BRAND = '#6D5DFB';
export const DEFAULT_BRAND_INK = '#4F46E5';
export const DEFAULT_BRAND_SOFT = '#EEF2FF';
/** Viền indigo nhạt quanh thẻ/khối nhấn brandSoft. */
export const DEFAULT_BRAND_BORDER = '#C7D2FE';
/** Nền ĐẶC mặc định cho băng/bìa/header bảng (chữ trắng 6.3:1). */
export const DEFAULT_BRAND_DARK = '#4F46E5';
/** Huy hiệu/đường trang trí trên nền brandDark (KHÔNG làm màu chữ). */
export const DEFAULT_BRAND_BADGE = '#988CFC';

// ── LIQUID GLASS: alpha / bán kính / bóng (độ trong suốt của chính palette app) ──────────
export const GLASS = {
  /** Bo góc tấm kính (mm). */
  radius: 3.5,
  /** Viền ngoài trắng (mm) + alpha; viền trong brand alpha. */
  rimW: 0.3,
  rimOuter: 0.9,
  rimInner: 0.4,
  /** Nền tấm kính: trắng bán trong (phẳng, vector — gradient/blur làm PDF phình). */
  panel: 0.7,
  /** Highlight trắng dọc cạnh trên. */
  highlight: 0.95,
  /** Bóng mềm (brandDark) lệch xuống: 3 lớp bậc thang không blur (vector) cho cảm giác mềm. */
  shadowA: 0.075,
  shadowDy: 0.5,
  /** Tấm nhấn: nền brand + viền brand. */
  accentFill: 0.14,
  accentBorder: 0.35,
  /** Tông số liệu (xanh/đỏ/cam/cyan) phủ lên thẻ: rất nhẹ để số đậm vẫn ≥ 3:1. */
  toneFill: 0.05,
  toneRing: 0.4,
  /** Thân hàng bảng / zebra / đường kẻ. */
  rowAlpha: 0.55,
  zebra: 0.05,
  rowLine: 0.8,
  /** Viên trạng thái kính (nền màu + viền màu; chữ AA). */
  chipFill: 0.08,
  chipBorder: 0.35,
  /** Nền trang: 2 orb mềm (brand / cyan) cắt ở mép trang. */
  orb: 0.06,
  /** Masthead/bìa: bóng loáng nửa trên, viền trắng, chip kính. */
  gloss: 0.14,
  mastRim: 0.35,
  mastChip: 0.12,
  mastChipBorder: 0.4,
  /** Thanh/track mờ trong thẻ. */
  track: 0.12,
} as const;

/** rgba() từ #RRGGBB + alpha. */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
/** Phủ màu `hex` (alpha a) lên tấm kính trắng (alpha GLASS.panel) → MỘT rgba phẳng (giữ PDF nhẹ, vector). */
export function glassTint(hex: string, a: number): string {
  const wa = GLASS.panel;
  const outA = a + wa * (1 - a);
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.round((v * a + 255 * wa * (1 - a)) / outA);
  return `rgba(${c(r)},${c(g)},${c(b)},${Math.round(outA * 1000) / 1000})`;
}
/** Bóng mềm bậc thang (3 lớp không blur) màu brandDark. */
export function softShadow(deep: string, k = 1, aMul = 1): string {
  const d = GLASS.shadowDy;
  return [1, 2, 3].map((i) => `0 ${mm(d * i * k)} 0 ${rgba(deep, Math.round((GLASS.shadowA * aMul * 1000) / (i * 0.9)) / 1000)}`).join(',');
}
/** Hợp thành: phủ `fg` (alpha a) lên `bg` → hex đặc (dùng để đo tương phản nền xấu nhất). */
export function over(fg: string, a: number, bg: string): string {
  return mix(bg, fg, a);
}

// ── Thang chữ (pt) — sàn 7pt ───────────────────────────────────────────
export const TYPE = {
  cover: 30,
  display: 22,
  h1: 16,
  kpi: 14,
  h2: 11,
  body: 8.5,
  table: 8,
  label: 7,
  caption: 7,
} as const;
export const MIN_FONT_PT = 7;

// ── Khoảng cách / lề (mm) ──────────────────────────────────────────────
export const SPACE = { s1: 2, s2: 4, s3: 8, s4: 12, s5: 16, s6: 24 } as const;
/**
 * KHOẢNG THỞ CÂN BẰNG (mm) — chốt sau khi bản 6/6/12 (quá thưa, trang trống) và bản dày cũ (quá sát) đều bị chê:
 * gutter giữa thẻ cùng hàng 4.5, giữa các hàng thẻ 4.5, giữa các mục 9, tiêu đề mục → nội dung 5, padding trong thẻ 4.5
 * (thanh chiều thu gọn: dọc 3.4), line-height thân 1.45. Nội dung CHẢY LIÊN TỤC (không ép mỗi mục một trang).
 */
export const AIR = { gutter: 4.5, row: 4.5, section: 9, head: 5, pad: 4.5, padBar: 3.4, lineHeight: 1.45 } as const;
/** A4 dọc: lề trên 14 / phải 14 / dưới 18 (chừa footer) / trái 14 → vùng nội dung 182 x 265mm. */
export const PAGE = {
  w: 210,
  h: 297,
  top: 14,
  right: 14,
  bottom: 18,
  left: 14,
  radius: 2, // bo góc tối đa 2mm
  hair: 0.2,
  border: 0.3,
  strong: 0.5,
} as const;
export const CONTENT_W = PAGE.w - PAGE.left - PAGE.right; // 182
export const CONTENT_H = PAGE.h - PAGE.top - PAGE.bottom; // 265

export const pt = (n: number) => `${n}pt`;
export const mm = (n: number) => `${n}mm`;

// ── Màu: chuyển đổi + tương phản WCAG 2.x ───────────────────────────────
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
export function rgbToHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
function luminance(hex: string): number {
  const c = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** Tỉ lệ tương phản WCAG 2.x giữa hai màu hex. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** Trộn `hex` về phía `toward` theo tỉ lệ t (0..1). */
export function mix(hex: string, toward: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  return rgbToHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number]);
}
/** Tối dần `fg` (về đen) tới khi tương phản với `bg` ≥ min. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  let cur = fg.toUpperCase();
  for (let i = 0; i < 40 && contrast(cur, bg) < min; i++) cur = mix(cur, '#000000', 0.06);
  return cur;
}

export interface Brand {
  /** Màu CLB đã kiểm tra hợp lệ (dùng cho vạch/thanh/viền, KHÔNG cho chữ nhỏ). */
  brand: string;
  /** Brand tối dần để CHỮ TRẮNG trên nó ≥ 4.5:1 (nền đặc: panel bìa, huy hiệu). */
  brandDeep: string;
  /** Chữ màu brand trên nền trắng / brandSoft (≥ 4.5:1 trên cả hai). */
  brandInk: string;
  /** Brand pha 8% với trắng (nền thẻ nhấn, hộp AI). */
  brandSoft: string;
  /** Viền của khối brandSoft. */
  brandBorder: string;
  /** Huy hiệu/đường trang trí trên nền brandDeep (không dùng làm chữ). */
  badge: string;
}

/** Sinh bộ màu thương hiệu AN TOÀN tương phản từ màu CLB (rỗng/sai định dạng → mặc định). */
export function makeBrand(primary?: string | null): Brand {
  const p = typeof primary === 'string' && HEX_RE.test(primary.trim()) ? primary.trim().toUpperCase() : DEFAULT_BRAND;
  const isDefault = p === DEFAULT_BRAND;
  const brandSoft = isDefault ? DEFAULT_BRAND_SOFT : mix(p, '#FFFFFF', 0.92);
  const brandDeep = isDefault ? DEFAULT_BRAND_DARK : ensureContrast(p, '#FFFFFF', 4.5);
  const brandBorder = isDefault ? DEFAULT_BRAND_BORDER : mix(p, '#FFFFFF', 0.75);
  const badge = isDefault ? DEFAULT_BRAND_BADGE : mix(brandDeep, '#FFFFFF', 0.35);
  const brandInk = isDefault
    ? DEFAULT_BRAND_INK
    : ensureContrast(ensureContrast(mix(p, '#000000', 0.2), brandSoft, 4.5), over(p, GLASS.orb, brandSoft), 4.5); // cũng đạt trên wash+orb
  return { brand: p, brandDeep, brandInk, brandSoft, brandBorder, badge };
}

/** Tông nền wash trang (rất nhạt, chéo): brandSoft → brandSoft pha 45% trắng → brand pha 92% trắng. */
export function washColors(B: Brand): { a: string; b: string; c: string } {
  return { a: mix(B.brandSoft, '#FFFFFF', 0.55), b: mix(B.brandSoft, '#FFFFFF', 0.8), c: mix(B.brand, '#FFFFFF', 0.97) };
}

/** Alpha orb: GLASS.orb, giảm dần cho thương hiệu sẫm để chữ muted trực tiếp trên wash vẫn ≥ 4.5:1. */
export function orbAlphaFor(B: Brand): number {
  const base = washColors(B).a;
  let a: number = GLASS.orb;
  while (a > 0.04 && contrast(COLORS.muted, over(B.brand, a, base)) < 4.5) a = Math.round((a - 0.01) * 100) / 100;
  return a;
}

/** Bộ màu LIQUID GLASS suy ra từ thương hiệu (băng/bìa/masthead). */
export interface GlassPalette {
  /** Đầu tối của dải gradient (brandDeep pha ink). */
  mastFrom: string;
  /** Giữa dải = brandDeep. */
  mastMid: string;
  /** Đầu sáng của dải = brandDeep → brand, nhưng chữ trắng trên (đầu này + chip kính) vẫn ≥ 4.5:1. */
  mastTo: string;
  /** Nền xấu nhất sau chip kính trên masthead (để kiểm chữ trắng). */
  mastWorst: string;
}
export function makeGlassPalette(B: Brand): GlassPalette {
  // chip kính (trắng α) nằm trên băng → chữ trắng vẫn ≥ 4.6 sau chip: tối thêm brandDeep nếu cần (mặc định tím đã đạt)
  let mastMid = B.brandDeep;
  for (let i = 0; i < 30 && contrast('#FFFFFF', over('#FFFFFF', Math.max(GLASS.mastChip, GLASS.gloss) + 0.02, mastMid)) < 4.6; i++) mastMid = mix(mastMid, '#000000', 0.05);
  const mastFrom = mix(mastMid, COLORS.ink, 0.35);
  let mastTo = mastMid;
  for (let t = 0.6; t > 0; t -= 0.05) {
    const s = mix(mastMid, B.brand, t);
    if (contrast('#FFFFFF', over('#FFFFFF', Math.max(GLASS.mastChip, GLASS.gloss) + 0.02, s)) >= 4.6) {
      mastTo = s;
      break;
    }
  }
  return { mastFrom, mastMid, mastTo, mastWorst: over('#FFFFFF', GLASS.mastChip, mastTo) };
}

/**
 * CSS dùng chung cho mọi báo cáo HTML→PDF (Chrome): wash nền trang + tấm kính + băng masthead + chip.
 * Chrome in PDF KHÔNG đáng tin với backdrop-filter → giả kính bằng gradient + rgba + viền + box-shadow.
 */
export function glassCss(B: Brand): string {
  const G = makeGlassPalette(B);
  const w = (a: number) => `rgba(255,255,255,${a})`;
  const WASH = washColors(B);
  const orbA = orbAlphaFor(B);
  const shadow = softShadow(B.brandDeep);
  return `:root{--wash-a:${WASH.a};--wash-b:${WASH.b};--wash-c:${WASH.c};
  --g-bg:${w(GLASS.panel)};
  --g-rim:${mm(GLASS.rimW)} solid ${w(GLASS.rimOuter)};
  --g-sh:inset 0 0 0 ${mm(0.28)} ${rgba(B.brand, GLASS.rimInner)},inset 0 ${mm(0.35)} 0 ${w(GLASS.highlight)},${shadow};
  --g-r:${mm(GLASS.radius)};
  --acc-bg:${glassTint(B.brand, GLASS.accentFill)};
  --acc-ring:inset 0 0 0 ${mm(0.2)} ${rgba(B.brand, GLASS.accentBorder)},inset 0 ${mm(0.35)} 0 ${w(GLASS.highlight)},${shadow};
  --mast-from:${G.mastFrom};--mast-mid:${G.mastMid};--mast-to:${G.mastTo};
  --mast-bg:radial-gradient(ellipse 85% 85% at 20% 0%,${w(GLASS.gloss + 0.04)},${w(0)} 100%),linear-gradient(115deg,${G.mastFrom} 0%,${G.mastMid} 52%,${G.mastTo} 100%);
  --mast-rim:${mm(GLASS.rimW)} solid ${w(GLASS.mastRim)};
  --mast-sh:inset 0 ${mm(0.35)} 0 ${w(0.3)},${softShadow(B.brandDeep, 1.6, 4)};
  --chip-bg:${w(GLASS.mastChip)};--chip-bd:${mm(0.25)} solid ${w(GLASS.mastChipBorder)}}
/* Nền trang: wash chéo + 2 orb mềm (brand / cyan), lặp mỗi trang (fixed), cắt ở mép giấy */
.wash{position:fixed;z-index:-1;left:0;top:0;width:${mm(CONTENT_W)};height:${mm(PAGE.h - PAGE.top - PAGE.bottom)};overflow:hidden;
  background:linear-gradient(90deg,#fff 0,${w(0)} ${mm(5)}),linear-gradient(270deg,#fff 0,${w(0)} ${mm(5)}),linear-gradient(180deg,#fff 0,${w(0)} ${mm(5)}),linear-gradient(0deg,#fff 0,${w(0)} ${mm(5)}),radial-gradient(circle at 86% 12%,${rgba(B.brand, orbA)} 0,${rgba(B.brand, 0)} 70mm),radial-gradient(circle at 14% 88%,${rgba(COLORS.infoFill, orbA)} 0,${rgba(COLORS.infoFill, 0)} 64mm),linear-gradient(150deg,var(--wash-a) 0%,var(--wash-b) 52%,var(--wash-c) 100%)}
.glass{background:var(--g-bg);border:var(--g-rim);box-shadow:var(--g-sh);border-radius:var(--g-r)}
.glass.acc{background:var(--acc-bg);box-shadow:var(--acc-ring)}
.mastband{background:var(--mast-bg);border:var(--mast-rim);box-shadow:var(--mast-sh);border-radius:var(--g-r);color:#fff}
.gchip{background:var(--chip-bg);border:var(--chip-bd);border-radius:${mm(3)};color:#fff}`;
}

// ── Định dạng số / tiền / ngày (vi-VN) ─────────────────────────────────
const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
/** "1.234.567 đ" (có dấu cách trước đ, nhóm nghìn bằng "."). */
export function vnd(n: number | null | undefined): string {
  return `${nf.format(Math.round(Number(n) || 0))} đ`;
}
function dec1(x: number): string {
  // 1 chữ số thập phân kiểu vi-VN, bỏ ",0" thừa: 5.3 → "5,3", 12 → "12"
  return x.toFixed(1).replace('.', ',').replace(/,0$/, '');
}
/**
 * Tiền rút gọn kiểu vi-VN: "1,2 tỷ đ" / "1,2 triệu đ" / "850 nghìn đ".
 * short=true (nhãn hẹp): "1,2 tỷ đ" / "5,3 tr đ" / "850 k đ". Âm giữ dấu "-".
 */
export function vndCompact(n: number | null | undefined, short = false): string {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}${dec1(a / 1e9)} tỷ đ`;
  if (a >= 1e6) return `${sign}${dec1(a / 1e6)} ${short ? 'tr' : 'triệu'} đ`;
  if (a >= 1e3) return `${sign}${Math.round(a / 1e3)} ${short ? 'k' : 'nghìn'} đ`;
  return `${sign}${a} đ`;
}

const TZ = 'Asia/Ho_Chi_Minh';
function partsOf(d: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d)) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  if (out.hour === '24') out.hour = '00';
  return out;
}
/** "dd/MM/yyyy HH:mm" (giờ VN). */
export function dateTimeVN(d: Date = new Date()): string {
  const p = partsOf(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
/** Mã tài liệu: PF-EXEC-yyMMdd-HHmm (giờ VN) — cùng chuỗi bản FE. */
export function docCode(d: Date = new Date(), kind = 'EXEC'): string {
  const p = partsOf(d);
  return `PF-${kind}-${p.year.slice(2)}${p.month}${p.day}-${p.hour}${p.minute}`;
}

export const DOC_TITLE = 'Báo cáo điều hành';
export const FALLBACK_CLUB = 'PickleFund';

/** Chuỗi footer TRÁI: "CLB · Tên TL · Mã TL" (tên CLB rỗng → PickleFund). */
export function footerLeftText(clubName: unknown, docTitle: string, code: string): string {
  const club = String(clubName ?? '').trim() || FALLBACK_CLUB;
  return `${club} · ${docTitle} · ${code}`;
}

export const escHtml = (x: unknown) =>
  String(x ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * footerTemplate cho Chromium: trái `CLB · Tên TL · Mã TL`, phải `Trang x / y`.
 * Chữ 7pt màu muted, hairline phía trên. Nhúng @font-face data-URI (Be Vietnam Pro) khi có font
 * để tên CLB CÓ DẤU hiển thị đúng trong container thiếu font; không có font → font hệ thống (vẫn giữ dấu).
 */
export function buildFooterTemplate(
  leftText: string,
  fontRegularBase64?: string | null,
): string {
  const face = fontRegularBase64
    ? `<style>@font-face{font-family:'BVPF';font-weight:400;src:url(data:font/ttf;base64,${fontRegularBase64}) format('truetype');}</style>`
    : '';
  const fam = fontRegularBase64 ? "'BVPF','Be Vietnam Pro',Arial,sans-serif" : "'Be Vietnam Pro',Arial,sans-serif";
  return `${face}<div style="box-sizing:border-box;width:100%;padding:${mm(SPACE.s1)} ${mm(PAGE.right)} 0 ${mm(PAGE.left)};margin:0;-webkit-print-color-adjust:exact;">
    <div style="box-sizing:border-box;width:100%;border-top:${mm(PAGE.hair)} solid ${COLORS.hairline};padding-top:${mm(1.5)};display:flex;justify-content:space-between;align-items:center;font-family:${fam};font-size:${pt(TYPE.caption)};line-height:1.3;color:${COLORS.muted};">
      <span>${escHtml(leftText)}</span>
      <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  </div>`;
}

/** Lề cho page.pdf() (chuỗi mm) — khớp @page trong HTML. */
export const PDF_MARGIN = {
  top: mm(PAGE.top),
  right: mm(PAGE.right),
  bottom: mm(PAGE.bottom),
  left: mm(PAGE.left),
};
/** Quy tắc @page dùng chung (HTML phải khai CÙNG lề, nếu không Chrome bỏ qua lề của options và footer đè nội dung). */
export const PAGE_CSS = `@page{size:A4;margin:${PDF_MARGIN.top} ${PDF_MARGIN.right} ${PDF_MARGIN.bottom} ${PDF_MARGIN.left}}`;
