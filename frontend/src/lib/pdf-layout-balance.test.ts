/* Chạy: node --test src/lib/pdf-layout-balance.test.ts — kiểm khoảng thở CÂN BẰNG: trang đầy đặn, không hàng mồ côi, số trang. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { buildQuyReportPDF, buildStandingsReportPDF, buildPersonalReceiptPDF, buildMiniExpensePDF, buildExpenseReportPDF } from './pdf-report-core.js'
import { THEME } from './export-theme.js'

const req = createRequire(import.meta.url)
const { jsPDF: Base } = req('jspdf')
const font = (f: string) => readFileSync(new URL(`../../public/fonts/${f}`, import.meta.url)).toString('base64')
const fonts = { regular: font('BeVietnamPro-Regular.ttf'), bold: font('BeVietnamPro-Bold.ttf') }
const branding = { name: 'B32', footer: 'B32', logo: null }

/** jsPDF gián điệp: ghi y lớn nhất của nội dung (text/rect bo góc) trên từng trang, bỏ vùng footer. */
function spy() {
  const maxY: Record<number, number> = {}
  const texts: Record<number, string[]> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class S extends (Base as any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(o: any) {
      super(o)
      const H = this.internal.pageSize.getHeight()
      const pg = () => this.internal.getCurrentPageInfo().pageNumber as number
      const note = (y: number) => { if (y < H - 17) maxY[pg()] = Math.max(maxY[pg()] ?? 0, y) }
      const t0 = this.text.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.text = (t: any, x: number, y: number, ...r: any[]) => { (texts[pg()] ??= []).push(...[t].flat().map(String)); note(y); return t0(t, x, y, ...r) }
      const rc = this.rect.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.rect = (x: number, y: number, w: number, h: number, ...r: any[]) => { if (h < 100 && y > 0.5) note(y + h); return rc(x, y, w, h, ...r) }
      const ln = this.line.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.line = (x1: number, y1: number, x2: number, y2: number, ...r: any[]) => { note(Math.max(y1, y2)); return ln(x1, y1, x2, y2, ...r) }
      const rr = this.roundedRect.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.roundedRect = (x: number, y: number, w: number, h: number, ...r: any[]) => { if (h < 100) note(y + h); return rr(x, y, w, h, ...r) }
    }
  }
  return { S, maxY, texts }
}
const bottom = 297 - THEME.page.bottomPad
const startOf = (p: number) => (p === 1 ? THEME.page.margin + THEME.air.mastH + THEME.air.afterMast : THEME.page.margin + THEME.air.contH + THEME.air.afterMast)
const fill = (maxY: Record<number, number>, p: number) => (maxY[p] - startOf(p)) / (bottom - startOf(p))

const b32 = (n: string, paid: boolean) => ({ memberName: n, attendedSessions: 1, totalSessions: 1, amountPaid: paid ? 300000 : 0, contributionPaid: paid, courtCost: 237500, livingCost: 35000, totalCost: 272500, balance: (paid ? 300000 : 0) - 272500 })
const mk = (n: number) => Array.from({ length: n }, (_, i) => b32(`Thành viên ${i + 1}`, i % 6 !== 5))
const summary = (n: number) => ({ periodName: 'B32 - Tháng 10/2026', clubName: 'B32', totalIncome: 2100000, totalExpense: 2180000, balance: -80000, memberCount: n, sessionCount: 1, confirmedCount: n - 1, miniBalance: 2170000, carryForward: 0, totalAttendance: n, activeMemberCount: n, clubAssets: -80000, exportedAtText: '10:00 02/10/2026', docCode: 'PF-T' })
const exps = [
  { date: '28/09/2026', description: 'Tiền sân B32', fundKey: 'COMMON', fundLabel: 'Quỹ Chính', kindLabel: 'Tiền sân', amount: 1900000, statusKey: 'approved', statusLabel: 'Đã duyệt' },
  { date: '01/10/2026', description: 'Tiền nước', fundKey: 'COMMON', fundLabel: 'Quỹ Chính', kindLabel: 'Sinh hoạt', amount: 280000, statusKey: 'approved', statusLabel: 'Đã duyệt' },
]
const quy = (n: number) => {
  const s = spy()
  const doc = buildQuyReportPDF({ jsPDF: s.S, fonts, summary: summary(n), rows: mk(n), expenseRows: exps, branding })
  return { doc, ...s, pages: doc.getNumberOfPages() as number }
}

test('khoảng thở: token cân bằng (gutter 4.5, section 9, titleGap 6, lề 14)', () => {
  assert.equal(THEME.air.gutter, 4.5)
  assert.equal(THEME.air.rowGap, 4.5)
  assert.equal(THEME.air.section, 9)
  assert.equal(THEME.air.titleGap, 6)
  assert.equal(THEME.air.cardPad, 4.5)
  assert.equal(THEME.page.margin, 14)
  assert.equal(THEME.air.mastH, 30)
  assert.equal(THEME.air.contH, 16)
  assert.ok(THEME.row.h <= 8.8)
})

