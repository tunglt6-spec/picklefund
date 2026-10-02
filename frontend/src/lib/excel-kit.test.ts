/* Chạy: node --test src/lib/excel-kit.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  makeBrand, contrastRatio, makeDocCode, docTypeFromFile, statusTone, columnWidth, estimateLines, displayNumber,
  patchWorkbookXml, sheetXmlPatch, stylesXmlPatch, colsWashPatch, glassPatchFor, XL_COLOR, XL_VIVID, XL_TEXT, moneyTone, inferSheetTone, tabColorFor,
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

test('gridlines ẩn, tabColor = brand app (màu CLB bị bỏ qua), freeze đến hết header, autofilter chỉ ở header (>= 8 hàng, >= 3 cột)', async () => {
  setExportBranding({ primaryColor: '#0F766E' })
  try {
    const x = unzipText(await fixture())
    const xml = x('xl/worksheets/sheet1.xml')
    assert.match(xml, /<sheetView showGridLines="0"[^>]*>/)
    assert.match(xml, /<tabColor rgb="FF6D5DFB"\/>/) // primaryColor CLB (#0F766E) KHÔNG tô Excel: EXPORT_USE_CLUB_COLOR=false
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
  assert.match(styles, new RegExp(`<color rgb="(?:FF)?${XL_TEXT.neg}"`)) // số âm: đỏ đậm (AA)
  assert.match(styles, new RegExp(`<color rgb="(?:FF)?${XL_TEXT.pos}"`)) // số thu/chip dương: xanh (AA)
  assert.match(styles, new RegExp(`<color rgb="(?:FF)?${XL_TEXT.warn}"`)) // chip chờ: amber (AA)
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
  const cols = wsA['!cols'].slice(0, 4).map((c: { wch: number }) => c.wch) // 4 cot bang (cac <col> sau chi mang style wash)
  assert.ok(cols.every((w: number) => w >= 10 && w <= 48), `cols=${cols}`)
  assert.equal(cols[1], 48) // cột nội dung rất dài bị chặn ở 48
  assert.ok(cols[2] >= displayNumber(1234567).length * 1.1) // "1,234,567" không bị ####
  assert.equal(columnWidth(3, 0), 10)
  assert.equal(columnWidth(200, 200), 48)
  assert.ok(estimateLines('a'.repeat(100), 30) >= 4)
  const xml = unzipText(bytes)('xl/worksheets/sheet1.xml')
  assert.match(xml, /<row r="8"(?![^>]*customHeight)[^>]*>/) // hàng nội dung dài: Excel tự cao
  assert.match(xml, /<row r="7"[^>]*ht="22"[^>]*customHeight="1"/) // hàng 1 dòng: cao 22pt (thoáng như tấm kính)
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

test('makeBrand: mọi brand (cả vàng/amber sáng) → chữ ink trên soft >= 4.5, chữ TRẮNG trên header/băng >= 4.5; mặc định = bộ chuẩn', () => {
  const def = { brand: '6D5DFB', ink: '4F46E5', soft: 'EEF2FF', head: '6D5DFB', border: 'C7D2FE', wash: 'F1F4FF', glass: 'F8F9FF', hair: 'E3E8FB', spec: 'A5B4FC' }
  assert.deepEqual(makeBrand('#6D5DFB'), def)
  assert.deepEqual(makeBrand('xyz'), def)
  for (const hex of ['#F59E0B', '#0F766E', '#FACC15', '#112233', '#FFFFFF', '#10B981', '#6D5DFB']) {
    const b = makeBrand(hex, true)
    assert.ok(contrastRatio(b.ink, b.soft) >= 4.5, `${hex}: ink/soft ${contrastRatio(b.ink, b.soft)}`)
    assert.ok(contrastRatio('FFFFFF', b.ink) >= 4.5, `${hex}: trắng/băng ${contrastRatio('FFFFFF', b.ink)}`)
    assert.ok(contrastRatio('FFFFFF', b.head) >= 4.5, `${hex}: trắng/header ${contrastRatio('FFFFFF', b.head)}`)
    // Liquid Glass: wash/glass/soft đều rất nhạt, chữ ink >= 4.5 trên cả ba
    for (const bg of [b.wash, b.glass, b.soft]) assert.ok(contrastRatio(b.ink, bg) >= 4.5, `${hex}: ink/${bg}`)
  }
  assert.equal(makeBrand('#F59E0B', true).brand, 'F59E0B') // brand giữ nguyên (tab/viền); chỉ header tự tối
  assert.notEqual(makeBrand('#F59E0B', true).head, 'F59E0B')
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

/* ── Màu sinh động ── */
interface CellStyle {
  fill?: string; font?: string; bold: boolean; sz?: number; topBorder?: string; bottomBorder?: string; leftBorder?: string
  /** gradientFill: [diem dau, diem cuoi] + degree (fill = mau DAU de so sanh nhanh). */
  gradient?: [string, string]; degree?: number; borderColors?: { left?: string; bottom?: string }
}
/** Đọc style THẬT của 1 ô từ XML (styles.xml: fonts/fills/borders/cellXfs; sheetN.xml: s="idx"). */
function styleOf(bytes: Uint8Array, ref: string, sheet = 1): CellStyle {
  const x = unzipText(bytes)
  const st = x('xl/styles.xml')
  const list = (group: string, tag: string) => {
    const inner = new RegExp('<' + group + '[ >][^]*?</' + group + '>').exec(st)?.[0] ?? ''
    return [...inner.matchAll(new RegExp('<' + tag + '(?: [^>]*?)?(?:/>|>[^]*?</' + tag + '>)', 'g'))].map(m => m[0])
  }
  const fonts = list('fonts', 'font'), fills = list('fills', 'fill'), borders = list('borders', 'border'), xfs = list('cellXfs', 'xf')
  const sx = x(`xl/worksheets/sheet${sheet}.xml`)
  const idx = Number(new RegExp('<c r="' + ref + '"[^>]*? s="([0-9]+)"').exec(sx)?.[1] ?? 0)
  const xf = xfs[idx]
  const attr = (n: string) => Number(new RegExp(n + '="([0-9]+)"').exec(xf)?.[1] ?? 0)
  const font = fonts[attr('fontId')] ?? '', fill = fills[attr('fillId')] ?? '', border = borders[attr('borderId')] ?? ''
  const rgb = (t: string) => /rgb="(?:FF)?([0-9A-F]{6})"/.exec(t)?.[1]
  const stops = [...fill.matchAll(/<stop [^>]*><color rgb="(?:FF)?([0-9A-F]{6})"\/><\/stop>/g)].map(m => m[1])
  const bc = (side: string) => rgb(new RegExp('<' + side + ' [^>]*>[^]*?</' + side + '>').exec(border)?.[0] ?? '')
  return {
    gradient: stops.length === 2 ? [stops[0], stops[1]] : undefined,
    degree: Number(/<gradientFill[^>]*degree="(\d+)"/.exec(fill)?.[1]),
    bottomBorder: /<bottom style="(\w+)"/.exec(border)?.[1],
    leftBorder: /<left style="(\w+)"/.exec(border)?.[1],
    borderColors: { left: bc('left'), bottom: bc('bottom') },
    fill: /patternType="solid"/.test(fill) ? rgb(/<fgColor[^>]*>/.exec(fill)?.[0] ?? '') : (stops.length === 2 ? stops[0] : undefined),
    font: rgb(/<color[^>]*>/.exec(font)?.[0] ?? ''),
    bold: /<b\/>/.test(font),
    sz: Number(/<sz val="(\d+)"/.exec(font)?.[1]),
    topBorder: /<top style="(\w+)"/.exec(border)?.[1],
  }
}

