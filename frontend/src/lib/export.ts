// xlsx / jspdf / html2canvas-pro được DYNAMIC import trong từng hàm export (chỉ tải khi bấm
// nút Xuất) → loại ~700-800KB khỏi bundle khởi động. html2canvas-pro thay html2canvas (gộp 1 lib).

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
export function setExportBranding(b: {
  displayName?: string | null
  pdfFooter?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}) {
  const hex = (b.primaryColor ?? '').trim()
  exportBranding = {
    displayName: b.displayName ? b.displayName : 'PickleFund',
    pdfFooter: b.pdfFooter ? b.pdfFooter : 'PickleFund',
    logoUrl: b.logoUrl ?? null,
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_BRAND_COLOR,
  }
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
function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}
function today() {
  return new Date().toLocaleDateString('vi-VN')
}
function todayFull() {
  return new Date().toLocaleString('vi-VN')
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

    // Chờ web font tải xong TRƯỚC khi html2canvas chụp. Nếu chụp lúc font chưa sẵn sàng,
    // chữ được đo bằng font dự phòng → nhãn (vd "Sinh hoạt (chia đều)") có thể xuống dòng/đo
    // sai → ô giá trị bị "nhảy lệch" lên giữa thẻ bill (lỗi không ổn định, lúc đúng lúc sai).
    // document.fonts.ready giúp kết quả render ỔN ĐỊNH mọi lần xuất.
    if (document.fonts?.ready) {
      try { await document.fonts.ready } catch { /* trình duyệt cũ không hỗ trợ → bỏ qua */ }
    }

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    const pageEl = container.querySelector('.page') as HTMLElement
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    document.body.removeChild(container)

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

  return savePdfDoc(pdf, filename)
}

/** Lưu 1 tài liệu jsPDF: hộp thoại "Lưu file" nếu có, fallback tải về Downloads. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function savePdfDoc(pdf: any, filename: string) {
  const suggestedName = `${filename}_${today().replace(/\//g, '-')}.pdf`

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
      return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Người dùng bấm Cancel → không làm gì
      if (e?.name === 'AbortError') return
    }
  }

  // Fallback: download thông thường (trình duyệt tự lưu vào thư mục Downloads)
  pdf.save(suggestedName)
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
  if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* bỏ qua */ } }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const pageEl = container.querySelector('.page') as HTMLElement
  const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
  document.body.removeChild(container)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas toBlob failed'))), 'image/png', 1.0),
  )
  const name = `${fileBase}_${today().replace(/\//g, '-')}.png`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({ suggestedName: name, types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }] })
      const w = await handle.createWritable(); await w.write(blob); await w.close(); return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { if (e?.name === 'AbortError') return }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Header report dùng chung cho ẢNH (brand màu CLB + logo nếu có + tiêu đề + meta + ngày). */
function reportHeaderHtml(title: string, subtitle: string | undefined, meta: string | undefined, logo: { dataUrl: string } | null) {
  const color = brandColor()
  // KHÔNG nền trắng: logo (con-quay trắng) đặt thẳng trên header màu brand.
  const logoImg = logo
    ? `<img src="${logo.dataUrl}" style="height:48px;width:auto;max-width:160px;object-fit:contain;margin-right:14px;flex-shrink:0;"/>`
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

/** Chụp 1 element DOM thành ẢNH REPORT chuẩn SaaS (form PDF): bọc header brand (màu CLB + logo)
   + nội dung (clone, ép light, tự co đúng chiều cao → HẾT whitespace) + footer. Dùng chung cho
   mọi màn (BXH, lịch thi đấu…). `report` bắt buộc để thống nhất khung; ép light qua onclone. */
export async function captureElementAsReportPng(
  elementId: string,
  fileBase: string,
  report: { title: string; subtitle?: string; meta?: string },
) {
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
  if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* bỏ qua */ } }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const canvas = await html2canvas(wrap, {
    scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false,
    onclone: (doc) => { doc.documentElement.setAttribute('data-theme', 'light'); doc.documentElement.style.colorScheme = 'light' },
  })
  document.body.removeChild(wrap)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas toBlob failed'))), 'image/png', 1.0),
  )
  const name = `${fileBase}_${today().replace(/\//g, '-')}.png`
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({ suggestedName: name, types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }] })
      const w = await handle.createWritable(); await w.write(blob); await w.close(); return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { if (e?.name === 'AbortError') return }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
  const paid = new Date(d.paidAt)
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
      <div class="header-meta"><span>Số: ${escHtml(d.invoiceNumber)}</span><span>Ngày: ${paid.toLocaleString('vi-VN')}</span></div>
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