test('báo cáo quỹ 8 thành viên ≤ 3 trang; trang 1 chứa đủ 8 hàng + dòng TỔNG', () => {
  const r = quy(8)
  assert.ok(r.pages <= 3, `pages=${r.pages}`)
  const p1 = r.texts[1].join('|')
  assert.ok(p1.includes('Thành viên 8') && p1.includes('TỔNG CỘNG'), 'trang 1 thiếu hàng/tổng')
  const p2 = r.texts[2].join('|')
  assert.ok(p2.includes('Tiền sân B32') && p2.includes('Thành viên 1'), 'khoản chi không cùng trang với bill đầu')
})

test('độ lấp: mọi trang (trừ trang cuối) ≥ 85% vùng nội dung; trang cuối ≥ 40% (8 TV)', () => {
  for (const n of [7, 8, 9, 16, 17, 18, 27, 28, 32, 34]) {
    const r = quy(n)
    for (let p = 1; p < r.pages; p++) assert.ok(fill(r.maxY, p) >= 0.85, `n=${n} trang ${p}/${r.pages} lấp ${(fill(r.maxY, p) * 100).toFixed(0)}%`)
  }
  const r8 = quy(8)
  assert.ok(fill(r8.maxY, r8.pages) >= 0.4)
})

test('độ lấp sàn: mọi n từ 3 đến 40 thành viên, trang không-cuối ≥ 60% (không trang trống)', () => {
  for (let n = 3; n <= 40; n++) {
    const r = quy(n)
    for (let p = 1; p < r.pages; p++) assert.ok(fill(r.maxY, p) >= 0.6, `n=${n} trang ${p}/${r.pages} lấp ${(fill(r.maxY, p) * 100).toFixed(0)}%`)
  }
})

test('không bảng mồ côi: mọi trang bảng ≥ 3 hàng, hàng TỔNG ở trang cuối cùng hàng', () => {
  for (let n = 10; n <= 40; n++) {
    const s = spy()
    const rows = Array.from({ length: n }, (_, i) => ({ rank: i + 1, name: `Dong${i + 1}`, pts: i }))
    const doc = buildStandingsReportPDF({
      jsPDF: s.S, fonts, branding,
      meta: { clubName: 'B32', tournamentName: 'G', sportLabel: 'S', formatLabel: '', exportedDateText: '', exportedAtText: '' },
      columns: [{ key: 'rank', label: '#', w: 10, align: 'center' }, { key: 'name', label: 'TEN', w: 100, align: 'left' }, { key: 'pts', label: 'D', w: 72, align: 'right' }],
      rows, stats: [], footerRow: { name: 'TONG-CUOI', pts: 1 },
    })
    const pages = doc.getNumberOfPages() as number
    for (let p = 1; p <= pages; p++) {
      const cnt = s.texts[p].filter((t) => /^Dong\d+$/.test(t)).length
      assert.ok(cnt >= 3, `n=${n} trang ${p}/${pages} chỉ ${cnt} hàng`)
      if (p === pages) assert.ok(s.texts[p].includes('TONG-CUOI'), `n=${n} TỔNG không ở trang cuối`)
    }
  }
})

test('phiếu thu/chi: đúng 1 trang', () => {
  const s = spy()
  const d = buildPersonalReceiptPDF({
    jsPDF: s.S, fonts, branding,
    receipt: { receiptNo: 7, memberName: 'Nguyễn Thị Ánh', loginName: 'anh.nt', periodName: 'Kỳ 03/2026', periodStartDate: '01/03/2026', periodEndDate: '31/03/2026', contributionAmount: 300000, clubName: 'B32', clubLocation: 'Hà Nội', amountPaid: 300000, paymentDate: '05/03/2026', attendedSessions: 9, totalSessions: 12, memberCountForSplit: 32, totalCourtFee: 5184000, courtCost: 162000, totalOtherFee: 1311000, livingCost: 41000, totalCost: 203000, balance: 97000, isConfirmed: true, printedDateText: '02/10/2026', printedAtText: '10:00' },
  })
  assert.equal(d.getNumberOfPages(), 1)
  const s2 = spy()
  const d2 = buildMiniExpensePDF({ jsPDF: s2.S, fonts, branding, receipt: { receiptNo: 3, receiverName: 'Ánh', expenseType: 'Nước', amount: 215000, expenseDate: '15/03/2026', description: 'Nước uống', notes: 'Có hóa đơn', clubName: 'B32', printedDateText: '02/10/2026', printedAtText: '10:00' } })
  assert.equal(d2.getNumberOfPages(), 1)
})

test('báo cáo chi 3 khoản: 1 trang', () => {
  const s = spy()
  const d = buildExpenseReportPDF({
    jsPDF: s.S, fonts, branding,
    summary: { clubName: 'B32', periodName: 'K', totalAll: 3, totalCommon: 3, totalMini: 0, totalApproved: 3, totalPending: 0, count: 3 },
    rows: [1, 2, 3].map((i) => ({ code: `C${i}`, description: `Khoan${i}`, kindLabel: 'K', dateText: '01/01/2026', amount: i, statusKey: 'approved' })),
  })
  assert.equal(d.getNumberOfPages(), 1)
})
