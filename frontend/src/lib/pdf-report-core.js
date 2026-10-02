/**
 * MẪU BÁO CÁO QUỸ CHUẨN (dùng chung mọi CLB) — PDF VECTOR thuần jsPDF, chuẩn "Luxury SaaS".
 *
 * KHÔNG dùng html2canvas (chụp DOM): cách đó phụ thuộc renderer từng máy. Ở đây mọi phần tử được
 * VẼ bằng toạ độ mm cố định → mọi máy, mọi lần xuất cho ra pixel GIỐNG HỆT.
 *
 * Token (màu / cỡ chữ / lề) ở export-theme.js; bộ vẽ dùng chung (masthead, footer, thẻ KPI, bảng,
 * chữ ký…) ở pdf-kit.js. File này chỉ GHÉP bố cục cho từng loại tài liệu.
 * Màu brand CLB đi vào qua `branding.primaryColor` (thiếu → tím mặc định).
 *
 * File là JS thuần (ESM + JSDoc) để tái dùng được cả trong app (export.ts import)
 * lẫn harness Node kiểm chứng ngoài trình duyệt.
 *
 * Font: Be Vietnam Pro (OFL) — đủ glyph tiếng Việt, nhúng thẳng vào PDF.
 */
import { THEME, fmt } from './export-theme.js'
import { setupDoc, createKit, drawFooterAll, drawTable, normalizeCols, drawNote, EMPTY_TEXT } from './pdf-kit.js'

const vnd = fmt.vnd

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

/** "+x đ" / "-x đ" / "0 đ" (số chênh lệch có dấu). */
function signedVnd(n) {
  const r = Math.round(Number(n) || 0)
  return r > 0 ? '+' + vnd(r) : vnd(r)
}

const newDoc = (jsPDF, fonts, orientation = 'portrait') =>
  setupDoc(new jsPDF({ orientation, unit: 'mm', format: 'a4' }), fonts)

/** Dựng hàm tạo trang-tiếp (masthead gọn) cho 1 tài liệu. */
const contFactory = (kit, { club, title, docCode }) => (section, right) => {
  kit.doc.addPage()
  return kit.masthead({ first: false, club, title, section, right: right ? [right] : [], docCode })
}

