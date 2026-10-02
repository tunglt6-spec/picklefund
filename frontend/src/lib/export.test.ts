/* Chạy: node --test src/lib/export.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  escHtml, sanitizeSheetNames, safeFileName, methodLabel, exportReceiptPDF, exportBillingReceiptPDF,
  exportMiniExpenseReceiptPDF, exportMiniIncomeReceiptPDF,
  formatNumberVN, toExcelDateSerial, reportTypeOf, setExportBranding, buildExcelBytes, exportExcel,
  exportGenericExcel, exportLedgerExcel, exportContribExcel, exportReportsExcel, exportMembersExcel,
} from './export.ts'

const req = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSX: any = req('xlsx-js-style')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { unzipSync, strFromU8 } = req('fflate') as any

const PAYLOAD = '<img src=x onerror=alert(1)>'

/* ── Stub tải file (node không có DOM): gom blob + tên file mỗi lần xuất ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any
async function captureDownload(run: () => Promise<void>): Promise<{ name: string; bytes: Uint8Array }> {
  let blob: Blob | null = null
  let name = ''
  const prevDoc = g.document
  const prevCreate = URL.createObjectURL
  URL.createObjectURL = (b: Blob) => { blob = b; return 'blob:x' }
  g.document = { body: { appendChild() {} }, createElement: () => ({ click() { name = this.download }, remove() {} }) }
  try { await run() } finally { g.document = prevDoc; URL.createObjectURL = prevCreate }
  assert.ok(blob, 'phải có file tải về')
  return { name, bytes: new Uint8Array(await (blob as Blob).arrayBuffer()) }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readSheet = (bytes: Uint8Array, sheet = 0): { ws: any; rows: any[][]; wb: any } => {
  const wb = XLSX.read(bytes, { type: 'array', cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[sheet]]
  return { wb, ws, rows: XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) }
}

/* ── H4: escape HTML ── */
test('escHtml escape đủ & < > " \'', () => {
  assert.equal(escHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  assert.equal(escHtml(null), '')
})

/* ── Phiếu / biên nhận đã chuyển PDF VECTOR (không còn HTML + html2canvas): XSS không còn đường vào.
   Nội dung từng phiếu được kiểm trong pdf-report-core.test.ts; ở đây kiểm hợp đồng của lớp export. ── */
test('phiếu / biên nhận PDF: hàm công khai trả Promise và LỖI được throw ra caller (không nuốt, không html2canvas)', async () => {
  const prevDoc = g.document
  const prevFetch = g.fetch
  g.document = undefined
  g.fetch = async () => { throw new Error('offline') } // tải font thất bại → phải reject
  try {
    const base = { clubName: 'C', clubLocation: '' }
    for (const p of [
      exportReceiptPDF({ ...base, memberName: PAYLOAD, periodName: 'K', amountPaid: 1, attendedSessions: 1, totalSessions: 1, courtCost: 1, livingCost: 1, totalCost: 2, balance: -1, isConfirmed: false }),
      exportBillingReceiptPDF({ clubName: PAYLOAD, invoiceNumber: 'INV-1', orderCode: 'O', planLabel: 'Gói Pro', cycleLabel: '12 tháng', amount: 1, paidAt: '2026-03-15T10:00:00Z', gateway: 'VNPay' }),
      exportMiniExpenseReceiptPDF({ ...base, receiverName: PAYLOAD, expenseType: 'x', amount: 1, expenseDate: '1/1', description: '<b>x</b>' }),
      exportMiniIncomeReceiptPDF({ ...base, payerName: PAYLOAD, incomeType: 'x', amount: 1, paymentDate: '1/1' }),
    ]) {
      assert.ok(p instanceof Promise)
      await assert.rejects(p)
    }
  } finally { g.document = prevDoc; g.fetch = prevFetch }
})

/* ── helpers ── */
test('sanitizeSheetNames: ký tự cấm, >31, trùng (không phân biệt hoa/thường), rỗng', () => {
  const [a, b, c, d, e] = sanitizeSheetNames(['a:b/c\\d?e*f[g]h', 'x'.repeat(40), 'Sổ', 'SỔ', ''])
  assert.equal(a, 'a b c d e f g h')
  assert.equal(b.length, 31)
  assert.equal(c, 'Sổ')
  assert.equal(d, 'SỔ (2)')
  assert.equal(e, 'Sheet5')
  const dup = sanitizeSheetNames(['x'.repeat(31), 'x'.repeat(31)])
  assert.ok(dup[1].length <= 31 && dup[0] !== dup[1])
})
test('safeFileName / methodLabel / formatNumberVN / reportTypeOf', () => {
  assert.equal(safeFileName('Cong No/Tháng 7\\2026: ?*"<>|%'), 'Cong_No' + 'Tháng_72026')
  assert.equal(methodLabel('cash'), 'Tiền mặt')
  assert.equal(methodLabel('bank_transfer'), 'Chuyển khoản')
  assert.equal(methodLabel('momo'), 'momo')
  assert.equal(methodLabel(undefined), '')
  assert.equal(formatNumberVN(1234567890), '1.234.567.890')
  assert.equal(formatNumberVN(-5000), '-5.000')
  assert.equal(formatNumberVN(1.5), '1,5')
  assert.equal(reportTypeOf('Dong_quy_Nguyễn_Văn_A_Kỳ_7'), 'Dong_quy')
})
test('toExcelDateSerial: dd/MM/yyyy + ISO; ngày sai → null', () => {
  assert.equal(toExcelDateSerial('01/01/1900'), 2)
  assert.equal(toExcelDateSerial('15/03/2026'), toExcelDateSerial('2026-03-15'))
  assert.equal(toExcelDateSerial('31/02/2026'), null)
  assert.equal(toExcelDateSerial('0910000001'), null)
  assert.equal(toExcelDateSerial('Kỳ 03/2026'), null)
})

/* ── Excel ── */
test('buildExcelBytes: số/ngày/công thức theo TỪNG ô, freeze 6 hàng (khối tiêu đề + header), footer ngoài auto-filter', async () => {
  const bytes = await buildExcelBytes([{
    name: 'T',
    headers: ['A', 'B', 'C'],
    rows: [[1234567, 'x', '15/03/2026'], ['abc', 2, '=SUM(1+1)'], [null as unknown as string, 1.5, '']],
    footerRows: [['Tổng', 99, '']],
  }])
  const { ws, rows } = readSheet(bytes)
  // Bố cục: hàng 1-4 khối tiêu đề · 5 đệm · 6 header · thân từ hàng 7
  assert.equal(ws['A7'].z, '#,##0;-#,##0;"–"') // cột A hỗn hợp: ô số vẫn có format nghìn
  assert.equal(ws['A8'].t, 's')
  assert.equal(ws['B8'].z, '#,##0;-#,##0;"–"')
  assert.equal(ws['B9'].z, '#,##0.##;-#,##0.##;"–"')
  assert.equal(ws['C7'].t, 'n') // ngày → serial
  assert.equal(ws['C7'].z, 'dd/mm/yyyy')
  assert.equal(ws['C8'].t, 's') // chuỗi bắt đầu "=" KHÔNG thành công thức
  assert.equal(ws['C8'].f, undefined)
  assert.equal(rows[rows.length - 1][0], 'Tổng')
  assert.equal(ws['!autofilter'], undefined) // bảng nhỏ (< 8 hàng) không cần auto-filter
  const files = unzipSync(bytes)
  const xml = strFromU8(files['xl/worksheets/sheet1.xml'])
  assert.match(xml, /<pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"\/>/)
})

test('exportExcel: tên sheet cấm/trùng không còn làm throw; trả Promise; tên file zero-pad dd-MM-yyyy, không có "/"', async () => {
  const { name, bytes } = await captureDownload(() => exportExcel('Cong No/Tháng 7', [
    { name: 'a:b', headers: ['A'], rows: [['x']] },
    { name: 'a:b', headers: ['A'], rows: [['y']] },
  ]))
  assert.match(name, /^Cong_NoTháng_7_\d{2}-\d{2}-\d{4}\.xlsx$/)
  assert.deepEqual(XLSX.read(bytes, { type: 'array' }).SheetNames, ['a b', 'a b (2)'])
})

test('Excel wrapper trả Promise và lỗi được throw ra caller (không nuốt)', async () => {
  const prevDoc = g.document
  g.document = undefined // node: không có DOM → bước tải file phải ném lỗi
  try {
    for (const p of [
      exportGenericExcel('F', 'S', ['A'], [['x']]),
      exportLedgerExcel('K', []),
      exportContribExcel('K', []),
      exportMembersExcel('C', []),
      exportReportsExcel({ periodName: 'K', clubName: 'C', totalIncome: 0, totalExpense: 0, balance: 0, memberCount: 0, sessionCount: 0, confirmedCount: 0 }, []),
    ]) {
      assert.ok(p instanceof Promise)
      await assert.rejects(p)
    }
  } finally { g.document = prevDoc }
})

test('exportLedgerExcel: dòng đầu "Số dư chuyển kỳ" + tổng; không truyền opening thì không có dòng đó', async () => {
  const rows = [
    { date: '01/07/2026', type: 'Thu', desc: 'A', amount: 100000, balance: 600000 },
    { date: '02/07/2026', type: 'Chi', desc: 'B', amount: -30000, balance: 570000 },
  ]
  const withOpen = readSheet((await captureDownload(() => exportLedgerExcel('K', rows, 500000, 570000))).bytes).rows
  assert.deepEqual(withOpen[6].slice(2, 3), ['Số dư chuyển kỳ'])
  assert.equal(withOpen[6][4], 500000)
  assert.equal(withOpen[7][4], 600000) // số dư dòng do caller tính — lib không cộng thêm
  const labels = withOpen.map(r => r[2])
  assert.ok(labels.includes('Tổng thu') && labels.includes('Tổng chi') && labels.includes('Số dư cuối kỳ'))
  assert.equal(withOpen.find(r => r[2] === 'Tổng chi')?.[3], 30000)
  const noOpen = readSheet((await captureDownload(() => exportLedgerExcel('K', rows))).bytes).rows
  assert.ok(!noOpen.some(r => r[2] === 'Số dư chuyển kỳ'))
})

test('exportContribExcel: cột Quỹ/Kỳ/Xác nhận, tổng chỉ tính đã xác nhận, confirmed thiếu = true', async () => {
  const { rows } = readSheet((await captureDownload(() => exportContribExcel('K', [
    { member: 'An', date: '01/07/2026', amount: 100, method: 'cash', confirmed: true, fund: 'COMMON', periodName: 'Kỳ 7' },
    { member: 'Bình', date: '02/07/2026', amount: 50, method: 'bank_transfer', confirmed: false, fund: 'COMMON', periodName: 'Kỳ 7' },
    { member: '', date: '03/07/2026', amount: 20, method: 'momo', fund: 'MINI', periodName: 'Quỹ Phụ' },
    { member: 'Cường', date: '04/07/2026', amount: 7, method: 'cash' },
  ]))).bytes)
  assert.deepEqual(rows[5], ['Thành viên / Nội dung', 'Quỹ', 'Kỳ quỹ', 'Ngày đóng', 'Số tiền (VNĐ)', 'Hình thức', 'Xác nhận'])
  assert.equal(rows[7][1], 'Quỹ Chính')
  assert.equal(rows[7][6], 'Chờ xác nhận')
  assert.equal(rows[8][0], 'Quỹ Phụ') // tên rỗng ở Quỹ Phụ → fallback
  assert.equal(rows[8][5], 'momo') // hình thức tự do giữ nguyên
  assert.equal(rows[9][6], 'Đã xác nhận') // thiếu confirmed → đã xác nhận
  const tot = (label: string) => rows.find(r => String(r[2]).startsWith(label))?.[4]
  assert.equal(tot('Tổng Quỹ Chính'), 107)
  assert.equal(tot('Tổng Quỹ Phụ'), 20)
  assert.equal(tot('Chờ xác nhận'), 50)
})

test('exportReportsExcel: thêm cột chi tiết + dòng tổng; Quỹ Chính/Tổng tài sản nhất quán khi thiếu clubAssets', async () => {
  const summary = { periodName: 'K', clubName: 'C', totalIncome: 100, totalExpense: 40, balance: 60, carryForward: 10, miniBalance: 5, memberCount: 2, sessionCount: 1, confirmedCount: 1 }
  const res = readSheet((await captureDownload(() => exportReportsExcel(summary, [
    { name: 'A', attended: 2, paid: 'Đã đóng', cost: 30, balance: 5, amountPaid: 35, courtCost: 20, livingCost: 10 },
    { name: 'B', attended: 1, paid: 'Chưa', cost: 10, balance: -10, amountPaid: 0, courtCost: 6, livingCost: 4 },
  ]))).bytes, 0)
  const get = (label: string) => res.rows.find(r => r[0] === label)?.[1]
  assert.equal(get('Số dư Quỹ Chính (Thu − Chi + chuyển kỳ)'), 70)
  assert.equal(get('Tổng tài sản (2 quỹ)'), 75) // = Quỹ Chính (gồm chuyển kỳ) + Quỹ Phụ
  const members = readSheet((await captureDownload(() => exportReportsExcel(summary, [
    { name: 'A', attended: 2, paid: 'Đã đóng', cost: 30, balance: 5, amountPaid: 35, courtCost: 20, livingCost: 10 },
    { name: 'B', attended: 1, paid: 'Chưa', cost: 10, balance: -10, amountPaid: 0, courtCost: 6, livingCost: 4 },
  ]))).bytes, 1).rows
  assert.deepEqual(members[5], ['Thành viên', 'Buổi tham gia', 'Đã đóng', 'Đã nộp (VNĐ)', 'Chi phí sân (VNĐ)', 'Sinh hoạt (VNĐ)', 'Chi phí (VNĐ)', 'Số dư (VNĐ)'])
  assert.deepEqual(members[members.length - 1], ['TỔNG', 3, '', 35, 26, 14, 40, -5])
})

/* ── M1: setExportBranding MERGE ── */
test('setExportBranding merge: field không truyền giữ nguyên', async () => {
  setExportBranding({ displayName: 'CLB Một', primaryColor: '#112233', pdfFooter: 'Foot' })
  setExportBranding({ displayName: 'CLB Hai' }) // chỉ đổi tên
  const { ws } = readSheet((await captureDownload(() => exportGenericExcel('F', 'S', ['A'], [['x']]))).bytes)
  assert.equal(ws['A1'].v, 'CLB HAI') // hàng 1 = tên CLB, hàng 2 = tên tài liệu
  assert.equal(ws['A2'].v, 'S')
  const tab = async (run: () => Promise<void>) =>
    /<tabColor rgb="FF([0-9A-F]{6})"/.exec(strFromU8(unzipSync((await captureDownload(run)).bytes)['xl/worksheets/sheet1.xml']))?.[1]
  assert.equal(await tab(() => exportGenericExcel('F', 'S', ['A'], [['x']])), '112233') // màu giữ nguyên
  setExportBranding({ displayName: null, primaryColor: null }) // null → mặc định
  const b = readSheet((await captureDownload(() => exportGenericExcel('F', 'S', ['A'], [['x']]))).bytes).ws
  assert.equal(b['A1'].v, 'PICKLEFUND')
  assert.equal(await tab(() => exportGenericExcel('F', 'S', ['A'], [['x']])), '6D5DFB')
})