export async function exportExcel(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
) {
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

  for (const sheet of sheets) {
    const nCols = sheet.headers.length
    const nRows = sheet.rows.length
    // Đặt bảng bắt đầu từ hàng HEAD (chừa 2 hàng đầu cho brand title + ngày xuất — form PDF).
    const data: (string | number)[][] = [
      [], [],
      sheet.headers,
      ...sheet.rows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(data) as Record<string, unknown>
    const numCol = sheet.headers.map(
      (_, c) => nRows > 0 && sheet.rows.every(r => typeof r[c] === 'number'),
    )
    // ── Block tiêu đề brand (merge cả hàng) ──
    set(ws, TITLE, 0, { t: 's', v: `${brandName()} · ${sheet.name}`, s: titleStyle })
    set(ws, META, 0, { t: 's', v: `Xuất ngày: ${today()}`, s: XL_META_STYLE })
    for (let c = 1; c < nCols; c++) { set(ws, TITLE, c, { t: 's', v: '', s: titleStyle }); set(ws, META, c, { t: 's', v: '', s: XL_META_STYLE }) }
    // ── Header cột + dữ liệu (đóng khung) ──
    for (let c = 0; c < nCols; c++) set(ws, HEAD, c, { s: headerStyle })
    for (let ri = 0; ri < nRows; ri++) {
      for (let c = 0; c < nCols; c++) {
        const align: 'left' | 'right' | 'center' = numCol[c] ? 'right' : 'left'
        const cell = set(ws, HEAD + 1 + ri, c, { s: xlCellStyle(align, ri % 2 === 1) })
        if (numCol[c] && typeof cell.v === 'number') cell.z = '#,##0'
      }
    }
    const lastRow = HEAD + nRows
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(lastRow, HEAD), c: Math.max(nCols - 1, 0) } })
    ws['!merges'] = [
      { s: { r: TITLE, c: 0 }, e: { r: TITLE, c: Math.max(nCols - 1, 0) } },
      { s: { r: META, c: 0 }, e: { r: META, c: Math.max(nCols - 1, 0) } },
    ]
    ws['!cols'] = sheet.headers.map((h, i) => {
      const max = Math.max(h.length, ...sheet.rows.map(r => String(r[i] ?? '').length))
      return { wch: Math.min(Math.max(max + 4, 12), 60) }
    })
    ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 24 }]
    if (nRows > 0) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: HEAD, c: 0 }, e: { r: lastRow, c: nCols - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  XLSX.writeFile(wb, `${filename}_${today().replace(/\//g, '-')}.xlsx`)
}

/* ════════════════════════════════════════
   EXPORT GENERIC: bảng bất kỳ (Excel + PDF) — dùng chung cho các màn tổng hợp
   (Công nợ, Chấm điểm, Kỳ quỹ, Chi thủ quỹ, Nhật ký...). Giữ đồng bộ mẫu BASE_CSS.
════════════════════════════════════════ */
type CellAlign = 'left' | 'right' | 'center'
export interface GenericTableColumn { header: string; align?: CellAlign }

function escHtml(v: string | number) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Excel 1 sheet từ headers + rows. */
export function exportGenericExcel(fileBase: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  exportExcel(fileBase, [{ name: sheetName.slice(0, 31), headers, rows }])
}

