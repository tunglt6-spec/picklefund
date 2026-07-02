import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  .${PDF_ROOT} .header { background: #6366f1; color: #fff; border-radius: 10px 10px 0 0; padding: 16px 22px 12px; }
  .${PDF_ROOT} .header h1 { font-size: 17px; font-weight: 700; }
  .${PDF_ROOT} .header p { font-size: 12px; opacity: .85; margin-top: 3px; }
  .${PDF_ROOT} .header-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; opacity: .75; }
  .${PDF_ROOT} table { width: 100%; border-collapse: collapse; }
  .${PDF_ROOT} th { background: #6366f1; color: #fff; padding: 8px 11px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
  .${PDF_ROOT} th.right, .${PDF_ROOT} td.right { text-align: right; }
  .${PDF_ROOT} th.center, .${PDF_ROOT} td.center { text-align: center; }
  .${PDF_ROOT} td { padding: 7px 11px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .${PDF_ROOT} tr:nth-child(even) td { background: #f8fafc; }
  .${PDF_ROOT} .badge-green { color: #16a34a; font-weight: 600; }
  .${PDF_ROOT} .badge-red { color: #ef4444; font-weight: 600; }
  .${PDF_ROOT} .badge-yellow { color: #d97706; font-weight: 600; }
  .${PDF_ROOT} .summary { background: #eef2ff; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }
  .${PDF_ROOT} .summary .label { font-size: 12px; color: #6366f1; font-weight: 600; }
  .${PDF_ROOT} .summary .value { font-size: 15px; font-weight: 700; color: #4338ca; }
  .${PDF_ROOT} .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
`

async function downloadPDF(sections: string[], filename: string) {
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

  const suggestedName = `${filename}_${today().replace(/\//g, '-')}.pdf`

  // File System Access API — mở hộp thoại "Lưu file" để người dùng chọn thư mục
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      const blob = pdf.output('blob')
      await writable.write(blob)
      await writable.close()
      return
    } catch (e: any) {
      // Người dùng bấm Cancel → không làm gì
      if (e?.name === 'AbortError') return
    }
  }

  // Fallback: download thông thường (trình duyệt tự lưu vào thư mục Downloads)
  pdf.save(suggestedName)
}

/* ════════════════════════════════════════
   EXCEL
════════════════════════════════════════ */
export function exportExcel(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const colWidths = sheet.headers.map((h, i) => {
      const max = Math.max(h.length, ...sheet.rows.map(r => String(r[i] ?? '').length))
      return { wch: Math.min(max + 4, 50) }
    })
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  XLSX.writeFile(wb, `${filename}_${today().replace(/\//g, '-')}.xlsx`)
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
      <h1>PickleFund · Sổ Quỹ Chi Tiết</h1>
      <p>${periodName}</p>
      <div class="header-meta"><span>Tổng thu: ${formatVND(totalIncome)} | Tổng chi: ${formatVND(totalExpense)}</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th>Ngày</th><th class="center">Loại</th><th>Mô tả</th><th class="right">Số tiền</th><th class="right">Số dư</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="summary"><span class="label">Số dư cuối kỳ</span><span class="value">${formatVND(balance)}</span></div>
    <div class="footer">PickleFund · Xuất lúc ${todayFull()}</div>
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
      <h1>PickleFund · Danh Sách Thu Quỹ</h1>
      <p>${periodName}</p>
      <div class="header-meta"><span>${rows.length} khoản | Đã xác nhận: ${confirmed}/${rows.length}</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th class="center">#</th><th>Thành viên</th><th class="center">Ngày đóng</th><th class="right">Số tiền</th><th class="center">Hình thức</th><th class="center">Trạng thái</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="summary"><span class="label">Tổng thu (${rows.length} khoản)</span><span class="value">${formatVND(total)}</span></div>
    <div class="footer">PickleFund · Xuất lúc ${todayFull()}</div>
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
      <h1>PickleFund · Danh Sách Thành Viên</h1>
      <p>${clubName}</p>
      <div class="header-meta"><span>${rows.length} thành viên</span><span>Xuất ngày: ${today()}</span></div>
    </div>
    <table>
      <thead><tr><th class="center">#</th><th>Họ và tên</th><th>Điện thoại</th><th>Email</th><th class="center">Ngày tham gia</th><th class="center">Trạng thái</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="footer">PickleFund · Xuất lúc ${todayFull()}</div>
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
    .r-head { background: #6366f1; color: #fff; padding: 18px 24px 14px; border-radius: 10px 10px 0 0; display: flex; align-items: flex-start; justify-content: space-between; }
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
    .r-clabel { font-size: 9px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; }
    .r-field { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .r-fk { font-size: 11px; color: #64748b; }
    .r-fv { font-size: 11px; font-weight: 600; color: #1e293b; }
    .r-fv.accent { color: #6366f1; }
    .r-banner { background: linear-gradient(135deg,#6366f1,#818cf8); color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; border-left:1.5px solid #6366f1; border-right:1.5px solid #6366f1; }
    .r-blabel { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: .85; }
    .r-bval { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-top: 2px; }
    .r-bdate { font-size: 11px; opacity: .75; margin-top: 2px; }
    .r-badge { background: #fff; color: #16a34a; border-radius: 20px; padding: 5px 13px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .r-badge.pending { color: #d97706; }
    .r-sec { border: 1.5px solid #e2e8f0; border-top: none; padding: 14px 18px; }
    .r-stitle { font-size: 9px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #eef2ff; }
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

export function exportReportsPDF(data: ReportSummary, memberBills?: MemberBillRow[]) {
  const expensePct = data.totalIncome > 0 ? Math.round((data.totalExpense / data.totalIncome) * 100) : 0
  const confirmedPct = data.memberCount > 0 ? Math.round((data.confirmedCount / data.memberCount) * 100) : 0
  const barW = Math.round((data.totalExpense / (data.totalIncome || 1)) * 100)

  // ── Trang 1: Tổng quan ──────────────────────────────────────────
  const summarySection = `
    <style>
      .rp-head { background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff; border-radius:10px 10px 0 0; padding:18px 24px 14px; }
      .rp-head h1 { font-size:18px; font-weight:800; letter-spacing:-.2px; }
      .rp-head p  { font-size:11px; opacity:.85; margin-top:3px; }
      .rp-head-meta { display:flex; justify-content:space-between; margin-top:8px; font-size:10px; opacity:.7; }
      .rp-kpi { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
      .rp-kpi-card { border:1.5px solid #e2e8f0; border-radius:9px; padding:12px 14px; }
      .rp-kpi-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.8px; }
      .rp-kpi-val   { font-size:20px; font-weight:800; margin-top:4px; color:#1e293b; }
      .rp-kpi-val.green { color:#16a34a; }
      .rp-kpi-val.red   { color:#ef4444; }
      .rp-kpi-val.blue  { color:#6366f1; }
      .rp-kpi-sub { font-size:9px; color:#94a3b8; margin-top:2px; }
      .rp-bar-wrap { margin-top:14px; border:1.5px solid #e2e8f0; border-radius:9px; padding:12px 16px; }
      .rp-bar-title { font-size:10px; font-weight:700; color:#475569; margin-bottom:8px; }
      .rp-bar-track { background:#f1f5f9; border-radius:99px; height:10px; overflow:hidden; }
      .rp-bar-fill  { background:linear-gradient(90deg,#6366f1,#818cf8); height:100%; border-radius:99px; transition:width .3s; }
      .rp-bar-labels { display:flex; justify-content:space-between; margin-top:5px; font-size:9px; color:#64748b; }
      .rp-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
      .rp-stat  { border:1.5px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; }
      .rp-stat-label { font-size:11px; color:#475569; }
      .rp-stat-val   { font-size:13px; font-weight:700; color:#1e293b; }
      .rp-member-section { margin-top:14px; }
      .rp-section-title { font-size:9px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:1px; padding-bottom:6px; border-bottom:2px solid #eef2ff; margin-bottom:8px; }
      .rp-mtable { width:100%; border-collapse:collapse; font-size:11px; }
      .rp-mtable th { background:#6366f1; color:#fff; padding:7px 10px; text-align:left; font-size:10px; font-weight:600; }
      .rp-mtable th.r { text-align:right; }
      .rp-mtable td { padding:6px 10px; border-bottom:1px solid #f1f5f9; }
      .rp-mtable td.r { text-align:right; }
      .rp-mtable tr:nth-child(even) td { background:#f8fafc; }
      .rp-foot { margin-top:16px; text-align:center; font-size:9px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:10px; }
    </style>

    <div class="rp-head">
      <h1>PickleFund · Báo Cáo Tài Chính</h1>
      <p>${data.clubName} · ${data.periodName}</p>
      <div class="rp-head-meta">
        <span>${data.memberCount} thành viên · ${data.sessionCount} buổi tập · ${data.confirmedCount} đã đóng quỹ (${confirmedPct}%)</span>
        <span>Xuất ngày ${today()}</span>
      </div>
    </div>

    <div class="rp-kpi">
      <div class="rp-kpi-card">
        <div class="rp-kpi-label">Tổng Thu</div>
        <div class="rp-kpi-val green">${formatVND(data.totalIncome)}</div>
        <div class="rp-kpi-sub">${data.confirmedCount}/${data.memberCount} thành viên đóng</div>
      </div>
      <div class="rp-kpi-card">
        <div class="rp-kpi-label">Tổng Chi</div>
        <div class="rp-kpi-val red">${formatVND(data.totalExpense)}</div>
        <div class="rp-kpi-sub">Tỷ lệ chi / thu: ${expensePct}%</div>
      </div>
      <div class="rp-kpi-card" style="background:#eef2ff;border-color:#c7d2fe;">
        <div class="rp-kpi-label" style="color:#6366f1;">Số Dư Quỹ</div>
        <div class="rp-kpi-val blue">${formatVND(data.balance)}</div>
        <div class="rp-kpi-sub">${data.balance >= 0 ? 'Quỹ còn dư' : 'Quỹ âm – cần bổ sung'}</div>
      </div>
    </div>

    <div class="rp-bar-wrap">
      <div class="rp-bar-title">Tỷ lệ Chi / Thu</div>
      <div class="rp-bar-track"><div class="rp-bar-fill" style="width:${Math.min(barW, 100)}%"></div></div>
      <div class="rp-bar-labels"><span>Thu: ${formatVND(data.totalIncome)}</span><span>Chi: ${formatVND(data.totalExpense)} (${expensePct}%)</span></div>
    </div>

    <div class="rp-stats">
      <div class="rp-stat"><span class="rp-stat-label">Tổng số thành viên</span><span class="rp-stat-val">${data.memberCount} người</span></div>
      <div class="rp-stat"><span class="rp-stat-label">Số buổi tập</span><span class="rp-stat-val">${data.sessionCount} buổi</span></div>
      <div class="rp-stat"><span class="rp-stat-label">Đã đóng quỹ</span><span class="rp-stat-val" style="color:#16a34a">${data.confirmedCount} / ${data.memberCount}</span></div>
      <div class="rp-stat"><span class="rp-stat-label">Chưa đóng quỹ</span><span class="rp-stat-val" style="color:#ef4444">${data.memberCount - data.confirmedCount} người</span></div>
    </div>

    ${memberBills && memberBills.length > 0 ? `
    <div class="rp-member-section">
      <div class="rp-section-title">Chi Tiết Từng Thành Viên</div>
      <table class="rp-mtable">
        <thead><tr>
          <th>#</th><th>Thành viên</th><th class="r">Buổi TG</th><th class="r">Trạng thái</th>
          <th class="r">Chi phí sân</th><th class="r">Sinh hoạt</th><th class="r">Tổng chi</th><th class="r">Số dư</th>
        </tr></thead>
        <tbody>
          ${memberBills.map((m, i) => `
          <tr>
            <td style="color:#94a3b8;font-size:10px;">${i + 1}</td>
            <td style="font-weight:600;">${m.memberName}</td>
            <td class="r" style="color:#6366f1;font-weight:600;">${m.attendedSessions}/${m.totalSessions}</td>
            <td class="r"><span style="color:${m.contributionPaid ? '#16a34a' : '#ef4444'};font-weight:600;">${m.contributionPaid ? '✓ Đã đóng' : '✗ Chưa đóng'}</span></td>
            <td class="r">${formatVND(m.courtCost)}</td>
            <td class="r">${formatVND(m.livingCost)}</td>
            <td class="r" style="font-weight:600;">${formatVND(m.totalCost)}</td>
            <td class="r" style="font-weight:700;color:${m.balance >= 0 ? '#16a34a' : '#ef4444'};">${m.balance >= 0 ? '+' : ''}${formatVND(m.balance)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="rp-foot">PickleFund · ${data.clubName} · Xuất lúc ${todayFull()}</div>
  `

  // ── Trang 2+: Bill card – cố định 6 thành viên/trang (2 cột × 3 hàng) ──
  //
  // downloadPDF đã wrap mỗi section trong <div class="page"> (BASE_CSS: width:754px, padding:28px 32px)
  // → content area: 690px wide, ~1010px tall (A4 96dpi trừ padding)
  // → header ~62px + footer ~27px + 2 gaps 10px = 109px overhead
  // → mỗi card được ~(1010-109-10)/3 = ~297px high
  //
  // KHÔNG bọc thêm <div class="page"> ở đây để tránh double-wrap.

  const BILL_CSS = `
    <style>
      .bp-layout { display:flex; flex-direction:column; height:954px; }
      .bp-head { background:linear-gradient(135deg,#4f46e5,#818cf8); color:#fff;
                 border-radius:10px 10px 0 0; padding:13px 18px 11px;
                 display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
      .bp-head-left h1 { font-size:15px; font-weight:800; letter-spacing:-.2px; }
      .bp-head-left p  { font-size:10px; opacity:.82; margin-top:2px; }
      .bp-head-right   { text-align:right; font-size:10px; opacity:.78; line-height:1.6; }
      .bp-grid { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:repeat(3,1fr);
                 gap:10px; margin-top:10px; flex:1; min-height:0; }
      .bp-foot { flex-shrink:0; border-top:1px solid #f1f5f9; padding-top:8px; margin-top:10px;
                 display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
      /* ── card ── */
      .bc { border:1.5px solid #e2e8f0; border-radius:9px; overflow:hidden;
            display:flex; flex-direction:column; }
      .bc-head { background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff; padding:10px 13px 9px; flex-shrink:0; }
      .bc-name { font-size:13px; font-weight:800; line-height:1.3; }
      .bc-meta { display:flex; justify-content:space-between; align-items:center; margin-top:4px; }
      .bc-meta-lft { font-size:10px; opacity:.88; }
      .bc-badge { background:rgba(255,255,255,.22); border-radius:20px; padding:2px 8px;
                  font-size:9px; font-weight:700; white-space:nowrap; }
      .bc-bar  { padding:8px 13px 0; flex-shrink:0; }
      .bc-bar-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px; }
      .bc-bar-lk  { font-size:9px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
      .bc-bar-lv  { font-size:13px; font-weight:800; color:#4338ca; }
      .bc-bar-track { background:#e2e8f0; border-radius:99px; height:6px; overflow:hidden; }
      .bc-bar-fill  { background:linear-gradient(90deg,#6366f1,#818cf8); height:100%; border-radius:99px; }
      .bc-bar-pct   { font-size:9px; color:#94a3b8; margin-top:2px; text-align:right; }
      .bc-rows  { padding:7px 13px 0; flex:1; }
      .bc-row   { display:flex; justify-content:space-between; align-items:center;
                  padding:4px 0; border-bottom:1px solid #f1f5f9; }
      .bc-row.last { border-bottom:none; border-top:1.5px dashed #e2e8f0; margin-top:2px; padding-top:5px; }
      .bc-rk    { font-size:10px; color:#64748b; }
      .bc-rk em { font-size:9px; color:#94a3b8; font-style:normal; }
      .bc-rv    { font-size:11px; font-weight:700; white-space:nowrap; }
      .bc-rv.g  { color:#16a34a; }
      .bc-rv.v  { color:#6366f1; }
      .bc-rv.c  { color:#0891b2; }
      .bc-rv.o  { color:#ea580c; }
      .bc-rv.b  { color:#1e293b; }
      .bc-bal   { margin:7px 13px 10px; border-radius:7px; padding:8px 12px;
                  display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
      .bc-bal.pos { background:#f0fdf4; border:1.5px solid #bbf7d0; }
      .bc-bal.neg { background:#fef2f2; border:1.5px solid #fecaca; }
      .bc-bal-lbl { font-size:10px; font-weight:700; }
      .bc-bal-lbl.pos { color:#16a34a; }
      .bc-bal-lbl.neg { color:#ef4444; }
      .bc-bal-sub { font-size:9px; color:#94a3b8; margin-top:1px; }
      .bc-bal-val { font-size:17px; font-weight:900; line-height:1; white-space:nowrap; }
      .bc-bal-val.pos { color:#16a34a; }
      .bc-bal-val.neg { color:#ef4444; }
    </style>
  `

  const makeBillCard = (m: MemberBillRow) => {
    const rate  = m.totalSessions > 0 ? Math.round((m.attendedSessions / m.totalSessions) * 100) : 0
    const isPos = m.balance >= 0
    return `
    <div class="bc">
      <div class="bc-head">
        <div class="bc-name">${m.memberName}</div>
        <div class="bc-meta">
          <span class="bc-meta-lft">${m.attendedSessions}/${m.totalSessions} buổi tham gia</span>
          <span class="bc-badge">${m.contributionPaid ? '✓ Đã đóng quỹ' : '✗ Chưa đóng quỹ'}</span>
        </div>
      </div>
      <div class="bc-bar">
        <div class="bc-bar-top">
          <span class="bc-bar-lk">Tỷ lệ tham gia</span>
          <span class="bc-bar-lv">${m.attendedSessions} / ${m.totalSessions} buổi</span>
        </div>
        <div class="bc-bar-track"><div class="bc-bar-fill" style="width:${rate}%"></div></div>
        <div class="bc-bar-pct">${rate}% số buổi trong kỳ</div>
      </div>
      <div class="bc-rows">
        <div class="bc-row">
          <span class="bc-rk">Đã nộp quỹ</span>
          <span class="bc-rv g">${formatVND(m.amountPaid)}</span>
        </div>
        <div class="bc-row">
          <span class="bc-rk">Chi phí sân <em>(${m.attendedSessions} buổi)</em></span>
          <span class="bc-rv v">${formatVND(m.courtCost)}</span>
        </div>
        <div class="bc-row">
          <span class="bc-rk">Sinh hoạt <em>(chia đều)</em></span>
          <span class="bc-rv c">${formatVND(m.livingCost)}</span>
        </div>
        <div class="bc-row last">
          <span class="bc-rk bc-rv b">Tổng chi phí</span>
          <span class="bc-rv o">${formatVND(m.totalCost)}</span>
        </div>
      </div>
      <div class="bc-bal ${isPos ? 'pos' : 'neg'}">
        <div>
          <div class="bc-bal-lbl ${isPos ? 'pos' : 'neg'}">${isPos ? 'Số dư của bạn' : 'Cần nộp thêm'}</div>
          <div class="bc-bal-sub">${isPos ? 'Chuyển sang kỳ tiếp theo' : 'Vui lòng nộp bổ sung'}</div>
        </div>
        <div class="bc-bal-val ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : ''}${formatVND(m.balance)}</div>
      </div>
    </div>`
  }

  // Chia thành từng trang 6 người — KHÔNG bọc <div class="page">, downloadPDF tự xử lý
  const billSections: string[] = []
  if (memberBills && memberBills.length > 0) {
    const total    = memberBills.length
    const totalPgs = Math.ceil(total / 6)
    for (let start = 0; start < total; start += 6) {
      const chunk   = memberBills.slice(start, start + 6)
      const pageNum = Math.floor(start / 6) + 1
      billSections.push(`
        ${BILL_CSS}
        <div class="bp-layout">
          <div class="bp-head">
            <div class="bp-head-left">
              <h1>PickleFund · Bill Chi Tiết Thành Viên</h1>
              <p>${data.clubName} · ${data.periodName}</p>
            </div>
            <div class="bp-head-right">
              <div>Trang ${pageNum} / ${totalPgs}</div>
              <div>${chunk.length} thành viên · Xuất ngày ${today()}</div>
            </div>
          </div>
          <div class="bp-grid">
            ${chunk.map(m => makeBillCard(m)).join('')}
          </div>
          <div class="bp-foot">
            <span>PickleFund · ${data.clubName}</span>
            <span>Thành viên ${start + 1}–${Math.min(start + 6, total)} / ${total} · Xuất lúc ${todayFull()}</span>
          </div>
        </div>
      `)
    }
  }

  const sections = [summarySection, ...billSections]
  const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '')
  // Tên file rõ ràng: BaoCao_Quy_<club>_<period> (downloadPDF thêm _<ngày>.pdf)
  return downloadPDF(sections, `BaoCao_Quy_${slug(data.clubName)}_${slug(data.periodName)}`)
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

export function exportMiniIncomeReceiptPDF(data: MiniIncomeReceiptData) {
  const no = String(data.receiptNo ?? 1).padStart(4, '0')
  downloadPDF([`
    <style>
      .mi-wrap { font-family:'Segoe UI',Arial,sans-serif; }
      .mi-head { background:linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff; border-radius:10px 10px 0 0; padding:16px 22px 12px; display:flex; justify-content:space-between; align-items:flex-start; }
      .mi-title { font-size:18px; font-weight:800; }
      .mi-sub   { font-size:11px; opacity:.85; margin-top:3px; }
      .mi-no    { text-align:right; font-size:16px; font-weight:700; }
      .mi-date  { font-size:10px; opacity:.8; margin-top:2px; }
      .mi-body  { border:1.5px solid #e2e8f0; border-top:none; padding:18px 22px; }
      .mi-field { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; }
      .mi-fk    { font-size:12px; color:#64748b; }
      .mi-fv    { font-size:12px; font-weight:600; color:#1e293b; }
      .mi-fv.accent { color:#7c3aed; }
      .mi-amount { margin-top:14px; background:linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff; border-radius:9px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
      .mi-al    { font-size:11px; opacity:.85; font-weight:600; }
      .mi-av    { font-size:28px; font-weight:800; }
      .mi-sig   { border:1.5px solid #e2e8f0; border-top:none; display:grid; grid-template-columns:1fr 1fr; }
      .mi-scol  { padding:14px 18px; text-align:center; }
      .mi-scol + .mi-scol { border-left:1.5px solid #e2e8f0; }
      .mi-stit  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
      .mi-sline { border-bottom:1.5px dashed #cbd5e1; margin:24px 10px 5px; }
      .mi-sname { font-size:11px; font-weight:600; color:#1e293b; }
      .mi-foot  { border:1.5px solid #e2e8f0; border-top:none; border-radius:0 0 9px 9px; padding:10px 18px; display:flex; justify-content:space-between; background:#f8fafc; font-size:10px; color:#94a3b8; }
    </style>
    <div class="mi-wrap">
      <div class="mi-head">
        <div>
          <div class="mi-title">🎮 Phiếu Thu Quỹ Phụ</div>
          <div class="mi-sub">${data.clubName}</div>
        </div>
        <div>
          <div class="mi-no">No. ${no}</div>
          <div class="mi-date">Ngày in: ${today()}</div>
        </div>
      </div>
      <div class="mi-body">
        <div class="mi-field"><span class="mi-fk">Người nộp</span><span class="mi-fv">${data.payerName}</span></div>
        <div class="mi-field"><span class="mi-fk">Loại thu</span><span class="mi-fv accent">${data.incomeType}</span></div>
        <div class="mi-field"><span class="mi-fk">Ngày nộp</span><span class="mi-fv">${data.paymentDate}</span></div>
        ${data.notes ? `<div class="mi-field"><span class="mi-fk">Ghi chú</span><span class="mi-fv">${data.notes}</span></div>` : ''}
        <div class="mi-amount">
          <div class="mi-al">Số Tiền Thu Quỹ Phụ</div>
          <div class="mi-av">${formatVND(data.amount)}</div>
        </div>
      </div>
      <div class="mi-sig">
        <div class="mi-scol">
          <div class="mi-stit">Thủ Quỹ Xác Nhận</div>
          <div class="mi-sline"></div>
          <div class="mi-sname">(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="mi-scol">
          <div class="mi-stit">Người Nộp</div>
          <div class="mi-sline"></div>
          <div class="mi-sname">${data.payerName}</div>
        </div>
      </div>
      <div class="mi-foot">
        <span>Phiếu Thu Quỹ Phụ – không tính vào công nợ thành viên Quỹ Chính</span>
        <span>${data.clubLocation ?? 'Hà Nội'}, ngày ${today()}</span>
      </div>
    </div>
  `], `Phieu_Thu_Mini_${data.payerName.replace(/\s/g, '_')}`)
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
