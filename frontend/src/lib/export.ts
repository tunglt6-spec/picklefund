// xlsx / jspdf / html2canvas-pro được DYNAMIC import trong từng hàm export (chỉ tải khi bấm
// nút Xuất) → loại ~700-800KB khỏi bundle khởi động. html2canvas-pro thay html2canvas (gộp 1 lib).
//
// QUY ƯỚC LỖI: hàm export trả Promise và THROW khi thất bại (không toast trong lib) → call site
// await + try/catch (xem hooks/useExportRunner). Người dùng bấm Hủy hộp thoại lưu = không lỗi.
import { THEME, CONTENT_W_PORTRAIT, fmt as themeFmt, makeBrand, css } from './export-theme.js'

/* ─── EPIC10C: branding cho PDF/export ───
 * brandingStore đẩy giá trị qua setExportBranding (không đổi signature từng hàm).
 * Bỏ trống → fallback PickleFund. */
const DEFAULT_BRAND_COLOR = '#6D5DFB'
let exportBranding = {
  displayName: 'PickleFund',
  pdfFooter: 'PickleFund',
  logoUrl: null as string | null,
  primaryColor: DEFAULT_BRAND_COLOR,
}
/** Ghi nhận 1 lần XUẤT báo cáo (best-effort, fire-and-forget) → Command Center đếm "báo cáo đã xuất". */
export function logReportExport(type: string, format: string) {
  void import('./api')
    .then((m) => m.default.post('/report-exports', { type, format }).catch(() => {}))
    .catch(() => {})
}

/** Loại báo cáo chung để ghi log: chỉ 2 token đầu của tên file (nhãn cố định, KHÔNG kèm tên người/kỳ). */
export function reportTypeOf(fileBase: string): string {
  return String(fileBase ?? '').split('_').filter(Boolean).slice(0, 2).join('_').slice(0, 60) || 'report'
}

/** MERGE (Partial): chỉ field được truyền (≠ undefined) mới đổi; null/'' = về mặc định PickleFund. */
export function setExportBranding(b: {
  displayName?: string | null
  pdfFooter?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}) {
  const next = { ...exportBranding }
  if (b.displayName !== undefined) next.displayName = b.displayName ? b.displayName : 'PickleFund'
  if (b.pdfFooter !== undefined) next.pdfFooter = b.pdfFooter ? b.pdfFooter : 'PickleFund'
  if (b.logoUrl !== undefined) next.logoUrl = b.logoUrl ?? null
  if (b.primaryColor !== undefined) {
    const hex = (b.primaryColor ?? '').trim()
    next.primaryColor = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_BRAND_COLOR
  }
  exportBranding = next
}
const brandName = () => exportBranding.displayName
const brandFooter = () => exportBranding.pdfFooter
/** Màu chủ đạo cho header export (theo CLB, mặc định tím PickleFund). */
const brandColor = () => exportBranding.primaryColor

/* Logo PickleFund MẶC ĐỊNH cho báo cáo: con-quay TRẮNG crop sát, nền TRONG SUỐT (KHÔNG nền
   trắng) → đặt thẳng trên header màu brand, hợp cả ảnh lẫn PDF. CLB chưa đặt logo riêng thì
   mọi export dùng logo chung này. */
const DEFAULT_LOGO_URL = '/logo-pf-report-white.png'

/* ── Logo CLB cho PDF vector: tải 1 lần / URL → dataURL + kích thước gốc.
   Best-effort: lỗi mạng/CORS/ảnh hỏng → trả null, PDF vẫn xuất bình thường không logo. ── */
type BrandLogo = { dataUrl: string; w: number; h: number; onDark?: boolean }
let brandLogoCache: { url: string; logo: BrandLogo | null } | null = null
async function loadBrandLogo(): Promise<BrandLogo | null> {
  // Không có logo CLB → dùng logo PickleFund mặc định (áp cho tất cả CLB).
  const url = exportBranding.logoUrl || DEFAULT_LOGO_URL
  if (!url) return null
  if (brandLogoCache && brandLogoCache.url === url) return brandLogoCache.logo
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('logo fetch failed')
    const blob = await res.blob()
    if (!/^image\/(png|jpe?g)$/i.test(blob.type)) throw new Error('logo format not supported')
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = reject
      img.src = dataUrl
    })
    // Logo mặc định là con-quay TRẮNG (nền trong suốt) → onDark: vẽ thẳng trên băng brandDark của masthead.
    brandLogoCache = { url, logo: { dataUrl, w: dims.w, h: dims.h, onDark: url === DEFAULT_LOGO_URL } }
  } catch {
    brandLogoCache = { url, logo: null }
  }
  return brandLogoCache.logo
}

/** Branding truyền vào MỌI builder PDF vector: tên/footer/logo + màu brand CLB (mặc định tím PickleFund). */
const pdfBranding = (logo: BrandLogo | null) => ({ name: brandName(), footer: brandFooter(), logo, primaryColor: brandColor() })

/* ─── helpers ─── */
/** Tiền VND deterministic (không phụ thuộc ICU): 1234567 → "1.234.567 đ", âm → "-5.000 đ". Dùng chung THEME/fmt. */
const formatVND = themeFmt.vnd
/** Số thường có phân cách nghìn kiểu VN: 1234567 → "1.234.567", -5000 → "-5.000", 1.5 → "1,5". */
export const formatNumberVN = themeFmt.num

