/** Khai báo kiểu cho export-theme.js (token Luxury SaaS dùng chung mọi exporter). */

export type RGB = [number, number, number] | number[]

export const DEFAULT_BRAND_HEX: string
export const MIN_PT: number
export const CONTENT_W_PORTRAIT: number
export const CONTENT_W_LANDSCAPE: number

export const THEME: {
  color: Record<
    | 'ink' | 'ink2' | 'muted' | 'line' | 'lineStrong' | 'connector' | 'surface2' | 'white'
    | 'lineSoft' | 'pos' | 'neg' | 'orange' | 'cyan' | 'amber' | 'posText' | 'negText' | 'warn' | 'info'
    | 'posFill' | 'negFill' | 'warnFill' | 'posDeep' | 'negDeep' | 'warnDeep' | 'posTint' | 'posEdge' | 'negTint' | 'negEdge' | 'warnTint' | 'warnEdge'
    | 'goldTint' | 'silverTint' | 'bronzeTint',
    RGB
  >
  type: { display: number; h1: number; kpi: number; h2: number; body: number; cell: number; label: number; caption: number }
  space: { xs: number; s: number; m: number; l: number; xl: number; xxl: number }
  page: {
    portrait: { w: number; h: number }
    landscape: { w: number; h: number }
    margin: number
    footerLine: number
    footerText: number
    bottomPad: number
  }
  line: { hair: number; border: number; strong: number; brandRule: number }
  radius: { card: number; bar: number }
  row: { h: number; lineH: number; padX: number }
  glass: {
    tile: number; row: number; accent: number; accentEdge: number
    edgeWhite: number; edgeWhiteW: number; hair: number; hairW: number; highlight: number; highlightW: number
    shadow: number[]; shadowStep: number; shadowDy: number
    radius: { panel: number; band: number; chip: number; bar: number }
    mast: { gloss: number; edge: number; chip: number; chipEdge: number; ring: number; ringGlass: number }
    orb: { alpha: number; rings: number }
    zebra: number; sep: number; sepHair: number
    chip: { base: number; tint: number; edge: number }
    box: number
  }
  fontFamily: string
}

export interface BrandPalette {
  brand: RGB
  /** Băng masthead + chữ tiêu đề mục (mặc định #4F46E5). */
  brandDark: RGB
  /** Alias của brandDark (tương thích mã cũ). */
  brandInk: RGB
  /** Nền header bảng: nhạt nhất mà chữ trắng ≥ 4.5:1. */
  brandMid: RGB
  brandSoft: RGB
  /** Liquid Glass: 2 đầu gradient băng + header bảng (chữ trắng ≥ 4.6:1 sau lớp bóng loáng). */
  glassStart: RGB
  glassEnd: RGB
  /** Wash nền trang: 3 nút (chéo). */
  washA: RGB
  washB: RGB
  washC: RGB
  brandEdge: RGB
  brandBorder: RGB
  badgeOnBrand: RGB
  hex: string
  inkHex: string
  softHex: string
}

export function luminance(c: RGB): number
export function contrast(a: RGB, b: RGB): number
export function mix(c: RGB, target: RGB, k: number): number[]
export function toHex(c: RGB): string
export function hexToRgb(hex: string | null | undefined): number[] | null
export const EXPORT_USE_CLUB_COLOR: boolean
export function makeBrand(hex?: string | null, allowCustom?: boolean): BrandPalette
export function css(c: RGB): string
export function rgba(c: RGB, a: number): string
export function glassWorstBg(brand: BrandPalette, alpha?: number): number[]

export const fmt: {
  vnd(n: number): string
  num(n: number): string
  dateTime(v: string | Date | null | undefined): string
  docCode(type: string, d?: Date): string
}
