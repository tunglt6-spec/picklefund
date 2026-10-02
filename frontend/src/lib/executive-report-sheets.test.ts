import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { docTypeFromFile } from './excel-kit.ts'
import { buildExcelBytes, exportFileName } from './export.ts'
import { buildExecutiveSheets, EXEC_DOC_TITLE } from './executive-report-sheets.ts'

const req = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSX: any = req('xlsx-js-style')

export const SAMPLE = {
  meta: { clubName: 'CLB B32', periodName: 'B32 - Tháng 10/2026' },
  summary: { clubHealthScore: 83, activeMembers: 8, totalMembers: 8, participationRate: 100, totalSessions: 4, completedSessions: 4, cancelledSessions: 0, tournamentsCount: 1, totalIncome: 2100000, totalExpense: 2180000, balance: -80000, carryForward: 500000, clubAssets: 420000, outstandingCount: 1 },
  health: { overall: 83, dimensions: [{ key: 'Tài chính', score: 70 }, { key: 'Tham gia', score: 100 }, { key: 'AI', score: null }] },
  finance: {
    totalIncome: 2100000, totalExpense: 2180000, balance: -80000, carryForward: 500000, clubAssets: 420000, courtExpenses: 1500000, livingExpenses: 680000, avgIncomePerMember: 262500,
    miniIncome: 0, miniExpense: 0, miniBalance: 0,
    compare: { incomeDeltaPct: 5, expenseDeltaPct: null, balanceDeltaPct: null },
    trends: [1, 2, 3, 4, 5].map(i => ({ name: `T${i + 5}/2026`, thu: 1000000 + i * 100000, chi: 1100000, startDate: `2026-0${i + 5 > 9 ? 9 : i + 5}-01` })),
  },
  members: {
    avgHealth: 80, distribution: { excellent: 3, good: 2, fair: 2, atRisk: 1 },
    all: Array.from({ length: 8 }, (_, i) => ({ name: `TV ${i + 1}`, participationRate: 100 - i * 10, paymentStatus: i === 7 ? 'debt' : 'paid', stars: 5 - (i % 3), conductScore: 90, healthScore: 95 - i * 3 })),
  },
  forecast: { projected30: 400000, projected60: 380000, projected90: -10000, dailyNet: -2666, trendLabel: 'Đang âm nhẹ', runwayMonths: 5, note: 'Dự báo tuyến tính.' },
  dna: { archetype: 'Cộng đồng gắn kết', traits: [{ key: 'Kỷ luật', score: 80 }], note: 'Ghi chú DNA' },
  activity: { totalSessions: 4, completed: 4, cancelled: 0, avgPresentPerSession: 7, busiest: { name: 'Buổi A', present: 8, date: '2026-10-01' }, emptiest: null },
  tournament: { tournamentsCount: 1, matchesCount: 6, teamsCount: 4, topPlayers: [{ name: 'An', wins: 5, winRate: 83 }] },
  ai: { automationScore: { score: 40, noActivity: false }, hermes: { completed: 2, runs: 3, failed: 1, running: 0 }, lisa: { answered: 4, reminders: 1 }, maika: { insights: 2, actions: 1 }, mitdac: { executed: 3, failed: 0, avgMs: 120 }, notification: { sent: 9, byChannel: { IN_APP: 5, EMAIL: 3, TELEGRAM: 1 } } },
  timeline: [1, 2, 3, 4, 5].map(i => ({ date: `2026-10-0${i}`, type: i % 2 ? 'income' : 'expense', label: `Sự kiện ${i}`, amount: i * 100000 })),
  alerts: [{ level: 'warning', message: 'Quỹ âm' }, { level: 'info', message: 'Một thông tin' }],
  recommendations: [{ agent: 'Maika', text: 'Nhắc các thành viên còn nợ đóng quỹ trước ngày 10 hàng tháng để cân đối dòng tiền.' }],
}
const AI = { text: 'Đoạn 1 khá dài. '.repeat(20) + '\nĐoạn 2.', generatedBy: 'ai' }