/** Các thành phần ngày-giờ theo múi giờ Việt Nam (không phụ thuộc múi giờ máy / ICU vi-VN). */
function hcmParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hh = get('hour')
  return { dd: get('day'), mm: get('month'), yyyy: get('year'), hh: hh === '24' ? '00' : hh, mi: get('minute'), ss: get('second') }
}
/** "dd/MM/yyyy" (zero-pad, giờ VN). */
function today() {
  const p = hcmParts()
  return `${p.dd}/${p.mm}/${p.yyyy}`
}
/** "HH:mm:ss dd/MM/yyyy" (giờ VN). */
function todayFull() {
  const p = hcmParts()
  return `${p.hh}:${p.mi}:${p.ss} ${p.dd}/${p.mm}/${p.yyyy}`
}
/** "dd-MM-yyyy" cho tên file. */
const dateStamp = () => today().replace(/\//g, '-')
/** ISO/Date → "dd/MM/yyyy HH:mm:ss" (giờ VN, ngày trước giờ); không hợp lệ → "—" (không in "Invalid Date"). */
function formatDateTime(v: string | Date | null | undefined): string {
  return themeFmt.dateTime(v)
}

/** Tên file an toàn: giữ tiếng Việt; "/" và "\" → "-" ("10/2026" → "10-2026"); " - " → "-" (không sinh "_-_");
 *  khoảng trắng → "_"; bỏ ký tự cấm ? % * : | " < > và ký tự điều khiển; gộp "_"/"-" lặp. */
export function safeFileName(s: string): string {
  const out = String(s ?? '')
    .replace(/[/\\]/g, '-')
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[?%*:|"<>]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/-{2,}/g, '-')
    .replace(/[_-]*-[_-]*/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
  return out.slice(0, 120) || 'export'
}

/** Tên file tải về: {safeFileName(base)}_{dd-MM-yyyy}.{ext} — dùng chung cho mọi export (kể cả PDF phía server). */
export function exportFileName(base: string, ext: string): string {
  return `${safeFileName(base)}_${dateStamp()}.${ext}`
}

/** Escape HTML cho MỌI biến chèn vào innerHTML (chặn HTML/script injection). */
export function escHtml(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Nhãn hình thức thanh toán: chỉ map giá trị chuẩn, giá trị tự do giữ nguyên chuỗi. */
export function methodLabel(m: string | null | undefined): string {
  const v = String(m ?? '').trim()
  if (v === 'cash') return 'Tiền mặt'
  if (v === 'bank_transfer') return 'Chuyển khoản'
  return v
}

/** Tải 1 Blob qua thẻ <a download>. */
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lưu PNG: hộp thoại "Lưu file" nếu có, fallback tải về. Trả false nếu người dùng bấm Hủy. */
async function savePngBlob(blob: Blob, name: string): Promise<boolean> {
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({ suggestedName: name, types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }] })
      const w = await handle.createWritable(); await w.write(blob); await w.close()
      return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { if (e?.name === 'AbortError') return false }
  }
  downloadBlob(blob, name)
  return true
}

/** Lưu 1 tài liệu jsPDF: hộp thoại "Lưu file" nếu có, fallback tải về Downloads.
 *  Ghi log "báo cáo đã xuất" SAU khi lưu thành công (Hủy hộp thoại thì không ghi). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function savePdfDoc(pdf: any, filename: string, opts: { log?: boolean } = {}) {
  const suggestedName = `${safeFileName(filename)}_${dateStamp()}.pdf`
  const done = () => { if (opts.log !== false) logReportExport(reportTypeOf(filename), 'pdf') }

  // File System Access API — mở hộp thoại "Lưu file" để người dùng chọn thư mục
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      const blob = pdf.output('blob')
      await writable.write(blob)
      await writable.close()
      done()
      return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Người dùng bấm Cancel → không làm gì
      if (e?.name === 'AbortError') return
    }
  }

  // Fallback: download thông thường (trình duyệt tự lưu vào thư mục Downloads)
  pdf.save(suggestedName)
  done()
}

/* ── Xuất ẢNH (PNG) theo CÙNG token với PDF vector (THEME): masthead BĂNG MÀU ĐẶC brandDark,
   thẻ KPI nhấn, header bảng brand đặc, footer "CLB · Tên TL · Mã TL". Font Be Vietnam Pro (nạp qua FontFace),
   logo CLB, màu brand CLB. Render off-screen HTML rồi rasterize 1 khung ảnh sắc nét. ── */
const PNG_ROOT = 'pf-png-render-root'
const ptPx = (pt: number) => `${((pt * 4) / 3).toFixed(2)}px`

/** Nạp Be Vietnam Pro (400/700) cho html2canvas — lỗi/không hỗ trợ thì rơi về font hệ thống, ảnh vẫn xuất. */
let reportFontPromise: Promise<void> | null = null
function ensureReportFont(): Promise<void> {
  if (!reportFontPromise) {
    reportFontPromise = (async () => {
      if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return
      const faces: [string, string][] = [['400', '/fonts/BeVietnamPro-Regular.ttf'], ['700', '/fonts/BeVietnamPro-Bold.ttf']]
      await Promise.all(faces.map(async ([weight, url]) => {
        const f = new FontFace('Be Vietnam Pro', `url(${url})`, { weight })
        await f.load()
        document.fonts.add(f)
      }))
    })().catch(() => { reportFontPromise = null })
  }
  return reportFontPromise
}

function pngCss(): string {
  const C = THEME.color
  const T = THEME.type
  const b = makeBrand(brandColor())
  const r = css
  // html2canvas dựng lại DOM trong iframe: font nạp bằng FontFace ở document cha KHÔNG có trong iframe → chữ đo bằng
  // font dự phòng nhưng vẽ bằng Be Vietnam Pro (dính chữ, chồng "đ"). Khai báo @font-face ngay trong <style> để iframe tự nạp.
  const origin = typeof location !== 'undefined' && location.origin && location.origin !== 'null' ? location.origin : ''
  const fontFaces = [['400', 'Regular'], ['700', 'Bold']]
    .map(([w, n]) => `@font-face { font-family: 'Be Vietnam Pro'; font-weight: ${w}; font-style: normal; font-display: block; src: url('${origin}/fonts/BeVietnamPro-${n}.ttf') format('truetype'); }`)
    .join(' ')
  return `
  ${fontFaces}
  .${PNG_ROOT}, .${PNG_ROOT} * { box-sizing: border-box; margin: 0; padding: 0; }
  .${PNG_ROOT} { font-family: ${THEME.fontFamily}; color: ${r(C.ink)}; background: #fff; }
  .${PNG_ROOT} .page { width: 794px; padding: 45px 45px 30px; background: #fff; }
  .${PNG_ROOT} .m-head { display: flex; align-items: center; gap: 18px; padding: 22px 26px 24px; background: ${r(b.brandDark)}; border-radius: 10px; border-bottom: 6px solid ${r(b.brand)}; color: #fff; }
  .${PNG_ROOT} .m-logo { width: 58px; height: 58px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .${PNG_ROOT} .m-logo.dark { padding: 2px; }
  .${PNG_ROOT} .m-logo:not(.dark):not(.ini) { background: #fff; padding: 7px; }
  .${PNG_ROOT} .m-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .${PNG_ROOT} .m-logo.ini { background: #fff; color: ${r(b.brandDark)}; border-radius: 50%; font-weight: 700; font-size: ${ptPx(T.h1 + 4)}; }
  .${PNG_ROOT} .m-main { flex: 1; min-width: 0; }
  .${PNG_ROOT} .m-club { font-size: ${ptPx(T.label)}; font-weight: 700; letter-spacing: .3pt; text-transform: uppercase; color: #fff; }
  .${PNG_ROOT} .m-title { font-size: ${ptPx(T.h1 + 2)}; font-weight: 700; line-height: 1.2; margin-top: 4px; color: #fff; }
  .${PNG_ROOT} .m-sub { font-size: ${ptPx(T.body)}; color: #fff; margin-top: 4px; }
  .${PNG_ROOT} .m-right { text-align: right; font-size: ${ptPx(T.caption)}; line-height: 1.6; color: #fff; flex-shrink: 0; max-width: 230px; }
  .${PNG_ROOT} .kpis { display: flex; gap: 12px; margin-top: 22px; }
  .${PNG_ROOT} .kpi { flex: 1; min-width: 0; background: #fff; border: 1px solid ${r(C.line)}; border-radius: 8px; padding: 13px 15px; }
  .${PNG_ROOT} .kpi.accent { background: ${r(b.brandSoft)}; border: 1px solid ${r(b.brandEdge)}; }
  .${PNG_ROOT} .kpi .l { font-size: ${ptPx(T.label)}; font-weight: 700; letter-spacing: .3pt; text-transform: uppercase; color: ${r(C.muted)}; }
  .${PNG_ROOT} .kpi.accent .l { color: ${r(b.brandDark)}; }
  .${PNG_ROOT} .kpi .v { font-size: ${ptPx(T.kpi)}; font-weight: 700; margin-top: 6px; white-space: nowrap; color: ${r(C.ink)}; }
  .${PNG_ROOT} .kpi.accent .v { color: ${r(b.brandDark)}; }
  .${PNG_ROOT} .kpi .v.pos { color: ${r(C.pos)}; }
  .${PNG_ROOT} .kpi .v.neg { color: ${r(C.neg)}; }
  .${PNG_ROOT} table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 22px; }
  .${PNG_ROOT} th { background: ${r(b.brandMid)}; color: #fff; padding: 10px 14px; text-align: left; font-size: ${ptPx(T.label)}; font-weight: 700; letter-spacing: .3pt; text-transform: uppercase; }
  .${PNG_ROOT} th { box-shadow: 1px 0 0 0 ${r(b.brandMid)}; }
  .${PNG_ROOT} th:first-child { border-radius: 6px 0 0 6px; }
  .${PNG_ROOT} th:last-child { border-radius: 0 6px 6px 0; }
  .${PNG_ROOT} th.right, .${PNG_ROOT} td.right { text-align: right; }
  .${PNG_ROOT} td { padding: 9px 14px; border-bottom: 1px solid ${r(C.lineSoft)}; font-size: ${ptPx(T.cell)}; color: ${r(C.ink)}; }
  .${PNG_ROOT} tbody tr:nth-child(even) td { background: ${r(C.surface2)}; }
  .${PNG_ROOT} td.right { font-weight: 700; white-space: nowrap; font-size: ${ptPx(T.body)}; }
  .${PNG_ROOT} td.pos { color: ${r(C.pos)}; }
  .${PNG_ROOT} td.neg { color: ${r(C.neg)}; }
  .${PNG_ROOT} tr.total td { background: ${r(b.brandSoft)}; border-top: 1px solid ${r(b.brandEdge)}; border-bottom: 1px solid ${r(b.brandEdge)}; font-weight: 700; color: ${r(b.brandDark)}; }
  .${PNG_ROOT} tr.total td:first-child { border-left: 1px solid ${r(b.brandEdge)}; border-radius: 8px 0 0 8px; }
  .${PNG_ROOT} tr.total td:last-child { border-right: 1px solid ${r(b.brandEdge)}; border-radius: 0 8px 8px 0; color: ${r(C.ink)}; }
  .${PNG_ROOT} tr.total td.pos { color: ${r(C.pos)}; }
  .${PNG_ROOT} tr.total td.neg { color: ${r(C.neg)}; }
  .${PNG_ROOT} .foot { margin-top: 26px; padding-top: 9px; border-top: 1px solid ${r(C.line)}; display: flex; justify-content: space-between; gap: 12px; font-size: ${ptPx(T.caption)}; color: ${r(C.muted)}; }
  `
}

type ReportLogo = { dataUrl: string; w: number; h: number; onDark?: boolean }

/** Masthead dùng chung cho ẢNH (logo CLB + tên CLB + tên TL + kỳ + mã TL + ngày xuất + vạch brand). */
function reportMastheadHtml(o: { title: string; subtitle?: string; meta?: string; logo: ReportLogo | null; docCode: string }) {
  const logoHtml = o.logo
    ? `<div class="m-logo${o.logo.onDark ? ' dark' : ''}"><img src="${escHtml(o.logo.dataUrl)}"/></div>`
    : `<div class="m-logo ini">${escHtml((Array.from(brandName().replace(/^(CLB|Câu lạc bộ)\s+/i, ''))[0] ?? 'P').toUpperCase())}</div>`
  return `<div class="m-head">
      ${logoHtml}
      <div class="m-main">
        <div class="m-club">${escHtml(brandName())}</div>
        <div class="m-title">${escHtml(o.title)}</div>
        ${o.subtitle ? `<div class="m-sub">${escHtml(o.subtitle)}</div>` : ''}
      </div>
      <div class="m-right"><div>Mã TL: ${escHtml(o.docCode)}</div><div>Xuất ${escHtml(todayFull())}</div>${o.meta ? `<div>${escHtml(o.meta)}</div>` : ''}</div>
    </div>`
}
function reportFooterHtml(title: string, docCode: string) {
  return `<div class="foot"><span>${escHtml(brandFooter())} · ${escHtml(title)} · ${escHtml(docCode)}</span><span>Trang 1 / 1</span></div>`
}

async function renderReportPng(sectionsHtml: string, fileBase: string) {
  const [{ default: html2canvas }] = await Promise.all([import('html2canvas-pro'), ensureReportFont()])
  const container = document.createElement('div')
  container.className = PNG_ROOT
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff;'
  container.innerHTML = `<style>${pngCss()}</style><div class="page">${sectionsHtml}</div>`
  document.body.appendChild(container)
  let canvas: HTMLCanvasElement
  try {
    if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* bỏ qua */ } }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const pageEl = container.querySelector('.page') as HTMLElement
    canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
  } finally {
    document.body.removeChild(container) // luôn dọn node off-screen kể cả khi html2canvas lỗi
  }
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas toBlob failed'))), 'image/png', 1.0),
  )
  const saved = await savePngBlob(blob, `${safeFileName(fileBase)}_${dateStamp()}.png`)
  if (saved) logReportExport(reportTypeOf(fileBase), 'image')
}

/** Dựng wrap off-screen (masthead + clone element + footer) và chụp canvas. */
async function captureReportCanvas(
  elementId: string,
  report: { title: string; subtitle?: string; meta?: string },
): Promise<HTMLCanvasElement> {
  const [{ default: html2canvas }, logo] = await Promise.all([import('html2canvas-pro'), loadBrandLogo(), ensureReportFont()])
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')
  const width = Math.max(Math.round(el.getBoundingClientRect().width) || 720, 560)
  const docCode = themeFmt.docCode('ANH')

  const wrap = document.createElement('div')
  wrap.className = PNG_ROOT
  wrap.style.cssText = `position:fixed;left:-99999px;top:0;z-index:-1;width:${width + 48}px;background:#fff;`
  wrap.innerHTML = `<style>${pngCss()}</style><div style="padding:24px 24px 0;">${reportMastheadHtml({ ...report, logo, docCode })}</div><div data-pf-body style="padding:18px 24px;background:#fff;"></div><div style="padding:0 24px 20px;">${reportFooterHtml(report.title, docCode)}</div>`
  const body = wrap.querySelector('[data-pf-body]') as HTMLElement
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-html2canvas-ignore]').forEach(n => n.remove())
  // Bỏ mọi ràng buộc chiều cao/stretch từ layout cha → clone co đúng nội dung (hết whitespace).
  clone.style.width = width + 'px'
  clone.style.height = 'auto'
  clone.style.minHeight = '0'
  clone.style.maxHeight = 'none'
  clone.style.flex = 'none'
  clone.style.margin = '0'
  body.appendChild(clone)
  document.body.appendChild(wrap)
  try {
    if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* bỏ qua */ } }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    return await html2canvas(wrap, {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false,
      onclone: (doc) => { doc.documentElement.setAttribute('data-theme', 'light'); doc.documentElement.style.colorScheme = 'light' },
    })
  } finally {
    document.body.removeChild(wrap) // luôn dọn node off-screen kể cả khi html2canvas lỗi
  }
}

/** Chụp 1 element DOM thành ẢNH REPORT chuẩn SaaS (cùng token với PDF): masthead (màu + logo CLB)
   + nội dung (clone, ép light, tự co đúng chiều cao → HẾT whitespace) + footer. Dùng chung cho
   mọi màn (BXH, lịch thi đấu…). `report` bắt buộc để thống nhất khung; ép light qua onclone. */