/** PDF bảng (vector-hoá qua html2canvas mẫu chung): header brand + bảng + summary tùy chọn. */
export function exportGenericTablePDF(opts: {
  fileBase: string
  title: string
  subtitle?: string
  metaLeft?: string
  columns: GenericTableColumn[]
  rows: (string | number)[][]
  summaryLabel?: string
  summaryValue?: string
}) {
  const cls = (a?: CellAlign) => (a === 'right' ? 'right' : a === 'center' ? 'center' : '')
  const thead = `<tr>${opts.columns.map(c => `<th class="${cls(c.align)}">${escHtml(c.header)}</th>`).join('')}</tr>`
  const body = opts.rows.map(r =>
    `<tr>${r.map((cell, i) => `<td class="${cls(opts.columns[i]?.align)}">${escHtml(cell)}</td>`).join('')}</tr>`,
  ).join('')
  return downloadPDF([`
    <div class="header">
      <h1>${escHtml(brandName())} · ${escHtml(opts.title)}</h1>
      ${opts.subtitle ? `<p>${escHtml(opts.subtitle)}</p>` : ''}
      <div class="header-meta"><span>${escHtml(opts.metaLeft ?? '')}</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table><thead>${thead}</thead><tbody>${body}</tbody></table>
    ${opts.summaryLabel ? `<div class="summary"><span class="label">${escHtml(opts.summaryLabel)}</span><span class="value">${escHtml(opts.summaryValue ?? '')}</span></div>` : ''}
    <div class="footer">${escHtml(brandFooter())} · Xuất lúc ${todayFull()}</div>
  `], opts.fileBase)
}

/* ════════════════════════════════════════
   EXPORT: Ledger (Sổ Quỹ)
════════════════════════════════════════ */
export interface LedgerRow { date: string; type: string; desc: string; amount: number; balance: number }

export function exportLedgerExcel(periodName: string, rows: LedgerRow[]) {
  exportExcel(`So_Quy_${periodName.replace(/\s/g, '_')}`, [{
    name: 'Sổ Quỹ',
    headers: ['Ngày', 'Loại', 'Mô tả', 'Số tiền (VNĐ)', 'Số dư (VNĐ)'],
    rows: rows.map(r => [r.date, r.type, r.desc, r.amount, r.balance]),
  }])
}