test('băng tiêu đề (glass): hàng 1-2 gradient ngang brandDark→brand chữ trắng đậm (title 16), hàng 3-4 kính tint chữ brandDark, viền trắng dày ở mép, phủ hết bề ngang', async () => {
  const bytes = await fixture()
  for (const ref of ['A1', 'B1', 'D1', 'A2', 'D2']) {
    const c = styleOf(bytes, ref)
    assert.deepEqual(c.gradient, ['4F46E5', '6D5DFB'], ref); assert.equal(c.degree, 0, ref)
    assert.equal(c.font, 'FFFFFF', ref); assert.ok(c.bold, ref)
  }
  assert.equal(styleOf(bytes, 'A2').sz, 16)
  assert.equal(styleOf(bytes, 'A2').borderColors?.bottom, 'A5B4FC') // cạnh sáng dưới tiêu đề
  assert.equal(styleOf(bytes, 'A1').leftBorder, 'medium'); assert.equal(styleOf(bytes, 'B1').leftBorder, undefined) // halo ở mép ngoài
  for (const ref of ['A3', 'D3', 'A4', 'D4']) assert.equal(styleOf(bytes, ref).fill, 'F8F9FF', ref)
  for (const ref of ['A3', 'A4']) assert.equal(styleOf(bytes, ref).font, '4F46E5', ref)
  assert.equal(styleOf(bytes, 'A4').bottomBorder, 'medium')
  assert.equal(styleOf(bytes, 'A4').borderColors?.bottom, 'C7D2FE')
  assert.ok(contrastRatio('FFFFFF', '4F46E5') >= 4.5 && contrastRatio('FFFFFF', '6D5DFB') >= 4.5) // cả hai đầu gradient
})

