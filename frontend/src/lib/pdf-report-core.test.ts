/* Chạy: node --test src/lib/pdf-report-core.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import {
  buildStandingsReportPDF, buildKnockoutReportPDF, buildMiniReceiptPDF, buildQuyReportPDF, buildExpenseReportPDF,
  buildPersonalReceiptPDF, buildBillingReceiptPDF, buildMiniExpensePDF,
} from './pdf-report-core.js'
import { THEME, MIN_PT, contrast, makeBrand, hexToRgb, mix, glassWorstBg } from './export-theme.js'
import { EMPTY_TEXT } from './pdf-kit.js'

const req = createRequire(import.meta.url)
const { jsPDF: BaseJsPDF } = req('jspdf')
const font = (f: string) => readFileSync(new URL(`../../public/fonts/${f}`, import.meta.url)).toString('base64')
const fonts = { regular: font('BeVietnamPro-Regular.ttf'), bold: font('BeVietnamPro-Bold.ttf') }
const branding = { name: 'CLB Test', footer: 'CLB Test', logo: null }
const dates = { exportedDateText: '02/10/2026', exportedAtText: '10:00:00 02/10/2026' }

/** jsPDF "gián điệp": ghi lại mọi chuỗi ĐÃ qua bộ lọc glyph + bề rộng thực của chuỗi lúc vẽ. */
function makeSpy() {
  const texts: string[] = []
  const widths: number[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class SpyPDF extends (BaseJsPDF as any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: any) {
      super({ ...opts, compress: false }) // test soi luồng PDF → tắt nén
      const orig = this.text.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.text = (t: any, ...rest: any[]) => {
        for (const s of Array.isArray(t) ? t : [t]) {
          if (typeof s === 'string') { texts.push(s); widths.push(this.getTextWidth(s)) }
        }
        return orig(t, ...rest)
      }
    }
  }
  return { SpyPDF, texts, widths }
}

const cols = [
  { key: 'rank', label: '#', w: 10, align: 'center' as const },
  { key: 'name', label: 'TÊN', w: 100, align: 'left' as const, bold: true },
  { key: 'pts', label: 'ĐIỂM', w: 76, align: 'right' as const },
]
const standings = (o: { rows: Record<string, string | number>[]; rankNote?: string; footerRow?: Record<string, string | number>; w?: number[] }) => {
  const s = makeSpy()
  const doc = buildStandingsReportPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    meta: { clubName: 'CLB', tournamentName: 'Giải', sportLabel: 'Pickle', formatLabel: '', rankNote: o.rankNote, ...dates },
    columns: o.w ? cols.map((c, i) => ({ ...c, w: o.w![i] })) : cols,
    rows: o.rows, stats: [], footerRow: o.footerRow,
  })
  return { doc, ...s }
}

/* ── M4: ký tự ngoài font ── */
test('sanitize: "→" thành "›", ✓/⏳/emoji bị loại, tiếng Việt giữ nguyên', () => {
  const r = standings({ rows: [{ name: 'Nguyễn Văn Ơn → Trần ✓ ⏳ 🎉 An', pts: 3 }], rankNote: 'Hòa → so điểm đối đầu ✓' })
  const all = r.texts.join('\n')
  assert.ok(all.includes('Nguyễn Văn Ơn › Trần An'), all)
  assert.ok(all.includes('Hòa › so điểm đối đầu'))
  for (const bad of ['→', '✓', '⏳', '🎉']) assert.ok(!all.includes(bad), `còn ký tự ${bad}`)
})

/* ── M6 / M7 / Low ── */
test('empty-state: 0 dòng → câu chuẩn "Chưa có dữ liệu trong phạm vi này"', () => {
  assert.equal(EMPTY_TEXT, 'Chưa có dữ liệu trong phạm vi này')
  assert.ok(standings({ rows: [] }).texts.includes(EMPTY_TEXT))
  assert.ok(!standings({ rows: [{ name: 'A', pts: 1 }] }).texts.includes(EMPTY_TEXT))
})
test('ghi chú cuối bảng KHÔNG bị bỏ khi bảng lấp đầy trang (mọi số dòng quanh ngưỡng sang trang)', () => {
  for (let n = 20; n <= 60; n++) {
    const rows = Array.from({ length: n }, (_, i) => ({ name: `Đội ${i}`, pts: i }))
    const r = standings({ rows, rankNote: 'GHI-CHU-CUOI', footerRow: { name: 'TONG-CUOI', pts: 99 } })
    assert.ok(r.texts.includes('GHI-CHU-CUOI'), `mất ghi chú ở n=${n}`)
    assert.ok(r.texts.includes('TONG-CUOI'), `mất dòng tổng ở n=${n}`)
  }
})
test('số trang thật: footer "Trang p / N" khớp doc.getNumberOfPages()', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ name: `Đội ${i}`, pts: i }))
  const r = standings({ rows })
  const n = r.doc.getNumberOfPages()
  assert.ok(n > 1)
  for (let p = 1; p <= n; p++) assert.ok(r.texts.includes(`Trang ${p} / ${n}`), `thiếu Trang ${p} / ${n}`)
})
test('bề rộng cột tự chuẩn hoá về 186mm (bảng không lệch lề phải)', () => {
  // cột tổng 156mm → bị kéo giãn: ô căn phải cuối bảng nằm sát lề phải (210-12-3 = 195mm), không dừng ở 168mm
  const spyDraw: number[] = []
  const s = makeSpy()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class P extends (s.SpyPDF as any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(o: any) { super(o); const t = this.text; this.text = (a: any, x: number, ...r: any[]) => { if (a === 'SAMPLE') spyDraw.push(x); return t(a, x, ...r) } }
  }
  buildStandingsReportPDF({
    jsPDF: P, fonts, branding, meta: { clubName: 'c', tournamentName: 't', sportLabel: 's', formatLabel: '', ...dates },
    columns: [{ key: 'name', label: 'A', w: 100, align: 'left' }, { key: 'pts', label: 'B', w: 56, align: 'right' }],
    rows: [{ name: 'x', pts: 'SAMPLE' }], stats: [],
  })
  assert.ok(Math.abs(spyDraw[0] - 195) < 0.01, `x=${spyDraw[0]}`)
})