export async function captureElementAsReportPng(
  elementId: string,
  fileBase: string,
  report: { title: string; subtitle?: string; meta?: string },
) {
  const canvas = await captureReportCanvas(elementId, report)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas toBlob failed'))), 'image/png', 1.0),
  )
  const saved = await savePngBlob(blob, `${safeFileName(fileBase)}_${dateStamp()}.png`)
  if (saved) logReportExport(reportTypeOf(fileBase), 'image')
}

export interface FinanceOverviewInput {
  clubName: string
  periodName: string
  totalIncome: number
  totalExpense: number
  balance: number
  miniBalance: number
  clubAssets: number
  carryForward: number
  memberCount: number
  sessionCount: number
  confirmedCount: number
}

/** Ảnh Tổng quan tài chính — CÙNG TOKEN với PDF (masthead + thẻ KPI + bảng + hàng tổng + footer). */
export async function exportFinanceOverviewImage(d: FinanceOverviewInput) {
  const logo = await loadBrandLogo()
  const TITLE = 'Tổng quan tài chính'
  const docCode = themeFmt.docCode('TQ')
  const e = escHtml
  const kpi = (label: string, value: number, accent = false, tone = '') =>
    `<div class="kpi${accent ? ' accent' : ''}"><div class="l">${e(label)}</div><div class="v${value < 0 ? ' neg' : tone ? ' ' + tone : ''}">${e(themeFmt.vnd(value))}</div></div>`
  const row = (label: string, value: number, tone = '') =>
    `<tr><td>${e(label)}</td><td class="right${value < 0 ? ' neg' : tone ? ' ' + tone : ''}">${e(themeFmt.vnd(value))}</td></tr>`
  const sections = `
    ${reportMastheadHtml({ title: TITLE, subtitle: `${d.clubName} · ${d.periodName}`, meta: `${d.memberCount} thành viên · ${d.sessionCount} buổi · đã đóng ${d.confirmedCount}/${d.memberCount}`, logo, docCode })}
    <div class="kpis">${kpi('Tổng thu', d.totalIncome, false, 'pos')}${kpi('Tổng chi', d.totalExpense, false, 'neg')}${kpi('Tồn Quỹ Chính', d.balance, true)}</div>
    <table>
      <thead><tr><th>Chỉ số</th><th class="right">Giá trị</th></tr></thead>
      <tbody>
        ${row('Tổng thu (Quỹ Chính)', d.totalIncome, 'pos')}
        ${row('Tổng chi (Quỹ Chính)', d.totalExpense, 'neg')}
        ${row('Tồn Quỹ Chính', d.balance)}
        ${row('Tồn Quỹ Phụ', d.miniBalance)}
        ${row('Số dư chuyển kỳ', d.carryForward)}
        <tr class="total"><td>Tổng tài sản CLB</td><td class="right${d.clubAssets < 0 ? ' neg' : ''}">${e(themeFmt.vnd(d.clubAssets))}</td></tr>
      </tbody>
    </table>
    ${reportFooterHtml(TITLE, docCode)}
  `
  return renderReportPng(sections, `Tai_chinh_${d.periodName.replace(/\s/g, '_')}`)
}

/* ════════════════════════════════════════
   BIÊN NHẬN THANH TOÁN GÓI (Billing receipt) — PDF vector (cùng engine phiếu)
════════════════════════════════════════ */
export interface BillingReceiptData {
  clubName: string
  invoiceNumber: string
  orderCode: string
  planLabel: string
  cycleLabel: string
  amount: number
  discount?: number
  paidAt: string // ISO
  gateway: string
  billingInfo?: { buyerName?: string; taxCode?: string; address?: string } | null
}

export async function exportBillingReceiptPDF(d: BillingReceiptData) {
  const [{ default: jsPDF }, fonts, { buildBillingReceiptPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildBillingReceiptPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    receipt: {
      ...d,
      paidAtText: formatDateTime(d.paidAt),
      printedDateText: today(),
      printedAtText: todayFull(),
    },
  })
  // Phiếu/biên nhận cá nhân: không tính vào "báo cáo đã xuất" của Command Center.
  return savePdfDoc(doc, `BienNhan_${d.invoiceNumber}`, { log: false })
}

/* ════════════════════════════════════════
   EXCEL
════════════════════════════════════════ */
/* ── Excel chuẩn "Luxury SaaS" (xlsx-js-style): style/độ rộng/vá XML print nằm ở `excel-kit.ts`.
   Khối tiêu đề 4 hàng (CLB · tên tài liệu · phạm vi · ngày xuất + mã PF-…) → hàng đệm → header brandSoft →
   thân hairline → hàng tổng. `xlsx` community KHÔNG hỗ trợ style → dùng fork `xlsx-js-style` (cùng API).
   Đổi 1 chỗ ⇒ MỌI export Excel đồng bộ. */
export interface ExcelSheet {
  name: string
  headers: string[]
  rows: (string | number)[][]
  /** Dòng tổng cuối bảng (in đậm, nền brandSoft, nằm NGOÀI vùng auto-filter). */
  footerRows?: (string | number)[][]
  /** Dòng "phạm vi / kỳ" (hàng 3 khối tiêu đề). Thiếu → "{n} dòng dữ liệu". */
  subtitle?: string
  /** Định dạng số riêng từng ô thân (cùng kích thước `rows`; undefined = mặc định theo số nguyên/thập phân),
   *  vd '0"%"' cho phần trăm. */
  cellFormats?: (string | undefined)[][]
  /** Loại sheet: 'income' (thu → tab xanh) / 'expense' (chi → tab đỏ). Thiếu → suy từ tên sheet + loại tài liệu. */
  tone?: 'income' | 'expense' | null
}

/** Tên sheet hợp lệ của Excel: bỏ : \ / ? * [ ], cắt 31 ký tự, KHÔNG trùng (không phân biệt hoa/thường). */
export function sanitizeSheetNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((raw, i) => {
    const base = String(raw ?? '')
      .replace(/[:\\/?*[\]]/g, ' ')
      .replace(/^'+|'+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || `Sheet${i + 1}`
    let name = base
    let n = 2
    while (used.has(name.toLowerCase())) {
      const suffix = ` (${n++})`
      name = base.slice(0, 31 - suffix.length) + suffix
    }
    used.add(name.toLowerCase())
    return name
  })
}

/** "dd/MM/yyyy" hoặc "yyyy-MM-dd" → số serial ngày Excel (null nếu không phải ngày hợp lệ). */
export function toExcelDateSerial(v: string): number | null {
  const s = v.trim()
  let y: number, m: number, d: number
  let mt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (mt) { d = +mt[1]; m = +mt[2]; y = +mt[3] }
  else {
    mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (!mt) return null
    y = +mt[1]; m = +mt[2]; d = +mt[3]
  }
  const t = Date.UTC(y, m - 1, d)
  const dt = new Date(t)
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return Math.round((t - Date.UTC(1899, 11, 30)) / 86400000)
}

/* Bố cục hàng: 0 CLB · 1 tên tài liệu · 2 phạm vi · 3 ngày xuất + mã TL · 4 đệm · 5 header cột. */
const XL_HEAD = 5
const XL_HEADER_ROWS = XL_HEAD + 1 // đóng băng đến hết header cột

type XlAlign = 'left' | 'right' | 'center'
type XlKind = 'num' | 'date' | 'text' | 'status'
type XlWorksheet = Record<string, unknown>

/** Xuất workbook ra bytes .xlsx (không đụng DOM → test được bằng node).
 *  @param opts.docType  loại tài liệu cho mã PF-{LOẠI}-yyMMdd-HHmm (mặc định BK; exportExcel suy từ tên file). */