test('header bảng = gradient dọc brand→brandDark chữ trắng đậm + viền dưới TRẮNG dày; thân trắng, zebra tint #F8F9FF ở dòng lẻ; hàng tổng brandSoft + viền trắng dày', async () => {
  const bytes = await fixture()
  for (const ref of ['A6', 'B6', 'C6', 'D6']) {
    const c = styleOf(bytes, ref)
    assert.deepEqual(c.gradient, ['6D5DFB', '4F46E5'], ref); assert.equal(c.degree, 90, ref)
    assert.equal(c.font, 'FFFFFF', ref); assert.ok(c.bold, ref)
    assert.equal(c.bottomBorder, 'medium', ref); assert.equal(c.borderColors?.bottom, 'FFFFFF', ref)
  }
  assert.equal(styleOf(bytes, 'A6').leftBorder, 'medium') // halo mép trái
  assert.equal(styleOf(bytes, 'B7').fill, 'FFFFFF') // dòng thân 0: tấm kính trắng
  assert.equal(styleOf(bytes, 'B8').fill, 'F8F9FF') // dòng thân 1: zebra tint
  assert.equal(styleOf(bytes, 'B9').fill, 'FFFFFF')
  assert.equal(styleOf(bytes, 'B7').borderColors?.bottom, 'E3E8FB') // hairline brand nhạt
  const t = styleOf(bytes, 'B15')
  assert.equal(t.fill, 'EEF2FF'); assert.equal(t.font, '4F46E5'); assert.ok(t.bold)
  assert.equal(t.topBorder, 'medium'); assert.equal(t.bottomBorder, 'medium'); assert.equal(t.borderColors?.bottom, 'FFFFFF')
})

test('glass XML: nền wash phủ toàn sheet bằng style cột (đến XFD), gradientFill hợp lệ, count khớp, file mở được bằng XLSX.read và dữ liệu nguyên vẹn', async () => {
  const bytes = await fixture()
  const x = unzipText(bytes)
  const st = x('xl/styles.xml')
  const sx = x('xl/worksheets/sheet1.xml')
  assert.match(st, /<gradientFill degree="0"><stop position="0"><color rgb="FF4F46E5"\/><\/stop><stop position="1"><color rgb="FF6D5DFB"\/><\/stop><\/gradientFill>/)
  assert.match(st, /<gradientFill degree="90"><stop position="0"><color rgb="FF6D5DFB"\/><\/stop><stop position="1"><color rgb="FF4F46E5"\/><\/stop><\/gradientFill>/)
  const fillsInner = /<fills count="(\d+)">([^]*?)<\/fills>/.exec(st)!
  assert.equal([...fillsInner[2].matchAll(/<fill>/g)].length, Number(fillsInner[1]))
  const xfInner = /<cellXfs count="(\d+)">([^]*?)<\/cellXfs>/.exec(st)!
  const xfs = xfInner[2].match(/<xf [^>]*?(?:\/>|>[^]*?<\/xf>)/g)!
  assert.equal(xfs.length, Number(xfInner[1]))
  const washXf = xfs.length - 1
  assert.match(sx, new RegExp(`<col min="5" max="16384" width="[0-9.]+" style="${washXf}"/>`))
  assert.equal([...sx.matchAll(/<col [^>]*style="(\d+)"/g)].every(m => Number(m[1]) === washXf), true)
  const washFillId = Number(/fillId="(\d+)"/.exec(xfs[washXf])![1])
  const fills = fillsInner[2].match(/<fill>[^]*?<\/fill>/g)!
  assert.match(fills[washFillId], /fgColor rgb="FFF1F4FF"/)
  assert.ok(sx.indexOf('<sheetViews>') < sx.indexOf('<cols>') && sx.indexOf('<cols>') < sx.indexOf('<sheetData'))
  const wb = readWb(bytes)
  const ws = wb.Sheets[wb.SheetNames[0]]
  assert.equal(ws.A6.v, 'Ngày'); assert.equal(ws.C7.v, 300000)
})