/* ── M5: wrap thay vì cắt "…" ── */
test('cột mô tả dài xuống dòng (không còn "…" khi vừa 3 dòng); quá dài mới cắt', () => {
  const desc = 'Thanh toán tiền sân Pickleball Thành Công buổi tối thứ Bảy kèm nước uống bóng mới thuê trọng tài'
  const ok = standings({ rows: [{ name: desc, pts: 1 }] })
  assert.ok(!ok.texts.some(t => t.endsWith('…')))
  assert.equal(ok.texts.filter(t => desc.includes(t) && t.length > 8).length >= 2, true, 'phải tách ≥ 2 dòng')
  const huge = standings({ rows: [{ name: desc.repeat(6), pts: 1 }], w: [10, 60, 116] })
  assert.ok(huge.texts.some(t => t.endsWith('…')), 'dài hơn 3 dòng thì dòng cuối có …')
})

/* ── L7: knockout ── */
test('knockout 64 trận/vòng: chia trang, footer đúng "Trang p / N", không hard-code 1/1', () => {
  const mk = (n: number, label: string) => ({
    label,
    matches: Array.from({ length: n }, (_, i) => ({ teamA: `A${i}`, teamB: `B${i}`, scoreA: 1, scoreB: 0, winner: 'A' as const })),
  })
  const s = makeSpy()
  const doc = buildKnockoutReportPDF({
    jsPDF: s.SpyPDF, fonts, branding, meta: { clubName: 'c', tournamentName: 't', sportLabel: 's', ...dates },
    rounds: [mk(64, 'V1'), mk(32, 'V2'), mk(16, 'V3'), mk(8, 'V4'), mk(4, 'V5'), mk(2, 'V6'), mk(1, 'CK')],
  })
  const n = doc.getNumberOfPages()
  assert.ok(n >= 5, `n=${n}`)
  assert.ok(s.texts.includes(`Trang 1 / ${n}`) && s.texts.includes(`Trang ${n} / ${n}`))
  assert.ok(!s.texts.includes('Trang 1 / 1'))
  // đủ 64 trận vòng 1 được vẽ (mỗi đội xuất hiện)
  for (let i = 0; i < 64; i++) assert.ok(s.texts.includes(`A${i}`), `thiếu trận ${i}`)
})
test('knockout 0 trận → thông điệp rỗng, không crash; vòng lệch cấu trúc không ném lỗi', () => {
  const s = makeSpy()
  buildKnockoutReportPDF({ jsPDF: s.SpyPDF, fonts, branding, meta: { clubName: 'c', tournamentName: 't', sportLabel: 's', ...dates }, rounds: [] })
  assert.ok(s.texts.includes(EMPTY_TEXT))
  const m = (n: number) => ({ label: 'v', matches: Array.from({ length: n }, () => ({ teamA: 'a', teamB: 'b', winner: null })) })
  assert.doesNotThrow(() => buildKnockoutReportPDF({ jsPDF: BaseJsPDF, fonts, branding, meta: { clubName: 'c', tournamentName: 't', sportLabel: 's', ...dates }, rounds: [m(1), m(2)] }))
})