export async function buildExcelBytes(sheets: ExcelSheet[], opts: { docType?: string; docTitle?: string } = {}): Promise<Uint8Array> {
  const [mod, kit] = await Promise.all([import('xlsx-js-style'), import('./excel-kit.ts')])
  const XLSX = ((mod as unknown as { default?: typeof import('xlsx-js-style') }).default ?? mod)
  const set = (ws: XlWorksheet, r: number, c: number, patch: { v?: unknown; t?: string; z?: string; s?: unknown; f?: string }) => {
    const ref = XLSX.utils.encode_cell({ r, c })
    const cur = (ws[ref] as Record<string, unknown>) ?? { t: 's', v: '' }
    ws[ref] = { ...cur, ...patch }
  }
  const wb = XLSX.utils.book_new()
  const b = kit.makeBrand(brandColor())
  const st = kit.xlStyles(b)
  const club = brandName()
  const docCode = kit.makeDocCode(opts.docType ?? 'BK', hcmParts())
  const exportedAt = todayFull()
  const names = sanitizeSheetNames(sheets.map(s => s.name))
  const patches: import('./excel-kit.ts').SheetPatch[] = []
  const colLetter = (c: number) => XLSX.utils.encode_col(c)
  // Giá trị không hữu hạn / null → ô trống (không sinh lỗi #NUM!/"NaN").
  const clean = (v: unknown): string | number =>
    typeof v === 'number' ? (Number.isFinite(v) ? v : '') : (v == null ? '' : String(v))

  sheets.forEach((sheet, si) => {
    const nCols = sheet.headers.length
    const nRows = sheet.rows.length
    const footers = sheet.footerRows ?? []
    const body = sheet.rows.map(r => r.map(clean))
    const foot = footers.map(r => r.map(clean))
    const maxCol = Math.max(nCols - 1, 0)
    const bodyStart = XL_HEAD + 1 + (nRows === 0 ? 1 : 0) // nRows = 0 → 1 hàng "Chưa có dữ liệu"
    const data: (string | number)[][] = [[], [], [], [], [], sheet.headers]
    const ws = XLSX.utils.aoa_to_sheet(data) as XlWorksheet

    // ── Nhận diện kiểu từng cột trên phần THÂN (số / ngày / trạng thái / chữ) ──
    const kinds: XlKind[] = sheet.headers.map((_, c) => {
      let num = 0, date = 0, status = 0, text = 0
      for (const r of body) {
        const v = r[c]
        if (v === '' || v == null) continue
        if (typeof v === 'number') num++
        else if (toExcelDateSerial(v) != null) date++
        else if (kit.statusTone(v)) { status++; text++ } else text++
      }
      const total = num + date + text
      if (total === 0) return 'text'
      if (num * 2 >= total) return 'num'
      if (date * 2 >= total) return 'date'
      if (status > 0 && status * 2 >= text) return 'status'
      return 'text'
    })
    const headAlign = (k: XlKind): XlAlign => (k === 'num' ? 'right' : k === 'text' ? 'left' : 'center')

    // ── Độ rộng cột: đo trên CHUỖI ĐÃ ĐỊNH DẠNG (nhóm nghìn, ngày dd/mm/yyyy) ──
    const shown = (v: string | number) => {
      if (typeof v === 'number') return kit.displayNumber(v)
      if (v !== '' && toExcelDateSerial(v) != null) return '00/00/0000'
      return v
    }
    const widths = sheet.headers.map((h, c) => {
      let max = 0
      for (const r of body) max = Math.max(max, ...shown(r[c] ?? '').split('\n').map(x => x.length))
      for (const r of foot) if (typeof r[c] === 'number') max = Math.max(max, shown(r[c]).length * 1.15) // số tổng in đậm
      return kit.columnWidth(h.length, max)
    })
    const sumW = widths.reduce((s, w) => s + w, 0)
    if (sumW < 44) widths[maxCol] += 44 - sumW // bảng quá hẹp (1-2 cột): nới cột cuối để khối tiêu đề không bị cắt
    const totalW = widths.reduce((s, w) => s + w, 0)

    // ── Khối tiêu đề 4 hàng (gộp ô theo bề ngang bảng) ──
    const sheetTone = sheet.tone !== undefined ? sheet.tone : kit.inferSheetTone(sheet.name, opts.docType)
    const blockRows: [string, unknown][] = [
      [club.toUpperCase(), st.club],
      [opts.docTitle ? `${opts.docTitle} — ${sheet.name}` : sheet.name, st.title],
      [sheet.subtitle ?? `${nRows} dòng dữ liệu`, st.scope],
      [`Xuất lúc ${exportedAt} · Mã TL: ${docCode}`, st.meta],
    ]
    blockRows.forEach(([text, style], r) => {
      set(ws, r, 0, { t: 's', v: text, s: style })
      for (let c = 1; c <= maxCol; c++) set(ws, r, c, { t: 's', v: '', s: r === 3 ? st.metaRule : style })
    })

    // ── Header cột ──
    for (let c = 0; c < nCols; c++) set(ws, XL_HEAD, c, { s: st.header(headAlign(kinds[c])) })

    // ── Ô thân ──
    const rowHeights: Record<number, number> = {}
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = []
    const zebra = true // zebra nhẹ cho MỌI bảng (không chỉ > 30 dòng)
    const numFmt = (n: number) => (Number.isInteger(n) ? kit.XL_NUM_INT : kit.XL_NUM_DEC)
    // Số tiền: dương thu/số dư = xanh, chi/nợ/âm = đỏ (ĐẬM); số đếm thường giữ màu chữ; STT/Hạng xám; 0 xám.
    const numStyle = (n: number, c: number, rowTexts: string[]) => {
      if (n === 0) return { color: kit.XL_COLOR.gray, bold: false }
      if (kit.isIndexHeader(sheet.headers[c] ?? '')) return { color: kit.XL_COLOR.gray, bold: false }
      const t = kit.moneyTone({ header: sheet.headers[c] ?? '', value: n, rowTexts, sheetTone })
      return t ? { color: kit.moneyColor(t), bold: true } : { color: undefined, bold: false }
    }
    if (nRows === 0) {
      for (let c = 0; c <= maxCol; c++) set(ws, XL_HEAD + 1, c, { t: 's', v: c === 0 ? 'Chưa có dữ liệu để hiển thị' : '', s: st.empty })
      if (maxCol > 0) merges.push({ s: { r: XL_HEAD + 1, c: 0 }, e: { r: XL_HEAD + 1, c: maxCol } })
      rowHeights[XL_HEAD + 1] = 32
    }
    body.forEach((row, ri) => {
      const r = bodyStart + ri
      let lines = 1
      const rowTexts = row.filter((v): v is string => typeof v === 'string')
      for (let c = 0; c < nCols; c++) {
        const raw = row[c] ?? ''
        const zb = zebra && ri % 2 === 1
        if (typeof raw === 'number') {
          set(ws, r, c, { t: 'n', v: raw, z: sheet.cellFormats?.[ri]?.[c] ?? numFmt(raw), s: st.cell(kit.isIndexHeader(sheet.headers[c] ?? '') ? 'center' : 'right', { zebra: zb, ...numStyle(raw, c, rowTexts) }) })
        } else if (raw === '') {
          set(ws, r, c, { t: 's', v: '', s: st.cell(kinds[c] === 'num' ? 'right' : kinds[c] === 'text' ? 'left' : 'center', { zebra: zb }) })
        } else {
          const serial = toExcelDateSerial(raw)
          if (serial != null) {
            set(ws, r, c, { t: 'n', v: serial, z: kit.XL_DATE, s: st.cell('center', { zebra: zb }) })
          } else if (kinds[c] === 'status') {
            const tone = kit.statusTone(raw)
            set(ws, r, c, { t: 's', v: raw, s: tone ? st.chip(tone) : st.cell('center', { zebra: zb }) })
          } else {
            // Chữ: wrap + tự cao hàng. Mã/SĐT số có số 0 đầu giữ dạng văn bản (@) để không mất số 0 khi sửa.
            lines = Math.max(lines, kit.estimateLines(raw, widths[c]))
            set(ws, r, c, { t: 's', v: raw, ...(/^0\d+$/.test(raw) ? { z: '@' } : {}), s: st.cell('left', { wrap: true, zebra: zb }) })
          }
        }
      }
      rowHeights[r] = lines === 1 ? 20 : 0 // 0 = để Excel tự cao theo nội dung wrap
    })

    // ── Hàng tổng: nền brandSoft, đậm, viền trên brand; SUBTOTAL khi là TỔNG THUẦN của cột ──
    const labelOf = (row: (string | number)[]) => row.findIndex(v => typeof v === 'string' && v.trim() !== '')
    const firstBody = bodyStart + 1 // dòng 1-based của hàng thân đầu
    const lastBody = bodyStart + nRows
    const pureTotal = foot.length === 1 && nRows > 0 && /^(tổng|cộng|total)/i.test(String(foot[0][labelOf(foot[0])] ?? '').trim())
    foot.forEach((row, fi) => {
      const r = bodyStart + nRows + fi
      const footTexts = row.filter((v): v is string => typeof v === 'string')
      const li = labelOf(row)
      let nextFilled = nCols
      if (li >= 0) for (let c = li + 1; c < nCols; c++) { if (row[c] !== '' && row[c] != null) { nextFilled = c; break } }
      const spanW = li >= 0 ? widths.slice(li, nextFilled).reduce((s, w) => s + w, 0) : 0
      let lines = 1
      for (let c = 0; c < nCols; c++) {
        const raw = row[c] ?? ''
        const first = fi === 0
        if (typeof raw === 'number') {
          let cell: { t: string; v: unknown; z: string; f?: string } = { t: 'n', v: raw, z: numFmt(raw) }
          if (pureTotal) {
            const col = body.map(x => x[c]).filter((x): x is number => typeof x === 'number')
            const sum = col.reduce((s, x) => s + x, 0)
            if (col.length > 0 && Math.abs(sum - raw) < 0.5) cell = { ...cell, f: `SUBTOTAL(9,${colLetter(c)}${firstBody}:${colLetter(c)}${lastBody})` }
          }
          set(ws, r, c, { ...cell, s: st.total('right', { first, color: (() => { const t = kit.moneyTone({ header: sheet.headers[c] ?? '', value: raw, rowTexts: footTexts, sheetTone, total: true }); return t ? kit.moneyColor(t) : undefined })() }) })
        } else if (c === li) {
          if (nextFilled - li > 1) merges.push({ s: { r, c: li }, e: { r, c: nextFilled - 1 } })
          lines = Math.max(lines, kit.estimateLines(raw, Math.max(spanW, 10)))
          set(ws, r, c, { t: 's', v: raw, s: st.total(li > 0 ? 'right' : 'left', { first, wrap: true }) }) // nhãn ở giữa bảng → căn phải sát số tổng
        } else {
          set(ws, r, c, { t: 's', v: '', s: st.total('left', { first }) })
        }
      }
      rowHeights[r] = Math.max(22, lines * 14 + 8)
    })

    // ── Cấp sheet ──
    const lastRow = bodyStart + nRows + foot.length - 1
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(lastRow, XL_HEAD), c: maxCol } })
    if (maxCol > 0) for (let r = 0; r < 4; r++) merges.push({ s: { r, c: 0 }, e: { r, c: maxCol } })
    ws['!merges'] = merges
    ws['!cols'] = widths.map(wch => ({ wch }))
    const headerWraps = sheet.headers.some((h, c) => kit.estimateLines(h, widths[c] - 1) > 1)
    const rowsMeta: { hpt?: number }[] = []
    ;[20, 34, 18, 18, 6].forEach((h, r) => { rowsMeta[r] = { hpt: h } })
    rowsMeta[XL_HEAD] = headerWraps ? {} : { hpt: 26 }
    for (const [r, h] of Object.entries(rowHeights)) rowsMeta[+r] = h > 0 ? { hpt: h } : {}
    for (let r = 0; r <= lastRow; r++) rowsMeta[r] = rowsMeta[r] ?? {}
    ws['!rows'] = rowsMeta
    if (nRows >= 8 && nCols >= 3) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: XL_HEAD, c: 0 }, e: { r: XL_HEAD + nRows, c: maxCol } }) }
    XLSX.utils.book_append_sheet(wb, ws, names[si])
    patches.push({
      freezeRows: XL_HEADER_ROWS,
      freezeCols: nCols > 6 ? 1 : 0,
      landscape: nCols > 7 || totalW > 120,
      footerLeft: `${club} · ${opts.docTitle ?? sheet.name}`,
      docCode,
      headerRow: XL_HEAD + 1,
      tabRgb: kit.tabColorFor(sheetTone, b.brand),
    })
  })
  // Thuộc tính file (docProps): tiêu đề = tên tài liệu, tác giả/đơn vị = tên CLB, chủ đề = mã TL.
  ;(wb as unknown as { Props: Record<string, unknown> }).Props = {
    Title: opts.docTitle ?? sheets[0]?.name ?? 'PickleFund',
    Subject: docCode,
    Author: club,
    LastAuthor: club,
    Company: club,
    CreatedDate: new Date(),
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return kit.patchWorkbookXml(new Uint8Array(out as ArrayBuffer), patches)
}

/** @param opts.docTitle tên tài liệu (khối tiêu đề: "{docTitle} — {tên sheet}"; thiếu → chỉ tên sheet). */
export async function exportExcel(filename: string, sheets: ExcelSheet[], opts: { docTitle?: string; docType?: string } = {}) {
  const kit = await import('./excel-kit.ts')
  const bytes = await buildExcelBytes(sheets, { docType: opts.docType ?? kit.docTypeFromFile(filename), docTitle: opts.docTitle })
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, exportFileName(filename, 'xlsx'))
  logReportExport(reportTypeOf(filename), 'excel')
}