test('số: âm đỏ đậm, 0 xám; chip trạng thái nền rất nhạt + chữ đậm AA theo tông', async () => {
  const bytes = await fixture()
  const neg = styleOf(bytes, 'C8')
  assert.equal(neg.font, XL_TEXT.neg); assert.ok(neg.bold) // -450000
  assert.equal(styleOf(bytes, 'C9').font, XL_COLOR.gray) // 0
  assert.equal(styleOf(bytes, 'C7').font, XL_TEXT.pos) // dòng 'Thu quỹ' → số tiền xanh (AA)
  assert.equal(styleOf(bytes, 'C7').bold, true)
  const ok = styleOf(bytes, 'D7') // Đã xác nhận
  assert.equal(ok.fill, XL_VIVID.posBg); assert.equal(ok.font, XL_TEXT.pos); assert.ok(ok.bold)
  const wait = styleOf(bytes, 'D8') // Chờ xác nhận
  assert.equal(wait.fill, XL_VIVID.warnBg); assert.equal(wait.font, XL_TEXT.warn)
  const no = styleOf(bytes, 'D9') // Từ chối
  assert.equal(no.fill, XL_VIVID.negBg); assert.equal(no.font, XL_TEXT.neg)
  assert.equal(no.leftBorder, undefined); assert.equal(no.borderColors?.bottom, 'E3E8FB') // chip: không viền gắt, chỉ hairline
})

test('glass: chữ số/chip đạt >= 4.5:1 trên tint kính, brandSoft (hàng tổng) và nền chip', () => {
  for (const t of ['pos', 'neg', 'warn', 'info'] as const) {
    assert.ok(contrastRatio(XL_TEXT[t], 'F8F9FF') >= 4.5, `${t} trên glass`)
    assert.ok(contrastRatio(XL_TEXT[t], XL_VIVID[`${t}Bg` as 'posBg']) >= 4.5, `${t} trên chip`)
  }
  for (const t of ['pos', 'neg', 'warn'] as const) assert.ok(contrastRatio(XL_TEXT[t], 'EEF2FF') >= 4.5, `${t} trên hàng tổng`)
  assert.ok(contrastRatio(XL_COLOR.gray, 'F8F9FF') >= 4.5)
})

test('glass: stylesXmlPatch với fill lạ → không gradient nhưng vẫn thêm wash; thiếu fills/cellXfs → null; colsWashPatch chèn <cols> khi thiếu', () => {
  const xml = '<styleSheet><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'
  const r = stylesXmlPatch(xml, glassPatchFor(makeBrand(null)))!
  assert.equal(r.washXf, 1)
  assert.match(r.xml, /<fills count="3">/); assert.match(r.xml, /<cellXfs count="2">/)
  assert.ok(!r.xml.includes('gradientFill'))
  assert.equal(stylesXmlPatch('<styleSheet/>', glassPatchFor(makeBrand(null))), null)
  assert.match(colsWashPatch('<worksheet><sheetData/></worksheet>', 5), /<cols><col min="1" max="16384"[^>]*style="5"\/><\/cols><sheetData/)
})

test('moneyTone: theo tên cột / nhãn dòng / loại sheet; số đếm không bị tô', () => {
  const base = { rowTexts: [] as string[] }
  assert.equal(moneyTone({ ...base, header: 'Thu (VNĐ)', value: 5 }), 'pos')
  assert.equal(moneyTone({ ...base, header: 'Chi (VNĐ)', value: 5 }), 'neg')
  assert.equal(moneyTone({ ...base, header: 'Còn nợ (VNĐ)', value: 5 }), 'neg')
  assert.equal(moneyTone({ ...base, header: 'Chi phí sân (VNĐ)', value: 5 }), 'neg')
  assert.equal(moneyTone({ ...base, header: 'Số dư (VNĐ)', value: 5 }), 'pos')
  assert.equal(moneyTone({ ...base, header: 'Số dư (VNĐ)', value: -5 }), 'neg')
  assert.equal(moneyTone({ header: 'Số tiền (VNĐ)', value: 5, rowTexts: ['01/07', 'Chi'] }), 'neg')
  assert.equal(moneyTone({ header: 'Số tiền (VNĐ)', value: 5, rowTexts: ['Thu'] }), 'pos')
  assert.equal(moneyTone({ header: 'Giá trị', value: 5, rowTexts: ['Tài chính kỳ', 'Tổng chi', 'VNĐ'] }), 'neg')
  assert.equal(moneyTone({ header: 'Giá trị', value: 5, rowTexts: ['Tài chính kỳ', 'Tổng thu', 'VNĐ'] }), 'pos')
  assert.equal(moneyTone({ header: 'Giá trị', value: 5, rowTexts: ['Chỉ số', 'Tổng số buổi', 'buổi'] }), null) // không phải tiền
  assert.equal(moneyTone({ header: 'Buổi tham gia', value: 5, rowTexts: ['Chi'] }), null)
  assert.equal(moneyTone({ header: 'Số tiền (VNĐ)', value: 5, rowTexts: [], sheetTone: 'expense' }), 'neg')
  assert.equal(moneyTone({ header: 'Số tiền (VNĐ)', value: 5, rowTexts: [], sheetTone: 'income' }), 'pos')
  assert.equal(moneyTone({ header: 'Số tiền (VNĐ)', value: 5, rowTexts: ['Chờ xác nhận (chưa tính vào quỹ)'], sheetTone: 'income', total: true }), 'warn')
  assert.equal(inferSheetTone('Thu Quỹ'), 'income'); assert.equal(inferSheetTone('Khoản Chi'), 'expense'); assert.equal(inferSheetTone('Chi Tiết Thành Viên'), null)
})

