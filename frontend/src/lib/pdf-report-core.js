/**
 * MẪU BÁO CÁO QUỸ CHUẨN (dùng chung mọi CLB) — PDF VECTOR thuần jsPDF.
 *
 * KHÔNG dùng html2canvas (chụp DOM): cách đó phụ thuộc renderer từng máy, đã gây
 * 3 kiểu lỗi khác nhau (cắt dòng / trôi số / giãn thẻ méo chữ). Ở đây mọi phần tử
 * được VẼ bằng toạ độ mm cố định → mọi máy, mọi lần xuất cho ra pixel GIỐNG HỆT.
 *
 * File là JS thuần (ESM + JSDoc) để tái dùng được cả trong app (export.ts import)
 * lẫn harness Node kiểm chứng ngoài trình duyệt.
 *
 * Font: Be Vietnam Pro (OFL) — đủ glyph tiếng Việt, nhúng thẳng vào PDF.
 */

/* ── Bảng màu thương hiệu (đồng bộ token --pf-primary của app) ── */
const C = {
  indigo: [109, 93, 251], // #6D5DFB
  indigoDark: [79, 70, 229], // #4F46E5
  indigoSoft: [238, 242, 255], // #EEF2FF
  indigoBorder: [199, 210, 254], // #C7D2FE
  badgeOnIndigo: [152, 140, 252], // pill trên nền indigo
  border: [226, 232, 240], // #E2E8F0
  zebra: [248, 250, 252], // #F8FAFC
  lineSoft: [241, 245, 249], // #F1F5F9
  textDark: [30, 41, 59], // #1E293B
  gray: [100, 116, 139], // #64748B
  grayLight: [148, 163, 184], // #94A3B8
  green: [22, 163, 74], // #16A34A
  greenBg: [240, 253, 244],
  greenBorder: [187, 247, 208],
  red: [239, 68, 68], // #EF4444
  redDark: [220, 38, 38],
  redBg: [254, 242, 242],
  redBorder: [254, 202, 202],
  orange: [234, 88, 12], // #EA580C
  cyan: [8, 145, 178], // #0891B2
  white: [255, 255, 255],
}

/* ── Khổ giấy & lề (mm) ── */
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2 // 186