/* ── File MẪU NHẬP LIỆU (.xlsx): header ở HÀNG 1 (importer đọc theo tên cột) — style header/độ rộng/
   ẩn gridlines/freeze nhất quán với báo cáo; sheet hướng dẫn = danh sách dòng chữ. Giữ nguyên TÊN FILE. ── */
export interface TemplateSheet {
  name: string
  /** Sheet dữ liệu: header (hàng 1) + các dòng ví dụ. */
  headers?: string[]
  rows?: (string | number)[][]
  widths?: number[]
  /** Sheet hướng dẫn: mỗi phần tử = 1 dòng (dòng đầu = tiêu đề). */
  lines?: string[]
}
export async function exportTemplateExcel(fileName: string, sheets: TemplateSheet[]): Promise<void> {
  const [mod, kit] = await Promise.all([import('xlsx-js-style'), import('./excel-kit.ts')])
  const XLSX = ((mod as unknown as { default?: typeof import('xlsx-js-style') }).default ?? mod)
  const b = kit.makeBrand(brandColor())
  const st = kit.xlStyles(b)
  const docCode = kit.makeDocCode('MAU', hcmParts())
  const club = brandName()
  const names = sanitizeSheetNames(sheets.map(s => s.name))
  const wb = XLSX.utils.book_new()
  const patches: import('./excel-kit.ts').SheetPatch[] = []
  sheets.forEach((sh, si) => {
    if (sh.lines) {
      const ws = XLSX.utils.aoa_to_sheet(sh.lines.map(l => [l])) as XlWorksheet
      sh.lines.forEach((line, r) => {
        const isTitle = r === 0
        const isHead = !isTitle && /^[\p{Lu}\s]{5,}/u.test(line)
        const style = isTitle ? st.title : isHead ? st.section : st.text
        ws[XLSX.utils.encode_cell({ r, c: 0 })] = {
          t: 's', v: line,
          s: { ...(style as object), alignment: { horizontal: 'left', vertical: 'center', wrapText: true, indent: isTitle || isHead ? 1 : 0 } },
        }
      })
      ws['!cols'] = [{ wch: 110 }]
      ws['!rows'] = sh.lines.map((line, r) => (r === 0 ? { hpt: 30 } : line === '' ? { hpt: 8 } : (line.length > 118 ? {} : { hpt: 18 })))
      XLSX.utils.book_append_sheet(wb, ws, names[si])
      patches.push({ freezeRows: 0, freezeCols: 0, landscape: false, footerLeft: `${club} · ${sh.name}`, docCode, headerRow: 0, tabRgb: b.ink })
      return
    }
    const headers = sh.headers ?? []
    const rows = sh.rows ?? []
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]) as XlWorksheet
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h, s: st.header('left') }
    })
    rows.forEach((row, ri) => row.forEach((v, c) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c })
      if (typeof v === 'number') ws[ref] = { t: 'n', v, z: Number.isInteger(v) ? kit.XL_NUM_INT : kit.XL_NUM_DEC, s: st.cell('right', { color: kit.XL_COLOR.ink2, zebra: ri % 2 === 1 }) }
      else ws[ref] = { t: 's', v: String(v ?? ''), ...(/^0\d+$/.test(String(v)) ? { z: '@' } : {}), s: st.cell('left', { wrap: true, color: kit.XL_COLOR.ink2, zebra: ri % 2 === 1 }) }
    }))
    ws['!cols'] = headers.map((h, c) => ({ wch: sh.widths?.[c] ?? kit.columnWidth(h.length, 12) }))
    ws['!rows'] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 20 }))]
    XLSX.utils.book_append_sheet(wb, ws, names[si])
    patches.push({
      freezeRows: 1, freezeCols: 0, landscape: headers.length > 5, footerLeft: `${club} · ${sh.name}`,
      docCode, headerRow: 1, tabRgb: b.brand,
    })
  })
  ;(wb as unknown as { Props: Record<string, unknown> }).Props = {
    Title: `Mẫu nhập liệu — ${sheets.find(s => s.headers)?.name ?? fileName}`, Subject: docCode, Author: club, LastAuthor: club, Company: club, CreatedDate: new Date(),
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const bytes = await kit.patchWorkbookXml(new Uint8Array(out as ArrayBuffer), patches)
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
}

/* ════════════════════════════════════════
   EXPORT GENERIC: bảng bất kỳ (Excel + PDF) — dùng chung cho các màn tổng hợp
   (Công nợ, Chấm điểm, Kỳ quỹ, Chi thủ quỹ, Nhật ký...). Giữ đồng bộ mẫu BASE_CSS.
════════════════════════════════════════ */
type CellAlign = 'left' | 'right' | 'center'
export interface GenericTableColumn { header: string; align?: CellAlign }

/** Excel 1 sheet từ headers + rows. `footerRow` (tùy chọn) = dòng tổng cuối bảng. */
export function exportGenericExcel(
  fileBase: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  footerRow?: (string | number)[],
  /** Dòng "phạm vi / kỳ" của khối tiêu đề (tùy chọn; thiếu → "{n} dòng dữ liệu"). */
  subtitle?: string,
) {
  return exportExcel(fileBase, [{ name: sheetName, headers, rows, footerRows: footerRow ? [footerRow] : undefined, subtitle }])
}

/** Cột cho bảng PDF vector: w tùy chọn (thiếu → tự phân bổ theo align). */
type VectorTableColumn = { key: string; label: string; w?: number; align?: 'left' | 'center' | 'right'; tone?: StandingsColumn['tone']; bold?: boolean; wrap?: boolean }

/** Slug tên file an toàn (giữ tiếng Việt, bỏ ký tự cấm). */
const slugName = safeFileName

/**
 * PDF BẢNG CHUẨN SaaS — VECTOR, tự phân trang theo HÀNG (không cắt ngang hàng/chân trang như
 * html2canvas). Dùng chung renderer `buildStandingsReportPDF` (lặp header + footer "Trang x/y"
 * mỗi trang, gọn trong từng A4). Mọi export bảng danh sách (thành viên, thu quỹ, sổ quỹ, generic)
 * đi qua đây để đồng nhất & hết lỗi chèn/cắt trang.
 */
async function buildVectorTable(input: {
  fileName: string
  title: string
  clubName: string
  /** Dòng phụ dưới tiêu đề (vd "CLB · 128 thành viên"). */
  headerLeft?: string
  /** Ghi chú cuối bảng (vd tổng/summary). */
  note?: string
  columns: VectorTableColumn[]
  rows: Record<string, string | number>[]
  stats?: { label: string; value: string | number; tone?: 'pos' | 'neg' | 'warn' | 'brand' }[]
  /** Dòng tổng cuối bảng (key theo columns). */
  footerRow?: Record<string, string | number>
  /** Loại tài liệu cho mã TL (PF-{LOẠI}-yyMMdd-HHmm), vd 'SQ' sổ quỹ, 'TQ' thu quỹ. */
  docType?: string
}) {
  const CONTENT_W = CONTENT_W_PORTRAIT // một nguồn: THEME.page (lề 12mm → 186mm), khớp pdf-kit
  const hasAllW = input.columns.every(c => typeof c.w === 'number')
  let cols: StandingsColumn[]
  if (hasAllW) {
    cols = input.columns.map(c => ({ key: c.key, label: c.label, w: c.w as number, align: c.align ?? 'left', tone: c.tone, bold: c.bold, wrap: c.wrap }))
  } else {
    // Tự phân bổ: cột text (trái) rộng hơn cột căn giữa/phải; cột cuối hút phần dư → tổng = CONTENT_W.
    const weight = (a?: string) => (a === 'right' ? 1.3 : a === 'center' ? 1 : 2.2)
    const totalW = input.columns.reduce((s, c) => s + weight(c.align), 0)
    let used = 0
    cols = input.columns.map((c, i) => {
      const last = i === input.columns.length - 1
      const w = last ? CONTENT_W - used : Math.round((weight(c.align) / totalW) * CONTENT_W)
      used += w
      return { key: c.key, label: c.label, w, align: c.align ?? 'left', tone: c.tone, bold: c.bold, wrap: c.wrap }
    })
  }
  const [{ default: jsPDF }, fonts, core, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = core.buildStandingsReportPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    meta: {
      clubName: input.clubName,
      sportLabel: input.headerLeft ?? input.clubName,
      tournamentName: '',
      formatLabel: '',
      rankNote: input.note ?? '',
      title: input.title,
      docType: input.docType,
      highlightTop3: false,
      exportedDateText: today(),
      exportedAtText: todayFull(),
    },
    columns: cols,
    rows: input.rows,
    stats: input.stats ?? [],
    footerRow: input.footerRow,
  })
  return savePdfDoc(doc, input.fileName)
}

/** Ô bảng PDF generic: số → có dấu phân cách nghìn ("-5.000"), null → rỗng, chuỗi giữ nguyên. */
const pdfCell = (v: string | number | null | undefined): string | number =>
  typeof v === 'number' ? formatNumberVN(v) : (v ?? '')

/** PDF bảng dùng chung (vector, phân trang chuẩn): header brand + bảng + summary tùy chọn.
 *  `footerRow` (tùy chọn) = dòng tổng cuối bảng, theo thứ tự `columns`. */
export function exportGenericTablePDF(opts: {
  fileBase: string
  title: string
  subtitle?: string
  metaLeft?: string
  columns: GenericTableColumn[]
  rows: (string | number)[][]
  summaryLabel?: string
  summaryValue?: string
  footerRow?: (string | number)[]
}) {
  const headerLeft = [opts.subtitle, opts.metaLeft].filter(Boolean).join(' · ') || undefined
  // Cột chưa chỉ định align mà toàn số → tự căn phải.
  const isNumCol = (i: number) => {
    const vals = opts.rows.map(r => r[i]).filter(v => v !== '' && v != null)
    return vals.length > 0 && vals.every(v => typeof v === 'number')
  }
  const colKey = (i: number) => `c${i}`
  const aligns = opts.columns.map((c, i) => c.align ?? (isNumCol(i) ? 'right' : 'left'))
  // Hàng TỔNG: ưu tiên footerRow caller đưa; không có mà có summary → nhãn ở cột đầu, giá trị ở cột số cuối.
  let footerRow: Record<string, string | number> | undefined
  if (opts.footerRow) {
    footerRow = Object.fromEntries(opts.columns.map((_, i) => [colKey(i), pdfCell(opts.footerRow?.[i])]))
  } else if (opts.summaryLabel) {
    const n = opts.columns.length
    const valIdx = n > 1 ? (aligns.lastIndexOf('right') > 0 ? aligns.lastIndexOf('right') : n - 1) : 0
    footerRow = Object.fromEntries(opts.columns.map((_, i) => [colKey(i), '']))
    footerRow[colKey(0)] = n > 1 ? opts.summaryLabel : `${opts.summaryLabel}: ${opts.summaryValue ?? ''}`
    if (n > 1) footerRow[colKey(valIdx)] = opts.summaryValue ?? ''
  }
  // KPI band tối thiểu: số dòng + (tổng) — bảng nào cũng có dải số liệu như các báo cáo khác.
  const stats: { label: string; value: string | number }[] = [{ label: 'Số dòng', value: opts.rows.length }]
  if (opts.summaryLabel) stats.push({ label: opts.summaryLabel, value: opts.summaryValue ?? '' })
  return buildVectorTable({
    fileName: opts.fileBase,
    title: opts.title.toUpperCase(),
    clubName: brandName(),
    headerLeft,
    docType: 'BCT',
    columns: opts.columns.map((c, i) => ({ key: colKey(i), label: c.header, align: aligns[i] })),
    rows: opts.rows.map(r => {
      const o: Record<string, string | number> = {}
      opts.columns.forEach((_, i) => { o[colKey(i)] = pdfCell(r[i]) })
      return o
    }),
    stats,
    footerRow,
  })
}