/* ── H3 (BE) mini receipt: không tràn lề ── */
test('phiếu thu Quỹ Phụ: tên/ghi chú/tên CLB dài đều xuống dòng hoặc cắt, KHÔNG chuỗi nào rộng hơn vùng nội dung', () => {
  const s = makeSpy()
  const long = 'Lê Thị Hồng Nhung Phương Thảo Quỳnh Trang Anh Đào Mai '
  buildMiniReceiptPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    receipt: { payerName: long.repeat(3), incomeType: 'Khác', amount: 5000, paymentDate: '1/1/2026', notes: 'ghi chú dài '.repeat(60), clubName: 'CLB '.repeat(40), printedDateText: '02/10/2026', printedAtText: '10:00 02/10/2026' },
  })
  assert.ok(Math.max(...s.widths) <= 186, `max width ${Math.max(...s.widths)}`)
})
test('phiếu thu Quỹ Phụ: không in "Hà Nội" cứng; thiếu số phiếu thì ẩn "Số …"; có thì tiếng Việt "Số 0003"', () => {
  const s = makeSpy()
  buildMiniReceiptPDF({ jsPDF: s.SpyPDF, fonts, branding, receipt: { payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', clubName: 'C', printedDateText: 'd', printedAtText: 'a' } })
  assert.ok(!s.texts.some(t => t.includes('Hà Nội')))
  assert.ok(!s.texts.some(t => t.startsWith('No. ') || /^Số \d{4}$/.test(t)))
  const s2 = makeSpy()
  buildMiniReceiptPDF({ jsPDF: s2.SpyPDF, fonts, branding, receipt: { receiptNo: 3, clubLocation: 'Huế', payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', clubName: 'C', printedDateText: 'd', printedAtText: 'a' } })
  assert.ok(s2.texts.includes('Số 0003') && !s2.texts.some(t => t.startsWith('No. ')) && s2.texts.some(t => t.startsWith('Huế,')))
})

/* ── M3 / bill ── */
const bill = (o: Record<string, unknown>) => ({
  memberName: 'An', attendedSessions: 3, totalSessions: 12, amountPaid: 100, contributionPaid: true,
  courtCost: 10, livingCost: 5, totalCost: 15, balance: 0, ...o,
})
const quy = (rows: ReturnType<typeof bill>[], extra: Record<string, unknown> = {}) => {
  const s = makeSpy()
  buildQuyReportPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    summary: { clubName: 'C', periodName: 'K', totalIncome: 100, totalExpense: 50, balance: 50, memberCount: 40, sessionCount: 3, confirmedCount: 1, ...dates, ...extra },
    rows,
  })
  return s
}
test('bill: nhãn sân/sinh hoạt đúng công thức (không "N buổi" cho sân)', () => {
  const t = quy([bill({})]).texts
  assert.ok(t.includes(' (chia đều)') && t.includes(' (chia đều + theo buổi)'))
  assert.ok(!t.some(x => /\(\d+ buổi\)/.test(x)))
})
test('bill: số dư âm → "Cần nộp thêm" hiện số dương, không "-1 đ"; |số dư| < 0.5 coi như 0', () => {
  const t = quy([bill({ balance: -1 })]).texts
  assert.ok(t.includes('Cần nộp thêm'))
  assert.ok(t.includes('1 đ'))
  const z = quy([bill({ balance: -0.4 })]).texts
  assert.ok(z.includes('Số dư của bạn') && !z.includes('Cần nộp thêm'))
  assert.ok(!z.includes('-0 đ') && !z.includes('+-0 đ'))
})
test('"Chưa đóng quỹ" không ra mẫu số lệch (77 / 40) khi có bảng thành viên', () => {
  const rows = Array.from({ length: 5 }, (_, i) => bill({ memberName: `M${i}`, contributionPaid: false }))
  const t = quy(rows, { activeMemberCount: 40, miniBalance: 0, carryForward: 0, totalAttendance: 1 }).texts
  assert.ok(t.includes('5 / 5 người'), t.filter(x => x.includes('người')).join('|'))
})
test('báo cáo chi phí: nhãn tổng tùy chỉnh + rỗng in câu chuẩn "Chưa có khoản chi…"', () => {
  const s = makeSpy()
  buildExpenseReportPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    summary: { clubName: 'C', periodName: 'K', totalAll: 10, totalCommon: 10, totalMini: 0, totalApproved: 10, totalPending: 0, count: 0, totalLabel: 'TỔNG ĐÃ DUYỆT', totalRowLabel: 'TỔNG ĐÃ DUYỆT / ĐÃ CHI', ...dates },
    rows: [],
  })
  assert.ok(s.texts.some(t => t.toUpperCase() === 'TỔNG ĐÃ DUYỆT') && s.texts.includes('TỔNG ĐÃ DUYỆT / ĐÃ CHI') && s.texts.includes('Chưa có khoản chi trong kỳ này'))
})

/* ═══════════ LUXURY SaaS — CONFORMANCE ═══════════
   Quét mọi builder bằng SpyPDF: cỡ chữ ≥ 7pt, mọi màu chữ thuộc THEME + tương phản ≥ 4.5:1 trên trắng,
   không emoji / ký tự ngoài font, màu brand CLB tới mọi PDF, mã tài liệu + footer chuẩn. */

/** jsPDF gián điệp thứ 2: ghi (chuỗi, cỡ chữ, đậm?, màu chữ, màu nền hiện hành) tại MỖI lệnh text. */
function makeStyleSpy() {
  const rec: { text: string; size: number; bold: boolean; color: number[]; fill: number[] }[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class StylePDF extends (BaseJsPDF as any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: any) {
      super({ ...opts, compress: false })
      const orig = this.text.bind(this)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.text = (t: any, ...rest: any[]) => {
        const color = hexToRgb(String(this.getTextColor())) as number[] // '#rrggbb' (có thể lệch ±1 do làm tròn)
        const fill = hexToRgb(String(this.getFillColor())) as number[]
        const bold = String(this.getFont().fontStyle) === 'bold'
        for (const s of Array.isArray(t) ? t : [t]) {
          if (typeof s === 'string' && s.trim() !== '') rec.push({ text: s, size: this.getFontSize(), bold, color, fill })
        }
        return orig(t, ...rest)
      }
    }
  }
  return { StylePDF, rec }
}

const near = (a: number[], b: number[], tol = 2) => a.every((v, i) => Math.abs(v - b[i]) <= tol)
/** jsPDF ghi màu với 2 chữ số thập phân, bỏ số 0 thừa ("0.06 0.46 0.43 RG"). */
const pdfRgb = (c: number[]) => c.map(v => String(Number((v / 255).toFixed(2)))).join(' ')

/** Dựng đủ mọi loại tài liệu với 1 màu brand. */
function buildAll(primaryColor: string | null, logo: unknown = null) {
  const s = makeStyleSpy()
  const br = { name: 'CLB Test', footer: 'CLB Test', logo: logo as null, primaryColor }
  const members = Array.from({ length: 14 }, (_, i) => bill({ memberName: `Thành viên ${i}`, contributionPaid: i % 3 !== 0, balance: i % 2 ? 1000 * i : -1000 * i }))
  const expRows = [
    { date: '05/03/2026', description: 'Tiền sân', fundKey: 'COMMON' as const, fundLabel: 'Quỹ Chính', kindLabel: 'Sân', amount: 480000, statusKey: 'approved' as const, statusLabel: 'Đã duyệt' },
    { date: '06/03/2026', description: 'Nước', fundKey: 'MINI' as const, fundLabel: 'Quỹ Phụ', kindLabel: 'Khác', amount: 30000, statusKey: 'pending' as const, statusLabel: 'Chờ duyệt' },
  ]
  const docs = [
    buildQuyReportPDF({ jsPDF: s.StylePDF, fonts, branding: br, summary: { clubName: 'CLB Test', periodName: 'Kỳ 1', totalIncome: 100, totalExpense: 95, balance: -5, memberCount: 14, sessionCount: 3, confirmedCount: 9, miniBalance: 5, carryForward: 1, totalAttendance: 20, activeMemberCount: 14, ...dates }, rows: members, expenseRows: expRows }),
    buildStandingsReportPDF({ jsPDF: s.StylePDF, fonts, branding: br, meta: { clubName: 'CLB Test', tournamentName: 'Giải', sportLabel: 'Pickle', formatLabel: 'Vòng tròn', rankNote: 'ghi chú', ...dates }, columns: [cols[0], cols[1], { key: 'st', label: 'TRẠNG THÁI', w: 30, align: 'center' as const, tone: 'status' as const }, { ...cols[2], w: 46 }], rows: [{ name: 'A', st: 'Hoạt động', pts: '-5.000 đ' }, { __section: 'KỲ QUỸ: K1', __sectionRight: '2 khoản' }, { name: 'B', st: 'Chờ xác nhận', pts: '+3' }], stats: [{ label: 'Số đội', value: 8 }], footerRow: { name: 'TỔNG', pts: '10' } }),
    buildKnockoutReportPDF({ jsPDF: s.StylePDF, fonts, branding: br, meta: { clubName: 'CLB Test', tournamentName: 'Cúp', sportLabel: 'Bóng đá', championName: 'Đội A', ...dates }, rounds: [{ label: 'Bán kết', matches: [{ teamA: 'A', teamB: 'B', scoreA: 2, scoreB: 2, winner: 'A' as const }, { teamA: 'C', teamB: 'D', scoreA: 0, scoreB: 1, winner: 'B' as const }] }, { label: 'Chung kết', matches: [{ teamA: 'A', teamB: 'D', scoreA: 1, scoreB: 0, winner: 'A' as const }] }] }),
    buildExpenseReportPDF({ jsPDF: s.StylePDF, fonts, branding: br, summary: { clubName: 'CLB Test', periodName: 'K', totalAll: 10, totalCommon: 5, totalMini: 5, totalApproved: 5, totalPending: 5, count: 2, ...dates }, rows: [{ code: 'CP1', description: 'x', kindLabel: 'y', dateText: '05/03/2026', amount: 5, statusKey: 'approved' }, { code: 'CP2', description: 'z', kindLabel: 'y', dateText: '06/03/2026', amount: 5, statusKey: 'rejected' }] }),
    buildMiniReceiptPDF({ jsPDF: s.StylePDF, fonts, branding: br, receipt: { receiptNo: 1, payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', notes: 'n', clubName: 'CLB Test', printedDateText: 'd', printedAtText: 'a' } }),
    buildMiniExpensePDF({ jsPDF: s.StylePDF, fonts, branding: br, receipt: { receiptNo: 1, receiverName: 'A', expenseType: 'X', amount: 1, expenseDate: '1/1', description: 'd', clubName: 'CLB Test', printedDateText: 'd', printedAtText: 'a' } }),
    buildPersonalReceiptPDF({ jsPDF: s.StylePDF, fonts, branding: br, receipt: { receiptNo: 2, memberName: 'A', periodName: 'K', clubName: 'CLB Test', amountPaid: 5, attendedSessions: 1, totalSessions: 2, courtCost: 1, livingCost: 1, totalCost: 2, balance: -2, isConfirmed: false, printedDateText: 'd', printedAtText: 'a' } }),
    buildBillingReceiptPDF({ jsPDF: s.StylePDF, fonts, branding: br, receipt: { clubName: 'CLB Test', invoiceNumber: 'INV-1', orderCode: 'O', planLabel: 'Gói Pro', cycleLabel: '12 tháng', amount: 9, discount: 1, gateway: 'VNPay', billingInfo: { buyerName: 'B', taxCode: '1', address: 'đ' }, printedDateText: 'd', printedAtText: 'a' } }),
  ]
  return { docs, rec: s.rec }
}

const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿⭐⏳✓✔▲▼◆]/u
const col = (k: string) => THEME.color[k as keyof typeof THEME.color] as number[]
/** Chữ thường nhỏ: bản AA (≥ 4.5:1 trên trắng). */
const AA_KEYS = ['ink', 'ink2', 'muted', 'posText', 'negText', 'warn', 'info', 'posDeep', 'negDeep', 'warnDeep']
/** Màu SINH ĐỘNG: chỉ cho chữ ĐẬM ≥ 12pt (KPI lớn / hero; ≥ 3:1). Chữ < 12pt PHẢI ≥ 4.5:1 (bản AA). */
const VIVID_KEYS = ['pos', 'neg', 'cyan', 'orange', 'amber']

for (const hex of ['#6D5DFB', '#0F766E', '#F59E0B', null]) {
  test(`conformance (brand ${hex ?? 'mặc định'}): chữ ≥ 7pt; màu chữ ∈ THEME; thường ≥ 4.5:1, sinh động chỉ khi ĐẬM ≥ 12pt (≥ 3:1), chữ < 12pt ≥ 4.5:1; chữ trắng trên băng kính; không #94A3B8/emoji`, () => {
    const { rec } = buildAll(hex)
    assert.ok(rec.length > 200, 'phải ghi được nhiều chuỗi')
    const brand = makeBrand(hex)
    const aa = [...AA_KEYS.map(col), brand.brandDark as number[]]
    const vivid = VIVID_KEYS.map(col)
    let whiteCount = 0
    let vividCount = 0
    for (const r of rec) {
      assert.ok(r.size >= MIN_PT - 1e-6, `cỡ chữ ${r.size} < ${MIN_PT} ở "${r.text}"`)
      assert.ok(!EMOJI.test(r.text), `emoji trong "${r.text}"`)
      assert.ok(!near(r.color, [148, 163, 184], 1), `#94A3B8 làm màu chữ ở "${r.text}"`)
      if (near(r.color, THEME.color.white as number[], 1)) {
        // chữ trắng chỉ nằm trên băng/header kính gradient — tương phản được kiểm RIÊNG ở test "LIQUID GLASS: chữ TRẮNG…" (cả 2 đầu gradient + bóng loáng)
        whiteCount++
        continue
      }
      if (aa.some(c => near(r.color, c))) {
        assert.ok(contrast(r.color, THEME.color.white) >= 4.4, `tương phản thấp ở "${r.text}" ${JSON.stringify(r.color)}`)
        continue
      }
      assert.ok(vivid.some(c => near(r.color, c)), `màu chữ ${JSON.stringify(r.color)} ngoài THEME ở "${r.text}"`)
      vividCount++
      assert.ok(r.bold && r.size >= 12 - 1e-6, `chữ sinh động phải ĐẬM ≥ 12pt: "${r.text}" ${r.size}pt bold=${r.bold}`)
      assert.ok(contrast(r.color, THEME.color.white) >= 2.95, `sinh động < 3:1 ở "${r.text}"`)
    }
    assert.ok(whiteCount > 20, 'masthead/header bảng phải có chữ trắng trên nền đặc')
    assert.ok(vividCount > 0, 'vẫn có chữ xanh/đỏ sinh động ở KPI lớn (≥ 12pt)')
  })
}

test('LIQUID GLASS: mọi PDF dùng độ trong suốt (ExtGState ca/CA) + gradient bằng dải rect + clip; KHÔNG shading/SMask (an toàn mọi trình đọc/in)', () => {
  for (const d of buildAll(null).docs) {
    const out = String(d.output())
    assert.ok(!/\/ShadingType|\/Shading |\/PatternType 2|\/SMask/.test(out), 'có shading/mask trong PDF')
    assert.ok(/\/ca [0-9.]+/.test(out) && /\/CA [0-9.]+/.test(out), 'thiếu ExtGState độ trong suốt')
    assert.ok(/\nW\n/.test(out), 'thiếu clip cho gradient bo góc')
    // số GState hợp lý (alpha lượng tử hoá, không phình theo số phần tử)
    const gsCount = new Set(out.match(/\/ca [0-9.]+/g)).size
    assert.ok(gsCount >= 8 && gsCount <= 40, `số GState ${gsCount}`)
  }
})

test('LIQUID GLASS: nền wash (washA → trắng → washC) + orb có mặt ở MỌI trang; trang tiếp (addPage) cũng có wash', () => {
  for (const hex of ['#6D5DFB', '#0F766E', '#F59E0B']) {
    const B = makeBrand(hex)
    const orbRgb = pdfRgb(THEME.color.cyan) + ' rg'
    for (const d of buildAll(hex).docs) {
      const out = String(d.output()).replace(/(\d)\. /g, '$1 ') // jsPDF in "1." cho kênh 255
      const pages = d.getNumberOfPages()
      assert.ok(out.split(orbRgb).length - 1 >= pages * THEME.glass.orb.rings, `${hex}: orb cyan < ${pages} trang × ${THEME.glass.orb.rings} vòng`)
      // dải wash đầu = mix(washA, washB, 2·(0.5/56)); dải cuối = mix(washB, washC, 2·((55.5/56) − 0.5))
      assert.ok(out.split(pdfRgb(mix(B.washA, B.washB, 1 / 56)) + ' rg').length - 1 >= pages, `${hex}: thiếu dải wash đầu ở mỗi trang`)
      assert.ok(out.split(pdfRgb(mix(B.washB, B.washC, 2 * (55.5 / 56 - 0.5))) + ' rg').length - 1 >= pages, `${hex}: thiếu dải wash cuối ở mỗi trang`)
    }
  }
})

test('LIQUID GLASS: chữ TRẮNG trên băng/header gradient đạt ≥ 4.5:1 ở CẢ HAI đầu, kể cả sau lớp bóng loáng; chip kính tối không làm giảm', () => {
  const white = THEME.color.white
  const G = THEME.glass
  const samples = ['#6D5DFB', '#0F766E', '#F59E0B', '#FACC15', '#22D3EE', '#E11D48', '#10B981', '#FFFFFF']
  for (let r = 0; r < 256; r += 85) for (let g = 0; g < 256; g += 85) for (let b = 0; b < 256; b += 85) samples.push('#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''))
  for (const hex of samples) {
    const B = makeBrand(hex)
    for (const [name, c] of [['glassStart', B.glassStart], ['glassEnd', B.glassEnd]] as const) {
      assert.ok(contrast(white, c) >= 4.5, `${hex} ${name}: ${contrast(white, c).toFixed(2)}`)
      assert.ok(contrast(white, mix(c, white, G.mast.gloss)) >= 4.5, `${hex} ${name}+gloss: ${contrast(white, mix(c, white, G.mast.gloss)).toFixed(2)}`)
    }
    // chip kính: glassStart α0.35 phủ lên glassEnd → chỉ tối thêm
    const chipBg = mix(B.glassEnd, B.glassStart, G.mast.chip)
    assert.ok(contrast(white, chipBg) >= contrast(white, B.glassEnd) - 1e-6)
  }
})

test('LIQUID GLASS: chữ trên tấm kính đạt ≥ 4.5:1 so với nền XẤU NHẤT (wash tối nhất + orb + kính α); ink/ink2/muted/brandDark/Deep', () => {
  const C = THEME.color
  for (const hex of ['#6D5DFB', '#0F766E', '#F59E0B', '#2563EB', '#E11D48']) {
    const B = makeBrand(hex)
    const bg = glassWorstBg(B)
    for (const [k, c] of Object.entries({ ink: C.ink, ink2: C.ink2, muted: C.muted, brandDark: B.brandDark, posText: C.posText, negText: C.negText, warn: C.warn, info: C.info, neg: C.neg })) {
      assert.ok(contrast(c as number[], bg) >= 4.5, `${hex} ${k} trên kính: ${contrast(c as number[], bg).toFixed(2)}`)
    }
    // tấm nhấn (brand α) + viên (màu α trên trắng α): chữ brandDark / Deep vẫn đạt
    const accentBg = mix(bg, B.brand, THEME.glass.accent)
    assert.ok(contrast(B.brandDark, accentBg) >= 4.5, `${hex} brandDark trên tấm nhấn ${contrast(B.brandDark, accentBg).toFixed(2)}`)
    for (const [deep, base] of [[C.posDeep, C.pos], [C.negDeep, C.neg], [C.warnDeep, C.amber]]) {
      const chipBg = mix(mix(bg, C.white, THEME.glass.chip.base), base, THEME.glass.chip.tint)
      assert.ok(contrast(deep, chipBg) >= 4.5, `${hex} chữ Deep trên viên kính ${contrast(deep, chipBg).toFixed(2)}`)
    }
  }
})

test('LIQUID GLASS: kích thước file — báo cáo nhiều trang < 1.5MB, tài liệu 1 trang < 600KB (font Việt nhúng, luồng nén), vẫn là PDF hợp lệ', () => {
  const members = Array.from({ length: 32 }, (_, i) => bill({ memberName: `Thành viên ${i}`, contributionPaid: i % 3 !== 0, balance: i % 2 ? 1000 * i : -1000 * i }))
  const big = buildQuyReportPDF({ jsPDF: BaseJsPDF, fonts, branding, summary: { clubName: 'C', periodName: 'K', totalIncome: 100, totalExpense: 95, balance: 5, memberCount: 32, sessionCount: 3, confirmedCount: 20, ...dates }, rows: members, expenseRows: [] })
  const bytes = (big.output('arraybuffer') as ArrayBuffer).byteLength
  assert.ok(big.getNumberOfPages() >= 7, `trang ${big.getNumberOfPages()}`)
  assert.ok(bytes < 1.5 * 1024 * 1024, `báo cáo quỹ ${big.getNumberOfPages()} trang = ${(bytes / 1024).toFixed(0)}KB`)
  const one = buildMiniReceiptPDF({ jsPDF: BaseJsPDF, fonts, branding, receipt: { receiptNo: 1, payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', clubName: 'C', printedDateText: 'd', printedAtText: 'a' } })
  const ab = one.output('arraybuffer') as ArrayBuffer
  assert.ok(ab.byteLength < 600 * 1024, `phiếu 1 trang = ${(ab.byteLength / 1024).toFixed(0)}KB`)
  assert.equal(String.fromCharCode(...new Uint8Array(ab).slice(0, 5)), '%PDF-')
})

test('brand CLB tới MỌI PDF: màu brand xuất hiện trong luồng PDF của từng tài liệu; emerald không lẫn tím mặc định', () => {
  const stroke = (hex: string | null) => pdfRgb(makeBrand(hex).brand) + ' rg'
  const emerald = buildAll('#0F766E').docs
  const def = buildAll(null).docs
  emerald.forEach((d, i) => {
    const out = String(d.output())
    assert.ok(out.includes(stroke('#0F766E')), `tài liệu #${i} thiếu màu brand emerald`)
    assert.ok(!out.includes(stroke(null)), `tài liệu #${i} còn màu tím mặc định`)
  })
  def.forEach((d, i) => assert.ok(String(d.output()).includes(stroke(null)), `tài liệu #${i} thiếu màu tím mặc định`))
})

test('mã tài liệu PF-{LOẠI}-yyMMdd-HHmm + footer "CLB · Tên TL · Mã TL" + "Trang x / y"', () => {
  const q = quy([bill({})])
  const foot = q.texts.find(x => /PF-BCQ-\d{6}-\d{4}$/.test(x) && x.includes(' · '))
  assert.ok(foot, 'thiếu footer có mã TL: ' + q.texts.filter(x => x.includes('PF-')).join('|'))
  assert.match(foot!, /^CLB Test · BÁO CÁO TÀI CHÍNH · PF-BCQ-\d{6}-\d{4}$/)
  assert.ok(q.texts.some(x => /^Trang 1 \/ \d+$/.test(x)))
  assert.ok(q.texts.some(x => /^Mã TL: PF-BCQ-\d{6}-\d{4}$/.test(x)))
  const k = standings({ rows: [{ name: 'A', pts: 1 }] }).texts
  assert.ok(k.some(x => /^Mã TL: PF-BXH-\d{6}-\d{4}$/.test(x)))
})

test('header trang tiếp: dùng masthead gọn "… (tiếp)" và vẫn có footer đủ trang', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ name: `Đội ${i}`, pts: i }))
  const r = standings({ rows })
  assert.ok(r.doc.getNumberOfPages() > 1)
  assert.ok(r.texts.some(t => t.includes('(tiếp)')))
})

test('hàng TỔNG: bảng thành viên báo cáo quỹ + bảng khoản chi + footerRow luôn in hàng tổng đúng giá trị', () => {
  const t = quy([bill({ courtCost: 100, livingCost: 50, totalCost: 150, balance: 20 }), bill({ courtCost: 10, livingCost: 5, totalCost: 15, balance: -5 })]).texts
  assert.ok(t.includes('TỔNG CỘNG'))
  assert.ok(t.includes('110 đ') && t.includes('55 đ') && t.includes('165 đ') && t.includes('+15 đ'), t.filter(x => /đ$/.test(x)).join('|'))
  assert.ok(standings({ rows: [{ name: 'A', pts: 1 }], footerRow: { name: 'TỔNG', pts: 9 } }).texts.includes('TỔNG'))
  const s = makeSpy()
  buildExpenseReportPDF({ jsPDF: s.SpyPDF, fonts, branding, summary: { clubName: 'C', periodName: 'K', totalAll: 10, totalCommon: 10, totalMini: 0, totalApproved: 10, totalPending: 0, count: 1, ...dates }, rows: [{ code: 'a', description: 'b', kindLabel: 'c', dateText: '05/03/2026', amount: 10, statusKey: 'approved' }] })
  assert.ok(s.texts.includes('TỔNG CỘNG'))
})

test('ngày/nhóm KHÔNG bị cắt "…": ô ngày ở cột hẹp tự co, tiêu đề nhóm dài tự xuống dòng', () => {
  const s = makeSpy()
  buildStandingsReportPDF({
    jsPDF: s.SpyPDF, fonts, branding, meta: { clubName: 'C', tournamentName: '', sportLabel: 'x', formatLabel: '', ...dates },
    columns: [{ key: 'd', label: 'NGÀY', w: 18, align: 'left' as const }, { key: 'n', label: 'TÊN', w: 168, align: 'left' as const }],
    rows: [{ __section: 'KỲ QUỸ: Kỳ rất dài 03/2026 · tháng Ba', __sectionRight: '24 khoản · 6.600.000 đ · chờ 4 (900.000 đ)' }, { d: '05/03/2026', n: 'a' }],
  })
  assert.ok(!s.texts.some(t => t.endsWith('…')), s.texts.filter(t => t.endsWith('…')).join('|'))
  assert.ok(s.texts.includes('05/03/2026'))
})

test('số âm: ô số bắt đầu "-" dùng đỏ neg (đậm sinh động) / negText / ink', () => {
  const { rec } = buildAll(null)
  const neg = rec.filter(r => /^-\s?\d/.test(r.text))
  assert.ok(neg.length > 0)
  for (const r of neg) assert.ok(near(r.color, THEME.color.neg as number[]) || near(r.color, THEME.color.negText as number[]) || near(r.color, THEME.color.ink as number[]), `${r.text} ${JSON.stringify(r.color)}`)
})

test('phiếu thu cá nhân: tiếng Việt, "Số 0012", không "No.", không emoji, payload HTML chỉ là chữ thuần; vector 1 trang', () => {
  const s = makeSpy()
  const doc = buildPersonalReceiptPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    receipt: {
      receiptNo: 12, memberName: 'Nguyễn <b>A</b>', periodName: 'Kỳ 3', clubName: 'CLB X', clubLocation: 'Huế', amountPaid: 300000, attendedSessions: 9, totalSessions: 12,
      memberCountForSplit: 5, totalCourtFee: 500000, courtCost: 100000, livingCost: 50000, totalCost: 150000, balance: 150000, isConfirmed: true,
      printedDateText: '02/10/2026', printedAtText: '10:00:00 02/10/2026',
    },
  })
  const all = s.texts.join('\n')
  assert.ok(s.texts.includes('Số 0012') && !all.includes('No. '))
  assert.ok(all.includes('Nguyễn <b>A</b>'))
  assert.ok(s.texts.includes('300.000 đ') && s.texts.includes('+150.000 đ') && s.texts.includes('500.000 đ'))
  assert.ok(all.includes('chia đều theo sĩ số / 5 người'))
  assert.ok(s.texts.some(t => t.startsWith('Huế,')))
  assert.ok(!EMOJI.test(all))
  assert.equal(doc.getNumberOfPages(), 1)
  assert.ok(!String(doc.output()).includes('/Subtype /Image'), 'phiếu vector không chứa ảnh raster')
  assert.ok(Math.max(...s.widths) <= 186)
})

test('phiếu thu cá nhân thiếu dữ liệu: ẩn "Tổng tiền sân toàn quỹ", "/ N người", số phiếu, "Hà Nội" cứng', () => {
  const s = makeSpy()
  buildPersonalReceiptPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    receipt: { memberName: 'A', periodName: 'K', clubName: 'CLB X', clubLocation: '', amountPaid: 0, attendedSessions: 3, totalSessions: 12, courtCost: 100000, livingCost: 50000, totalCost: 150000, balance: -150000, isConfirmed: false, printedDateText: 'd', printedAtText: 'a' },
  })
  const all = s.texts.join('\n')
  assert.ok(all.includes('Sinh hoạt (chia đều + theo buổi tham dự)'))
  assert.ok(!all.includes('Tổng tiền sân toàn quỹ') && !/\/ \d+ người/.test(all) && !all.includes('Hà Nội') && !/^Số \d{4}$/m.test(all))
  assert.ok(all.includes('Số tiền cần nộp thêm') && s.texts.includes('-150.000 đ'))
})