/** Định dạng tiền deterministic: 1234567 → "1.234.567 đ" (không phụ thuộc ICU). */
function vnd(n) {
  const neg = n < 0
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (neg ? '-' : '') + s + ' đ'
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function buildQuyReportPDF({ jsPDF, fonts, summary, rows, branding }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  /* Nhúng font Việt */
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  /* ── helpers vẽ ── */
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  /** Cắt chữ kèm "…" khi vượt bề rộng cho phép (theo font đang set). */
  const clip = (text, maxW) => {
    if (doc.getTextWidth(text) <= maxW) return text
    let t = text
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)

  /* Header band của MỌI trang (đậm trang 1, gọn trang bill) */
  const drawHeader = (title, subRight1, subRight2, big) => {
    const h = big ? 30 : 18
    setFill(C.indigoDark)
    rrect(MARGIN, MARGIN, CONTENT_W, h, 2.5, 'F')
    // dải nhấn brand sáng hơn ở đáy band
    setFill(C.indigo)
    doc.rect(MARGIN, MARGIN + h - 1.6, CONTENT_W, 1.6, 'F')
    font('bold', big ? 7 : 6.5, C.white)
    doc.setTextColor(255, 255, 255)
    // brand nhỏ phía trên
    doc.text((branding.name || 'PickleFund').toUpperCase(), MARGIN + 7, MARGIN + (big ? 8 : 6.5))
    font('bold', big ? 16.5 : 12, C.white)
    doc.text(title, MARGIN + 7, MARGIN + (big ? 16.5 : 12.5))
    font('normal', big ? 9 : 7.5, C.white)
    doc.text(`${summary.clubName} · ${summary.periodName}`, MARGIN + 7, MARGIN + (big ? 23.5 : 16))
    font('normal', 7.5, C.white)
    if (subRight1) doc.text(subRight1, PAGE_W - MARGIN - 7, MARGIN + (big ? 10 : 8), { align: 'right' })
    if (subRight2) doc.text(subRight2, PAGE_W - MARGIN - 7, MARGIN + (big ? 15 : 12.5), { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(`${branding.footer || 'PickleFund'} · ${summary.clubName} · Xuất lúc ${summary.exportedAtText}`, MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  /* ═══════════ TRANG 1 — BÁO CÁO TÀI CHÍNH ═══════════ */
  const unpaidCount = rows.length > 0
    ? rows.filter((r) => !r.contributionPaid).length
    : Math.max(0, summary.memberCount - summary.confirmedCount)
  const chiThuPct = pct(summary.totalExpense, summary.totalIncome)

  let y = drawHeader(
    'BÁO CÁO TÀI CHÍNH',
    `Xuất ngày ${summary.exportedDateText}`,
    `${summary.memberCount} thành viên · ${summary.sessionCount} buổi tập`,
    true,
  )
  y += 5

  /* KPI: Tổng thu / Tổng chi / Số dư */
  const kpiW = (CONTENT_W - 8) / 3
  const kpis = [
    { label: 'TỔNG THU', value: vnd(summary.totalIncome), sub: `${summary.confirmedCount}/${summary.memberCount} thành viên đóng`, color: C.green },
    { label: 'TỔNG CHI', value: vnd(summary.totalExpense), sub: `Tỷ lệ chi / thu: ${chiThuPct}%`, color: C.redDark },
    {
      label: 'SỐ DƯ QUỸ', value: vnd(summary.balance),
      sub: summary.balance < 0 ? 'Quỹ âm – cần bổ sung' : 'Quỹ còn dư',
      color: summary.balance < 0 ? C.redDark : C.indigoDark, highlight: true,
    },
  ]
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiW + 4)
    setFill(k.highlight ? C.indigoSoft : C.white)
    setDraw(k.highlight ? C.indigoBorder : C.border)
    doc.setLineWidth(0.35)
    rrect(x, y, kpiW, 22, 2, 'FD')
    font('bold', 7, k.highlight ? C.indigoDark : C.gray)
    doc.text(k.label, x + 5, y + 6.5)
    font('bold', 14, k.color)
    doc.text(k.value, x + 5, y + 13.5)
    font('normal', 6.5, C.grayLight)
    doc.text(k.sub, x + 5, y + 18.5)
  })
  y += 27

  /* Thanh Tỷ lệ Chi/Thu */
  setFill(C.white)
  setDraw(C.border)
  rrect(MARGIN, y, CONTENT_W, 17, 2, 'FD')
  font('bold', 8, C.textDark)
  doc.text('Tỷ lệ Chi / Thu', MARGIN + 5, y + 5.5)
  const barX = MARGIN + 5
  const barW = CONTENT_W - 10
  setFill(C.lineSoft)
  rrect(barX, y + 7.5, barW, 2.6, 1.3, 'F')
  const fillW = Math.max(2.6, Math.min(barW, (barW * Math.min(chiThuPct, 100)) / 100))
  setFill(C.indigo)
  rrect(barX, y + 7.5, fillW, 2.6, 1.3, 'F')
  font('normal', 6.5, C.gray)
  doc.text(`Thu: ${vnd(summary.totalIncome)}`, barX, y + 14.5)
  doc.text(`Chi: ${vnd(summary.totalExpense)} (${chiThuPct}%)`, barX + barW, y + 14.5, { align: 'right' })
  y += 22

  /* 4 chỉ số nhanh */
  const statW = (CONTENT_W - 12) / 4
  const stats = [
    { label: 'Tổng thành viên', value: `${summary.memberCount} người`, color: C.textDark },
    { label: 'Số buổi tập', value: `${summary.sessionCount} buổi`, color: C.textDark },
    { label: 'Đã đóng quỹ', value: `${summary.confirmedCount} / ${summary.memberCount}`, color: C.green },
    { label: 'Chưa đóng quỹ', value: `${unpaidCount} người`, color: unpaidCount > 0 ? C.red : C.green },
  ]
  stats.forEach((s, i) => {
    const x = MARGIN + i * (statW + 4)
    setFill(C.white)
    setDraw(C.border)
    rrect(x, y, statW, 13, 2, 'FD')
    font('normal', 6.5, C.gray)
    doc.text(s.label, x + 4, y + 5)
    font('bold', 9.5, s.color)
    doc.text(s.value, x + 4, y + 10.5)
  })
  y += 19

  /* Bảng chi tiết từng thành viên (tự phân trang, lặp header) */
  const COLS = [
    { key: 'idx', label: '#', w: 7, align: 'left' },
    { key: 'name', label: 'THÀNH VIÊN', w: 47, align: 'left' },
    { key: 'sess', label: 'BUỔI', w: 13, align: 'center' },
    { key: 'status', label: 'TRẠNG THÁI', w: 22, align: 'center' },
    { key: 'court', label: 'CHI PHÍ SÂN', w: 25, align: 'right' },
    { key: 'living', label: 'SINH HOẠT', w: 22, align: 'right' },
    { key: 'total', label: 'TỔNG CHI', w: 25, align: 'right' },
    { key: 'bal', label: 'SỐ DƯ', w: 25, align: 'right' },
  ]
  const ROW_H = 7.5
  const colX = []
  {
    let cx = MARGIN
    for (const c of COLS) { colX.push(cx); cx += c.w }
  }
  const cellX = (i) => {
    const c = COLS[i]
    if (c.align === 'right') return colX[i] + c.w - 3
    if (c.align === 'center') return colX[i] + c.w / 2
    return colX[i] + 3
  }

  const drawTableHeader = (yy) => {
    setFill(C.indigo)
    doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
    font('bold', 7, C.white)
    COLS.forEach((c, i) => doc.text(c.label, cellX(i), yy + 5.3, { align: c.align }))
    return yy + 8
  }

  if (rows.length > 0) {
    font('bold', 8.5, C.indigoDark)
    doc.text('CHI TIẾT TỪNG THÀNH VIÊN', MARGIN, y + 2)
    y += 5
    y = drawTableHeader(y)
    const bottomLimit = PAGE_H - MARGIN - 12
    rows.forEach((r, idx) => {
      if (y + ROW_H > bottomLimit) {
        doc.addPage()
        y = drawHeader('BÁO CÁO TÀI CHÍNH (tiếp)', `Xuất ngày ${summary.exportedDateText}`, '', false) + 5
        y = drawTableHeader(y)
      }
      if (idx % 2 === 1) {
        setFill(C.zebra)
        doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F')
      }
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
      const midY = y + ROW_H / 2 + 1.6
      font('normal', 7, C.grayLight)
      doc.text(String(idx + 1), cellX(0), midY)
      font('bold', 8, C.textDark)
      doc.text(clip(r.memberName, COLS[1].w - 6), cellX(1), midY)
      font('bold', 7.5, C.indigoDark)
      doc.text(`${r.attendedSessions}/${r.totalSessions}`, cellX(2), midY, { align: 'center' })
      // Không dùng ký hiệu ✓/✗ — font Be Vietnam Pro không có glyph này.
      if (r.contributionPaid) {
        font('bold', 7, C.green)
        doc.text('Đã đóng', cellX(3), midY, { align: 'center' })
      } else {
        font('bold', 7, C.red)
        doc.text('Chưa đóng', cellX(3), midY, { align: 'center' })
      }
      font('normal', 7.5, C.textDark)
      doc.text(vnd(r.courtCost), cellX(4), midY, { align: 'right' })
      doc.text(vnd(r.livingCost), cellX(5), midY, { align: 'right' })
      font('bold', 7.5, C.textDark)
      doc.text(vnd(r.totalCost), cellX(6), midY, { align: 'right' })
      font('bold', 7.5, r.balance >= 0 ? C.green : C.red)
      doc.text((r.balance >= 0 ? '+' : '') + vnd(r.balance), cellX(7), midY, { align: 'right' })
      y += ROW_H
    })
  }

  /* ═══════════ TRANG BILL — 6 thẻ/trang (2 cột × 3 hàng), toạ độ CỐ ĐỊNH ═══════════ */
  const CARD_W = (CONTENT_W - 6) / 2 // 90
  const CARD_H = 76
  const CARD_GAP = 5

  const drawCard = (m, x, yy) => {
    const pos = m.balance >= 0
    const rate = pct(m.attendedSessions, m.totalSessions)
    /* khung */
    setDraw(C.border)
    doc.setLineWidth(0.35)
    setFill(C.white)
    rrect(x, yy, CARD_W, CARD_H, 2.5, 'FD')
    /* header thẻ */
    setFill(C.indigo)
    rrect(x, yy, CARD_W, 15, 2.5, 'F')
    doc.rect(x, yy + 8, CARD_W, 7, 'F') // vuông hoá đáy header
    font('bold', 10, C.white)
    doc.text(clip(m.memberName, CARD_W - 40), x + 5, yy + 6.8)
    font('normal', 6.8, C.white)
    doc.text(`${m.attendedSessions}/${m.totalSessions} buổi tham gia`, x + 5, yy + 11.8)
    /* badge pill */
    const badgeTxt = m.contributionPaid ? 'Đã đóng quỹ' : 'Chưa đóng quỹ'
    font('bold', 6.2)
    const bw = doc.getTextWidth(badgeTxt) + 5
    setFill(C.badgeOnIndigo)
    rrect(x + CARD_W - 5 - bw, yy + 8.2, bw, 5, 2.5, 'F')
    setText(C.white)
    doc.text(badgeTxt, x + CARD_W - 5 - bw / 2, yy + 11.6, { align: 'center' })
    /* tỷ lệ tham gia */
    let cy = yy + 20.5
    font('bold', 6.3, C.gray)
    doc.text('TỶ LỆ THAM GIA', x + 5, cy)
    font('bold', 9.5, C.indigoDark)
    doc.text(`${m.attendedSessions} / ${m.totalSessions} buổi`, x + CARD_W - 5, cy + 0.6, { align: 'right' })
    cy += 2.6
    setFill(C.border)
    rrect(x + 5, cy, CARD_W - 10, 2, 1, 'F')
    setFill(C.indigo)
    rrect(x + 5, cy, Math.max(2, ((CARD_W - 10) * Math.min(rate, 100)) / 100), 2, 1, 'F')
    cy += 5.4
    font('normal', 6, C.grayLight)
    doc.text(`${rate}% số buổi trong kỳ`, x + CARD_W - 5, cy, { align: 'right' })
    cy += 3.2
    /* 4 dòng chi phí — mỗi dòng đúng 7mm, label trái / số phải */
    const lines = [
      { label: 'Đã nộp quỹ', note: '', val: vnd(m.amountPaid), color: C.green },
      { label: 'Chi phí sân', note: `(${m.attendedSessions} buổi)`, val: vnd(m.courtCost), color: C.indigo },
      { label: 'Sinh hoạt', note: '(chia đều)', val: vnd(m.livingCost), color: C.cyan },
      { label: 'Tổng chi phí', note: '', val: vnd(m.totalCost), color: C.orange, total: true },
    ]
    lines.forEach((ln) => {
      const rowMid = cy + 4.6
      if (ln.total) {
        setDraw(C.border)
        doc.setLineWidth(0.3)
        doc.setLineDashPattern([1.2, 1.2], 0)
        doc.line(x + 5, cy + 0.8, x + CARD_W - 5, cy + 0.8)
        doc.setLineDashPattern([], 0)
        font('bold', 7.8, C.textDark)
      } else {
        font('normal', 7.5, C.gray)
      }
      doc.text(ln.label, x + 5, rowMid)
      if (ln.note) {
        const lw = doc.getTextWidth(ln.label)
        font('normal', 6.2, C.grayLight)
        doc.text(' ' + ln.note, x + 5 + lw + 0.5, rowMid)
      }
      font('bold', 8.2, ln.color)
      doc.text(ln.val, x + CARD_W - 5, rowMid, { align: 'right' })
      if (!ln.total) {
        setDraw(C.lineSoft)
        doc.setLineWidth(0.2)
        doc.line(x + 5, cy + 7, x + CARD_W - 5, cy + 7)
      }
      cy += 7
    })
    /* ô số dư */
    const boxY = cy + 1.2
    setFill(pos ? C.greenBg : C.redBg)
    setDraw(pos ? C.greenBorder : C.redBorder)
    doc.setLineWidth(0.35)
    rrect(x + 5, boxY, CARD_W - 10, 12.5, 2, 'FD')
    font('bold', 7.5, pos ? C.green : C.red)
    doc.text(pos ? 'Số dư của bạn' : 'Cần nộp thêm', x + 8, boxY + 5.2)
    font('normal', 6, C.grayLight)
    doc.text(pos ? 'Chuyển sang kỳ tiếp theo' : 'Vui lòng nộp bổ sung', x + 8, boxY + 9.4)
    font('bold', 12, pos ? C.green : C.red)
    doc.text((pos ? '+' : '') + vnd(m.balance), x + CARD_W - 8, boxY + 8.2, { align: 'right' })
  }

  if (rows.length > 0) {
    const totalBillPages = Math.ceil(rows.length / 6)
    for (let pg = 0; pg < totalBillPages; pg++) {
      doc.addPage()
      const chunk = rows.slice(pg * 6, pg * 6 + 6)
      const top = drawHeader(
        'BILL CHI TIẾT THÀNH VIÊN',
        `Trang ${pg + 1} / ${totalBillPages}`,
        `${chunk.length} thành viên · Xuất ngày ${summary.exportedDateText}`,
        false,
      ) + 5
      chunk.forEach((m, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        drawCard(m, MARGIN + col * (CARD_W + 6), top + row * (CARD_H + CARD_GAP))
      })
    }
  }

  /* Footer + số trang cho toàn tài liệu */
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }

  return doc
}