/* ════════════════════════════════════════
   EXPORT: Ledger (Sổ Quỹ)
════════════════════════════════════════ */
export interface LedgerRow { date: string; type: string; desc: string; amount: number; balance: number }

const OPENING_LABEL = 'Số dư chuyển kỳ'

/**
 * @param openingBalance  số dư chuyển kỳ — truyền (kể cả 0) → in dòng đầu "Số dư chuyển kỳ". Số dư từng
 *                        dòng (`rows[].balance`) do caller tính từ số này; lib KHÔNG cộng thêm.
 * @param closingBalance  số dư cuối kỳ (tùy chọn) → in dòng "Số dư cuối kỳ" cuối bảng.
 */
export function exportLedgerExcel(periodName: string, rows: LedgerRow[], openingBalance?: number, closingBalance?: number) {
  const body: (string | number)[][] = rows.map(r => [r.date, r.type, r.desc, r.amount, r.balance])
  if (openingBalance !== undefined) body.unshift(['', '', OPENING_LABEL, '', openingBalance])
  const income = rows.reduce((s, r) => (r.amount > 0 ? s + r.amount : s), 0)
  const expense = rows.reduce((s, r) => (r.amount < 0 ? s - r.amount : s), 0)
  const footerRows: (string | number)[][] = [
    ['', '', 'Tổng thu', income, ''],
    ['', '', 'Tổng chi', expense, ''],
  ]
  if (closingBalance !== undefined) footerRows.push(['', '', 'Số dư cuối kỳ', '', closingBalance])
  return exportExcel(`So_Quy_${periodName.replace(/\s/g, '_')}`, [{
    name: 'Sổ Quỹ',
    subtitle: `Kỳ quỹ: ${periodName} · ${rows.length} giao dịch`,
    headers: ['Ngày', 'Loại', 'Mô tả', 'Số tiền (VNĐ)', 'Số dư (VNĐ)'],
    rows: body,
    footerRows,
  }])
}

export function exportLedgerPDF(
  periodName: string,
  rows: LedgerRow[],
  totalIncome: number,
  totalExpense: number,
  balance: number,
  openingBalance?: number,
) {
  const tableRows: Record<string, string | number>[] = rows.map(r => ({
    date: r.date,
    type: r.type,
    desc: r.desc,
    amount: (r.amount > 0 ? '+' : '') + formatVND(r.amount),
    balance: formatVND(r.balance),
  }))
  if (openingBalance !== undefined) {
    tableRows.unshift({ date: '', type: '', desc: OPENING_LABEL, amount: '', balance: formatVND(openingBalance) })
  }
  const net = totalIncome - totalExpense
  return buildVectorTable({
    fileName: `So_Quy_${slugName(periodName)}`,
    title: 'SỔ QUỸ CHI TIẾT',
    clubName: brandName(), // footer/masthead dùng tên CLB (KHÔNG dùng tên kỳ)
    headerLeft: `Kỳ quỹ: ${periodName} · ${rows.length} giao dịch`,
    docType: 'SQ',
    footerRow: { desc: 'TỔNG KỲ · SỐ DƯ CUỐI KỲ', amount: (net > 0 ? '+' : '') + formatVND(net), balance: formatVND(balance) },
    columns: [
      { key: 'date', label: 'NGÀY', w: 26, align: 'left' },
      { key: 'type', label: 'LOẠI', w: 18, align: 'center' },
      { key: 'desc', label: 'MÔ TẢ', w: 66, align: 'left' },
      { key: 'amount', label: 'SỐ TIỀN', w: 38, align: 'right', tone: 'sign', bold: true },
      { key: 'balance', label: 'SỐ DƯ', w: 38, align: 'right' },
    ],
    rows: tableRows,
    stats: [
      { label: 'Tổng thu', value: formatVND(totalIncome), tone: 'pos' },
      { label: 'Tổng chi', value: formatVND(totalExpense), tone: 'neg' },
      { label: 'Số dư cuối kỳ', value: formatVND(balance) },
    ],
  })
}

/* ════════════════════════════════════════
   EXPORT: Contributions (Thu Quỹ)
════════════════════════════════════════ */
export interface ContribRow {
  member: string
  date: string
  amount: number
  method: string
  /** Thiếu → coi là đã xác nhận (tương thích call site cũ). */
  confirmed?: boolean
  /** Quỹ của khoản thu (thiếu → suy ra: có trong miniRows = Quỹ Phụ, còn lại = Quỹ Chính). */
  fund?: 'COMMON' | 'MINI'
  /** Tên kỳ quỹ (Quỹ Phụ không theo kỳ → "Quỹ Phụ"). */
  periodName?: string
}
/** Nhóm khoản thu theo 1 Kỳ quỹ (chỉ kỳ đang mở mới đưa vào file). */
export interface ContribGroup { periodName: string; rows: ContribRow[] }

const isConfirmedRow = (r: ContribRow) => r.confirmed !== false
const fundLabelOf = (r: ContribRow) => (r.fund === 'MINI' ? 'Quỹ Phụ' : 'Quỹ Chính')
const contribName = (r: ContribRow) => r.member || (r.fund === 'MINI' ? 'Quỹ Phụ' : '—')
const confirmText = (r: ContribRow) => (isConfirmedRow(r) ? 'Đã xác nhận' : 'Chờ xác nhận')

export function exportContribExcel(periodName: string, rows: ContribRow[]) {
  const sumBy = (pred: (r: ContribRow) => boolean) => rows.filter(pred).reduce((s, r) => s + r.amount, 0)
  const confirmedCommon = sumBy(r => isConfirmedRow(r) && r.fund !== 'MINI')
  const confirmedMini = sumBy(r => isConfirmedRow(r) && r.fund === 'MINI')
  const pending = sumBy(r => !isConfirmedRow(r))
  const footer = (label: string, v: number): (string | number)[] => ['', '', label, '', v, '', '']
  return exportExcel(`Thu_Quy_${periodName.replace(/\s/g, '_')}`, [{
    name: 'Thu Quỹ',
    subtitle: `Kỳ quỹ: ${periodName} · ${rows.length} khoản thu`,
    headers: ['Thành viên / Nội dung', 'Quỹ', 'Kỳ quỹ', 'Ngày đóng', 'Số tiền (VNĐ)', 'Hình thức', 'Xác nhận'],
    rows: rows.map(r => [contribName(r), fundLabelOf(r), r.periodName ?? '', r.date, r.amount, methodLabel(r.method), confirmText(r)]),
    footerRows: [
      footer('Tổng Quỹ Chính (đã xác nhận)', confirmedCommon),
      footer('Tổng Quỹ Phụ (đã xác nhận)', confirmedMini),
      footer('Chờ xác nhận (chưa tính vào quỹ)', pending),
    ],
  }])
}

const sumRows = (rows: ContribRow[]) => rows.reduce((s, r) => s + r.amount, 0)

/**
 * Xuất PDF Thu Quỹ — TÁCH theo từng Kỳ quỹ (mỗi kỳ 1 nhóm), CHỈ gồm kỳ đang mở (kỳ đã đóng
 * đã quyết toán → không đưa vào). Kèm thẻ tổng Quỹ Chính / Quỹ Phụ — các thẻ tổng CHỈ tính khoản
 * ĐÃ XÁC NHẬN (khớp màn hình/backend); khoản chờ xác nhận tách riêng.
 * @param clubName   tên CLB (đầu báo cáo)
 * @param groups     nhóm khoản thu Quỹ Chính theo kỳ đang mở (kỳ đã đóng đã lọc từ caller)
 * @param miniRows   khoản thu Quỹ Phụ (không theo kỳ) — tùy chọn
 */
export function exportContribPDF(
  groups: ContribGroup[],
  miniRows: ContribRow[] = [],
  clubNameArg?: string,
) {
  const clubName = clubNameArg || brandName()
  const commonRows = groups.flatMap(g => g.rows)
  const allRows = [...commonRows, ...miniRows]
  const commonTotal = sumRows(commonRows.filter(isConfirmedRow))
  const miniTotal = sumRows(miniRows.filter(isConfirmedRow))
  const pendingRows = allRows.filter(r => !isConfirmedRow(r))
  const pendingTotal = sumRows(pendingRows)
  const commonConfirmed = commonRows.filter(isConfirmedRow).length
  const totalCount = allRows.length
  const groupRight = (rs: ContribRow[]) => {
    const pend = rs.filter(r => !isConfirmedRow(r))
    return `${rs.length} khoản · ${formatVND(sumRows(rs.filter(isConfirmedRow)))}` + (pend.length ? ` · chờ ${pend.length} (${formatVND(sumRows(pend))})` : '')
  }

  // Ghép dòng: mỗi kỳ mở → 1 dải tiêu đề (__section) + các khoản của kỳ; cuối cùng nhóm Quỹ Phụ.
  const tableRows: Record<string, string | number>[] = []
  const pushRow = (r: ContribRow) => tableRows.push({
    member: contribName(r),
    date: r.date,
    amount: formatVND(r.amount),
    method: methodLabel(r.method),
    status: confirmText(r),
  })
  for (const g of groups) {
    if (g.rows.length === 0) continue
    tableRows.push({ __section: `KỲ QUỸ: ${g.periodName}`, __sectionRight: groupRight(g.rows) })
    g.rows.forEach(pushRow)
  }
  if (miniRows.length > 0) {
    tableRows.push({ __section: 'QUỸ PHỤ', __sectionRight: groupRight(miniRows) })
    miniRows.forEach(pushRow)
  }

  const openNames = groups.filter(g => g.rows.length > 0).map(g => g.periodName)
  return buildVectorTable({
    fileName: `Thu_Quy_${slugName(clubName)}`,
    title: 'DANH SÁCH THU QUỸ',
    clubName,
    docType: 'TQ',
    footerRow: { member: 'TỔNG THU ĐÃ XÁC NHẬN', amount: formatVND(commonTotal + miniTotal) },
    headerLeft: openNames.length ? `Kỳ đang mở: ${openNames.join(', ')}` : clubName,
    note: `Chỉ gồm các kỳ quỹ ĐANG MỞ · Tổng thu đã xác nhận ${formatVND(commonTotal + miniTotal)}`
      + (pendingRows.length ? ` · Chờ xác nhận ${pendingRows.length} khoản (${formatVND(pendingTotal)}) chưa tính vào quỹ` : '')
      + ` · Quỹ Chính đã xác nhận ${commonConfirmed}/${commonRows.length}`,
    columns: [
      { key: 'rank', label: '#', w: 10, align: 'center' },
      { key: 'member', label: 'THÀNH VIÊN / NỘI DUNG', w: 56, align: 'left', bold: true },
      { key: 'date', label: 'NGÀY ĐÓNG', w: 28, align: 'center' },
      { key: 'amount', label: 'SỐ TIỀN', w: 34, align: 'right', tone: 'points' },
      { key: 'method', label: 'HÌNH THỨC', w: 30, align: 'center' },
      { key: 'status', label: 'XÁC NHẬN', w: 28, align: 'center', tone: 'status' },
    ],
    rows: tableRows,
    stats: [
      { label: 'Quỹ Chính (đã xác nhận)', value: formatVND(commonTotal) },
      { label: 'Quỹ Phụ (đã xác nhận)', value: formatVND(miniTotal) },
      { label: 'Tổng thu (đã xác nhận)', value: formatVND(commonTotal + miniTotal), tone: 'pos' },
      { label: 'Chờ xác nhận', value: formatVND(pendingTotal), tone: 'warn' },
      { label: 'Số khoản', value: totalCount },
    ],
  })
}

