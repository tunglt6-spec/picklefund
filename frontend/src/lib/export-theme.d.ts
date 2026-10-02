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
    | 'posFill' | 'negFill' | 'warnFill' | 'posTint' | 'posEdge' | 'negTint' | 'negEdge' | 'warnTint' | 'warnEdge'
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
export function makeBrand(hex?: string | null): BrandPalette
export function css(c: RGB): string

export const fmt: {
  vnd(n: number): string
  num(n: number): string
  dateTime(v: string | Date | null | undefined): string
  docCode(type: string, d?: Date): string
}
