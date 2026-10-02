/**
 * Token thiết kế "Luxury SaaS" cho PDF phía SERVER (Chrome HTML→PDF + fallback jsPDF).
 * BẢN SAO có CÙNG giá trị với spec xuất tài liệu của FE (ink/ink2/muted/hairline/semantic/brand mặc định);
 * export-tokens.spec.ts khoá giá trị + tương phản WCAG ≥ 4.5 cho mọi cặp chữ/nền dùng thật.
 * Luật: 1 màu chủ đạo (màu CLB), không gradient/đổ bóng/emoji, chữ ≥ 7pt, đơn vị pt/mm sinh từ token.
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
  // nền nhấn trạng thái
  posTint: '#F0FDF4',
  negTint: '#FEF2F2',
  warnTint: '#FFFBEB',
  infoTint: '#ECFEFF',
} as const;

export const DEFAULT_BRAND = '#6D5DFB';
export const DEFAULT_BRAND_INK = '#4F46E5';
export const DEFAULT_BRAND_SOFT = '#EEF2FF';

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
/** A4 dọc: lề trên 14 / phải 16 / dưới 20 (≥18: chừa chỗ footer) / trái 16. */
export const PAGE = {
  w: 210,
  h: 297,
  top: 14,
  right: 16,
  bottom: 20,
  left: 16,
  radius: 2, // bo góc tối đa 2mm
  hair: 0.2,
  border: 0.3,
  strong: 0.5,
} as const;
export const CONTENT_W = PAGE.w - PAGE.left - PAGE.right; // 178
export const CONTENT_H = PAGE.h - PAGE.top - PAGE.bottom; // 263

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
  /** Brand pha 8% với trắng (nền header bảng, thẻ nhấn). */
  brandSoft: string;
}

/** Sinh bộ màu thương hiệu AN TOÀN tương phản từ màu CLB (rỗng/sai định dạng → mặc định). */
export function makeBrand(primary?: string | null): Brand {
  const p = typeof primary === 'string' && HEX_RE.test(primary.trim()) ? primary.trim().toUpperCase() : DEFAULT_BRAND;
  const isDefault = p === DEFAULT_BRAND;
  const brandSoft = isDefault ? DEFAULT_BRAND_SOFT : mix(p, '#FFFFFF', 0.92);
  const brandDeep = ensureContrast(p, '#FFFFFF', 4.5);
  const brandInk = isDefault
    ? DEFAULT_BRAND_INK
    : ensureContrast(mix(p, '#000000', 0.2), brandSoft, 4.5);
  return { brand: p, brandDeep, brandInk, brandSoft };
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