/* ════════════════════════════════════════
   EXPORT: Members list
════════════════════════════════════════ */
export interface MemberRow { name: string; phone: string; email: string; joinDate: string; status: string }

export function exportMembersExcel(clubName: string, rows: MemberRow[]) {
  return exportExcel(`Danh_Sach_Thanh_Vien_${clubName.replace(/\s/g, '_')}`, [{
    name: 'Thành viên',
    subtitle: `${clubName} · ${rows.length} thành viên`,
    headers: ['Họ và tên', 'Điện thoại', 'Email', 'Ngày tham gia', 'Trạng thái'],
    rows: rows.map(r => [r.name, r.phone, r.email, r.joinDate, r.status]),
  }])
}

export function exportMembersPDF(clubName: string, rows: MemberRow[]) {
  const active = rows.filter(r => r.status === 'Hoạt động').length
  return buildVectorTable({
    fileName: `Danh_Sach_Thanh_Vien_${slugName(clubName)}`,
    title: 'DANH SÁCH THÀNH VIÊN',
    clubName,
    docType: 'DSTV',
    headerLeft: `${clubName} · ${rows.length} thành viên`,
    columns: [
      { key: 'rank', label: '#', w: 10, align: 'center' },
      { key: 'name', label: 'HỌ VÀ TÊN', w: 44, align: 'left', bold: true },
      { key: 'phone', label: 'ĐIỆN THOẠI', w: 30, align: 'left' },
      { key: 'email', label: 'EMAIL', w: 52, align: 'left' },
      { key: 'joinDate', label: 'NGÀY THAM GIA', w: 24, align: 'center' },
      { key: 'status', label: 'TRẠNG THÁI', w: 26, align: 'center', tone: 'status' },
    ],
    rows: rows.map(r => ({ name: r.name, phone: r.phone, email: r.email, joinDate: r.joinDate, status: r.status })),
    stats: [
      { label: 'Tổng thành viên', value: rows.length },
      { label: 'Đang hoạt động', value: active },
      { label: 'Tạm nghỉ / khác', value: rows.length - active },
    ],
  })
}

/* ════════════════════════════════════════
   EXPORT: Personal Receipt (Phiếu Thu Cá Nhân)
════════════════════════════════════════ */
export interface ReceiptData {
  /** Số phiếu — thiếu thì ẩn "No. xxxx" (không in số giả). */
  receiptNo?: number
  memberName: string
  loginName?: string
  periodName: string
  periodStartDate?: string
  periodEndDate?: string
  contributionAmount?: number
  clubName: string
  /** Rỗng/thiếu → bỏ phần địa điểm ở chân phiếu (không cứng "Hà Nội"). */
  clubLocation?: string
  amountPaid: number
  paymentDate?: string
  attendedSessions: number
  totalSessions: number
  /** Tổng tiền sân toàn quỹ (thiếu và không có memberCountForSplit → ẩn dòng). */
  totalCourtFee?: number
  /** Sĩ số đã chốt dùng để chia tiền sân/sinh hoạt (KHÔNG có mặc định; thiếu → ẩn "/ N người"). */
  memberCountForSplit?: number
  courtCost: number
  /** Tổng chi khác toàn quỹ (thiếu → ẩn dòng, không suy ngược sai). */
  totalOtherFee?: number
  livingCost: number
  totalCost: number
  balance: number
  isConfirmed: boolean
}

export async function exportReceiptPDF(data: ReceiptData) {
  // PDF VECTOR (cùng engine phiếu với Quỹ Phụ / biên nhận): font Be Vietnam Pro nhúng, logo + màu CLB,
  // không emoji/gradient, không html2canvas → mọi máy giống hệt, chữ chọn/sao chép được.
  const [{ default: jsPDF }, fonts, { buildPersonalReceiptPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildPersonalReceiptPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    receipt: { ...data, printedDateText: today(), printedAtText: todayFull() },
  })
  // Phiếu cá nhân: không tính vào "báo cáo đã xuất" của Command Center.
  return savePdfDoc(
    doc,
    `Phieu_Thu_${data.memberName.replace(/\s/g, '_')}_${data.periodName.replace(/\s/g, '_')}`,
    { log: false },
  )
}

/* ════════════════════════════════════════
   EXPORT: Reports summary
════════════════════════════════════════ */
export interface ReportSummary {
  periodName: string
  clubName: string
  totalIncome: number
  totalExpense: number
  balance: number
  memberCount: number
  sessionCount: number
  confirmedCount: number
  // Bổ sung để khớp các thẻ dashboard (tùy chọn — thiếu thì PDF ẩn hàng thẻ bổ sung).
  miniBalance?: number
  carryForward?: number
  totalAttendance?: number
  activeMemberCount?: number
  /** Số dư Quỹ Chính thực có (gồm tồn đầu kỳ) — thẻ "Quỹ Chính". */
  clubAssets?: number
}

export interface MemberBillRow {
  memberName: string
  attendedSessions: number
  totalSessions: number
  amountPaid: number
  contributionPaid: boolean
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
}

/* ── Font Việt cho PDF vector (Be Vietnam Pro, tải 1 lần rồi cache module) ── */
let vnFontsPromise: Promise<{ regular: string; bold: string }> | null = null
function loadVnFonts() {
  if (!vnFontsPromise) {
    vnFontsPromise = (async () => {
      const toB64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf)
        let bin = ''
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        }
        return btoa(bin)
      }
      const fetchFont = async (url: string) => {
        const r = await fetch(url)
        if (!r.ok) throw new Error(`Không tải được font ${url}`)
        return toB64(await r.arrayBuffer())
      }
      const [regular, bold] = await Promise.all([
        fetchFont('/fonts/BeVietnamPro-Regular.ttf'),
        fetchFont('/fonts/BeVietnamPro-Bold.ttf'),
      ])
      return { regular, bold }
    })()
    // Lỗi mạng → reset để lần xuất sau thử tải lại (không kẹt promise rejected).
    vnFontsPromise.catch(() => { vnFontsPromise = null })
  }
  return vnFontsPromise
}

export interface ReportExpenseRow {
  date: string
  description: string
  fundKey: 'COMMON' | 'MINI'
  fundLabel: string
  kindLabel: string
  amount: number
  statusKey: 'approved' | 'pending' | 'paid' | 'rejected'
  statusLabel: string
}

export async function exportReportsPDF(
  data: ReportSummary,
  memberBills?: MemberBillRow[],
  expenseRows: ReportExpenseRow[] = [],
) {
  // PDF VECTOR (jsPDF vẽ trực tiếp, KHÔNG html2canvas): mẫu báo cáo chuẩn DÙNG CHUNG
  // mọi CLB — toạ độ mm cố định, chữ vector sắc nét → mọi máy/lần xuất giống hệt nhau,
  // chấm dứt chuỗi lỗi renderer (cắt dòng / trôi số / giãn thẻ) của cách chụp DOM.
  const [{ default: jsPDF }, fonts, { buildQuyReportPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildQuyReportPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    summary: {
      clubName: data.clubName,
      periodName: data.periodName,
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      balance: data.balance,
      memberCount: data.memberCount,
      sessionCount: data.sessionCount,
      confirmedCount: data.confirmedCount,
      miniBalance: data.miniBalance,
      carryForward: data.carryForward,
      totalAttendance: data.totalAttendance,
      activeMemberCount: data.activeMemberCount,
      clubAssets: data.clubAssets,
      exportedDateText: today(),
      exportedAtText: todayFull(),
    },
    rows: memberBills ?? [],
    expenseRows,
  })
  return savePdfDoc(doc, `BaoCao_Quy_${slugName(data.clubName)}_${slugName(data.periodName)}`)
}

/* ════════════════════════════════════════
   EXPORT: Báo cáo Chi phí (PDF vector)
════════════════════════════════════════ */
export interface ExpenseReportSummaryInput {
  clubName: string
  periodName: string
  totalAll: number
  totalCommon: number
  totalMini: number
  totalApproved: number
  totalPending: number
  count: number
  /** Nhãn thẻ tổng đầu trang (mặc định "TỔNG CHI"). */
  totalLabel?: string
  /** Nhãn dòng tổng cuối bảng (mặc định "TỔNG CỘNG"). */
  totalRowLabel?: string
}
export interface ExpenseReportRowInput {
  code: string
  description: string
  kindLabel: string
  dateText: string
  amount: number
  statusKey: 'approved' | 'pending' | 'paid' | 'rejected'
}

export async function exportExpensesPDF(
  summary: ExpenseReportSummaryInput,
  rows: ExpenseReportRowInput[],
) {
  const [{ default: jsPDF }, fonts, { buildExpenseReportPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildExpenseReportPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    summary: {
      ...summary,
      exportedDateText: today(),
      exportedAtText: todayFull(),
    },
    rows,
  })
  return savePdfDoc(doc, `BaoCao_ChiPhi_${slugName(summary.clubName)}_${slugName(summary.periodName)}`)
}

