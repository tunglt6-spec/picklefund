/* Chạy: node --test src/lib/excel-kit.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  makeBrand, contrastRatio, makeDocCode, docTypeFromFile, statusTone, columnWidth, estimateLines, displayNumber,
  patchWorkbookXml, sheetXmlPatch, XL_COLOR,
} from './excel-kit.ts'
import {
  buildExcelBytes, exportExcel, exportLedgerExcel, exportReportsExcel, exportTemplateExcel, setExportBranding,
} from './export.ts'

const req = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSX: any = req('xlsx-js-style')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { unzipSync, strFromU8 } = req('fflate') as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

async function capture(run: () => Promise<void>): Promise<{ name: string; bytes: Uint8Array }> {
  let blob: Blob | null = null
  let name = ''
  const prevDoc = g.document
  const prevCreate = URL.createObjectURL
  URL.createObjectURL = (b: Blob) => { blob = b; return 'blob:x' }
  g.document = { body: { appendChild() {} }, createElement: () => ({ click() { name = this.download }, remove() {} }) }
  try { await run() } finally { g.document = prevDoc; URL.createObjectURL = prevCreate }
  assert.ok(blob)
  return { name, bytes: new Uint8Array(await (blob as Blob).arrayBuffer()) }
}
const readWb = (b: Uint8Array) => XLSX.read(b, { type: 'array', cellStyles: true })
const unzipText = (bytes: Uint8Array) => {
  const files = unzipSync(bytes)
  return (n: string) => strFromU8(files[n])
}
const NUMFMT_INT = '#,##0;-#,##0;"–"'

const fixture = () => buildExcelBytes([{
  name: 'Sổ thử',
  subtitle: 'Kỳ 07/2026',
  headers: ['Ngày', 'Nội dung', 'Số tiền (VNĐ)', 'Trạng thái'],
  rows: [
    ['01/07/2026', 'Thu quỹ', 300000, 'Đã xác nhận'],
    ['02/07/2026', 'Tiền sân — mô tả rất dài '.repeat(6), -450000, 'Chờ xác nhận'],
    ['03/07/2026', 'Không phát sinh', 0, 'Từ chối'],
    ['04/07/2026', 'Thu quỹ', 1234567, 'Đã xác nhận'],
    ['05/07/2026', 'Thu quỹ', 100, 'Đã xác nhận'],
    ['06/07/2026', 'Thu quỹ', 100, 'Đã xác nhận'],
    ['07/07/2026', 'Thu quỹ', 100, 'Đã xác nhận'],
    ['08/07/2026', 'Thu quỹ', 100, 'Đã xác nhận'],
  ],
  footerRows: [['', 'TỔNG', 300000 - 450000 + 0 + 1234567 + 400, '']],
}], { docType: 'SQ' })

test('print setup: A4, fitToWidth=1/fitToHeight=0, landscape theo độ rộng, margins, footer in "Trang &P / &N"', async () => {
  const x = unzipText(await fixture())
  const xml = x('xl/worksheets/sheet1.xml')
  assert.match(xml, /<pageSetup paperSize="9" orientation="(portrait|landscape)" fitToWidth="1" fitToHeight="0"\/>/)
  assert.match(xml, /<pageSetUpPr fitToPage="1"\/>/)
  assert.match(xml, /<pageMargins left="0\.4" right="0\.4" top="0\.5" bottom="0\.65" header="0\.3" footer="0\.3"\/>/)
  assert.match(xml, /<printOptions horizontalCentered="1"\/>/)
  assert.match(xml, /<oddFooter>&amp;L&amp;8[^<]*Sổ thử&amp;C&amp;8PF-SQ-\d{6}-\d{4}&amp;R&amp;8Trang &amp;P \/ &amp;N<\/oddFooter>/)
  // Thứ tự phần tử hợp lệ: ... autoFilter, mergeCells, printOptions, pageMargins, pageSetup, headerFooter, (ignoredErrors)
  const order = ['<autoFilter', '<mergeCells', '<printOptions', '<pageMargins', '<pageSetup', '<headerFooter'].map(t => xml.indexOf(t))
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), `thứ tự sai: ${order}`)
  if (xml.includes('<ignoredErrors')) assert.ok(xml.indexOf('<ignoredErrors') > xml.indexOf('<headerFooter'))
  // Lặp header mỗi trang in
  assert.match(x('xl/workbook.xml'), /<definedName name="_xlnm\.Print_Titles" localSheetId="0">'Sổ thử'!\$6:\$6<\/definedName>/)
})

test('gridlines ẩn, tabColor = brand, freeze đến hết header, autofilter chỉ ở header (>= 8 hàng, >= 3 cột)', async () => {
  setExportBranding({ primaryColor: '#0F766E' })
  try {
    const x = unzipText(await fixture())
    const xml = x('xl/worksheets/sheet1.xml')
    assert.match(xml, /<sheetView showGridLines="0"[^>]*>/)
    assert.match(xml, /<tabColor rgb="FF0F766E"\/>/)
    assert.match(xml, /<pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"\/>/)
    assert.match(xml, /<autoFilter ref="A6:D14"\/>/) // header hàng 6 + 8 hàng thân; KHÔNG gồm hàng tổng
  } finally { setExportBranding({ primaryColor: null }) }
})

test('docProps: title = tên tài liệu, creator/company = tên CLB, subject = mã tài liệu, có ngày tạo', async () => {
  setExportBranding({ displayName: 'CLB Thử Nghiệm' })
  try {
    const x = unzipText(await fixture())
    const core = x('docProps/core.xml')
    assert.match(core, /<dc:title>Sổ thử<\/dc:title>/)
    assert.match(core, /<dc:creator>CLB Thử Nghiệm<\/dc:creator>/)
    assert.match(core, /<dc:subject>PF-SQ-\d{6}-\d{4}<\/dc:subject>/)
    assert.match(core, /<dcterms:created[^>]*>\d{4}-\d{2}-\d{2}T/)
    assert.match(x('docProps/app.xml'), /<Company>CLB Thử Nghiệm<\/Company>/)
  } finally { setExportBranding({ displayName: null }) }
})

test('khối tiêu đề 4 hàng: CLB · tên tài liệu · phạm vi · ngày xuất + mã TL (cùng mã với docProps)', async () => {
  const bytes = await fixture()
  const wb = readWb(bytes)
  const ws = wb.Sheets[wb.SheetNames[0]]
  assert.equal(ws.A1.v, 'PICKLEFUND')
  assert.equal(ws.A2.v, 'Sổ thử')
  assert.equal(ws.A3.v, 'Kỳ 07/2026')
  assert.match(ws.A4.v, /^Xuất lúc \d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4} · Mã TL: PF-SQ-\d{6}-\d{4}$/)
  const code = /PF-SQ-\d{6}-\d{4}/.exec(ws.A4.v)?.[0]
  assert.match(unzipText(bytes)('docProps/core.xml'), new RegExp(`<dc:subject>${code}</dc:subject>`))
  assert.equal(ws.A6.v, 'Ngày') // hàng 5 = đệm, hàng 6 = header
})

test('số: format 3 vế (âm / 0 → "–"), số âm đỏ AA #B91C1C, 0 muted, ngày dd/mm/yyyy serial, số thật không phải chuỗi', async () => {
  const bytes = await fixture()
  const ws = readWb(bytes).Sheets.S0 ?? (() => { const wb = readWb(bytes); return wb.Sheets[wb.SheetNames[0]] })()
  assert.equal(ws.C7.t, 'n'); assert.equal(ws.C7.v, 300000)
  assert.equal(ws.C8.v, -450000)
  assert.equal(ws.C9.v, 0)
  assert.equal(ws.C7.z, NUMFMT_INT)
  assert.equal(ws.A7.t, 'n'); assert.equal(ws.A7.z, 'dd/mm/yyyy')
  const styles = unzipText(bytes)('xl/styles.xml')
  assert.ok(styles.includes('&quot;–&quot;') || styles.includes('"–"'), 'numFmt có ký tự "–" cho 0')
  assert.match(styles, new RegExp(`<color rgb="${XL_COLOR.neg}"`)) // font số âm
  assert.match(styles, new RegExp(`<color rgb="${XL_COLOR.pos}"`)) // trạng thái dương
  assert.match(styles, new RegExp(`<color rgb="${XL_COLOR.warn}"`))
  assert.ok(!styles.includes('[Red]'), 'không dùng [Red] (đỏ FF0000 không đạt AA)')
})

test('hàng tổng: SUBTOTAL(9,…) có giá trị cache đúng = tổng fixture; tổng "lọc" (≠ tổng cột) giữ giá trị tĩnh', async () => {
  const bytes = await fixture()
  const wb = readWb(bytes)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const sum = 300000 - 450000 + 0 + 1234567 + 400
  assert.equal(ws.C15.f, 'SUBTOTAL(9,C7:C14)')
  assert.equal(ws.C15.v, sum)
  const xml = unzipText(bytes)('xl/worksheets/sheet1.xml')
  assert.match(xml, new RegExp(`<c r="C15"[^>]*><f>SUBTOTAL\\(9,C7:C14\\)</f><v>${sum}</v></c>`))
  // Tổng không phải tổng thuần của cột → KHÔNG tạo công thức sai ngữ nghĩa khi lọc
  const wb2 = readWb(await buildExcelBytes([{ name: 'T', headers: ['A', 'B'], rows: [['x', 10], ['y', 20]], footerRows: [['TỔNG ĐÃ XÁC NHẬN', 10]] }]))
  const t = wb2.Sheets[wb2.SheetNames[0]]
  assert.equal(t.B9.f, undefined)
  assert.equal(t.B9.v, 10)
  // Nhiều hàng tổng (Sổ quỹ: Tổng thu/Tổng chi) → tĩnh
  const wb3 = readWb(await buildExcelBytes([{ name: 'T', headers: ['A', 'B'], rows: [['x', 10]], footerRows: [['Tổng thu', 10], ['Tổng chi', 0]] }]))
  assert.equal(wb3.Sheets[wb3.SheetNames[0]].B8.f, undefined)
})

test('độ rộng cột: đo trên chuỗi đã định dạng, clamp [10, 48]; chữ dài → wrap (không cố định hpt)', async () => {
  const bytes = await fixture()
  const ws = readWb(bytes).Sheets
  const wsA = ws[Object.keys(ws)[0]]
  const cols = wsA['!cols'].map((c: { wch: number }) => c.wch)
  assert.ok(cols.every((w: number) => w >= 10 && w <= 48), `cols=${cols}`)
  assert.equal(cols[1], 48) // cột nội dung rất dài bị chặn ở 48
  assert.ok(cols[2] >= displayNumber(1234567).length * 1.1) // "1,234,567" không bị ####
  assert.equal(columnWidth(3, 0), 10)
  assert.equal(columnWidth(200, 200), 48)
  assert.ok(estimateLines('a'.repeat(100), 30) >= 4)
  const xml = unzipText(bytes)('xl/worksheets/sheet1.xml')
  assert.match(xml, /<row r="8"(?![^>]*customHeight)[^>]*>/) // hàng nội dung dài: Excel tự cao
  assert.match(xml, /<row r="7"[^>]*ht="20"[^>]*customHeight="1"/) // hàng 1 dòng: cao 20pt
})

test('trạng thái: tông semantic theo nguyên chuỗi (không phân biệt dấu), chữ lạ → null', () => {
  assert.equal(statusTone('Đã đóng'), 'pos')
  assert.equal(statusTone('da xac nhan'), 'pos')
  assert.equal(statusTone('Chưa đóng'), 'neg')
  assert.equal(statusTone('Từ chối'), 'neg')
  assert.equal(statusTone('Chờ duyệt'), 'warn')
  assert.equal(statusTone('Tạm nghỉ'), 'warn')
  assert.equal(statusTone('Nguyễn Văn A'), null)
  assert.equal(statusTone(''), null)
})

test('makeBrand: brand sáng (vàng) vẫn cho chữ header đạt tương phản >= 4.5 trên nền soft; mặc định = cặp chuẩn', () => {
  assert.deepEqual(makeBrand('#6D5DFB'), { brand: '6D5DFB', ink: '4F46E5', soft: 'EEF2FF' })
  assert.deepEqual(makeBrand('xyz'), { brand: '6D5DFB', ink: '4F46E5', soft: 'EEF2FF' })
  for (const hex of ['#F59E0B', '#0F766E', '#FACC15', '#112233', '#FFFFFF']) {
    const b = makeBrand(hex)
    assert.ok(contrastRatio(b.ink, b.soft) >= 4.5, `${hex}: ${contrastRatio(b.ink, b.soft)}`)
  }
  assert.ok(contrastRatio(XL_COLOR.neg, 'FFFFFF') >= 4.5 && contrastRatio(XL_COLOR.pos, 'FFFFFF') >= 4.5 && contrastRatio(XL_COLOR.warn, 'FFFFFF') >= 4.5)
})

test('mã tài liệu: PF-{LOẠI}-yyMMdd-HHmm; loại suy từ tên file', () => {
  assert.equal(makeDocCode('SQ', { dd: '02', mm: '10', yyyy: '2026', hh: '10', mi: '15' }), 'PF-SQ-261002-1015')
  assert.equal(docTypeFromFile('So_Quy_Kỳ_03'), 'SQ')
  assert.equal(docTypeFromFile('Thu_Quy_K'), 'TQ')
  assert.equal(docTypeFromFile('Danh_Sach_Thanh_Vien_CLB'), 'DSTV')
  assert.equal(docTypeFromFile('Bao_Cao_K'), 'BCQ')
  assert.equal(docTypeFromFile('Cong_No_K'), 'CN')
  assert.equal(docTypeFromFile('abc'), 'BK')
})

test('exportExcel suy loại mã từ tên file; Ledger/Reports đều có phạm vi + hàng tổng', async () => {
  const { bytes } = await capture(() => exportLedgerExcel('Kỳ 7', [{ date: '01/07/2026', type: 'Thu', desc: 'A', amount: 100, balance: 100 }], 0, 100))
  const wb = readWb(bytes)
  const ws = wb.Sheets[wb.SheetNames[0]]
  assert.match(ws.A4.v, /PF-SQ-/)
  assert.match(ws.A3.v, /Kỳ quỹ: Kỳ 7/)
  const { bytes: rb } = await capture(() => exportReportsExcel({ periodName: 'K', clubName: 'C', totalIncome: 1, totalExpense: 1, balance: 0, memberCount: 1, sessionCount: 1, confirmedCount: 1 }, [
    { name: 'A', attended: 2, paid: 'Đã đóng', cost: 30, balance: 5 }, { name: 'B', attended: 1, paid: 'Chưa đóng', cost: 10, balance: -10 },
  ]))
  const rwb = readWb(rb)
  const m = rwb.Sheets[rwb.SheetNames[1]]
  assert.equal(m.A10, undefined)
  assert.equal(m.A9.v, 'TỔNG')
  assert.equal(m.D9.v, 40) // tổng Chi phí = 30 + 10
  assert.equal(m.D9.f, 'SUBTOTAL(9,D7:D8)')
  assert.equal(m.E9.v, -5) // tổng Số dư = 5 + (-10)
})

test('bảng rỗng: 1 hàng gộp "Chưa có dữ liệu"; bảng 1 cột không throw và không gộp ô 1 ô', async () => {
  const bytes = await buildExcelBytes([
    { name: 'Rỗng', headers: ['A', 'B', 'C'], rows: [] },
    { name: 'Một cột', headers: ['Ghi chú'], rows: [['x']] },
  ])
  const wb = readWb(bytes)
  assert.equal(wb.Sheets['Rỗng'].A7.v, 'Chưa có dữ liệu để hiển thị')
  const xml2 = unzipText(bytes)('xl/worksheets/sheet2.xml')
  assert.ok(!/<mergeCell ref="A\d+:A\d+"/.test(xml2), 'không gộp ô trong 1 cột')
  assert.match(unzipText(bytes)('xl/workbook.xml'), /localSheetId="1">'Một cột'!\$6:\$6/)
})

test('patchWorkbookXml: dữ liệu hỏng → trả file gốc, không throw; tên sheet có dấu nháy/& được escape', async () => {
  const garbage = new Uint8Array([1, 2, 3, 4, 5])
  const out = await patchWorkbookXml(garbage, [{ freezeRows: 6, freezeCols: 0, landscape: false, footerLeft: 'x', docCode: 'y', headerRow: 6, tabRgb: '000000' }])
  assert.equal(out, garbage)
  const xml = sheetXmlPatch('<worksheet xmlns="x"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData/><pageMargins left="1"/></worksheet>',
    { freezeRows: 6, freezeCols: 1, landscape: true, footerLeft: 'A & B <C>', docCode: '2026', headerRow: 6, tabRgb: 'AABBCC' })
  assert.match(xml, /<pane xSplit="1" ySplit="6" topLeftCell="B7" activePane="bottomRight" state="frozen"\/>/)
  assert.match(xml, /&amp;L&amp;8A &amp;&amp; B &lt;C&gt;&amp;C&amp;8 2026/) // & → &&, chữ số đầu có dấu cách sau mã cỡ chữ
  assert.match(xml, /orientation="landscape"/)
  assert.equal((xml.match(/<pageMargins/g) ?? []).length, 1) // thay chứ không nhân đôi
  const { bytes } = await capture(() => exportExcel('Tên', [{ name: "O'Brien & Co", headers: ['A'], rows: [['x']] }]))
  assert.match(unzipText(bytes)('xl/workbook.xml'), /'O''Brien &amp; Co'!\$6:\$6/)
})

test('freeze thêm cột A khi bảng > 6 cột; > 7 cột → in ngang', async () => {
  const h = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const bytes = await buildExcelBytes([{ name: 'Rộng', headers: h, rows: [h.map((_, i) => i)] }])
  const xml = unzipText(bytes)('xl/worksheets/sheet1.xml')
  assert.match(xml, /<pane xSplit="1" ySplit="6" topLeftCell="B7" activePane="bottomRight" state="frozen"\/>/)
  assert.match(xml, /orientation="landscape"/)
})

test('file mẫu nhập liệu: header ở hàng 1 (importer đọc theo tên cột), sheet hướng dẫn, gridlines ẩn, freeze hàng 1, đúng tên file', async () => {
  const { name, bytes } = await capture(() => exportTemplateExcel('mau_x.xlsx', [
    { name: 'Hướng dẫn', lines: ['TIÊU ĐỀ', '', 'Dòng 1'] },
    { name: 'Dữ liệu', headers: ['Họ và tên', 'Số điện thoại', 'Số tiền (VNĐ)'], rows: [['Nguyễn Văn A', '0901234567', 150000]], widths: [25, 15, 15] },
  ]))
  assert.equal(name, 'mau_x.xlsx')
  const wb = readWb(bytes)
  assert.deepEqual(wb.SheetNames, ['Hướng dẫn', 'Dữ liệu'])
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Dữ liệu'], { defval: '' })
  assert.deepEqual(rows, [{ 'Họ và tên': 'Nguyễn Văn A', 'Số điện thoại': '0901234567', 'Số tiền (VNĐ)': 150000 }])
  const x = unzipText(bytes)
  assert.match(x('xl/worksheets/sheet2.xml'), /<sheetView showGridLines="0"[^>]*><pane ySplit="1" topLeftCell="A2"/)
  assert.match(x('xl/worksheets/sheet1.xml'), /showGridLines="0"/)
  assert.ok(!/<pane/.test(x('xl/worksheets/sheet1.xml')), 'sheet hướng dẫn không freeze')
})