export function exportLedgerPDF(periodName: string, rows: LedgerRow[], totalIncome: number, totalExpense: number, balance: number) {
  const bodyRows = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td class="center"><span class="${r.type === 'Thu' ? 'badge-green' : 'badge-red'}">${r.type}</span></td>
      <td>${r.desc}</td>
      <td class="right ${r.amount > 0 ? 'badge-green' : 'badge-red'}">${r.amount > 0 ? '+' : ''}${formatVND(r.amount)}</td>
      <td class="right">${formatVND(r.balance)}</td>
    </tr>`).join('')

  downloadPDF([`
    <div class="header">
      <h1>${brandName()} · Sổ Quỹ Chi Tiết</h1>
      <p>${periodName}</p>
      <div class="header-meta"><span>Tổng thu: ${formatVND(totalIncome)} | Tổng chi: ${formatVND(totalExpense)}</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th>Ngày</th><th class="center">Loại</th><th>Mô tả</th><th class="right">Số tiền</th><th class="right">Số dư</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="summary"><span class="label">Số dư cuối kỳ</span><span class="value">${formatVND(balance)}</span></div>
    <div class="footer">${brandFooter()} · Xuất lúc ${todayFull()}</div>
  `], `So_Quy_${periodName.replace(/\s/g, '_')}`)
}

/* ════════════════════════════════════════
   EXPORT: Contributions (Thu Quỹ)
════════════════════════════════════════ */
export interface ContribRow { member: string; date: string; amount: number; method: string; confirmed: boolean }

export function exportContribExcel(periodName: string, rows: ContribRow[]) {
  exportExcel(`Thu_Quy_${periodName.replace(/\s/g, '_')}`, [{
    name: 'Thu Quỹ',
    headers: ['Thành viên', 'Ngày đóng', 'Số tiền (VNĐ)', 'Hình thức', 'Trạng thái'],
    rows: rows.map(r => [r.member, r.date, r.amount, r.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt', r.confirmed ? 'Đã xác nhận' : 'Chờ xác nhận']),
  }])
}

export function exportContribPDF(periodName: string, rows: ContribRow[], total: number) {
  const confirmed = rows.filter(r => r.confirmed).length
  const bodyRows = rows.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${r.member}</td>
      <td class="center">${r.date}</td>
      <td class="right">${formatVND(r.amount)}</td>
      <td class="center">${r.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
      <td class="center"><span class="${r.confirmed ? 'badge-green' : 'badge-yellow'}">${r.confirmed ? '✓ Xác nhận' : '⏳ Chờ'}</span></td>
    </tr>`).join('')

  downloadPDF([`
    <div class="header">
      <h1>${brandName()} · Danh Sách Thu Quỹ</h1>
      <p>${periodName}</p>
      <div class="header-meta"><span>${rows.length} khoản | Đã xác nhận: ${confirmed}/${rows.length}</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th class="center">#</th><th>Thành viên</th><th class="center">Ngày đóng</th><th class="right">Số tiền</th><th class="center">Hình thức</th><th class="center">Trạng thái</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="summary"><span class="label">Tổng thu (${rows.length} khoản)</span><span class="value">${formatVND(total)}</span></div>
    <div class="footer">${brandFooter()} · Xuất lúc ${todayFull()}</div>
  `], `Thu_Quy_${periodName.replace(/\s/g, '_')}`)
}

/* ════════════════════════════════════════
   EXPORT: Members list
════════════════════════════════════════ */
export interface MemberRow { name: string; phone: string; email: string; joinDate: string; status: string }

export function exportMembersExcel(clubName: string, rows: MemberRow[]) {
  exportExcel(`Danh_Sach_Thanh_Vien_${clubName.replace(/\s/g, '_')}`, [{
    name: 'Thành viên',
    headers: ['Họ và tên', 'Điện thoại', 'Email', 'Ngày tham gia', 'Trạng thái'],
    rows: rows.map(r => [r.name, r.phone, r.email, r.joinDate, r.status]),
  }])
}

