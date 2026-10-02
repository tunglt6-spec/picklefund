// xlsx / jspdf / html2canvas-pro được DYNAMIC import trong từng hàm export (chỉ tải khi bấm
// nút Xuất) → loại ~700-800KB khỏi bundle khởi động. html2canvas-pro thay html2canvas (gộp 1 lib).
//
// QUY ƯỚC LỖI: hàm export trả Promise và THROW khi thất bại (không toast trong lib) → call site
// await + try/catch (xem hooks/useExportRunner). Người dùng bấm Hủy hộp thoại lưu = không lỗi.

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
/** Bản KHÔNG dấu # cho fill của xlsx-js-style. */
const brandColorHex = () => brandColor().replace('#', '').toUpperCase()

/* Logo PickleFund MẶC ĐỊNH cho báo cáo: con-quay TRẮNG crop sát, nền TRONG SUỐT (KHÔNG nền
   trắng) → đặt thẳng trên header màu brand, hợp cả ảnh lẫn PDF. CLB chưa đặt logo riêng thì
   mọi export dùng logo chung này. */
const DEFAULT_LOGO_URL = '/logo-pf-report-white.png'

/* ── Logo CLB cho PDF vector: tải 1 lần / URL → dataURL + kích thước gốc.
   Best-effort: lỗi mạng/CORS/ảnh hỏng → trả null, PDF vẫn xuất bình thường không logo. ── */
let brandLogoCache: { url: string; logo: { dataUrl: string; w: number; h: number } | null } | null = null
async function loadBrandLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
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
    brandLogoCache = { url, logo: { dataUrl, w: dims.w, h: dims.h } }
  } catch {
    brandLogoCache = { url, logo: null }
  }
  return brandLogoCache.logo
}