test('biên nhận billing: không lặp "Gói dịch vụ Gói Pro", ngày trước giờ, logo CLB nhúng, 1 trang', () => {
  const s = makeSpy()
  const logo = { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', w: 1, h: 1, onDark: true }
  const doc = buildBillingReceiptPDF({
    jsPDF: s.SpyPDF, fonts, branding: { ...branding, logo, primaryColor: '#0F766E' },
    receipt: { clubName: 'CLB X', invoiceNumber: 'INV-1', orderCode: 'O-1', planLabel: 'Gói Pro', cycleLabel: '12 tháng', amount: 2990000, discount: 300000, paidAtText: '15/03/2026 17:00:00', gateway: 'VNPay', printedDateText: '02/10/2026', printedAtText: '10:00:00 02/10/2026' },
  })
  const all = s.texts.join('\n')
  assert.ok(!all.includes('Gói dịch vụ Gói'))
  assert.ok(s.texts.includes('Gói Pro · 12 tháng'))
  assert.ok(s.texts.includes('Ngày thanh toán: 15/03/2026 17:00:00'))
  assert.ok(s.texts.includes('3.290.000 đ') && s.texts.includes('-300.000 đ') && s.texts.includes('2.990.000 đ'))
  assert.equal(doc.getNumberOfPages(), 1)
  assert.ok(String(doc.output()).includes('/Subtype /Image'), 'logo CLB được nhúng')
})

test('phiếu chi Quỹ Phụ: vector, "Số 0003", thẻ Quỹ Phụ, không emoji, mô tả/ghi chú/CLB dài không tràn lề', () => {
  const s = makeSpy()
  buildMiniExpensePDF({
    jsPDF: s.SpyPDF, fonts, branding,
    receipt: { receiptNo: 3, receiverName: 'Nguyễn Văn A', expenseType: 'Nước uống', amount: 215000, expenseDate: '15/03/2026', description: 'mô tả rất dài '.repeat(30), notes: 'ghi chú '.repeat(40), clubName: 'CLB '.repeat(30), printedDateText: 'd', printedAtText: 'a' },
  })
  assert.ok(s.texts.includes('Số 0003') && s.texts.some(t => /quỹ phụ/i.test(t)))
  assert.ok(!EMOJI.test(s.texts.join('')))
  assert.ok(Math.max(...s.widths) <= 186)
})

test('knockout: trận hoà tỉ số có winner ghi "đi tiếp" / "pen x-y"; đường nối dùng màu connector đậm (≥ 3:1)', () => {
  const s = makeSpy()
  const doc = buildKnockoutReportPDF({
    jsPDF: s.SpyPDF, fonts, branding, meta: { clubName: 'c', tournamentName: 't', sportLabel: 's', ...dates },
    rounds: [
      { label: 'BK', matches: [{ teamA: 'A', teamB: 'B', scoreA: 1, scoreB: 1, winner: 'A' as const }, { teamA: 'C', teamB: 'D', scoreA: 2, scoreB: 2, winner: 'B' as const, pen: '4-3' }] },
      { label: 'CK', matches: [{ teamA: 'A', teamB: 'D', winner: null }] },
    ],
  })
  assert.ok(s.texts.includes('đi tiếp') && s.texts.includes('pen 4-3'))
  assert.ok(String(doc.output()).includes(pdfRgb(THEME.color.connector) + ' RG'))
  assert.ok(contrast(THEME.color.connector, THEME.color.white) >= 3)
})

test('lề/CONTENT_W một nơi: THEME.page → 186mm', () => {
  assert.equal(THEME.page.portrait.w - THEME.page.margin * 2, 186)
})

test('masthead = băng KÍNH gradient glassStart → glassEnd (dải rect + bóng loáng): stream có màu đầu gradient + brandDark (chữ) + brand (nhấn); mọi tài liệu', () => {
  for (const hex of ['#6D5DFB', '#0F766E', '#F59E0B']) {
    const m = makeBrand(hex)
    assert.ok(contrast(m.brandMid, THEME.color.white) >= 4.5, `${hex}: chữ trắng trên brandMid`)
    for (const [i, d] of buildAll(hex).docs.entries()) {
      const out = String(d.output())
      assert.ok(out.includes(pdfRgb(m.glassStart) + ' rg'), `tài liệu #${i} thiếu đầu gradient glassStart (${hex})`)
      assert.ok(out.includes(pdfRgb(m.brandDark) + ' RG'), `tài liệu #${i} thiếu bóng mềm brandDark (${hex})`)
      assert.ok(out.includes(pdfRgb(m.brand) + ' rg'), `tài liệu #${i} thiếu màu brand (${hex})`)
    }
  }
})

test('nguồn không hard-code: pdf-report-core/pdf-kit không còn mảng màu [r,g,b] / hex; mọi font(…, cỡ) ≥ 7', () => {
  for (const f of ['pdf-report-core.js', 'pdf-kit.js']) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')
    assert.ok(!/\[\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\]/.test(src), `${f} còn mảng màu cứng`)
    assert.ok(!/#[0-9a-fA-F]{6}\b/.test(src), `${f} còn hex cứng`)
    for (const m of src.matchAll(/font\('(?:bold|normal)',\s*([0-9.]+)/g)) assert.ok(Number(m[1]) >= MIN_PT, `${f}: font cỡ ${m[1]} < ${MIN_PT}`)
  }
})