/* ════════════════════════════════════════
   EXPORT: Bảng xếp hạng giải đấu (PDF vector) — dùng chung mọi bộ môn
════════════════════════════════════════ */
export interface StandingsColumn {
  key: string
  label: string
  w: number
  align: 'left' | 'center' | 'right'
  tone?: 'win' | 'loss' | 'points' | 'muted' | 'sign' | 'status'
  bold?: boolean
  /** Xuống dòng thay vì cắt "…" (mặc định: cột căn trái trừ 'rank'). */
  wrap?: boolean
}
export interface StandingsPdfInput {
  clubName: string
  tournamentName: string
  sportLabel: string
  formatLabel: string
  rankNote?: string
  columns: StandingsColumn[]
  rows: Record<string, string | number>[]
  stats?: { label: string; value: string | number; tone?: 'pos' | 'neg' | 'warn' | 'brand' }[]
  /** Tiêu đề header (mặc định 'BẢNG XẾP HẠNG'). */
  title?: string
  /** Tô nhẹ 3 dòng đầu (mặc định true). Tắt cho bảng không xếp hạng (vd Lịch). */
  highlightTop3?: boolean
  /** Tiền tố tên file (mặc định 'BXH'). */
  filePrefix?: string
  /** Loại tài liệu cho mã TL (mặc định 'BXH'; lịch = 'LTD'). */
  docType?: string
}

export async function exportStandingsPDF(input: StandingsPdfInput) {
  const [{ default: jsPDF }, fonts, { buildStandingsReportPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildStandingsReportPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    meta: {
      clubName: input.clubName,
      tournamentName: input.tournamentName,
      sportLabel: input.sportLabel,
      formatLabel: input.formatLabel,
      rankNote: input.rankNote,
      title: input.title,
      docType: input.docType,
      highlightTop3: input.highlightTop3,
      exportedDateText: today(),
      exportedAtText: todayFull(),
    },
    columns: input.columns,
    rows: input.rows,
    stats: input.stats ?? [],
  })
  return savePdfDoc(doc, `${input.filePrefix ?? 'BXH'}_${slugName(input.sportLabel)}_${slugName(input.tournamentName)}`)
}

/* ════════════════════════════════════════
   EXPORT: Lịch thi đấu (PDF vector) — tái dùng bảng chuẩn, đổi tiêu đề + tắt highlight top-3
════════════════════════════════════════ */
export async function exportSchedulePDF(
  input: Omit<StandingsPdfInput, 'title' | 'highlightTop3' | 'filePrefix' | 'rankNote' | 'docType'> & { rankNote?: string },
) {
  return exportStandingsPDF({
    ...input,
    title: 'LỊCH THI ĐẤU',
    highlightTop3: false,
    filePrefix: 'Lich',
    docType: 'LTD',
  })
}

/* ════════════════════════════════════════
   EXPORT: Sơ đồ loại trực tiếp (knockout) — PDF vector khổ ngang
════════════════════════════════════════ */
export interface KnockoutMatchInput {
  teamA?: string
  teamB?: string
  scoreA?: number | string | null
  scoreB?: number | string | null
  winner: 'A' | 'B' | null
  walkover?: boolean
  /** Tỉ số loạt pen (vd "4-3") — nếu có, trận hoà tỉ số hiện "pen 4-3" thay vì "đi tiếp". */
  pen?: string
}
export interface KnockoutRoundInput { label: string; matches: KnockoutMatchInput[] }
export interface KnockoutPdfInput {
  clubName: string
  tournamentName: string
  sportLabel: string
  championName?: string
  rounds: KnockoutRoundInput[]
}

export async function exportKnockoutPDF(input: KnockoutPdfInput) {
  const [{ default: jsPDF }, fonts, { buildKnockoutReportPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildKnockoutReportPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    meta: {
      clubName: input.clubName,
      tournamentName: input.tournamentName,
      sportLabel: input.sportLabel,
      championName: input.championName,
      exportedDateText: today(),
      exportedAtText: todayFull(),
    },
    rounds: input.rounds,
  })
  return savePdfDoc(doc, `SoDo_${slugName(input.sportLabel)}_${slugName(input.tournamentName)}`)
}

/* ════════════════════════════════════════
   EXPORT: Phiếu Thu Quỹ Phụ
════════════════════════════════════════ */
export interface MiniIncomeReceiptData {
  receiptNo?: number
  payerName: string
  incomeType: string
  amount: number
  paymentDate: string
  notes?: string
  clubName: string
  clubLocation?: string
}

export async function exportMiniIncomeReceiptPDF(data: MiniIncomeReceiptData) {
  // PDF VECTOR (đồng bộ mẫu báo cáo chuẩn efdf7612): toạ độ mm cố định + font nhúng
  // → phiếu in ra giống hệt trên mọi máy; kèm logo CLB nếu CLB có đặt branding.
  const [{ default: jsPDF }, fonts, { buildMiniReceiptPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildMiniReceiptPDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    receipt: {
      receiptNo: data.receiptNo,
      payerName: data.payerName,
      incomeType: data.incomeType,
      amount: data.amount,
      paymentDate: data.paymentDate,
      notes: data.notes,
      clubName: data.clubName,
      clubLocation: data.clubLocation,
      printedDateText: today(),
      printedAtText: todayFull(),
    },
  })
  return savePdfDoc(doc, `Phieu_Thu_QuyPhu_${data.payerName.replace(/\s/g, '_')}`, { log: false })
}

/* ════════════════════════════════════════
   EXPORT: Phiếu Chi Quỹ Phụ
════════════════════════════════════════ */
export interface MiniExpenseReceiptData {
  receiptNo?: number
  receiverName: string
  expenseType: string
  amount: number
  expenseDate: string
  description: string
  notes?: string
  clubName: string
  clubLocation?: string
}

export async function exportMiniExpenseReceiptPDF(data: MiniExpenseReceiptData) {
  const [{ default: jsPDF }, fonts, { buildMiniExpensePDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const doc = buildMiniExpensePDF({
    jsPDF,
    fonts,
    branding: pdfBranding(logo),
    receipt: { ...data, printedDateText: today(), printedAtText: todayFull() },
  })
  return savePdfDoc(doc, `Phieu_Chi_Mini_${data.receiverName.replace(/\s/g, '_')}`, { log: false })
}

export type ReportMemberDetail = {
  name: string
  attended: number
  paid: string
  cost: number
  balance: number
  /** Số tiền đã nộp (VNĐ) — truyền cho ÍT NHẤT 1 thành viên thì sheet có thêm 3 cột chi tiết. */
  amountPaid?: number
  courtCost?: number
  livingCost?: number
}

export function exportReportsExcel(
  data: ReportSummary,
  memberDetails: ReportMemberDetail[],
  expenseRows: ReportExpenseRow[] = [],
) {
  // Số dư Quỹ Chính = clubAssets (Thu − Chi + chuyển kỳ) — KHỚP màn hình & PDF (không phải balance thô).
  // Cùng 1 công thức cho Quỹ Chính + Tổng tài sản dù clubAssets có hay không (khớp pdf-report-core).
  const mainFund = data.clubAssets ?? (data.balance + (data.carryForward ?? 0))
  const totalAssets = mainFund + (data.miniBalance ?? 0)
  const hasDetail = memberDetails.some(m => m.amountPaid != null || m.courtCost != null || m.livingCost != null)
  const sum = (pick: (m: ReportMemberDetail) => number | undefined) =>
    memberDetails.reduce((s, m) => s + (pick(m) ?? 0), 0)
  const memberHeaders = hasDetail
    ? ['Thành viên', 'Buổi tham gia', 'Đã đóng', 'Đã nộp (VNĐ)', 'Chi phí sân (VNĐ)', 'Sinh hoạt (VNĐ)', 'Chi phí (VNĐ)', 'Số dư (VNĐ)']
    : ['Thành viên', 'Buổi tham gia', 'Đã đóng', 'Chi phí (VNĐ)', 'Số dư (VNĐ)']
  const memberRows: (string | number)[][] = memberDetails.map(m => hasDetail
    ? [m.name, m.attended, m.paid, m.amountPaid ?? '', m.courtCost ?? '', m.livingCost ?? '', m.cost, m.balance]
    : [m.name, m.attended, m.paid, m.cost, m.balance])
  const memberTotal: (string | number)[] = hasDetail
    ? ['TỔNG', sum(m => m.attended), '', sum(m => m.amountPaid), sum(m => m.courtCost), sum(m => m.livingCost), sum(m => m.cost), sum(m => m.balance)]
    : ['TỔNG', sum(m => m.attended), '', sum(m => m.cost), sum(m => m.balance)]
  const sheets: ExcelSheet[] = [
    {
      name: 'Tổng Quan',
      subtitle: `Kỳ quỹ: ${data.periodName}`,
      headers: ['Chỉ số', 'Giá trị'],
      rows: [
        ['Tổng thu kỳ', data.totalIncome],
        ['Tổng chi kỳ', data.totalExpense],
        ['Số dư Quỹ Chính (Thu − Chi + chuyển kỳ)', mainFund],
        ['Quỹ Phụ', data.miniBalance ?? 0],
        ['Số dư chuyển kỳ', data.carryForward ?? 0],
        ['Tổng tài sản (2 quỹ)', totalAssets],
        ['Tổng lượt điểm danh', data.totalAttendance ?? 0],
        ['Thành viên hoạt động', data.activeMemberCount ?? data.memberCount],
        ['Số buổi tập', data.sessionCount],
        ['Đã đóng quỹ', data.confirmedCount],
      ],
    },
    {
      name: 'Chi Tiết Thành Viên',
      subtitle: `Kỳ quỹ: ${data.periodName} · ${memberDetails.length} thành viên`,
      headers: memberHeaders,
      rows: memberRows,
      footerRows: memberDetails.length > 0 ? [memberTotal] : undefined,
    },
  ]
  // Sheet "Khoản Chi" — parity với trang Chi trong PDF (chỉ thêm khi có dữ liệu).
  if (expenseRows.length > 0) {
    const approved = (fund: 'COMMON' | 'MINI') => expenseRows
      .filter(e => e.fundKey === fund && (e.statusKey === 'approved' || e.statusKey === 'paid'))
      .reduce((s, e) => s + e.amount, 0)
    const footer = (label: string, v: number): (string | number)[] => ['', label, '', '', v, '']
    sheets.push({
      name: 'Khoản Chi',
      subtitle: `Kỳ quỹ: ${data.periodName} · ${expenseRows.length} khoản chi`,
      headers: ['Ngày', 'Nội dung', 'Nguồn', 'Loại', 'Số tiền (VNĐ)', 'Trạng thái'],
      rows: expenseRows.map(e => [e.date, e.description, e.fundLabel, e.kindLabel, e.amount, e.statusLabel]),
      footerRows: [
        footer('Tổng chi Quỹ Chính (đã duyệt / đã chi)', approved('COMMON')),
        footer('Tổng chi Quỹ Phụ (đã duyệt / đã chi)', approved('MINI')),
      ],
    })
  }
  return exportExcel(`Bao_Cao_${data.periodName.replace(/\s/g, '_')}`, sheets)
}