export function exportMembersPDF(clubName: string, rows: MemberRow[]) {
  const bodyRows = rows.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${r.name}</td>
      <td>${r.phone}</td>
      <td>${r.email}</td>
      <td class="center">${r.joinDate}</td>
      <td class="center"><span class="${r.status === 'Hoạt động' ? 'badge-green' : r.status === 'Tạm nghỉ' ? 'badge-yellow' : ''}">${r.status}</span></td>
    </tr>`).join('')

  downloadPDF([`
    <div class="header">
      <h1>${brandName()} · Danh Sách Thành Viên</h1>
      <p>${clubName}</p>
      <div class="header-meta"><span>${rows.length} thành viên</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th class="center">#</th><th>Họ và tên</th><th>Điện thoại</th><th>Email</th><th class="center">Ngày tham gia</th><th class="center">Trạng thái</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="footer">${brandFooter()} · Xuất lúc ${todayFull()}</div>
  `], `Danh_Sach_Thanh_Vien_${clubName.replace(/\s/g, '_')}`)
}

/* ════════════════════════════════════════
   EXPORT: Personal Receipt (Phiếu Thu Cá Nhân)
════════════════════════════════════════ */
export interface ReceiptData {
  receiptNo?: number
  memberName: string
  loginName?: string
  periodName: string
  periodStartDate?: string
  periodEndDate?: string
  contributionAmount?: number
  clubName: string
  clubLocation?: string
  amountPaid: number
  paymentDate?: string
  attendedSessions: number
  totalSessions: number
  totalCourtFee?: number
  memberCountForSplit?: number
  courtCost: number
  totalOtherFee?: number
  livingCost: number
  totalCost: number
  balance: number
  isConfirmed: boolean
}

export function exportReceiptPDF(data: ReceiptData) {
  const isPos = data.balance >= 0
  const no = String(data.receiptNo ?? 1).padStart(4, '0')
  const splitCount = data.memberCountForSplit ?? 8
  const totalCourt = data.totalCourtFee ?? data.courtCost * splitCount
  const totalOther = data.totalOtherFee ?? data.livingCost * splitCount
  const avgCourtPerSession = data.attendedSessions > 0 ? Math.round(data.courtCost / data.attendedSessions) : 0

  const receiptCSS = `
    .r-wrap { font-family: 'Segoe UI', Arial, sans-serif; }
    .r-head { background: #6D5DFB; color: #fff; padding: 18px 24px 14px; border-radius: 10px 10px 0 0; display: flex; align-items: flex-start; justify-content: space-between; }
    .r-head-left { display: flex; align-items: center; gap: 12px; }
    .r-logo { width: 40px; height: 40px; background: rgba(255,255,255,.18); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .r-title-sub { font-size: 10px; font-weight: 600; letter-spacing: 1px; opacity: .85; text-transform: uppercase; }
    .r-title-main { font-size: 19px; font-weight: 800; letter-spacing: -.2px; margin-top: 2px; }
    .r-head-right { text-align: right; }
    .r-no { font-size: 17px; font-weight: 700; }
    .r-date { font-size: 10px; opacity: .8; margin-top: 2px; }
    .r-cards { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #e2e8f0; border-top: none; }
    .r-card { padding: 13px 18px; }
    .r-card + .r-card { border-left: 1.5px solid #e2e8f0; }
    .r-clabel { font-size: 9px; font-weight: 700; color: #6D5DFB; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; }
    .r-field { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .r-fk { font-size: 11px; color: #64748b; }
    .r-fv { font-size: 11px; font-weight: 600; color: #1e293b; }
    .r-fv.accent { color: #6D5DFB; }
    .r-banner { background: linear-gradient(135deg,#6D5DFB,#818cf8); color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; border-left:1.5px solid #6D5DFB; border-right:1.5px solid #6D5DFB; }
    .r-blabel { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: .85; }
    .r-bval { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-top: 2px; }
    .r-bdate { font-size: 11px; opacity: .75; margin-top: 2px; }
    .r-badge { background: #fff; color: #16a34a; border-radius: 20px; padding: 5px 13px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .r-badge.pending { color: #d97706; }
    .r-sec { border: 1.5px solid #e2e8f0; border-top: none; padding: 14px 18px; }
    .r-stitle { font-size: 9px; font-weight: 700; color: #6D5DFB; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #eef2ff; }
    .r-stitle.gray { color: #64748b; margin-top: 8px; }
    .r-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .r-rk { font-size: 11px; color: #475569; }
    .r-rv { font-size: 11px; font-weight: 500; color: #1e293b; }
    .r-rv.orange { color: #ea580c; font-weight: 700; }
    .r-rv.muted { color: #94a3b8; font-size: 10px; }
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
    .r-scol { padding: 14px 18px; text-align: center; }
    .r-scol + .r-scol { border-left: 1.5px solid #e2e8f0; }
    .r-stit { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    .r-sline { border-bottom: 1.5px dashed #cbd5e1; margin: 24px 10px 5px; }
    .r-sname { font-size: 11px; font-weight: 600; color: #1e293b; }
    .r-snote { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .r-foot { border: 1.5px solid #e2e8f0; border-top: none; border-radius: 0 0 9px 9px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: flex-end; background: #f8fafc; }
    .r-fnote { font-size: 10px; color: #94a3b8; max-width: 55%; line-height: 1.5; }
    .r-fright { text-align: right; font-size: 10px; color: #475569; }
    .r-fclub { font-weight: 700; color: #1e293b; font-size: 11px; }
  `

  downloadPDF([`
    <style>${receiptCSS}</style>
    <div class="r-wrap">
      <div class="r-head">
        <div class="r-head-left">
          <div class="r-logo">🏓</div>
          <div>
            <div class="r-title-sub">${data.clubName}</div>
            <div class="r-title-main">PHIẾU THU QUỸ</div>
          </div>
        </div>
        <div class="r-head-right">
          <div class="r-no">No. ${no}</div>
          <div class="r-date">Ngày in: ${today()}</div>
        </div>
      </div>

      <div class="r-cards">
        <div class="r-card">
          <div class="r-clabel">👤 Thành Viên</div>
          <div class="r-field"><span class="r-fk">Họ và tên:</span><span class="r-fv">${data.memberName}</span></div>
          ${data.loginName ? `<div class="r-field"><span class="r-fk">Tên đăng nhập:</span><span class="r-fv">${data.loginName}</span></div>` : ''}
          <div class="r-field"><span class="r-fk">Số buổi tham gia:</span><span class="r-fv">${data.attendedSessions} / ${data.totalSessions} buổi</span></div>
        </div>
        <div class="r-card">
          <div class="r-clabel">📅 Thông Tin Quỹ</div>
          <div class="r-field"><span class="r-fk">Quỹ:</span><span class="r-fv accent">${data.periodName}</span></div>
          ${data.periodStartDate && data.periodEndDate ? `<div class="r-field"><span class="r-fk">Thời gian:</span><span class="r-fv">${data.periodStartDate} – ${data.periodEndDate}</span></div>` : ''}
          <div class="r-field"><span class="r-fk">Mức đóng:</span><span class="r-fv accent">${formatVND(data.contributionAmount ?? data.amountPaid)}</span></div>
        </div>
      </div>

      <div class="r-banner">
        <div>
          <div class="r-blabel">Số Tiền Đã Đóng Quỹ</div>
          <div class="r-bval">${formatVND(data.amountPaid)}</div>
          ${data.paymentDate ? `<div class="r-bdate">Ngày đóng: ${data.paymentDate}</div>` : ''}
        </div>
        <div class="r-badge ${data.isConfirmed ? '' : 'pending'}">${data.isConfirmed ? '✓ Đã đóng quỹ' : '⏳ Chờ xác nhận'}</div>
      </div>

      <div class="r-sec">
        <div class="r-stitle">Chi Tiết Chi Phí Của Bạn – ${data.periodName}</div>
        <div class="r-stitle gray">Tiền Thuê Sân</div>
        <div class="r-row"><span class="r-rk">Tổng tiền sân toàn quỹ</span><span class="r-rv">${formatVND(totalCourt)}</span></div>
        <div class="r-row"><span class="r-rk">Chia đều / ${splitCount} người</span><span class="r-rv orange">${formatVND(data.courtCost)}</span></div>
        ${avgCourtPerSession > 0 ? `<div class="r-row"><span class="r-rk">Trung bình / buổi / người</span><span class="r-rv muted">${formatVND(avgCourtPerSession)} × ${data.attendedSessions} buổi</span></div>` : ''}
        <div class="r-stitle gray">Nước, Ăn, Phát Sinh</div>
        <div class="r-row"><span class="r-rk">Tổng chi khác toàn quỹ</span><span class="r-rv">${formatVND(totalOther)}</span></div>
        <div class="r-row"><span class="r-rk">Chia đều / ${splitCount} người</span><span class="r-rv orange">${formatVND(data.livingCost)}</span></div>
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
          <div class="r-sname">${data.memberName}</div>
          <div class="r-snote">Thành viên CLB</div>
        </div>
      </div>

      <div class="r-foot">
        <div class="r-fnote">Phiếu này xác nhận việc đóng quỹ của thành viên. Mọi thắc mắc liên hệ Ban Quản lý CLB.</div>
        <div class="r-fright">
          <div class="r-fclub">${data.clubName}</div>
          <div>${data.clubLocation ?? 'Hà Nội'}, ngày ${today()}</div>
        </div>
      </div>
    </div>
  `], `Phieu_Thu_${data.memberName.replace(/\s/g, '_')}_${data.periodName.replace(/\s/g, '_')}`)
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

export async function exportReportsPDF(data: ReportSummary, memberBills?: MemberBillRow[]) {
  // PDF VECTOR (jsPDF vẽ trực tiếp, KHÔNG html2canvas): mẫu báo cáo chuẩn DÙNG CHUNG
  // mọi CLB — toạ độ mm cố định, chữ vector sắc nét → mọi máy/lần xuất giống hệt nhau,
  // chấm dứt chuỗi lỗi renderer (cắt dòng / trôi số / giãn thẻ) của cách chụp DOM.
  const [{ default: jsPDF }, fonts, { buildQuyReportPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadVnFonts(),
    import('./pdf-report-core.js'),
    loadBrandLogo(),
  ])
  const now = new Date()
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
      exportedDateText: now.toLocaleDateString('vi-VN'),
      exportedAtText: now.toLocaleString('vi-VN'),
    },
    rows: memberBills ?? [],
  })
  const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  return savePdfDoc(doc, `BaoCao_Quy_${slug(data.clubName)}_${slug(data.periodName)}`)
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
  const now = new Date()
  const doc = buildExpenseReportPDF({
    jsPDF,
    fonts,
    branding: { name: brandName(), footer: brandFooter(), logo },
    summary: {
      ...summary,
      exportedDateText: now.toLocaleDateString('vi-VN'),
      exportedAtText: now.toLocaleString('vi-VN'),
    },
    rows,
  })
  const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  return savePdfDoc(doc, `BaoCao_ChiPhi_${slug(summary.clubName)}_${slug(summary.periodName)}`)
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
  const now = new Date()
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
      exportedDateText: now.toLocaleDateString('vi-VN'),
      exportedAtText: now.toLocaleString('vi-VN'),
    },
    columns: input.columns,
    rows: input.rows,
    stats: input.stats ?? [],
  })
  const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  return savePdfDoc(doc, `${input.filePrefix ?? 'BXH'}_${slug(input.sportLabel)}_${slug(input.tournamentName)}`)
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
  const now = new Date()
  const doc = buildKnockoutReportPDF({
    jsPDF,
    fonts,
    branding: { name: brandName(), footer: brandFooter(), logo },
    meta: {
      clubName: input.clubName,
      tournamentName: input.tournamentName,
      sportLabel: input.sportLabel,
      championName: input.championName,
      exportedDateText: now.toLocaleDateString('vi-VN'),
      exportedAtText: now.toLocaleString('vi-VN'),
    },
    rounds: input.rounds,
  })
  const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  return savePdfDoc(doc, `SoDo_${slug(input.sportLabel)}_${slug(input.tournamentName)}`)
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
  const now = new Date()
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
      printedDateText: now.toLocaleDateString('vi-VN'),
      printedAtText: now.toLocaleString('vi-VN'),
    },
  })
  return savePdfDoc(doc, `Phieu_Thu_QuyPhu_${data.payerName.replace(/\s/g, '_')}`)
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

export function exportMiniExpenseReceiptPDF(data: MiniExpenseReceiptData) {
  const no = String(data.receiptNo ?? 1).padStart(4, '0')
  downloadPDF([`
    <style>
      .me-wrap { font-family:'Segoe UI',Arial,sans-serif; }
      .me-head { background:linear-gradient(135deg,#6d28d9,#8b5cf6); color:#fff; border-radius:10px 10px 0 0; padding:16px 22px 12px; display:flex; justify-content:space-between; align-items:flex-start; }
      .me-title { font-size:18px; font-weight:800; }
      .me-sub   { font-size:11px; opacity:.85; margin-top:3px; }
      .me-no    { text-align:right; font-size:16px; font-weight:700; }
      .me-date  { font-size:10px; opacity:.8; margin-top:2px; }
      .me-body  { border:1.5px solid #e2e8f0; border-top:none; padding:18px 22px; }
      .me-field { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; }
      .me-fk    { font-size:12px; color:#64748b; }
      .me-fv    { font-size:12px; font-weight:600; color:#1e293b; }
      .me-fv.accent { color:#6d28d9; }
      .me-amount { margin-top:14px; background:linear-gradient(135deg,#dc2626,#f87171); color:#fff; border-radius:9px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
      .me-al    { font-size:11px; opacity:.85; font-weight:600; }
      .me-av    { font-size:28px; font-weight:800; }
      .me-sig   { border:1.5px solid #e2e8f0; border-top:none; display:grid; grid-template-columns:1fr 1fr; }
      .me-scol  { padding:14px 18px; text-align:center; }
      .me-scol + .me-scol { border-left:1.5px solid #e2e8f0; }
      .me-stit  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
      .me-sline { border-bottom:1.5px dashed #cbd5e1; margin:24px 10px 5px; }
      .me-sname { font-size:11px; font-weight:600; color:#1e293b; }
      .me-foot  { border:1.5px solid #e2e8f0; border-top:none; border-radius:0 0 9px 9px; padding:10px 18px; display:flex; justify-content:space-between; background:#f8fafc; font-size:10px; color:#94a3b8; }
    </style>
    <div class="me-wrap">
      <div class="me-head">
        <div>
          <div class="me-title">🎮 Phiếu Chi Quỹ Phụ</div>
          <div class="me-sub">${data.clubName}</div>
        </div>
        <div>
          <div class="me-no">No. ${no}</div>
          <div class="me-date">Ngày in: ${today()}</div>
        </div>
      </div>
      <div class="me-body">
        <div class="me-field"><span class="me-fk">Mô tả</span><span class="me-fv">${data.description}</span></div>
        <div class="me-field"><span class="me-fk">Người nhận</span><span class="me-fv">${data.receiverName}</span></div>
        <div class="me-field"><span class="me-fk">Loại chi</span><span class="me-fv accent">${data.expenseType}</span></div>
        <div class="me-field"><span class="me-fk">Ngày chi</span><span class="me-fv">${data.expenseDate}</span></div>
        ${data.notes ? `<div class="me-field"><span class="me-fk">Ghi chú</span><span class="me-fv">${data.notes}</span></div>` : ''}
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
          <div class="me-sname">${data.receiverName}</div>
        </div>
      </div>
      <div class="me-foot">
        <span>Phiếu Chi Quỹ Phụ – không phân bổ cá nhân, không ảnh hưởng Quỹ Chính</span>
        <span>${data.clubLocation ?? 'Hà Nội'}, ngày ${today()}</span>
      </div>
    </div>
  `], `Phieu_Chi_Mini_${data.receiverName.replace(/\s/g, '_')}`)
}

export function exportReportsExcel(data: ReportSummary, memberDetails: { name: string; attended: number; paid: string; cost: number; balance: number }[]) {
  exportExcel(`Bao_Cao_${data.periodName.replace(/\s/g, '_')}`, [
    {
      name: 'Tổng Quan',
      headers: ['Chỉ số', 'Giá trị'],
      rows: [
        ['Tổng thu', data.totalIncome],
        ['Tổng chi', data.totalExpense],
        ['Số dư', data.balance],
        ['Số thành viên', data.memberCount],
        ['Buổi tập', data.sessionCount],
        ['Đã đóng quỹ', data.confirmedCount],
      ],
    },
    {
      name: 'Chi Tiết Thành Viên',
      headers: ['Thành viên', 'Buổi tham gia', 'Đã đóng', 'Chi phí (VNĐ)', 'Số dư (VNĐ)'],
      rows: memberDetails.map(m => [m.name, m.attended, m.paid, m.cost, m.balance]),
    },
  ])
}