/* ─── helpers ─── */
/** Tiền VND deterministic (không phụ thuộc ICU): 1234567 → "1.234.567 đ", âm → "-5.000 đ". Ký hiệu 'đ' dùng chung mọi export. */
function formatVND(n: number) {
  const r = Math.round(Number(n) || 0)
  return `${r < 0 ? '-' : ''}${String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`
}
/** Số thường có phân cách nghìn kiểu VN: 1234567 → "1.234.567", -5000 → "-5.000", 1.5 → "1,5". */
export function formatNumberVN(n: number): string {
  if (!Number.isFinite(n)) return ''
  const neg = n < 0
  const abs = Math.abs(n)
  const [ip, fp] = (Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/0+$/, '')).split('.')
  const int = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}${int}${fp ? ',' + fp : ''}`
}

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
/** ISO/Date → "HH:mm:ss dd/MM/yyyy" (giờ VN); không hợp lệ → "—" (không in "Invalid Date"). */
function formatDateTime(v: string | Date | null | undefined): string {
  const d = v instanceof Date ? v : new Date(v ?? '')
  if (Number.isNaN(d.getTime())) return '—'
  const p = hcmParts(d)
  return `${p.hh}:${p.mi}:${p.ss} ${p.dd}/${p.mm}/${p.yyyy}`
}

/** Tên file an toàn: giữ tiếng Việt, khoảng trắng → "_", bỏ ký tự cấm / \ ? % * : | " < > và ký tự điều khiển. */
export function safeFileName(s: string): string {
  const out = String(s ?? '')
    .replace(/\s+/g, '_')
    .replace(/[/\\?%*:|"<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/^[._]+|[._]+$/g, '')
  return out.slice(0, 120) || 'export'
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

/* ════════════════════════════════════════
   PDF via html2canvas → jsPDF (auto download, hỗ trợ tiếng Việt)
════════════════════════════════════════ */
// Prefix `PDF_ROOT` cho MỌI selector để CSS chỉ áp trong container render off-screen
// (light DOM) — không leak ra trang khi html2canvas chụp. Xem downloadPDF().
const PDF_ROOT = 'pf-pdf-render-root'
const BASE_CSS = `
  .${PDF_ROOT} * { box-sizing: border-box; margin: 0; padding: 0; }
  .${PDF_ROOT} { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
  .${PDF_ROOT} .page { width: 754px; padding: 28px 32px; background: #fff; }
  .${PDF_ROOT} .header { background: #6D5DFB; color: #fff; border-radius: 10px 10px 0 0; padding: 16px 22px 12px; }
  .${PDF_ROOT} .header h1 { font-size: 17px; font-weight: 700; }
  .${PDF_ROOT} .header p { font-size: 12px; opacity: .85; margin-top: 3px; }
  .${PDF_ROOT} .header-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; opacity: .75; }
  .${PDF_ROOT} table { width: 100%; border-collapse: collapse; }
  .${PDF_ROOT} th { background: #6D5DFB; color: #fff; padding: 8px 11px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  .${PDF_ROOT} th.right, .${PDF_ROOT} td.right { text-align: right; }
  .${PDF_ROOT} th.center, .${PDF_ROOT} td.center { text-align: center; }
  .${PDF_ROOT} td { padding: 7px 11px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .${PDF_ROOT} tr:nth-child(even) td { background: #f8fafc; }
  .${PDF_ROOT} .badge-green { color: #16a34a; font-weight: 600; }
  .${PDF_ROOT} .badge-red { color: #ef4444; font-weight: 600; }
  .${PDF_ROOT} .badge-yellow { color: #d97706; font-weight: 600; }
  .${PDF_ROOT} .summary { background: #eef2ff; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }
  .${PDF_ROOT} .summary .label { font-size: 12px; color: #6D5DFB; font-weight: 600; }
  .${PDF_ROOT} .summary .value { font-size: 15px; font-weight: 700; color: #4338ca; }
  .${PDF_ROOT} .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
`

async function downloadPDF(sections: string[], filename: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297

  for (let i = 0; i < sections.length; i++) {
    // Light DOM (KHÔNG dùng attachShadow): html2canvas clone node đích sang document
    // riêng để chụp — style trong shadow-encapsulated <style> sẽ KHÔNG áp cho clone
    // → PDF vỡ/blank (đã xác nhận). BASE_CSS đã scope theo .${PDF_ROOT} nên đặt ở
    // light DOM off-screen vẫn không leak style ra trang.
    const container = document.createElement('div')
    container.className = PDF_ROOT
    container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff;'
    container.innerHTML = `<style>${BASE_CSS}</style><div class="page">${sections[i]}</div>`
    document.body.appendChild(container)

    let canvas: HTMLCanvasElement
    try {
      // Chờ web font tải xong TRƯỚC khi html2canvas chụp. Nếu chụp lúc font chưa sẵn sàng,
      // chữ được đo bằng font dự phòng → nhãn có thể xuống dòng/đo sai → ô giá trị bị "nhảy lệch"
      // (lỗi không ổn định). document.fonts.ready giúp kết quả render ỔN ĐỊNH mọi lần xuất.
      if (document.fonts?.ready) {
        try { await document.fonts.ready } catch { /* trình duyệt cũ không hỗ trợ → bỏ qua */ }
      }

      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const pageEl = container.querySelector('.page') as HTMLElement
      canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
    } finally {
      document.body.removeChild(container) // luôn dọn node off-screen kể cả khi html2canvas lỗi
    }

    const imgW = pageW
    const chunkCanvasH = Math.floor((canvas.width * pageH) / imgW)

    let offsetY = 0
    let firstChunk = true

    while (offsetY < canvas.height) {
      // Lát đuôi < 2% chiều cao trang = rìa làm tròn pixel (không phải nội dung thật)
      // → bỏ, tránh sinh thêm 1 trang gần-trắng làm lệch phân trang bill.
      if (!firstChunk && canvas.height - offsetY < chunkCanvasH * 0.02) break
      const sliceH = Math.min(chunkCanvasH, canvas.height - offsetY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      slice.getContext('2d')!.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      const sliceImgH = Math.min((sliceH / canvas.width) * imgW, pageH)

      if (i > 0 || !firstChunk) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, imgW, sliceImgH)

      offsetY += sliceH
      firstChunk = false
    }
  }

  // Phiếu/biên nhận cá nhân: không tính vào "báo cáo đã xuất" của Command Center.
  return savePdfDoc(pdf, filename, { log: false })
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

/* ── Xuất ẢNH (PNG) theo ĐÚNG FORM PDF: render off-screen HTML dùng chung BASE_CSS (brand
   header + bảng + summary + footer) rồi rasterize 1 khung ảnh sắc nét. Thay cách chụp DOM
   dashboard sống (thưa, dính theme). ── */
async function renderReportPng(sectionsHtml: string, fileBase: string) {
  const { default: html2canvas } = await import('html2canvas-pro')
  const container = document.createElement('div')
  container.className = PDF_ROOT
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff;'
  container.innerHTML = `<style>${BASE_CSS}</style><div class="page">${sectionsHtml}</div>`
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

/** Header report dùng chung cho ẢNH (brand màu CLB + logo nếu có + tiêu đề + meta + ngày). */
function reportHeaderHtml(title: string, subtitle: string | undefined, meta: string | undefined, logo: { dataUrl: string } | null) {
  const color = brandColor()
  // KHÔNG nền trắng: logo (con-quay trắng) đặt thẳng trên header màu brand.
  const logoImg = logo
    ? `<img src="${escHtml(logo.dataUrl)}" style="height:48px;width:auto;max-width:160px;object-fit:contain;margin-right:14px;flex-shrink:0;"/>`
    : ''
  return `<div style="background:${color};color:#fff;padding:16px 24px 13px;">
      <div style="display:flex;align-items:center;">
        ${logoImg}
        <div style="min-width:0;">
          <div style="font-size:18px;font-weight:800;line-height:1.2;">${escHtml(brandName())} · ${escHtml(title)}</div>
          ${subtitle ? `<div style="font-size:12.5px;opacity:.9;margin-top:3px;">${escHtml(subtitle)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;opacity:.82;margin-top:9px;"><span>${escHtml(meta ?? '')}</span><span>Xuất ngày: ${today()}</span></div>
    </div>`
}
function reportFooterHtml() {
  return `<div style="text-align:center;font-size:10.5px;color:#94a3b8;padding:12px 24px 16px;border-top:1px solid #eef1f6;margin-top:2px;">${escHtml(brandFooter())} · Xuất lúc ${todayFull()}</div>`
}

/** Dựng wrap off-screen (header brand + clone element + footer) và chụp canvas. Dùng chung PNG/PDF. */
async function captureReportCanvas(
  elementId: string,
  report: { title: string; subtitle?: string; meta?: string },
): Promise<HTMLCanvasElement> {
  const [{ default: html2canvas }, logo] = await Promise.all([import('html2canvas-pro'), loadBrandLogo()])
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')
  const width = Math.max(Math.round(el.getBoundingClientRect().width) || 720, 560)

  const wrap = document.createElement('div')
  wrap.style.cssText = `position:fixed;left:-99999px;top:0;z-index:-1;width:${width + 48}px;background:#fff;font-family:'Be Vietnam Pro','Segoe UI',Arial,sans-serif;`
  wrap.innerHTML = reportHeaderHtml(report.title, report.subtitle, report.meta, logo) + '<div data-pf-body style="padding:18px 24px;background:#fff;"></div>' + reportFooterHtml()
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

/** Chụp 1 element DOM thành ẢNH REPORT chuẩn SaaS (form PDF): bọc header brand (màu CLB + logo)
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

/**
 * Chụp TOÀN BỘ nội dung 1 element (giống Xuất ảnh) rồi đóng thành PDF nhiều trang A4.
 * Dùng cho báo cáo dài (AIDO Executive Report): giữ NGUYÊN giao diện on-screen (Tailwind +
 * CSS var) vì clone được gắn vào document.body nên thừa hưởng stylesheet — khác downloadPDF
 * (render HTML rời trong container BASE_CSS). Ép light theme khi chụp.
 */
export async function captureElementAsReportPDF(
  elementId: string,
  fileBase: string,
  report: { title: string; subtitle?: string; meta?: string },
) {
  const [{ default: jsPDF }, canvas] = await Promise.all([
    import('jspdf'),
    captureReportCanvas(elementId, report),
  ])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgW = 210
  const pageH = 297
  const chunkCanvasH = Math.floor((canvas.width * pageH) / imgW)
  let offsetY = 0
  let first = true
  while (offsetY < canvas.height) {
    if (!first && canvas.height - offsetY < chunkCanvasH * 0.02) break
    const sliceH = Math.min(chunkCanvasH, canvas.height - offsetY)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceH
    slice.getContext('2d')!.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    const sliceImgH = Math.min((sliceH / canvas.width) * imgW, pageH)
    if (!first) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, imgW, sliceImgH)
    offsetY += sliceH
    first = false
  }
  // savePdfDoc tự thêm _ngày → truyền fileBase trần (tránh tên file kép ngày).
  return savePdfDoc(pdf, fileBase)
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

/** Ảnh Tổng quan tài chính — CÙNG FORM với Xuất PDF (brand header màu CLB + logo + bảng +
   summary + footer). */
export async function exportFinanceOverviewImage(d: FinanceOverviewInput) {
  const logo = await loadBrandLogo()
  const color = brandColor()
  const row = (label: string, value: string, cls = '') => `<tr><td>${escHtml(label)}</td><td class="right ${cls}">${escHtml(value)}</td></tr>`
  const sections = `
    ${reportHeaderHtml('Tổng quan tài chính', `Kỳ quỹ: ${d.periodName} · ${d.clubName}`, `${d.memberCount} thành viên · ${d.sessionCount} buổi · đã đóng ${d.confirmedCount}/${d.memberCount}`, logo)}
    <table style="margin-top:16px;">
      <thead><tr><th style="background:${color};">Chỉ số</th><th class="right" style="background:${color};">Giá trị</th></tr></thead>
      <tbody>
        ${row('Tổng thu (Quỹ Chính)', formatVND(d.totalIncome), 'badge-green')}
        ${row('Tổng chi (Quỹ Chính)', formatVND(d.totalExpense), 'badge-red')}
        ${row('Tồn Quỹ Chính', formatVND(d.balance))}
        ${row('Tồn Quỹ Phụ', formatVND(d.miniBalance))}
        ${row('Tổng tài sản CLB', formatVND(d.clubAssets))}
        ${row('Số dư chuyển kỳ', formatVND(d.carryForward))}
      </tbody>
    </table>
    <div class="summary" style="background:color-mix(in srgb, ${color} 12%, #fff);"><span class="label" style="color:${color};">Tồn quỹ hiện tại (Quỹ Chính)</span><span class="value" style="color:${color};">${escHtml(formatVND(d.balance))}</span></div>
    ${reportFooterHtml()}
  `
  return renderReportPng(sections, `Tai_chinh_${d.periodName.replace(/\s/g, '_')}`)
}

/* ════════════════════════════════════════
   BIÊN NHẬN THANH TOÁN GÓI (Billing receipt) — dùng template PDF chung
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
  const gross = d.amount + (d.discount ?? 0)
  const bi = d.billingInfo
  const infoRows = bi && (bi.buyerName || bi.taxCode || bi.address)
    ? `<tr><td>Đơn vị mua</td><td class="right">${escHtml(bi.buyerName ?? '—')}</td></tr>
       ${bi.taxCode ? `<tr><td>Mã số thuế</td><td class="right">${escHtml(bi.taxCode)}</td></tr>` : ''}
       ${bi.address ? `<tr><td>Địa chỉ</td><td class="right">${escHtml(bi.address)}</td></tr>` : ''}`
    : ''
  return downloadPDF([`
    <div class="header">
      <h1>${escHtml(brandName())} · Biên nhận thanh toán</h1>
      <p>Gói dịch vụ ${escHtml(d.planLabel)} · ${escHtml(d.cycleLabel)}</p>
      <div class="header-meta"><span>Số: ${escHtml(d.invoiceNumber)}</span><span>Ngày: ${escHtml(formatDateTime(d.paidAt))}</span></div>
    </div>
    <table>
      <thead><tr><th>Nội dung</th><th class="right">Giá trị</th></tr></thead>
      <tbody>
        <tr><td>Câu lạc bộ</td><td class="right">${escHtml(d.clubName)}</td></tr>
        <tr><td>Mã đơn</td><td class="right">${escHtml(d.orderCode)}</td></tr>
        <tr><td>Gói · chu kỳ</td><td class="right">${escHtml(d.planLabel)} · ${escHtml(d.cycleLabel)}</td></tr>
        <tr><td>Giá gốc</td><td class="right">${formatVND(gross)}</td></tr>
        ${d.discount ? `<tr><td>Ưu đãi</td><td class="right badge-green">- ${formatVND(d.discount)}</td></tr>` : ''}
        <tr><td>Hình thức</td><td class="right">${escHtml(d.gateway)}</td></tr>
        ${infoRows}
      </tbody>
    </table>
    <div class="summary"><span class="label">Đã thanh toán</span><span class="value">${formatVND(d.amount)}</span></div>
    <div class="footer">${escHtml(brandFooter())} · Biên nhận điện tử · Xuất lúc ${todayFull()}</div>
  `], `BienNhan_${d.invoiceNumber}`)
}

/* ════════════════════════════════════════
   EXCEL
════════════════════════════════════════ */
/* ── Style bảng Excel chuẩn SaaS (xlsx-js-style) — LẤY FORM TỪ PDF: block tiêu đề brand tím
   #6D5DFB + bảng ĐÓNG KHUNG mọi ô (border xám rõ, không lẫn gridline) + header cột tím + hàng
   xen kẽ + cột số căn phải/định dạng nghìn + auto-filter. `xlsx` community KHÔNG hỗ trợ style →
   dùng fork `xlsx-js-style` (cùng API). Đổi 1 chỗ ⇒ MỌI export Excel đồng bộ. */
// Border XÁM RÕ (slate-400) để đọc thành KHUNG thật, không chìm vào gridline mặc định Excel.
const XL_BD = { style: 'thin', color: { rgb: '94A3B8' } }
const XL_BD_ALL = { top: XL_BD, bottom: XL_BD, left: XL_BD, right: XL_BD }
// Tiêu đề + header cột theo MÀU CLB (brand) — build theo màu hiện tại lúc xuất.
const xlTitleStyle = (brand: string) => ({
  font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
  fill: { patternType: 'solid', fgColor: { rgb: brand } },
  alignment: { horizontal: 'left', vertical: 'center' },
})
const XL_META_STYLE = {
  font: { sz: 10, italic: true, color: { rgb: '64748B' }, name: 'Calibri' },
  fill: { patternType: 'solid', fgColor: { rgb: 'EEF0FB' } },
  alignment: { horizontal: 'left', vertical: 'center' },
}
const xlHeaderStyle = (brand: string) => ({
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
  fill: { patternType: 'solid', fgColor: { rgb: brand } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: XL_BD_ALL,
})
const xlCellStyle = (align: 'left' | 'right' | 'center', banded: boolean) => ({
  font: { sz: 11, color: { rgb: '1E293B' }, name: 'Calibri' },
  alignment: { horizontal: align, vertical: 'center' },
  border: XL_BD_ALL,
  fill: { patternType: 'solid', fgColor: { rgb: banded ? 'F4F6FB' : 'FFFFFF' } },
})
const xlFooterStyle = (align: 'left' | 'right' | 'center') => ({
  font: { bold: true, sz: 11, color: { rgb: '1E293B' }, name: 'Calibri' },
  alignment: { horizontal: align, vertical: 'center' },
  border: XL_BD_ALL,
  fill: { patternType: 'solid', fgColor: { rgb: 'EEF0FB' } },
})

export interface ExcelSheet {
  name: string
  headers: string[]
  rows: (string | number)[][]
  /** Dòng tổng cuối bảng (in đậm, nằm NGOÀI vùng auto-filter). */
  footerRows?: (string | number)[][]
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

const XL_HEADER_ROWS = 3 // hàng 0 tiêu đề brand · 1 ngày xuất · 2 header cột → đóng băng cả 3

/** Xuất workbook ra bytes .xlsx (không đụng DOM → test được bằng node). */
export async function buildExcelBytes(sheets: ExcelSheet[]): Promise<Uint8Array> {
  const mod = await import('xlsx-js-style')
  const XLSX = ((mod as unknown as { default?: typeof import('xlsx-js-style') }).default ?? mod)
  const set = (ws: Record<string, unknown>, r: number, c: number, patch: { v?: unknown; t?: string; z?: string; s?: unknown }) => {
    const ref = XLSX.utils.encode_cell({ r, c })
    const cur = (ws[ref] as Record<string, unknown>) ?? { t: 's', v: '' }
    ws[ref] = { ...cur, ...patch }
    return ws[ref] as { v?: unknown; t?: string; z?: string; s?: unknown }
  }
  const wb = XLSX.utils.book_new()
  const brand = brandColorHex() // màu CLB cho tiêu đề + header cột
  const titleStyle = xlTitleStyle(brand)
  const headerStyle = xlHeaderStyle(brand)
  const TITLE = 0, META = 1, HEAD = 2 // hàng tiêu đề brand · meta ngày · header cột
  const names = sanitizeSheetNames(sheets.map(s => s.name))

  sheets.forEach((sheet, si) => {
    const nCols = sheet.headers.length
    const nRows = sheet.rows.length
    const footers = sheet.footerRows ?? []
    const allRows = [...sheet.rows, ...footers]
    // Giá trị không hữu hạn / null → ô trống (không sinh lỗi #NUM!/"NaN").
    const clean = (v: unknown): string | number =>
      typeof v === 'number' ? (Number.isFinite(v) ? v : '') : (v == null ? '' : String(v))
    // Đặt bảng bắt đầu từ hàng HEAD (chừa 2 hàng đầu cho brand title + ngày xuất — form PDF).
    const data: (string | number)[][] = [
      [], [],
      sheet.headers,
      ...allRows.map(r => r.map(clean)),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data) as Record<string, unknown>
    // ── Block tiêu đề brand (merge cả hàng) ──
    set(ws, TITLE, 0, { t: 's', v: `${brandName()} · ${sheet.name}`, s: titleStyle })
    set(ws, META, 0, { t: 's', v: `Xuất ngày: ${today()}`, s: XL_META_STYLE })
    for (let c = 1; c < nCols; c++) { set(ws, TITLE, c, { t: 's', v: '', s: titleStyle }); set(ws, META, c, { t: 's', v: '', s: XL_META_STYLE }) }
    // ── Header cột + dữ liệu (đóng khung). Kiểu/định dạng theo TỪNG Ô (cột hỗn hợp số + chuỗi vẫn đúng) ──
    for (let c = 0; c < nCols; c++) set(ws, HEAD, c, { s: headerStyle })
    allRows.forEach((row, ri) => {
      const isFooter = ri >= nRows
      for (let c = 0; c < nCols; c++) {
        const raw = clean(row[c])
        let align: 'left' | 'right' | 'center' = 'left'
        let patch: { t?: string; v?: unknown; z?: string } = {}
        if (typeof raw === 'number') {
          align = 'right'
          patch = { z: Number.isInteger(raw) ? '#,##0' : '#,##0.##' }
        } else if (raw !== '') {
          const serial = toExcelDateSerial(raw)
          if (serial != null) { align = 'center'; patch = { t: 'n', v: serial, z: 'dd/mm/yyyy' } }
        }
        set(ws, HEAD + 1 + ri, c, { ...patch, s: isFooter ? xlFooterStyle(align) : xlCellStyle(align, ri % 2 === 1) })
      }
    })
    const lastRow = HEAD + allRows.length
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(lastRow, HEAD), c: Math.max(nCols - 1, 0) } })
    ws['!merges'] = [
      { s: { r: TITLE, c: 0 }, e: { r: TITLE, c: Math.max(nCols - 1, 0) } },
      { s: { r: META, c: 0 }, e: { r: META, c: Math.max(nCols - 1, 0) } },
    ]
    ws['!cols'] = sheet.headers.map((h, i) => {
      const max = Math.max(h.length, ...allRows.map(r => String(r[i] ?? '').length))
      return { wch: Math.min(Math.max(max + 4, 12), 60) }
    })
    ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 24 }]
    if (nRows > 0) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: HEAD, c: 0 }, e: { r: HEAD + nRows, c: nCols - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, names[si])
  })
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return freezeHeaderRows(new Uint8Array(out as ArrayBuffer), XL_HEADER_ROWS)
}

/** Đóng băng `rows` hàng đầu của MỌI sheet. xlsx-js-style không ghi pane → vá thẳng sheetViews trong
 *  zip bằng fflate (phụ thuộc có sẵn của jspdf). Lỗi vá → trả file gốc (chỉ mất freeze, không mất dữ liệu). */
async function freezeHeaderRows(bytes: Uint8Array, rows: number): Promise<Uint8Array> {
  try {
    const { unzipSync, zipSync, strFromU8, strToU8 } = await import('fflate')
    const files = unzipSync(bytes)
    let patched = false
    for (const name of Object.keys(files)) {
      if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) continue
      const xml = strFromU8(files[name])
      const next = xml.replace(
        /<sheetViews>[\s\S]*?<\/sheetViews>/,
        `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${rows}" topLeftCell="A${rows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${rows + 1}" sqref="A${rows + 1}"/></sheetView></sheetViews>`,
      )
      if (next !== xml) { files[name] = strToU8(next); patched = true }
    }
    return patched ? zipSync(files) : bytes
  } catch {
    return bytes
  }
}

export async function exportExcel(filename: string, sheets: ExcelSheet[]) {
  const bytes = await buildExcelBytes(sheets)
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `${safeFileName(filename)}_${dateStamp()}.xlsx`)
  logReportExport(reportTypeOf(filename), 'excel')
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
) {
  return exportExcel(fileBase, [{ name: sheetName, headers, rows, footerRows: footerRow ? [footerRow] : undefined }])
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
  stats?: { label: string; value: string | number }[]
  /** Dòng tổng cuối bảng (key theo columns). */
  footerRow?: Record<string, string | number>
}) {
  const CONTENT_W = 186 // = PAGE_W(210) - 2*MARGIN(12), khớp pdf-report-core
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
    branding: { name: brandName(), footer: brandFooter(), logo },
    meta: {
      clubName: input.clubName,
      sportLabel: input.headerLeft ?? input.clubName,
      tournamentName: '',
      formatLabel: '',
      rankNote: input.note ?? '',
      title: input.title,
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
  return buildVectorTable({
    fileName: opts.fileBase,
    title: opts.title.toUpperCase(),
    clubName: opts.subtitle ?? brandName(),
    headerLeft,
    note: opts.summaryLabel ? `${opts.summaryLabel}: ${opts.summaryValue ?? ''}` : '',
    columns: opts.columns.map((c, i) => ({ key: colKey(i), label: c.header, align: c.align ?? (isNumCol(i) ? 'right' : 'left') })),
    rows: opts.rows.map(r => {
      const o: Record<string, string | number> = {}
      opts.columns.forEach((_, i) => { o[colKey(i)] = pdfCell(r[i]) })
      return o
    }),
    footerRow: opts.footerRow
      ? Object.fromEntries(opts.columns.map((_, i) => [colKey(i), pdfCell(opts.footerRow?.[i])]))
      : undefined,
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
  return buildVectorTable({
    fileName: `So_Quy_${slugName(periodName)}`,
    title: 'SỔ QUỸ CHI TIẾT',
    clubName: periodName,
    headerLeft: `${periodName} · ${rows.length} giao dịch`,
    note: `Số dư cuối kỳ: ${formatVND(balance)}`,
    columns: [
      { key: 'date', label: 'NGÀY', w: 26, align: 'left' },
      { key: 'type', label: 'LOẠI', w: 18, align: 'center' },
      { key: 'desc', label: 'MÔ TẢ', w: 66, align: 'left' },
      { key: 'amount', label: 'SỐ TIỀN', w: 38, align: 'right', tone: 'sign', bold: true },
      { key: 'balance', label: 'SỐ DƯ', w: 38, align: 'right' },
    ],
    rows: tableRows,
    stats: [
      { label: 'Tổng thu', value: formatVND(totalIncome) },
      { label: 'Tổng chi', value: formatVND(totalExpense) },
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
      { key: 'status', label: 'XÁC NHẬN', w: 28, align: 'center' },
    ],
    rows: tableRows,
    stats: [
      { label: 'Quỹ Chính (đã xác nhận)', value: formatVND(commonTotal) },
      { label: 'Quỹ Phụ (đã xác nhận)', value: formatVND(miniTotal) },
      { label: 'Tổng thu (đã xác nhận)', value: formatVND(commonTotal + miniTotal) },
      { label: 'Chờ xác nhận', value: formatVND(pendingTotal) },
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
    headerLeft: `${clubName} · ${rows.length} thành viên`,
    columns: [
      { key: 'rank', label: '#', w: 10, align: 'center' },
      { key: 'name', label: 'HỌ VÀ TÊN', w: 44, align: 'left', bold: true },
      { key: 'phone', label: 'ĐIỆN THOẠI', w: 30, align: 'left' },
      { key: 'email', label: 'EMAIL', w: 56, align: 'left' },
      { key: 'joinDate', label: 'NGÀY THAM GIA', w: 24, align: 'center' },
      { key: 'status', label: 'TRẠNG THÁI', w: 22, align: 'center', tone: 'muted' },
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

const RECEIPT_CSS = `
    .r-wrap { font-family: 'Segoe UI', Arial, sans-serif; }
    .r-head { background: #6D5DFB; color: #fff; padding: 18px 24px 14px; border-radius: 10px 10px 0 0; display: flex; align-items: flex-start; justify-content: space-between; }
    .r-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .r-logo { width: 40px; height: 40px; background: rgba(255,255,255,.18); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .r-title-sub { font-size: 10px; font-weight: 600; letter-spacing: 1px; opacity: .85; text-transform: uppercase; overflow-wrap: anywhere; }
    .r-title-main { font-size: 19px; font-weight: 800; letter-spacing: -.2px; margin-top: 2px; }
    .r-head-right { text-align: right; flex-shrink: 0; }
    .r-no { font-size: 17px; font-weight: 700; }
    .r-date { font-size: 10px; opacity: .8; margin-top: 2px; }
    .r-cards { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #e2e8f0; border-top: none; }
    .r-card { padding: 13px 18px; min-width: 0; }
    .r-card + .r-card { border-left: 1.5px solid #e2e8f0; }
    .r-clabel { font-size: 9px; font-weight: 700; color: #6D5DFB; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; }
    .r-field { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .r-fk { font-size: 11px; color: #64748b; flex-shrink: 0; }
    .r-fv { font-size: 11px; font-weight: 600; color: #1e293b; text-align: right; min-width: 0; overflow-wrap: anywhere; }
    .r-fv.accent { color: #6D5DFB; }
    .r-banner { background: linear-gradient(135deg,#6D5DFB,#818cf8); color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; border-left:1.5px solid #6D5DFB; border-right:1.5px solid #6D5DFB; }
    .r-blabel { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: .85; }
    .r-bval { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-top: 2px; }
    .r-bdate { font-size: 11px; opacity: .75; margin-top: 2px; }
    .r-badge { background: #fff; color: #16a34a; border-radius: 20px; padding: 5px 13px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .r-badge.pending { color: #d97706; }
    .r-sec { border: 1.5px solid #e2e8f0; border-top: none; padding: 14px 18px; }
    .r-stitle { font-size: 9px; font-weight: 700; color: #6D5DFB; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #eef2ff; overflow-wrap: anywhere; }
    .r-stitle.gray { color: #64748b; margin-top: 8px; }
    .r-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .r-rk { font-size: 11px; color: #475569; }
    .r-rv { font-size: 11px; font-weight: 500; color: #1e293b; flex-shrink: 0; }
    .r-rv.orange { color: #ea580c; font-weight: 700; }
    .r-total { display: flex; justify-content: space-between; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #e2e8f0; }
    .r-tk { font-size: 12px; font-weight: 700; color: #1e293b; }
    .r-tv { font-size: 13px; font-weight: 800; color: #ea580c; }
    .r-pay { border: 1.5px solid #e2e8f0; border-top: none; padding: 13px 18px; }
    .r-prow { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .r-pk { font-size: 11px; color: #475569; }
    .r-pv { font-size: 12px; font-weight: 700; color: #16a34a; }
    .r-bal { margin-top: 10px; border-radius: 7px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .r-bal.pos { background: #f0fdf4; border: 1.5px solid #bbf7d0; }
    .r-bal.neg { background: #fef2f2; border: 1.5px solid #fecaca; }
    .r-balk { font-size: 11px; font-weight: 600; }
    .r-balk.pos { color: #16a34a; }
    .r-balk.neg { color: #ef4444; }
    .r-balv { font-size: 19px; font-weight: 800; }
    .r-balv.pos { color: #16a34a; }
    .r-balv.neg { color: #ef4444; }
    .r-sig { border: 1.5px solid #e2e8f0; border-top: none; display: grid; grid-template-columns: 1fr 1fr; }
    .r-scol { padding: 14px 18px; text-align: center; min-width: 0; }
    .r-scol + .r-scol { border-left: 1.5px solid #e2e8f0; }
    .r-stit { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    .r-sline { border-bottom: 1.5px dashed #cbd5e1; margin: 24px 10px 5px; }
    .r-sname { font-size: 11px; font-weight: 600; color: #1e293b; overflow-wrap: anywhere; }
    .r-snote { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .r-foot { border: 1.5px solid #e2e8f0; border-top: none; border-radius: 0 0 9px 9px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: flex-end; background: #f8fafc; gap: 12px; }
    .r-fnote { font-size: 10px; color: #94a3b8; max-width: 55%; line-height: 1.5; }
    .r-fright { text-align: right; font-size: 10px; color: #475569; min-width: 0; overflow-wrap: anywhere; }
    .r-fclub { font-weight: 700; color: #1e293b; font-size: 11px; }
  `

/** HTML phiếu thu cá nhân. MỌI biến đều qua escHtml (tên/CLB/kỳ do người dùng nhập). Pure → test được. */
export function buildReceiptHtml(data: ReceiptData): string {
  const e = escHtml
  const isPos = data.balance >= 0
  const hasNo = data.receiptNo != null
  const no = hasNo ? String(data.receiptNo).padStart(4, '0') : ''
  const splitCount = data.memberCountForSplit && data.memberCountForSplit > 0 ? data.memberCountForSplit : undefined
  // Tổng toàn quỹ: dùng số backend đưa; chỉ suy ngược khi có sĩ số thật; thiếu cả hai → ẩn dòng.
  const totalCourt = data.totalCourtFee ?? (splitCount ? data.courtCost * splitCount : undefined)
  const loc = (data.clubLocation ?? '').trim()
  const splitNote = splitCount ? ` / ${e(splitCount)} người` : ''

  return `
    <style>${RECEIPT_CSS}</style>
    <div class="r-wrap">
      <div class="r-head">
        <div class="r-head-left">
          <div class="r-logo">🏓</div>
          <div>
            <div class="r-title-sub">${e(data.clubName)}</div>
            <div class="r-title-main">PHIẾU THU QUỸ</div>
          </div>
        </div>
        <div class="r-head-right">
          ${hasNo ? `<div class="r-no">No. ${e(no)}</div>` : ''}
          <div class="r-date">Ngày in: ${today()}</div>
        </div>
      </div>

      <div class="r-cards">
        <div class="r-card">
          <div class="r-clabel">👤 Thành Viên</div>
          <div class="r-field"><span class="r-fk">Họ và tên:</span><span class="r-fv">${e(data.memberName)}</span></div>
          ${data.loginName ? `<div class="r-field"><span class="r-fk">Tên đăng nhập:</span><span class="r-fv">${e(data.loginName)}</span></div>` : ''}
          <div class="r-field"><span class="r-fk">Số buổi tham gia:</span><span class="r-fv">${e(data.attendedSessions)} / ${e(data.totalSessions)} buổi</span></div>
        </div>
        <div class="r-card">
          <div class="r-clabel">📅 Thông Tin Quỹ</div>
          <div class="r-field"><span class="r-fk">Quỹ:</span><span class="r-fv accent">${e(data.periodName)}</span></div>
          ${data.periodStartDate && data.periodEndDate ? `<div class="r-field"><span class="r-fk">Thời gian:</span><span class="r-fv">${e(data.periodStartDate)} – ${e(data.periodEndDate)}</span></div>` : ''}
          <div class="r-field"><span class="r-fk">Mức đóng:</span><span class="r-fv accent">${formatVND(data.contributionAmount ?? data.amountPaid)}</span></div>
        </div>
      </div>

      <div class="r-banner">
        <div>
          <div class="r-blabel">Số Tiền Đã Đóng Quỹ</div>
          <div class="r-bval">${formatVND(data.amountPaid)}</div>
          ${data.paymentDate ? `<div class="r-bdate">Ngày đóng: ${e(data.paymentDate)}</div>` : ''}
        </div>
        <div class="r-badge ${data.isConfirmed ? '' : 'pending'}">${data.isConfirmed ? '✓ Đã đóng quỹ' : '⏳ Chờ xác nhận'}</div>
      </div>

      <div class="r-sec">
        <div class="r-stitle">Chi Tiết Chi Phí Của Bạn – ${e(data.periodName)}</div>
        <div class="r-stitle gray">Tiền Thuê Sân</div>
        ${totalCourt != null ? `<div class="r-row"><span class="r-rk">Tổng tiền sân toàn quỹ</span><span class="r-rv">${formatVND(totalCourt)}</span></div>` : ''}
        <div class="r-row"><span class="r-rk">Chia đều theo sĩ số${splitNote}</span><span class="r-rv orange">${formatVND(data.courtCost)}</span></div>
        <div class="r-stitle gray">Nước, Ăn, Phát Sinh</div>
        ${data.totalOtherFee != null ? `<div class="r-row"><span class="r-rk">Tổng chi khác toàn quỹ</span><span class="r-rv">${formatVND(data.totalOtherFee)}</span></div>` : ''}
        <div class="r-row"><span class="r-rk">Sinh hoạt (chia đều + theo buổi tham dự)</span><span class="r-rv orange">${formatVND(data.livingCost)}</span></div>
        <div class="r-total"><span class="r-tk">Tổng chi phí của bạn</span><span class="r-tv">${formatVND(data.totalCost)}</span></div>
      </div>

      <div class="r-pay">
        <div class="r-stitle">Thanh Toán</div>
        <div class="r-prow"><span class="r-pk">Bạn đã nộp quỹ</span><span class="r-pv">${formatVND(data.amountPaid)}</span></div>
        <div class="r-bal ${isPos ? 'pos' : 'neg'}">
          <div>
            <div class="r-balk ${isPos ? 'pos' : 'neg'}">${isPos ? 'Số dư của bạn' : 'Số tiền cần nộp thêm'}</div>
            ${isPos ? `<div style="font-size:10px;color:#64748b;margin-top:3px;font-style:italic;">Số dư sẽ dùng cho các buổi tiếp theo.</div>` : ''}
          </div>
          <div class="r-balv ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : ''}${formatVND(data.balance)}</div>
        </div>
      </div>

      <div class="r-sig">
        <div class="r-scol">
          <div class="r-stit">Thủ Quỹ Xác Nhận</div>
          <div class="r-sline"></div>
          <div class="r-sname">${data.isConfirmed ? '(Đã xác nhận)' : '(Ký và ghi rõ họ tên)'}</div>
          <div class="r-snote">Thủ quỹ CLB</div>
        </div>
        <div class="r-scol">
          <div class="r-stit">Người Đóng Quỹ</div>
          <div class="r-sline"></div>
          <div class="r-sname">${e(data.memberName)}</div>
          <div class="r-snote">Thành viên CLB</div>
        </div>
      </div>

      <div class="r-foot">
        <div class="r-fnote">Phiếu này xác nhận việc đóng quỹ của thành viên. Mọi thắc mắc liên hệ Ban Quản lý CLB.</div>
        <div class="r-fright">
          <div class="r-fclub">${e(data.clubName)}</div>
          <div>${loc ? `${e(loc)}, ` : ''}ngày ${today()}</div>
        </div>
      </div>
    </div>
  `
}

export function exportReceiptPDF(data: ReceiptData) {
  return downloadPDF(
    [buildReceiptHtml(data)],
    `Phieu_Thu_${data.memberName.replace(/\s/g, '_')}_${data.periodName.replace(/\s/g, '_')}`,
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
    branding: { name: brandName(), footer: brandFooter(), logo },
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
    branding: { name: brandName(), footer: brandFooter(), logo },
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
  tone?: 'win' | 'loss' | 'points' | 'muted' | 'sign'
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
  stats?: { label: string; value: string | number }[]
  /** Tiêu đề header (mặc định 'BẢNG XẾP HẠNG'). */
  title?: string
  /** Tô nhẹ 3 dòng đầu (mặc định true). Tắt cho bảng không xếp hạng (vd Lịch). */
  highlightTop3?: boolean
  /** Tiền tố tên file (mặc định 'BXH'). */
  filePrefix?: string
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
    branding: { name: brandName(), footer: brandFooter(), logo },
    meta: {
      clubName: input.clubName,
      tournamentName: input.tournamentName,
      sportLabel: input.sportLabel,
      formatLabel: input.formatLabel,
      rankNote: input.rankNote,
      title: input.title,
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
  input: Omit<StandingsPdfInput, 'title' | 'highlightTop3' | 'filePrefix' | 'rankNote'> & { rankNote?: string },
) {
  return exportStandingsPDF({
    ...input,
    title: 'LỊCH THI ĐẤU',
    highlightTop3: false,
    filePrefix: 'Lich',
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
    branding: { name: brandName(), footer: brandFooter(), logo },
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
    branding: { name: brandName(), footer: brandFooter(), logo },
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

/** HTML phiếu chi Quỹ Phụ — MỌI biến qua escHtml; giá trị dài tự xuống dòng, không đè cột nhãn. Pure → test được. */
export function buildMiniExpenseReceiptHtml(data: MiniExpenseReceiptData): string {
  const e = escHtml
  const hasNo = data.receiptNo != null
  const loc = (data.clubLocation ?? '').trim()
  return `
    <style>
      .me-wrap { font-family:'Segoe UI',Arial,sans-serif; }
      .me-head { background:linear-gradient(135deg,#6d28d9,#8b5cf6); color:#fff; border-radius:10px 10px 0 0; padding:16px 22px 12px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
      .me-title { font-size:18px; font-weight:800; }
      .me-sub   { font-size:11px; opacity:.85; margin-top:3px; overflow-wrap:anywhere; }
      .me-no    { text-align:right; font-size:16px; font-weight:700; }
      .me-date  { font-size:10px; opacity:.8; margin-top:2px; }
      .me-body  { border:1.5px solid #e2e8f0; border-top:none; padding:18px 22px; }
      .me-field { display:flex; justify-content:space-between; gap:16px; padding:8px 0; border-bottom:1px solid #f1f5f9; }
      .me-fk    { font-size:12px; color:#64748b; flex-shrink:0; min-width:70px; }
      .me-fv    { font-size:12px; font-weight:600; color:#1e293b; text-align:right; min-width:0; overflow-wrap:anywhere; }
      .me-fv.accent { color:#6d28d9; }
      .me-amount { margin-top:14px; background:linear-gradient(135deg,#dc2626,#f87171); color:#fff; border-radius:9px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
      .me-al    { font-size:11px; opacity:.85; font-weight:600; }
      .me-av    { font-size:28px; font-weight:800; }
      .me-sig   { border:1.5px solid #e2e8f0; border-top:none; display:grid; grid-template-columns:1fr 1fr; }
      .me-scol  { padding:14px 18px; text-align:center; min-width:0; }
      .me-scol + .me-scol { border-left:1.5px solid #e2e8f0; }
      .me-stit  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
      .me-sline { border-bottom:1.5px dashed #cbd5e1; margin:24px 10px 5px; }
      .me-sname { font-size:11px; font-weight:600; color:#1e293b; overflow-wrap:anywhere; }
      .me-foot  { border:1.5px solid #e2e8f0; border-top:none; border-radius:0 0 9px 9px; padding:10px 18px; display:flex; justify-content:space-between; gap:12px; background:#f8fafc; font-size:10px; color:#94a3b8; }
    </style>
    <div class="me-wrap">
      <div class="me-head">
        <div style="min-width:0;">
          <div class="me-title">🎮 Phiếu Chi Quỹ Phụ</div>
          <div class="me-sub">${e(data.clubName)}</div>
        </div>
        <div style="flex-shrink:0;">
          ${hasNo ? `<div class="me-no">No. ${e(String(data.receiptNo).padStart(4, '0'))}</div>` : ''}
          <div class="me-date">Ngày in: ${today()}</div>
        </div>
      </div>
      <div class="me-body">
        <div class="me-field"><span class="me-fk">Mô tả</span><span class="me-fv">${e(data.description)}</span></div>
        <div class="me-field"><span class="me-fk">Người nhận</span><span class="me-fv">${e(data.receiverName)}</span></div>
        <div class="me-field"><span class="me-fk">Loại chi</span><span class="me-fv accent">${e(data.expenseType)}</span></div>
        <div class="me-field"><span class="me-fk">Ngày chi</span><span class="me-fv">${e(data.expenseDate)}</span></div>
        ${data.notes ? `<div class="me-field"><span class="me-fk">Ghi chú</span><span class="me-fv">${e(data.notes)}</span></div>` : ''}
        <div class="me-amount">
          <div class="me-al">Số Tiền Chi Quỹ Phụ</div>
          <div class="me-av">${formatVND(data.amount)}</div>
        </div>
      </div>
      <div class="me-sig">
        <div class="me-scol">
          <div class="me-stit">Thủ Quỹ Xác Nhận</div>
          <div class="me-sline"></div>
          <div class="me-sname">(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="me-scol">
          <div class="me-stit">Người Nhận</div>
          <div class="me-sline"></div>
          <div class="me-sname">${e(data.receiverName)}</div>
        </div>
      </div>
      <div class="me-foot">
        <span>Phiếu Chi Quỹ Phụ – không phân bổ cá nhân, không ảnh hưởng Quỹ Chính</span>
        <span>${loc ? `${e(loc)}, ` : ''}ngày ${today()}</span>
      </div>
    </div>
  `
}

export function exportMiniExpenseReceiptPDF(data: MiniExpenseReceiptData) {
  return downloadPDF([buildMiniExpenseReceiptHtml(data)], `Phieu_Chi_Mini_${data.receiverName.replace(/\s/g, '_')}`)
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
