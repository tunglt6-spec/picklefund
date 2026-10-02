/* Chạy: node --test src/lib/pdf-report-core.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import {
  buildStandingsReportPDF, buildKnockoutReportPDF, buildMiniReceiptPDF, buildQuyReportPDF, buildExpenseReportPDF,
} from './pdf-report-core.js'

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
      super(opts)
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
test('empty-state: 0 dòng → "Không có dữ liệu"', () => {
  assert.ok(standings({ rows: [] }).texts.includes('Không có dữ liệu'))
  assert.ok(!standings({ rows: [{ name: 'A', pts: 1 }] }).texts.includes('Không có dữ liệu'))
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
  assert.ok(s.texts.includes('Không có dữ liệu'))
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
test('phiếu thu Quỹ Phụ: không in "Hà Nội" cứng; thiếu số phiếu thì ẩn "No."', () => {
  const s = makeSpy()
  buildMiniReceiptPDF({ jsPDF: s.SpyPDF, fonts, branding, receipt: { payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', clubName: 'C', printedDateText: 'd', printedAtText: 'a' } })
  assert.ok(!s.texts.some(t => t.includes('Hà Nội')))
  assert.ok(!s.texts.some(t => t.startsWith('No. ')))
  const s2 = makeSpy()
  buildMiniReceiptPDF({ jsPDF: s2.SpyPDF, fonts, branding, receipt: { receiptNo: 3, clubLocation: 'Huế', payerName: 'A', incomeType: 'X', amount: 1, paymentDate: '1/1', clubName: 'C', printedDateText: 'd', printedAtText: 'a' } })
  assert.ok(s2.texts.includes('No. 0003') && s2.texts.some(t => t.startsWith('Huế,')))
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
test('báo cáo chi phí: nhãn tổng tùy chỉnh + rỗng in "Không có dữ liệu"', () => {
  const s = makeSpy()
  buildExpenseReportPDF({
    jsPDF: s.SpyPDF, fonts, branding,
    summary: { clubName: 'C', periodName: 'K', totalAll: 10, totalCommon: 10, totalMini: 0, totalApproved: 10, totalPending: 0, count: 0, totalLabel: 'TỔNG ĐÃ DUYỆT', totalRowLabel: 'TỔNG ĐÃ DUYỆT / ĐÃ CHI', ...dates },
    rows: [],
  })
  assert.ok(s.texts.includes('TỔNG ĐÃ DUYỆT') && s.texts.includes('TỔNG ĐÃ DUYỆT / ĐÃ CHI') && s.texts.includes('Không có dữ liệu'))
})