test('tab color: thu = xanh, chi = đỏ, còn lại = brand; số tiền tô theo loại sheet / loại dòng', async () => {
  const bytes = await buildExcelBytes([
    { name: 'Thu Quỹ', headers: ['A', 'Số tiền (VNĐ)'], rows: [['x', 10]] },
    { name: 'Khoản Chi', headers: ['A', 'Số tiền (VNĐ)'], rows: [['x', 10]] },
    { name: 'Tổng quan', headers: ['A', 'Loại', 'Số tiền (VNĐ)'], rows: [['a', 'Thu', 10], ['b', 'Chi', 20]] },
  ], { docType: 'BK' })
  const x = unzipText(bytes)
  assert.match(x('xl/worksheets/sheet1.xml'), new RegExp(`<tabColor rgb="FF${XL_VIVID.pos}"/>`))
  assert.match(x('xl/worksheets/sheet2.xml'), new RegExp(`<tabColor rgb="FF${XL_VIVID.neg}"/>`))
  assert.match(x('xl/worksheets/sheet3.xml'), /<tabColor rgb="FF6D5DFB"\/>/)
  assert.equal(styleOf(bytes, 'B7', 1).font, XL_TEXT.pos); assert.equal(styleOf(bytes, 'B7', 2).font, XL_TEXT.neg)
  assert.equal(styleOf(bytes, 'C7', 3).font, XL_TEXT.pos); assert.equal(styleOf(bytes, 'C8', 3).font, XL_TEXT.neg)
  assert.equal(tabColorFor('income', 'ABCDEF'), XL_VIVID.pos)
})

test('CLB đặt màu amber/vàng: Excel vẫn ra bộ màu app chung (header tím), chữ trắng đủ tương phản', async () => {
  setExportBranding({ primaryColor: '#F59E0B' })
  try {
    const bytes = await fixture()
    const head = styleOf(bytes, 'A6'), band = styleOf(bytes, 'A1')
    assert.equal(head.font, 'FFFFFF')
    for (const c of [...head.gradient!, ...band.gradient!]) assert.ok(contrastRatio('FFFFFF', c) >= 4.5, c) // CẢ HAI đầu gradient
    assert.notEqual(head.gradient![0], 'F59E0B')
    assert.match(unzipText(bytes)('xl/worksheets/sheet1.xml'), /<tabColor rgb="FF6D5DFB"\/>/) // tab = brand app, KHÔNG phải amber CLB
  } finally { setExportBranding({ primaryColor: null }) }
})

test('moneyTone: dòng % thay đổi — Chi giảm xanh, Thu giảm đỏ', async () => {
  const { moneyTone } = await import('./excel-kit.ts')
  const row = (label: string) => ({ header: 'Giá trị', rowTexts: ['So với kỳ trước', label, '% thay đổi'] })
  assert.equal(moneyTone({ ...row('Chi'), value: -12.8 }), 'pos')
  assert.equal(moneyTone({ ...row('Chi'), value: 5 }), 'neg')
  assert.equal(moneyTone({ ...row('Thu'), value: -16 }), 'neg')
  assert.equal(moneyTone({ ...row('Thu'), value: 8 }), 'pos')
})

test('ĐỒNG BỘ: makeBrand Excel bỏ qua màu CLB; styles.xml của 2 CLB khác màu GIỐNG HỆT', async () => {
  assert.deepEqual(makeBrand('#0F766E'), makeBrand(null))
  assert.deepEqual(makeBrand('#F59E0B'), makeBrand(null))
  const styles = async (color: string | null) => {
    setExportBranding({ primaryColor: color })
    try { return unzipText(await fixture())('xl/styles.xml') } finally { setExportBranding({ primaryColor: null }) }
  }
  const a = await styles(null)
  assert.equal(await styles('#0F766E'), a)
  assert.equal(await styles('#F59E0B'), a)
})
