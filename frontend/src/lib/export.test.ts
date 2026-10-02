/* Chạy: node --test src/lib/export.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  escHtml, buildReceiptHtml, buildMiniExpenseReceiptHtml, sanitizeSheetNames, safeFileName, methodLabel,
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

test('buildReceiptHtml: payload HTML ở MỌI trường chữ bị vô hiệu', () => {
  const html = buildReceiptHtml({
    receiptNo: 5, memberName: PAYLOAD, loginName: PAYLOAD, periodName: PAYLOAD, periodStartDate: PAYLOAD, periodEndDate: PAYLOAD,
    clubName: PAYLOAD, clubLocation: PAYLOAD, paymentDate: PAYLOAD, amountPaid: 1, attendedSessions: 1, totalSessions: 1,
    courtCost: 1, livingCost: 1, totalCost: 2, balance: -1, isConfirmed: false,
  })
  assert.ok(!html.includes('<img'), 'không được còn thẻ <img> thật')
  assert.ok(!/onerror=alert\(1\)>/.test(html.replace(/&lt;img src=x onerror=alert\(1\)&gt;/g, '')))
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
})

test('buildMiniExpenseReceiptHtml: escape description/receiverName/expenseType/notes/clubName/clubLocation', () => {
  const html = buildMiniExpenseReceiptHtml({
    receiverName: PAYLOAD, expenseType: '<script>1</script>', amount: 1, expenseDate: PAYLOAD, description: '<b>x</b>',
    notes: PAYLOAD, clubName: PAYLOAD, clubLocation: '"><svg onload=1>',
  })
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<script>1'))
  assert.ok(!html.includes('<b>x</b>'))
  assert.ok(!html.includes('<svg'))
})

/* ── H6: nhãn/giá trị phiếu thu ── */
test('phiếu thu: nhãn sinh hoạt đúng công thức, bỏ TB/buổi, bỏ "Hà Nội"/"No."/"/ 8 người" cứng', () => {
  const html = buildReceiptHtml({
    memberName: 'A', periodName: 'K', clubName: 'CLB X', clubLocation: '', amountPaid: 0, attendedSessions: 3, totalSessions: 12,
    courtCost: 100000, livingCost: 50000, totalCost: 150000, balance: -150000, isConfirmed: false,
  })
  assert.ok(html.includes('Sinh hoạt (chia đều + theo buổi tham dự)'))
  assert.ok(!html.includes('Trung bình / buổi'))
  assert.ok(!html.includes('Hà Nội'))
  assert.ok(!html.includes('No. '))
  assert.ok(!/\/ 8 người/.test(html))
  assert.ok(!html.includes('Tổng tiền sân toàn quỹ'), 'thiếu dữ liệu → ẩn, không suy ngược sai')
  const withN = buildReceiptHtml({
    receiptNo: 7, memberName: 'A', periodName: 'K', clubName: 'CLB X', clubLocation: 'Đà Nẵng', amountPaid: 0, attendedSessions: 0, totalSessions: 0,
    memberCountForSplit: 5, totalCourtFee: 500000, courtCost: 100000, livingCost: 0, totalCost: 100000, balance: 0, isConfirmed: true,
  })
  assert.ok(withN.includes('/ 5 người') && withN.includes('No. 0007') && withN.includes('Đà Nẵng,') && withN.includes('500.000 đ'))
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
test('buildExcelBytes: số/ngày/công thức theo TỪNG ô, freeze 3 hàng, footer ngoài auto-filter', async () => {
  const bytes = await buildExcelBytes([{
    name: 'T',
    headers: ['A', 'B', 'C'],
    rows: [[1234567, 'x', '15/03/2026'], ['abc', 2, '=SUM(1+1)'], [null as unknown as string, 1.5, '']],
    footerRows: [['Tổng', 99, '']],
  }])
  const { ws, rows } = readSheet(bytes)
  assert.equal(ws['A4'].z, '#,##0') // cột A hỗn hợp: ô số vẫn có format nghìn
  assert.equal(ws['A5'].t, 's')
  assert.equal(ws['B5'].z, '#,##0')
  assert.equal(ws['B6'].z, '#,##0.##')
  assert.equal(ws['C4'].t, 'n') // ngày → serial
  assert.equal(ws['C4'].z, 'dd/mm/yyyy')
  assert.equal(ws['C5'].t, 's') // chuỗi bắt đầu "=" KHÔNG thành công thức
  assert.equal(ws['C5'].f, undefined)
  assert.equal(rows[rows.length - 1][0], 'Tổng')
  assert.equal(ws['!autofilter'].ref, 'A3:C6') // không gồm dòng tổng (hàng 7)
  const files = unzipSync(bytes)
  const xml = strFromU8(files['xl/worksheets/sheet1.xml'])
  assert.match(xml, /<pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"\/>/)
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
  assert.deepEqual(withOpen[3].slice(2, 3), ['Số dư chuyển kỳ'])
  assert.equal(withOpen[3][4], 500000)
  assert.equal(withOpen[4][4], 600000) // số dư dòng do caller tính — lib không cộng thêm
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
  assert.deepEqual(rows[2], ['Thành viên / Nội dung', 'Quỹ', 'Kỳ quỹ', 'Ngày đóng', 'Số tiền (VNĐ)', 'Hình thức', 'Xác nhận'])
  assert.equal(rows[4][1], 'Quỹ Chính')
  assert.equal(rows[4][6], 'Chờ xác nhận')
  assert.equal(rows[5][0], 'Quỹ Phụ') // tên rỗng ở Quỹ Phụ → fallback
  assert.equal(rows[5][5], 'momo') // hình thức tự do giữ nguyên
  assert.equal(rows[6][6], 'Đã xác nhận') // thiếu confirmed → đã xác nhận
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
  assert.deepEqual(members[2], ['Thành viên', 'Buổi tham gia', 'Đã đóng', 'Đã nộp (VNĐ)', 'Chi phí sân (VNĐ)', 'Sinh hoạt (VNĐ)', 'Chi phí (VNĐ)', 'Số dư (VNĐ)'])
  assert.deepEqual(members[members.length - 1], ['TỔNG', 3, '', 35, 26, 14, 40, -5])
})

/* ── M1: setExportBranding MERGE ── */
test('setExportBranding merge: field không truyền giữ nguyên', async () => {
  setExportBranding({ displayName: 'CLB Một', primaryColor: '#112233', pdfFooter: 'Foot' })
  setExportBranding({ displayName: 'CLB Hai' }) // chỉ đổi tên
  const { ws } = readSheet((await captureDownload(() => exportGenericExcel('F', 'S', ['A'], [['x']]))).bytes)
  assert.equal(ws['A1'].v, 'CLB Hai · S')
  assert.equal(ws['A1'].s.fgColor.rgb, '112233') // màu giữ nguyên
  setExportBranding({ displayName: null, primaryColor: null }) // null → mặc định
  const b = readSheet((await captureDownload(() => exportGenericExcel('F', 'S', ['A'], [['x']]))).bytes).ws
  assert.equal(b['A1'].v, 'PickleFund · S')
  assert.equal(b['A1'].s.fgColor.rgb, '6D5DFB')
})