/* ═══════════════════════════════════════════════════════════════════
   BÁO CÁO QUỸ — trang 1 tài chính + bảng thành viên (+ khoản chi) + bill thành viên
═══════════════════════════════════════════════════════════════════ */
export function buildQuyReportPDF({ jsPDF, fonts, summary, rows, expenseRows = [], branding }) {
  const doc = newDoc(jsPDF, fonts)
  const kit = createKit(doc, branding)
  const { T, C, B, M, CW, W } = kit
  const club = summary.clubName || branding.name
  const TITLE = 'BÁO CÁO TÀI CHÍNH'
  const docCode = summary.docCode || fmt.docCode('BCQ')
  const cont = contFactory(kit, { club, title: TITLE, docCode })

  const unpaidTotal = rows.length > 0 ? rows.length : summary.memberCount
  const unpaidCount = rows.length > 0
    ? rows.filter((r) => !r.contributionPaid).length
    : Math.max(0, summary.memberCount - summary.confirmedCount)
  const chiThuPct = pct(summary.totalExpense, summary.totalIncome)
  const hasExtra = [
    summary.miniBalance, summary.carryForward,
    summary.totalAttendance, summary.activeMemberCount,
  ].some((v) => v != null)

  /* ── TRANG 1 ── */
  let y = kit.masthead({
    club,
    title: TITLE,
    subtitle: summary.periodName,
    docCode,
    exportedText: summary.exportedAtText,
    right: [`${summary.memberCount} thành viên · ${summary.sessionCount} buổi tập`],
  })

  y = kit.kpiGrid([
    { label: 'Tổng thu', value: vnd(summary.totalIncome), caption: `${summary.confirmedCount}/${summary.memberCount} thành viên đóng`, accent: false },
    { label: 'Tổng chi', value: vnd(summary.totalExpense), caption: `Tỷ lệ chi / thu: ${chiThuPct}%`, accent: false },
    {
      // Khi có hàng "QUỸ CHÍNH" (thực có) bên dưới → đổi nhãn để KHÔNG lẫn: đây là kết quả THU−CHI của kỳ.
      label: hasExtra ? 'Số dư thu − chi' : 'Số dư quỹ',
      value: vnd(summary.balance),
      caption: hasExtra ? 'Thu − Chi trong kỳ' : (summary.balance < 0 ? 'Quỹ âm – cần bổ sung' : 'Quỹ còn dư'),
      accent: true,
      tone: summary.balance < 0 ? 'neg' : undefined,
    },
  ], y, { perRow: 3, after: T.space.s })

  /* Hàng thẻ thứ 2 — SỐ DƯ CÁC QUỸ (chỉ khi có dữ liệu dashboard) */
  if (hasExtra) {
    const mainFund = summary.clubAssets != null
      ? Number(summary.clubAssets)
      : Number(summary.balance || 0) + Number(summary.carryForward || 0)
    const mini = Number(summary.miniBalance || 0)
    const carry = Number(summary.carryForward || 0)
    const totalAssets = mainFund + mini
    const neg = (v) => (v < 0 ? 'neg' : undefined)
    y = kit.kpiGrid([
      { label: 'Quỹ Chính', value: vnd(mainFund), caption: 'Thực có, gồm tồn đầu kỳ', tone: neg(mainFund) },
      { label: 'Quỹ Phụ', value: vnd(mini), caption: 'Độc lập Quỹ Chính', tone: neg(mini) },
      { label: 'Số dư chuyển kỳ', value: vnd(carry), caption: 'Từ kỳ trước', tone: neg(carry) },
      { label: 'Tổng tài sản', value: vnd(totalAssets), caption: 'Quỹ Chính + Quỹ Phụ', tone: neg(totalAssets) },
    ], y, { perRow: 4, after: T.space.m })
  } else {
    y += T.space.s
  }

  /* Thanh tiến độ Chi / Thu (cao 2mm, track line, fill brand → warn ≥ 90% → neg ≥ 100%) */
  kit.font('bold', T.type.body, C.ink)
  doc.text('Tỷ lệ chi / thu', M, y + 3)
  kit.font('bold', T.type.body, chiThuPct >= 100 ? C.neg : C.ink)
  doc.text(`${chiThuPct}%`, W - M, y + 3, { align: 'right' })
  kit.fill(C.line)
  kit.rrect(M, y + 5.4, CW, 2, T.radius.bar, 'F')
  kit.fill(chiThuPct >= 100 ? C.negFill : chiThuPct >= 90 ? C.warnFill : B.brand)
  kit.rrect(M, y + 5.4, Math.max(2, (CW * Math.min(chiThuPct, 100)) / 100), 2, T.radius.bar, 'F')
  kit.font('normal', T.type.caption, C.muted)
  doc.text(`Thu: ${vnd(summary.totalIncome)}`, M, y + 11.4)
  doc.text(`Chi: ${vnd(summary.totalExpense)} (${chiThuPct}%)`, W - M, y + 11.4, { align: 'right' })
  y += 11.4 + T.space.m

  /* Chỉ số nhanh (thẻ compact) */
  const nfmt = (n) => fmt.num(Math.round(Number(n || 0)))
  const statItems = hasExtra
    ? [
      { label: 'Đang hoạt động', value: `${nfmt(summary.activeMemberCount ?? summary.memberCount)} người` },
      { label: 'Số buổi tập', value: `${summary.sessionCount} buổi` },
      { label: 'Lượt điểm danh', value: `${nfmt(summary.totalAttendance)} lượt` },
      { label: 'Chưa đóng quỹ', value: `${unpaidCount} / ${unpaidTotal} người`, tone: unpaidCount > 0 ? 'neg' : 'pos' },
    ]
    : [
      { label: 'Tổng thành viên', value: `${summary.memberCount} người` },
      { label: 'Số buổi tập', value: `${summary.sessionCount} buổi` },
      { label: 'Đã đóng quỹ', value: `${summary.confirmedCount} / ${summary.memberCount}`, tone: 'pos' },
      { label: 'Chưa đóng quỹ', value: `${unpaidCount} người`, tone: unpaidCount > 0 ? 'neg' : 'pos' },
    ]
  y = kit.kpiGrid(statItems.map((s) => ({ ...s, compact: true, accent: false })), y, { perRow: 4, compact: true, after: T.space.m })

  /* ── Bảng thành viên ── */
  if (y + 30 > kit.bottom) y = cont('Chi tiết thành viên')
  y = kit.sectionTitle('Chi tiết từng thành viên', y)
  const memberCols = normalizeCols(kit, [
    { key: 'idx', label: '#', w: 9, align: 'left' },
    { key: 'name', label: 'Thành viên', w: 43, align: 'left', bold: true },
    { key: 'sess', label: 'Buổi', w: 13, align: 'center' },
    { key: 'status', label: 'Trạng thái', w: 25, align: 'center' },
    { key: 'court', label: 'Chi phí sân', w: 24, align: 'right' },
    { key: 'living', label: 'Sinh hoạt', w: 24, align: 'right' },
    { key: 'total', label: 'Tổng chi', w: 24, align: 'right', bold: true },
    { key: 'bal', label: 'Số dư', w: 24, align: 'right', bold: true },
  ])
  const sum = (pick) => rows.reduce((s, r) => s + (Number(pick(r)) || 0), 0)
  const paidCount = rows.filter((r) => r.contributionPaid).length
  const tbl = drawTable(kit, {
    columns: memberCols,
    y,
    onNewPage: () => cont('Chi tiết thành viên'),
    emptyText: 'Chưa có thành viên trong kỳ quỹ này',
    rows: rows.map((r, i) => ({
      idx: i + 1,
      name: r.memberName,
      sess: `${r.attendedSessions}/${r.totalSessions}`,
      status: { t: r.contributionPaid ? 'Đã đóng' : 'Chưa đóng', tone: 'status' },
      court: vnd(r.courtCost),
      living: vnd(r.livingCost),
      total: vnd(r.totalCost),
      bal: { t: signedVnd(r.balance), tone: 'sign' },
    })),
    footerRows: rows.length > 0 ? [{
      __label: 'TỔNG CỘNG', __span: 3,
      status: { t: `${paidCount}/${rows.length} đóng`, tone: 'ink2' },
      court: vnd(sum((r) => r.courtCost)),
      living: vnd(sum((r) => r.livingCost)),
      total: vnd(sum((r) => r.totalCost)),
      bal: { t: signedVnd(sum((r) => r.balance)), tone: 'sign' },
    }] : [],
  })
  y = tbl.y

  /* ── Trang khoản chi ── */
  if (expenseRows.length > 0) {
    const ecols = normalizeCols(kit, [
      { key: 'idx', label: '#', w: 8, align: 'left' },
      { key: 'date', label: 'Ngày', w: 22, align: 'left' },
      { key: 'desc', label: 'Nội dung', w: 52, align: 'left', bold: true },
      { key: 'fund', label: 'Nguồn', w: 22, align: 'center' },
      { key: 'kind', label: 'Loại', w: 25, align: 'left' },
      { key: 'amount', label: 'Số tiền', w: 27, align: 'right' },
      { key: 'status', label: 'Trạng thái', w: 30, align: 'center' },
    ])
    let ey = cont('Khoản chi')
    ey = kit.sectionTitle('Danh sách khoản chi (Quỹ Chính & Quỹ Phụ)', ey)
    let approvedCommon = 0
    let approvedMini = 0
    const dotOf = (k) => (k === 'approved' || k === 'paid' ? C.posFill : k === 'rejected' ? C.negFill : C.warnFill)
    const erows = expenseRows.map((e, i) => {
      const isMini = e.fundKey === 'MINI'
      if (e.statusKey === 'approved' || e.statusKey === 'paid') {
        if (isMini) approvedMini += e.amount
        else approvedCommon += e.amount
      }
      return {
        idx: i + 1,
        date: e.date ?? '',
        desc: e.description ?? '',
        fund: { t: e.fundLabel ?? (isMini ? 'Quỹ Phụ' : 'Quỹ Chính'), tone: isMini ? 'info' : 'ink2' },
        kind: { t: e.kindLabel ?? '', tone: 'ink2' },
        amount: vnd(e.amount),
        status: { t: e.statusLabel ?? '', tone: 'status', dot: dotOf(e.statusKey) },
      }
    })
    const foots = []
    /* Tổng theo NGUỒN — Quỹ Chính khớp "Tổng chi kỳ"; Quỹ Phụ độc lập. Chỉ tính đã duyệt/đã chi. */
    if (expenseRows.some((e) => e.fundKey !== 'MINI')) foots.push({ __label: 'TỔNG CHI QUỸ CHÍNH (đã duyệt / đã chi)', __span: 5, amount: vnd(approvedCommon) })
    if (expenseRows.some((e) => e.fundKey === 'MINI')) foots.push({ __label: 'TỔNG CHI QUỸ PHỤ (đã duyệt / đã chi)', __span: 5, amount: vnd(approvedMini) })
    drawTable(kit, { columns: ecols, y: ey, rows: erows, footerRows: foots, onNewPage: () => cont('Khoản chi'), emptyText: 'Chưa có khoản chi trong kỳ này' })
  }

  /* ── Bill thành viên: 6 thẻ/trang (2 cột × 3 hàng), toạ độ CỐ ĐỊNH ── */
  const CARD_GAP = 6
  const CARD_W = (CW - CARD_GAP) / 2
  const CARD_H = 76
  const ROW_GAP = 5

  const drawCard = (m, x, yy) => {
    const pos = Math.round(Number(m.balance) || 0) >= 0
    const rate = pct(m.attendedSessions, m.totalSessions)
    const px = 5
    kit.fill(C.white)
    kit.stroke(C.lineStrong)
    kit.lw(T.line.border)
    kit.rrect(x, yy, CARD_W, CARD_H, T.radius.card, 'FD')

    /* tên + trạng thái (không header đặc) */
    const badgeTxt = m.contributionPaid ? 'Đã đóng quỹ' : 'Chưa đóng quỹ'
    kit.font('bold', T.type.caption, C.ink2)
    const bw = doc.getTextWidth(badgeTxt) + 4
    kit.font('bold', T.type.h2, C.ink)
    doc.text(kit.fit(m.memberName, CARD_W - px * 2 - bw - 3, T.type.h2, 8.5), x + px, yy + 7.6)
    kit.fill(m.contributionPaid ? C.posFill : C.negFill)
    doc.circle(x + CARD_W - px - bw + 1, yy + 6.5, 1, 'F')
    kit.font('bold', T.type.caption, C.ink2)
    doc.text(badgeTxt, x + CARD_W - px, yy + 7.6, { align: 'right' })
    kit.font('normal', T.type.caption, C.muted)
    doc.text(`${m.attendedSessions}/${m.totalSessions} buổi tham gia`, x + px, yy + 12.2)
    kit.hline(x + px, x + CARD_W - px, yy + 15.4, C.line, T.line.hair)

    /* tỷ lệ tham gia */
    kit.tracked('Tỷ lệ tham gia', x + px, yy + 21, { color: C.muted })
    kit.font('bold', T.type.body, C.ink)
    doc.text(`${rate}%`, x + CARD_W - px, yy + 21, { align: 'right' })
    kit.fill(C.line)
    kit.rrect(x + px, yy + 23.4, CARD_W - px * 2, 2, T.radius.bar, 'F')
    kit.fill(B.brand)
    kit.rrect(x + px, yy + 23.4, Math.max(2, ((CARD_W - px * 2) * Math.min(rate, 100)) / 100), 2, T.radius.bar, 'F')

    /* 4 dòng chi phí — label trái / số phải; nhãn đúng công thức backend */
    const lines = [
      { label: 'Đã nộp quỹ', note: '', val: vnd(m.amountPaid) },
      { label: 'Chi phí sân', note: ' (chia đều)', val: vnd(m.courtCost) },
      { label: 'Sinh hoạt', note: ' (chia đều + theo buổi)', val: vnd(m.livingCost) },
      { label: 'Tổng chi phí', note: '', val: vnd(m.totalCost), total: true },
    ]
    let cy = yy + 29
    lines.forEach((ln) => {
      const mid = cy + 4.4
      if (ln.total) {
        kit.hline(x + px, x + CARD_W - px, cy + 0.4, C.lineStrong, T.line.border)
        kit.font('bold', T.type.body, C.ink)
      } else {
        kit.font('normal', T.type.body, C.ink2)
      }
      doc.text(ln.label, x + px, mid)
      if (ln.note) {
        const lw = doc.getTextWidth(ln.label)
        kit.font('normal', T.type.caption, C.muted)
        doc.text(ln.note, x + px + lw, mid)
      }
      kit.font('bold', T.type.body, C.ink)
      doc.text(ln.val, x + CARD_W - px, mid, { align: 'right' })
      cy += 6.4
    })

    /* ô số dư — âm: hiện SỐ TIỀN CẦN NỘP (dương), nhãn "Cần nộp thêm" đã nói rõ chiều */
    const boxY = cy + 1.4
    const tone = pos ? C.pos : C.neg
    kit.fill(pos ? C.posTint : C.negTint)
    kit.rrect(x + px, boxY, CARD_W - px * 2, 11.4, T.radius.card, 'F')
    kit.font('bold', T.type.cell, tone)
    doc.text(pos ? 'Số dư của bạn' : 'Cần nộp thêm', x + px + 3, boxY + 4.8)
    kit.font('normal', T.type.caption, tone)
    doc.text(pos ? 'Chuyển sang kỳ tiếp theo' : 'Vui lòng nộp bổ sung', x + px + 3, boxY + 8.8)
    kit.font('bold', T.type.h2, tone)
    doc.text(pos ? '+' + vnd(m.balance) : vnd(Math.abs(Number(m.balance) || 0)), x + CARD_W - px - 3, boxY + 7.6, { align: 'right' })
  }

  if (rows.length > 0) {
    const totalBillPages = Math.ceil(rows.length / 6)
    for (let pg = 0; pg < totalBillPages; pg++) {
      const top = cont('Bill chi tiết thành viên', `Bill ${pg + 1} / ${totalBillPages}`)
      rows.slice(pg * 6, pg * 6 + 6).forEach((m, i) => {
        drawCard(m, M + (i % 2) * (CARD_W + CARD_GAP), top + Math.floor(i / 2) * (CARD_H + ROW_GAP))
      })
    }
  }

  drawFooterAll(kit, { club, title: TITLE, docCode })
  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   BẢNG XẾP HẠNG / LỊCH / DANH SÁCH — vector, dùng chung mọi bộ môn & mọi bảng danh sách.
   meta = { clubName, tournamentName, sportLabel, formatLabel, exportedDateText, exportedAtText,
            title?, rankNote?, highlightTop3?, emptyText?, docType?, docCode? }
   columns = [{ key, label, w, align:'left'|'center'|'right', tone?, bold?, wrap? }]
     tone ∈ 'win'|'loss'|'points'|'muted'|'sign'|'status' (status = chấm màu + chữ)
     Tổng bề rộng cột tự co/giãn về đúng CONTENT_W.
   rows = [{ [key]: string|number }]   (key 'rank' tự đánh số thứ hạng; { __section } = dòng nhóm)
   stats = [{ label, value }]  (dải thẻ KPI phía trên, tùy chọn)
   footerRow = { [key]: string|number }  (hàng TỔNG cuối bảng, tùy chọn)
═══════════════════════════════════════════════════════════════════ */
export function buildStandingsReportPDF({ jsPDF, fonts, meta, columns: rawColumns, rows, stats, branding, footerRow }) {
  const doc = newDoc(jsPDF, fonts)
  const kit = createKit(doc, branding)
  const { T } = kit
  const club = meta.clubName || branding.name
  const TITLE = String(meta.title || 'BẢNG XẾP HẠNG')
  const docCode = meta.docCode || fmt.docCode(meta.docType || 'BXH')
  const cont = contFactory(kit, { club, title: TITLE, docCode })
  const columns = normalizeCols(kit, rawColumns)

  // Ghép các phần KHÔNG rỗng bằng ' · ' — báo cáo không-giải-đấu chỉ truyền 1 phần.
  const subLine = [meta.sportLabel, meta.tournamentName].filter((v) => v != null && String(v).trim() !== '').join(' · ')
  let y = kit.masthead({
    club,
    title: TITLE,
    subtitle: subLine,
    docCode,
    exportedText: meta.exportedAtText,
    right: [meta.formatLabel],
  })

  const st = (stats || []).map((s) => ({ label: s.label, value: String(s.value), compact: false, accent: false }))
  if (st.length > 0) {
    st[0].accent = true
    y = kit.kpiGrid(st, y, { max: 4, after: T.space.m })
  }

  const tbl = drawTable(kit, {
    columns,
    y,
    rows,
    top3: meta.highlightTop3 !== false,
    emptyText: meta.emptyText || EMPTY_TEXT,
    onNewPage: () => cont(),
    footerRows: footerRow && typeof footerRow === 'object' ? [{ ...footerRow }] : [],
  })
  drawNote(kit, meta.rankNote, tbl.y, () => cont())

  drawFooterAll(kit, { club, title: TITLE, docCode })
  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   SƠ ĐỒ LOẠI TRỰC TIẾP (knockout bracket) — vector, khổ NGANG A4.
   meta = { clubName, tournamentName, sportLabel, championName?, exportedDateText, exportedAtText }
   rounds = [{ label, matches: [{ teamA, teamB, scoreA, scoreB, winner: 'A'|'B'|null, walkover?, pen? }] }]
     round[0] = vòng đầu; mỗi vòng sau số trận = nửa vòng trước (chuẩn single-elimination).
     Trận hoà tỉ số nhưng có `winner` → ghi "đi tiếp" (kèm `pen` nếu có: "pen 4-3").
   Vòng đầu > 16 trận → tự CHIA TRANG: mỗi trang 16 trận (cây con tới 1 trận), rồi trang nhánh cuối.
═══════════════════════════════════════════════════════════════════ */
const KO_MAX_PER_PAGE = 16

export function buildKnockoutReportPDF({ jsPDF, fonts, meta, rounds, branding }) {
  const doc = newDoc(jsPDF, fonts, 'landscape')
  const kit = createKit(doc, branding)
  const { T, C, B, M, CW, W } = kit
  const club = meta.clubName || branding.name
  const TITLE = 'SƠ ĐỒ LOẠI TRỰC TIẾP'
  const docCode = meta.docCode || fmt.docCode('SDN')
  const subLine = [meta.sportLabel, meta.tournamentName].filter((v) => v != null && String(v).trim() !== '').join(' · ')

  /* ── Chia trang ── */
  const pagesPlan = []
  {
    let from = 0
    const depth = Math.round(Math.log2(KO_MAX_PER_PAGE)) + 1 // 16 → 8 → 4 → 2 → 1 = 5 vòng
    while (from < rounds.length) {
      const n = rounds[from].matches.length
      if (n <= KO_MAX_PER_PAGE) { pagesPlan.push(rounds.slice(from)); break }
      for (let a = 0; a < n; a += KO_MAX_PER_PAGE) {
        const sub = []
        for (let d = 0; d < depth && from + d < rounds.length; d++) {
          const lo = a >> d
          sub.push({ label: rounds[from + d].label, matches: rounds[from + d].matches.slice(lo, lo + (KO_MAX_PER_PAGE >> d)) })
        }
        pagesPlan.push(sub)
      }
      from += depth - 1
    }
  }
  if (pagesPlan.length === 0) pagesPlan.push([])

  const drawPage = (pageRounds, pageIdx) => {
    let top
    if (pageIdx === 0) {
      top = kit.masthead({
        club, title: TITLE, subtitle: subLine, docCode, exportedText: meta.exportedAtText,
        right: pagesPlan.length > 1 ? [`Phần ${pageIdx + 1} / ${pagesPlan.length}`] : [],
      })
    } else {
      doc.addPage()
      top = kit.masthead({ first: false, club, title: TITLE, docCode, right: [`Phần ${pageIdx + 1} / ${pagesPlan.length}`] })
    }
    if (meta.championName) {
      kit.tracked('Vô địch', M, top + 3, { color: B.brandInk })
      kit.font('bold', T.type.h2, C.ink)
      doc.text(kit.clip(String(meta.championName), CW / 2), M + kit.trackedWidth('Vô địch') + 3, top + 3.4)
      top += 8
    }

    /* Vùng vẽ nhánh */
    const bracketTop = top + 5
    const bottom = kit.bottom
    const areaH = bottom - bracketTop
    const rs = pageRounds.filter((rd) => rd && rd.matches)
    if (rs.length === 0 || rs[0].matches.length === 0) {
      kit.font('normal', T.type.body, C.muted)
      doc.text(meta.emptyText || EMPTY_TEXT, W / 2, bracketTop + areaH / 2, { align: 'center' })
      return
    }
    const R = Math.max(1, rs.length)
    const colW = CW / R
    const boxW = Math.min(colW - 8, 62)
    const n0 = rs[0].matches.length || 1
    // Khoảng cách dòng (pitch) có GIỚI HẠN để bracket ít đội không bị giãn thưa; khối được CĂN GIỮA dọc.
    const MAX_PITCH = 46
    const pitch = Math.min(areaH / n0, MAX_PITCH)
    const boxH = Math.max(8, Math.min(13, pitch - 1.2))
    const startY = bracketTop + Math.max(0, (areaH - pitch * n0) / 2)

    /* Tâm theo chiều dọc của từng trận mỗi vòng */
    const centers = []
    rs.forEach((rd, r) => {
      if (r === 0) {
        centers[r] = rd.matches.map((_, i) => startY + pitch * (i + 0.5))
      } else {
        centers[r] = rd.matches.map((_, i) => {
          const a = centers[r - 1][2 * i]
          const b = centers[r - 1][2 * i + 1]
          if (a == null) return b != null ? b : startY + (pitch * n0) / 2
          return b != null ? (a + b) / 2 : a
        })
      }
    })

    /* Đường nối giữa các vòng (vẽ trước, nằm dưới hộp) — đậm hơn, đủ tương phản */
    kit.stroke(C.connector)
    kit.lw(T.line.strong)
    for (let r = 1; r < R; r++) {
      const xPrevR = M + (r - 1) * colW + boxW
      const xR = M + r * colW
      const midX = (xPrevR + xR) / 2
      rs[r].matches.forEach((_, i) => {
        const c1 = centers[r - 1][2 * i]
        const c2 = centers[r - 1][2 * i + 1] ?? c1
        const cy = centers[r][i]
        if (c1 == null || cy == null) return
        doc.line(xPrevR, c1, midX, c1)
        doc.line(xPrevR, c2, midX, c2)
        doc.line(midX, c1, midX, c2)
        doc.line(midX, cy, xR, cy)
      })
    }

    /* Hộp trận */
    const drawSide = (x, y, w, name, score, isWinner, isBye, tieNote) => {
      if (isWinner) {
        kit.fill(B.brandSoft)
        doc.rect(x + 0.2, y, w - 0.4, boxH / 2, 'F')
        kit.fill(B.brand)
        doc.rect(x, y, 1, boxH / 2, 'F')
      }
      const my = y + boxH / 4 + 1.3
      let rightEdge = x + w - 2.5
      if (score != null && score !== '') {
        kit.font('bold', T.type.cell, isWinner ? B.brandInk : C.ink2)
        doc.text(String(score), rightEdge, my, { align: 'right' })
        rightEdge -= doc.getTextWidth(String(score)) + 2
      }
      if (tieNote) {
        kit.font('bold', T.type.caption, B.brandInk)
        doc.text(tieNote, rightEdge, my, { align: 'right' })
        rightEdge -= doc.getTextWidth(tieNote) + 2
      }
      kit.font(isWinner ? 'bold' : 'normal', T.type.cell, isBye ? C.muted : isWinner ? B.brandInk : C.ink)
      doc.text(kit.fit(name, rightEdge - (x + 3), T.type.cell, T.type.label), x + 3, my)
    }
    rs.forEach((rd, r) => {
      const x = M + r * colW
      // Nhãn vòng đặt ngay trên hộp đầu tiên của cột (gắn với nội dung, không lơ lửng).
      if (rd.matches.length > 0) {
        kit.tracked(rd.label, x + boxW / 2, centers[r][0] - boxH / 2 - 2.6, { color: B.brandInk, align: 'center', maxW: boxW })
      }
      rd.matches.forEach((m, i) => {
        const cy = centers[r][i]
        const y = cy - boxH / 2
        kit.fill(C.white)
        kit.stroke(C.lineStrong)
        kit.lw(T.line.border)
        kit.rrect(x, y, boxW, boxH, 1.5, 'FD')
        kit.hline(x, x + boxW, y + boxH / 2, C.line, T.line.hair)
        const tie = m.winner && m.scoreA != null && m.scoreB != null && m.scoreA !== '' && String(m.scoreA) === String(m.scoreB)
        const tieNote = tie ? (m.pen ? `pen ${m.pen}` : 'đi tiếp') : ''
        drawSide(x, y, boxW, m.teamA || 'Chờ...', m.scoreA, m.winner === 'A', false, m.winner === 'A' ? tieNote : '')
        drawSide(x, y + boxH / 2, boxW, m.walkover ? '(BYE)' : (m.teamB || 'Chờ...'), m.walkover ? '' : m.scoreB, m.winner === 'B', m.walkover, m.winner === 'B' ? tieNote : '')
      })
    })
  }
  pagesPlan.forEach((pr, i) => drawPage(pr, i))

  drawFooterAll(kit, { club, title: TITLE, docCode })
  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   PHIẾU THU / CHI / BIÊN NHẬN — vector, 1 template: masthead + hero số tiền + khoá–giá trị +
   (bảng chi phí) + chữ ký. Loại phiếu = thẻ chữ nhỏ cạnh tiêu đề (KHÔNG đổi màu cả băng).
═══════════════════════════════════════════════════════════════════ */
function buildReceiptDoc({ jsPDF, fonts, branding, spec }) {
  const doc = newDoc(jsPDF, fonts)
  const kit = createKit(doc, branding)
  const { T, C, M, W } = kit
  const docCode = spec.docCode || fmt.docCode(spec.docType)
  const club = spec.club || branding.name

  let y = kit.masthead({
    club,
    title: spec.title,
    tag: spec.tag,
    subtitle: spec.subtitle,
    docCode,
    exportedText: spec.printedAtText,
    number: spec.number,
    right: spec.right || [],
  })
  y = kit.hero({ y, label: spec.amountLabel, value: vnd(spec.amount), caption: spec.amountCaption, tone: spec.amountTone, status: spec.status })

  for (const sec of spec.sections) {
    if (!sec.rows.length) continue
    y = kit.sectionTitle(sec.title, y)
    y = kit.kvList(sec.rows, y, { rowH: spec.rowH ?? 7.6 })
    if (sec.footnote) {
      kit.font('normal', T.type.caption, C.muted)
      doc.text(kit.clip(sec.footnote, kit.CW), M, y + 3.8)
      y += 4.6
    }
    y += spec.gap ?? T.space.m - 1
  }

  /* chữ ký (neo xuống phần dưới trang cho bố cục cân đối) + ghi chú chân phiếu */
  const noteH = 12
  if (spec.signatures && spec.signatures.length) {
    const sigH = 3 + 24 + 5 + 4 + 6
    // Neo xuống dưới nhưng không để khoảng trống quá 40mm giữa nội dung và ô ký.
    const sigTop = Math.max(y + 12, Math.min(kit.bottom - noteH - sigH, y + 40))
    y = kit.signatures(spec.signatures, sigTop)
  } else {
    y = Math.max(y, kit.bottom - noteH - 4)
  }
  kit.hline(M, W - M, y, C.line, T.line.hair)
  kit.font('normal', T.type.caption, C.muted)
  const noteLines = kit.wrap(spec.note || '', kit.CW * 0.6, 2)
  noteLines.forEach((ln, i) => doc.text(ln, M, y + 4.4 + i * 3.6))
  const loc = String(spec.location || '').trim()
  kit.font('normal', T.type.caption, C.ink2)
  doc.text(kit.clip(`${loc ? loc + ', ' : ''}ngày ${spec.printedDateText}`, kit.CW * 0.38), W - M, y + 4.4, { align: 'right' })

  drawFooterAll(kit, { club, title: spec.title, docCode })
  return doc
}

const padNo = (n) => String(n).padStart(4, '0')

/* ── PHIẾU THU QUỸ PHỤ ──
   receipt = { receiptNo?, payerName, incomeType, amount, paymentDate, notes?, clubName, clubLocation?, printedDateText, printedAtText } */
export function buildMiniReceiptPDF({ jsPDF, fonts, receipt, branding }) {
  const hasNo = receipt.receiptNo != null && receipt.receiptNo !== ''
  return buildReceiptDoc({
    jsPDF, fonts, branding,
    spec: {
      docType: 'PTP',
      club: receipt.clubName,
      title: 'PHIẾU THU QUỸ PHỤ',
      tag: 'Quỹ Phụ',
      subtitle: receipt.clubName,
      number: hasNo ? `Số ${padNo(receipt.receiptNo)}` : '',
      printedAtText: receipt.printedAtText,
      printedDateText: receipt.printedDateText,
      location: receipt.clubLocation,
      amountLabel: 'Số tiền thu Quỹ Phụ',
      amount: receipt.amount,
      amountCaption: receipt.paymentDate ? `Ngày nộp: ${receipt.paymentDate}` : '',
      sections: [{
        title: 'Thông tin khoản thu',
        rows: [
          { k: 'Người nộp', v: receipt.payerName, lines: 2 },
          { k: 'Loại thu', v: receipt.incomeType, tone: 'brand', lines: 2 },
          { k: 'Ngày nộp', v: receipt.paymentDate },
          ...(receipt.notes ? [{ k: 'Ghi chú', v: receipt.notes, lines: 6, bold: false }] : []),
        ],
      }],
      signatures: [
        { title: 'Thủ quỹ xác nhận', name: '(Ký và ghi rõ họ tên)' },
        { title: 'Người nộp', name: receipt.payerName },
      ],
      note: 'Phiếu thu Quỹ Phụ – không tính vào công nợ thành viên Quỹ Chính.',
    },
  })
}

/* ── PHIẾU CHI QUỸ PHỤ ──
   receipt = { receiptNo?, receiverName, expenseType, amount, expenseDate, description, notes?, clubName, clubLocation?, printedDateText, printedAtText } */
export function buildMiniExpensePDF({ jsPDF, fonts, receipt, branding }) {
  const hasNo = receipt.receiptNo != null && receipt.receiptNo !== ''
  return buildReceiptDoc({
    jsPDF, fonts, branding,
    spec: {
      docType: 'PCP',
      club: receipt.clubName,
      title: 'PHIẾU CHI QUỸ PHỤ',
      tag: 'Quỹ Phụ',
      subtitle: receipt.clubName,
      number: hasNo ? `Số ${padNo(receipt.receiptNo)}` : '',
      printedAtText: receipt.printedAtText,
      printedDateText: receipt.printedDateText,
      location: receipt.clubLocation,
      amountLabel: 'Số tiền chi Quỹ Phụ',
      amount: receipt.amount,
      amountTone: 'ink',
      amountCaption: receipt.expenseDate ? `Ngày chi: ${receipt.expenseDate}` : '',
      sections: [{
        title: 'Thông tin khoản chi',
        rows: [
          { k: 'Mô tả', v: receipt.description, lines: 4 },
          { k: 'Người nhận', v: receipt.receiverName, lines: 2 },
          { k: 'Loại chi', v: receipt.expenseType, tone: 'brand', lines: 2 },
          { k: 'Ngày chi', v: receipt.expenseDate },
          ...(receipt.notes ? [{ k: 'Ghi chú', v: receipt.notes, lines: 6, bold: false }] : []),
        ],
      }],
      signatures: [
        { title: 'Thủ quỹ xác nhận', name: '(Ký và ghi rõ họ tên)' },
        { title: 'Người nhận', name: receipt.receiverName },
      ],
      note: 'Phiếu chi Quỹ Phụ – không phân bổ cá nhân, không ảnh hưởng Quỹ Chính.',
    },
  })
}

/* ── PHIẾU THU CÁ NHÂN (đóng quỹ thành viên) ──
   receipt = { receiptNo?, memberName, loginName?, periodName, periodStartDate?, periodEndDate?, contributionAmount?,
               clubName, clubLocation?, amountPaid, paymentDate?, attendedSessions, totalSessions, totalCourtFee?,
               memberCountForSplit?, courtCost, totalOtherFee?, livingCost, totalCost, balance, isConfirmed,
               printedDateText, printedAtText } */
export function buildPersonalReceiptPDF({ jsPDF, fonts, receipt: d, branding }) {
  const hasNo = d.receiptNo != null && d.receiptNo !== ''
  const split = d.memberCountForSplit && d.memberCountForSplit > 0 ? d.memberCountForSplit : undefined
  // Tổng toàn quỹ: dùng số backend đưa; chỉ suy ngược khi có sĩ số thật; thiếu cả hai → ẩn dòng.
  const totalCourt = d.totalCourtFee ?? (split ? d.courtCost * split : undefined)
  const isPos = d.balance >= 0
  return buildReceiptDoc({
    jsPDF, fonts, branding,
    spec: {
      docType: 'PTQ',
      club: d.clubName,
      title: 'PHIẾU THU QUỸ',
      tag: 'Quỹ Chính',
      subtitle: d.periodName,
      number: hasNo ? `Số ${padNo(d.receiptNo)}` : '',
      printedAtText: d.printedAtText,
      printedDateText: d.printedDateText,
      location: d.clubLocation,
      amountLabel: 'Số tiền đã đóng quỹ',
      amount: d.amountPaid,
      amountCaption: d.paymentDate ? `Ngày đóng: ${d.paymentDate}` : '',
      status: { text: d.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận', dot: d.isConfirmed ? THEME.color.posFill : THEME.color.warnFill },
      gap: 5,
      sections: [
        {
          title: 'Thông tin thành viên và quỹ',
          rows: [
            { k: 'Họ và tên', v: d.memberName, lines: 2 },
            ...(d.loginName ? [{ k: 'Tên đăng nhập', v: d.loginName }] : []),
            { k: 'Số buổi tham gia', v: `${d.attendedSessions} / ${d.totalSessions} buổi` },
            { k: 'Kỳ quỹ', v: d.periodName, tone: 'brand', lines: 2 },
            ...(d.periodStartDate && d.periodEndDate ? [{ k: 'Thời gian', v: `${d.periodStartDate} – ${d.periodEndDate}` }] : []),
            { k: 'Mức đóng', v: vnd(d.contributionAmount ?? d.amountPaid) },
          ],
        },
        {
          title: `Chi tiết chi phí của bạn – ${d.periodName}`,
          rows: [
            ...(totalCourt != null ? [{ k: 'Tổng tiền sân toàn quỹ', v: vnd(totalCourt), bold: false }] : []),
            { k: `Tiền sân – chia đều theo sĩ số${split ? ` / ${split} người` : ''}`, v: vnd(d.courtCost) },
            ...(d.totalOtherFee != null ? [{ k: 'Tổng chi khác toàn quỹ', v: vnd(d.totalOtherFee), bold: false }] : []),
            { k: 'Sinh hoạt (chia đều + theo buổi tham dự)', v: vnd(d.livingCost) },
            { k: 'Tổng chi phí của bạn', v: vnd(d.totalCost), total: true },
          ],
        },
        {
          title: 'Thanh toán',
          rows: [
            { k: 'Bạn đã nộp quỹ', v: vnd(d.amountPaid) },
            { k: isPos ? 'Số dư của bạn' : 'Số tiền cần nộp thêm', v: (isPos && d.balance > 0 ? '+' : '') + vnd(d.balance), tone: isPos ? 'pos' : 'neg' },
          ],
          footnote: isPos ? 'Số dư sẽ dùng cho các buổi tiếp theo.' : '',
        },
      ],
      signatures: [
        { title: 'Thủ quỹ xác nhận', name: d.isConfirmed ? '(Đã xác nhận)' : '(Ký và ghi rõ họ tên)', sub: 'Thủ quỹ CLB' },
        { title: 'Người đóng quỹ', name: d.memberName, sub: 'Thành viên CLB' },
      ],
      note: 'Phiếu này xác nhận việc đóng quỹ của thành viên. Mọi thắc mắc liên hệ Ban Quản lý CLB.',
    },
  })
}

/* ── BIÊN NHẬN THANH TOÁN GÓI (billing) ──
   receipt = { clubName, invoiceNumber, orderCode, planLabel, cycleLabel, amount, discount?, paidAtText, gateway,
               billingInfo?, printedDateText, printedAtText } */
export function buildBillingReceiptPDF({ jsPDF, fonts, receipt: d, branding }) {
  const gross = d.amount + (d.discount ?? 0)
  const bi = d.billingInfo
  // "Gói Pro" đã có tiền tố "Gói" → không lặp thành "Gói dịch vụ Gói Pro".
  const plan = /^gói\b/i.test(String(d.planLabel).trim()) ? String(d.planLabel).trim() : `Gói ${d.planLabel}`
  const planCycle = `${plan} · ${d.cycleLabel}`
  const hasBuyer = bi && (bi.buyerName || bi.taxCode || bi.address)
  return buildReceiptDoc({
    jsPDF, fonts, branding,
    spec: {
      docType: 'BNTT',
      club: d.clubName,
      title: 'BIÊN NHẬN THANH TOÁN',
      tag: 'Gói dịch vụ',
      subtitle: planCycle,
      number: d.invoiceNumber ? `Số ${d.invoiceNumber}` : '',
      printedAtText: d.printedAtText,
      printedDateText: d.printedDateText,
      amountLabel: 'Đã thanh toán',
      amount: d.amount,
      amountCaption: d.paidAtText ? `Ngày thanh toán: ${d.paidAtText}` : '',
      status: { text: 'Thành công', dot: THEME.color.posFill },
      sections: [
        {
          title: 'Thông tin giao dịch',
          rows: [
            { k: 'Câu lạc bộ', v: d.clubName, lines: 2 },
            { k: 'Mã đơn', v: d.orderCode },
            { k: 'Số biên nhận', v: d.invoiceNumber },
            { k: 'Gói · chu kỳ', v: planCycle },
            { k: 'Hình thức thanh toán', v: d.gateway },
          ],
        },
        ...(hasBuyer ? [{
          title: 'Đơn vị mua',
          rows: [
            { k: 'Tên đơn vị', v: bi.buyerName ?? '—', lines: 2 },
            ...(bi.taxCode ? [{ k: 'Mã số thuế', v: bi.taxCode }] : []),
            ...(bi.address ? [{ k: 'Địa chỉ', v: bi.address, lines: 3 }] : []),
          ],
        }] : []),
        {
          title: 'Chi tiết thanh toán',
          rows: [
            { k: 'Giá gốc', v: vnd(gross), bold: false },
            ...(d.discount ? [{ k: 'Ưu đãi', v: '-' + vnd(d.discount) }] : []),
            { k: 'Đã thanh toán', v: vnd(d.amount), total: true },
          ],
        },
      ],
      note: 'Biên nhận điện tử – không cần chữ ký.',
    },
  })
}

/* ═══════════════════════════════════════════════════════════════════
   BÁO CÁO CHI PHÍ — vector, dùng chung mọi CLB.
   summary = { clubName, periodName, totalAll, totalCommon, totalMini,
               totalApproved, totalPending, count, exportedDateText, exportedAtText,
               totalLabel?, totalRowLabel?, docCode? }
   rows = [{ code, description, kindLabel, dateText, amount, statusKey }]
     statusKey ∈ 'approved' | 'pending' | 'paid' | 'rejected'
═══════════════════════════════════════════════════════════════════ */
const EXP_STATUS = {
  approved: { label: 'Đã duyệt', dot: THEME.color.posFill },
  paid: { label: 'Đã chi', dot: THEME.color.posFill },
  pending: { label: 'Chờ duyệt', dot: THEME.color.warnFill },
  rejected: { label: 'Từ chối', dot: THEME.color.negFill },
}

export function buildExpenseReportPDF({ jsPDF, fonts, summary, rows, branding }) {
  const doc = newDoc(jsPDF, fonts)
  const kit = createKit(doc, branding)
  const { T } = kit
  const club = summary.clubName || branding.name
  const TITLE = 'BÁO CÁO CHI PHÍ'
  const docCode = summary.docCode || fmt.docCode('BCC')
  const cont = contFactory(kit, { club, title: TITLE, docCode })

  let y = kit.masthead({
    club,
    title: TITLE,
    subtitle: summary.periodName,
    docCode,
    exportedText: summary.exportedAtText,
    right: [`${summary.count} khoản chi`],
  })

  /* Dải KPI: Tổng chi (nhấn) / Quỹ Chính / Quỹ Phụ / Đã duyệt / Chờ duyệt */
  const items = [
    { label: summary.totalLabel || 'Tổng chi', value: vnd(summary.totalAll) },
    { label: 'Quỹ Chính', value: vnd(summary.totalCommon) },
    { label: 'Quỹ Phụ', value: vnd(summary.totalMini) },
    { label: 'Đã duyệt', value: vnd(summary.totalApproved) },
    { label: 'Chờ duyệt', value: vnd(summary.totalPending) },
  ]
  y = kit.kpiGrid(items, y, { perRow: 5, after: T.space.m })

  const cols = normalizeCols(kit, [
    { key: 'idx', label: '#', w: 8, align: 'left' },
    { key: 'code', label: 'Mã chi', w: 24, align: 'left' },
    { key: 'desc', label: 'Nội dung', w: 48, align: 'left', bold: true },
    { key: 'kind', label: 'Phân bổ', w: 28, align: 'left' },
    { key: 'date', label: 'Ngày', w: 22, align: 'left' },
    { key: 'amount', label: 'Số tiền', w: 26, align: 'right', bold: true },
    { key: 'status', label: 'Trạng thái', w: 30, align: 'center' },
  ])
  drawTable(kit, {
    columns: cols,
    y,
    onNewPage: () => cont(),
    emptyText: 'Chưa có khoản chi trong kỳ này',
    rows: rows.map((r, i) => {
      const st = EXP_STATUS[r.statusKey] ?? EXP_STATUS.pending
      return {
        idx: i + 1,
        code: { t: r.code, tone: 'ink2' },
        desc: r.description,
        kind: { t: r.kindLabel, tone: 'ink2' },
        date: r.dateText,
        amount: vnd(r.amount),
        status: { t: st.label, tone: 'status', dot: st.dot },
      }
    }),
    footerRows: [{ __label: summary.totalRowLabel || 'TỔNG CỘNG', __span: 5, amount: vnd(summary.totalAll) }],
  })

  drawFooterAll(kit, { club, title: TITLE, docCode })
  return doc
}