test('docTypeFromFile: BaoCao_DieuHanh → EXEC; các tiền tố đã biết không rơi về BK', () => {
  assert.equal(docTypeFromFile('BaoCao_DieuHanh_B32 - Tháng 10/2026'), 'EXEC')
  for (const n of ['Cho_xac_nhan_nop_quy', 'Nhac_dong_quy_K1', 'Hoat_dong_thanh_vien', 'Giao_dich_tai_chinh', 'Danh_sach_CLB']) assert.notEqual(docTypeFromFile(n), 'BK', n)
  assert.equal(docTypeFromFile('abc'), 'BK')
})

test('exportFileName: "10/2026" → "10-2026", không "_-_"', () => {
  assert.match(exportFileName('BaoCao_DieuHanh_B32 - Tháng 10/2026', 'xlsx'), /^BaoCao_DieuHanh_B32-Tháng_10-2026_\d{2}-\d{2}-\d{4}\.xlsx$/)
})

test('Excel điều hành: đủ sheet, tiêu đề = tên tài liệu, mã PF-EXEC, header "Đơn vị…", số thật', async () => {
  const sheets = buildExecutiveSheets(SAMPLE, AI)
  assert.deepEqual(sheets.map(s => s.name), ['Tổng quan', 'Tài chính', 'Thành viên', 'Dự báo & DNA', 'Hoạt động, Giải & AIDO', 'Sự kiện', 'Cảnh báo & Khuyến nghị', 'Tóm tắt AI'])
  const bytes = await buildExcelBytes(sheets, { docType: 'EXEC', docTitle: EXEC_DOC_TITLE })
  const wb = XLSX.read(bytes, { type: 'array' })
  assert.equal(wb.SheetNames.length, 8)
  for (const n of wb.SheetNames) {
    const ws = wb.Sheets[n]
    assert.match(ws.A2.v, /^Báo cáo điều hành — /, n)
    assert.match(ws.A4.v, /PF-EXEC-\d{6}-\d{4}/, n)
    assert.match(ws.A3.v, /Kỳ B32 - Tháng 10\/2026/, n)
  }
  const ov = wb.Sheets['Tổng quan']
  assert.equal(ov.A6.v, 'Nhóm'); assert.equal(ov.D6.v, 'Đơn vị / ghi chú')
  assert.ok(!/Kỳ/.test(ov.D6.v))
  assert.equal(ov.C7.t, 'n'); assert.equal(ov.C7.v, 83)
  const tc = wb.Sheets['Tài chính']
  assert.equal(tc.A12.v, 'Tổng'); assert.equal(tc.B12.v, 5 * 1000000 + 1500000)
  const tp = XLSX.utils.sheet_to_json(wb.Sheets['Thành viên'], { header: 1, range: 5 })
  assert.equal(tp.length, 9)
})

test('Tỷ lệ tham gia có định dạng %, mục thiếu dữ liệu bị bỏ (không bịa)', async () => {
  const bytes = await buildExcelBytes(buildExecutiveSheets(SAMPLE, AI), { docType: 'EXEC', docTitle: EXEC_DOC_TITLE })
  const ov = XLSX.read(bytes, { type: 'array', cellNF: true }).Sheets['Tổng quan']
  const row = XLSX.utils.sheet_to_json(ov, { header: 1, range: 5 }).findIndex((r: unknown[]) => r[1] === 'Tỷ lệ tham gia')
  assert.ok(row > 0)
  assert.equal(ov[`C${6 + row}`].z, '0"%"')
  const minimal = buildExecutiveSheets({ meta: { periodName: 'K' }, summary: {}, finance: {} }, null)
  assert.deepEqual(minimal.map(s => s.name), ['Tổng quan', 'Sự kiện', 'Cảnh báo & Khuyến nghị'])
})
