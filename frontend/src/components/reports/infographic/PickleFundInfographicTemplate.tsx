import { useEffect } from 'react'
import type { InfographicReportData } from './infographic.types'

function formatVND(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ'
}
function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
function getAttendancePercent(attended: number, total: number) {
  if (!total) return 0
  return Math.round((attended / total) * 100)
}
function getRatioWidth(ratio: number) { return Math.min(Math.max(ratio, 0), 100) }
function getRatioStatus(ratio: number) {
  if (ratio > 100) return 'Vượt ngân sách'
  if (ratio >= 80) return 'Cần theo dõi'
  return 'Ổn định'
}
function getMemberNote(balance: number, isPaid: boolean) {
  if (balance < 0) return { icon: '⚠️', title: 'Cần nộp thêm ' + formatVND(Math.abs(balance)), subtitle: 'Vui lòng bổ sung', cls: 'danger' }
  if (balance > 0) return { icon: '✅', title: 'Số dư ' + formatVND(balance), subtitle: 'Chuyển sang kỳ tiếp theo', cls: 'success' }
  if (isPaid) return { icon: '✅', title: 'Đã cân đối', subtitle: 'Không phát sinh thêm', cls: 'success' }
  return { icon: '⏳', title: 'Chưa đóng quỹ', subtitle: 'Vui lòng hoàn thành', cls: 'danger' }
}

const INFOGRAPHIC_CSS = `
.pf-export-wrap {
  width: 100%;
  min-height: 100vh;
  background: #eafaf1;
  display: flex;
  justify-content: center;
  padding: 32px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.pf-infographic {
  width: 1080px;
  min-height: 1920px;
  background:
    radial-gradient(circle at 20% 8%, rgba(250, 204, 21, 0.18), transparent 220px),
    radial-gradient(circle at 85% 12%, rgba(37, 99, 235, 0.14), transparent 260px),
    linear-gradient(180deg, #ecfdf5 0%, #f8fafc 36%, #ecfdf5 100%);
  color: #0f172a;
  overflow: hidden;
  border-radius: 0;
}
.pf-hero {
  position: relative;
  min-height: 360px;
  padding: 34px 42px 36px;
  background: linear-gradient(135deg, rgba(5,150,105,0.96), rgba(11,42,74,0.96)),
    linear-gradient(180deg, #10b981, #0b2a4a);
  color: white;
  overflow: hidden;
}
.pf-hero::after {
  content: "";
  position: absolute;
  inset: auto -80px -110px -80px;
  height: 210px;
  background:
    linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255,255,255,.08) 1px, transparent 1px);
  background-size: 110px 70px;
  transform: perspective(400px) rotateX(55deg);
  opacity: .55;
}
.pf-hero > * { position: relative; z-index: 2; }
.pf-hero-bg-shapes { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.pf-ball {
  position: absolute;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #fff7a8 0 8%, transparent 9%),
    radial-gradient(circle at 65% 35%, #fff7a8 0 7%, transparent 8%),
    radial-gradient(circle at 45% 65%, #fff7a8 0 7%, transparent 8%),
    linear-gradient(135deg, #facc15, #a3e635);
  box-shadow: 0 24px 60px rgba(0,0,0,.22);
  opacity: .95;
}
.pf-ball-lg { width: 170px; height: 170px; right: 38px; top: 86px; }
.pf-ball-sm { width: 74px; height: 74px; right: 220px; top: 34px; opacity: .32; }
.pf-paddle {
  position: absolute;
  width: 62px;
  height: 128px;
  border-radius: 34px 34px 46px 46px;
  background: rgba(255,255,255,.12);
  transform: rotate(-24deg);
  filter: blur(.1px);
}
.pf-paddle-left { left: 54px; bottom: 30px; }
.pf-paddle-right { right: 122px; bottom: 44px; transform: rotate(28deg); }
.pf-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.pf-sport-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.24);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.pf-badge-dot { width: 10px; height: 10px; border-radius: 999px; background: linear-gradient(135deg, #facc15, #ec4899); }
.pf-date-box { text-align: right; font-size: 13px; color: rgba(255,255,255,.72); }
.pf-date-box strong { display: block; margin-top: 6px; font-size: 20px; color: #fff; font-weight: 900; }
.pf-hero-main { margin-top: 54px; display: flex; justify-content: space-between; align-items: center; gap: 32px; }
.pf-hero h1 { margin: 0; font-size: 64px; line-height: .92; letter-spacing: -0.06em; font-weight: 950; }
.pf-hero-main p { margin: 8px 0 18px; font-size: 27px; line-height: 1; font-weight: 950; letter-spacing: .18em; color: #facc15; }
.pf-fund-pill {
  display: inline-flex;
  max-width: 690px;
  padding: 12px 22px;
  border-radius: 999px;
  background: rgba(15,23,42,.38);
  border: 1px solid rgba(255,255,255,.18);
  font-size: 18px;
  font-weight: 850;
  white-space: normal;
}
.pf-club-shield {
  width: 150px;
  height: 170px;
  border-radius: 28px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.22);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  box-shadow: 0 22px 50px rgba(0,0,0,.18);
  flex-shrink: 0;
}
.pf-club-shield span { font-size: 48px; }
.pf-club-shield strong { font-size: 15px; font-weight: 950; }
.pf-hero-stats {
  margin-top: 42px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: rgba(2,6,23,.28);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 24px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}
.pf-hero-stats div { min-height: 92px; padding: 18px; display: grid; place-items: center; border-right: 1px solid rgba(255,255,255,.12); }
.pf-hero-stats div:last-child { border-right: none; }
.pf-hero-stats span { font-size: 22px; }
.pf-hero-stats strong { font-size: 28px; line-height: 1; font-weight: 950; }
.pf-hero-stats small { font-size: 13px; color: rgba(255,255,255,.76); }
.pf-kpi-grid { padding: 34px 32px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.pf-kpi-card {
  position: relative;
  min-height: 168px;
  padding: 28px 26px;
  border-radius: 30px;
  background: rgba(255,255,255,.96);
  border: 1px solid rgba(226,232,240,.95);
  box-shadow: 0 20px 50px rgba(15,23,42,.08);
  overflow: hidden;
}
.pf-kpi-card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 8px; }
.pf-kpi-income::before { background: #10b981; }
.pf-kpi-expense::before { background: #f97316; }
.pf-kpi-balance::before { background: #2563eb; }
.pf-kpi-balance.negative::before { background: #ef4444; }
.pf-kpi-icon { position: absolute; right: 22px; top: 22px; width: 52px; height: 52px; border-radius: 18px; background: #f1f5f9; display: grid; place-items: center; font-size: 28px; }
.pf-kpi-card span { display: block; margin-top: 16px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: .16em; font-weight: 950; }
.pf-kpi-card strong { display: block; margin-top: 16px; font-size: 36px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.pf-kpi-card small { display: block; margin-top: 12px; font-size: 14px; color: #64748b; font-weight: 700; }
.pf-kpi-income strong { color: #059669; }
.pf-kpi-expense strong { color: #ea580c; }
.pf-kpi-balance strong { color: #2563eb; }
.pf-kpi-balance.negative strong { color: #ef4444; }
.pf-ratio-card { margin: 24px 32px 0; padding: 28px; border-radius: 30px; background: rgba(255,255,255,.96); border: 1px solid #e2e8f0; box-shadow: 0 16px 40px rgba(15,23,42,.06); }
.pf-section-head, .pf-section-title-row { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
.pf-section-head h2, .pf-section-title-row h2, .pf-summary-card h2 { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 950; color: #0b2a4a; letter-spacing: .02em; text-transform: uppercase; }
.pf-warning-badge { padding: 9px 16px; border-radius: 999px; background: #fee2e2; color: #ef4444; font-size: 14px; font-weight: 950; white-space: nowrap; }
.pf-ratio-track { position: relative; margin-top: 22px; height: 26px; border-radius: 999px; background: #e2e8f0; overflow: visible; }
.pf-ratio-fill { height: 100%; max-width: 100%; border-radius: 999px; background: linear-gradient(90deg, #22c55e 0%, #a3e635 48%, #facc15 70%, #f97316 88%, #ef4444 100%); }
.pf-ratio-pin { position: absolute; top: 50%; width: 38px; height: 38px; border-radius: 999px; background: white; border: 4px solid #334155; transform: translate(-50%, -50%); box-shadow: 0 8px 20px rgba(15,23,42,.24); }
.pf-ratio-meta { margin-top: 20px; display: flex; justify-content: space-between; color: #64748b; font-size: 15px; }
.pf-ratio-meta b { color: #059669; }
.pf-ratio-meta span:last-child b { color: #ef4444; }
.pf-mini-stats { padding: 24px 32px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.pf-mini-card { min-height: 138px; padding: 20px; border-radius: 26px; background: rgba(255,255,255,.94); border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 12px 30px rgba(15,23,42,.05); }
.pf-mini-card span { display: block; font-size: 30px; margin-bottom: 10px; }
.pf-mini-card small { display: block; color: #64748b; font-size: 13px; font-weight: 800; }
.pf-mini-card strong { display: block; margin-top: 9px; font-size: 31px; font-weight: 950; }
.pf-mini-card.success strong { color: #059669; }
.pf-mini-card.danger strong { color: #ef4444; }
.pf-members-section { padding: 34px 32px 0; }
.pf-status-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.pf-status-pills span { padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 900; }
.pf-status-pills .ok { background: #dcfce7; color: #059669; border: 1px solid #86efac; }
.pf-status-pills .wait { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
.pf-member-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
.pf-member-card { position: relative; min-height: 282px; padding: 22px; border-radius: 30px; background: rgba(255,255,255,.96); border: 1px solid #e2e8f0; box-shadow: 0 18px 44px rgba(15,23,42,.07); overflow: hidden; }
.pf-member-card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 7px; background: #10b981; }
.pf-member-card.unpaid::before { background: #f97316; }
.pf-member-card.negative::before { background: #ef4444; }
.pf-member-top { display: grid; grid-template-columns: 62px 1fr auto; gap: 15px; align-items: start; }
.pf-avatar { width: 58px; height: 58px; border-radius: 20px; display: grid; place-items: center; background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; font-size: 18px; font-weight: 950; }
.pf-member-name-wrap { min-width: 0; }
.pf-member-name-wrap h3 { margin: 2px 0 9px; font-size: 21px; line-height: 1.18; font-weight: 950; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pf-member-badge { display: inline-flex; max-width: 100%; min-height: 28px; align-items: center; padding: 6px 12px; border-radius: 999px; font-size: 12px; line-height: 1.1; font-weight: 950; white-space: normal; }
.pf-member-badge.paid { background: #dcfce7; color: #059669; border: 1px solid #86efac; }
.pf-member-badge.unpaid { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
.pf-member-index { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; background: #f1f5f9; color: #94a3b8; font-size: 12px; font-weight: 950; }
.pf-attendance-row { margin-top: 18px; display: flex; justify-content: space-between; gap: 12px; font-size: 14px; color: #64748b; }
.pf-attendance-row strong { color: #0f172a; font-weight: 950; white-space: nowrap; }
.pf-progress { margin-top: 10px; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.pf-progress div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #10b981, #22c55e); }
.pf-member-card.unpaid .pf-progress div { background: linear-gradient(90deg, #f59e0b, #f97316); }
.pf-member-money { margin-top: 18px; padding: 16px; border-radius: 22px; background: #f8fafc; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pf-member-money small { display: block; color: #94a3b8; font-size: 11px; font-weight: 800; margin-bottom: 6px; }
.pf-member-money strong { display: block; font-size: 14px; line-height: 1.15; font-weight: 950; color: #0f172a; word-break: keep-all; }
.pf-positive { color: #059669 !important; }
.pf-negative { color: #ef4444 !important; }
.pf-member-note { margin-top: 16px; padding: 15px 16px; border-radius: 20px; display: flex; gap: 12px; align-items: center; }
.pf-member-note.danger { background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; }
.pf-member-note.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #059669; }
.pf-member-note strong { display: block; font-size: 14px; font-weight: 950; }
.pf-member-note small { display: block; margin-top: 3px; font-size: 12px; color: #64748b; }
.pf-summary-card { margin: 34px 32px 0; padding: 26px; border-radius: 30px; background: rgba(255,255,255,.96); border: 1px solid #e2e8f0; box-shadow: 0 14px 36px rgba(15,23,42,.06); }
.pf-summary-list { margin-top: 18px; display: grid; gap: 12px; }
.pf-summary-list div { min-height: 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; }
.pf-summary-list div:last-child { border-bottom: none; }
.pf-summary-list span { color: #64748b; font-size: 15px; font-weight: 750; }
.pf-summary-list strong { font-size: 20px; font-weight: 950; }
.pf-footer-poster {
  position: relative;
  margin-top: 34px;
  min-height: 220px;
  padding: 48px 34px 34px;
  text-align: center;
  color: white;
  background:
    radial-gradient(circle at 16% 20%, rgba(250,204,21,.24), transparent 120px),
    radial-gradient(circle at 88% 70%, rgba(37,99,235,.22), transparent 160px),
    linear-gradient(135deg, #064e3b, #0b2a4a);
  overflow: hidden;
}
.pf-footer-poster h2 { margin: 0; font-size: 31px; font-weight: 950; letter-spacing: .04em; }
.pf-footer-poster h3 { margin: 6px 0 0; font-size: 38px; font-weight: 950; color: #facc15; letter-spacing: .04em; }
.pf-footer-poster p { margin: 10px 0 0; color: rgba(255,255,255,.76); font-size: 15px; font-weight: 650; }
.pf-player-left, .pf-player-right { position: absolute; bottom: 10px; width: 120px; height: 150px; opacity: .18; border-radius: 60px 60px 20px 20px; background: rgba(255,255,255,.4); }
.pf-player-left { left: 42px; transform: rotate(-16deg); }
.pf-player-right { right: 42px; transform: rotate(16deg); }
.pf-footer-ball { position: absolute; width: 54px; height: 54px; border-radius: 999px; left: 50%; bottom: 26px; transform: translateX(-50%); background: linear-gradient(135deg, #facc15, #a3e635); box-shadow: 0 12px 30px rgba(0,0,0,.25); }
.pf-footer-art { position: absolute; inset: 0; pointer-events: none; }
.pf-footer { min-height: 78px; padding: 0 32px; display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center; gap: 16px; background: #022c22; color: rgba(255,255,255,.72); font-size: 14px; }
.pf-footer strong { color: white; font-size: 20px; font-weight: 950; }
.pf-footer span:nth-child(2) { text-align: center; }
.pf-footer span:last-child { text-align: right; }
@media (max-width: 900px) {
  .pf-export-wrap { padding: 0; background: #ecfdf5; }
  .pf-infographic { width: 100%; min-height: auto; }
  .pf-hero { padding: 24px 22px 28px; min-height: 330px; }
  .pf-hero h1 { font-size: 46px; }
  .pf-hero-main p { font-size: 20px; }
  .pf-club-shield { display: none; }
  .pf-kpi-grid, .pf-mini-stats, .pf-member-grid { grid-template-columns: 1fr; }
  .pf-kpi-grid, .pf-mini-stats, .pf-members-section { padding-left: 18px; padding-right: 18px; }
  .pf-ratio-card, .pf-summary-card { margin-left: 18px; margin-right: 18px; }
  .pf-member-money { grid-template-columns: 1fr; }
  .pf-footer { grid-template-columns: 1fr; text-align: center; padding: 20px; }
  .pf-footer span:nth-child(2), .pf-footer span:last-child { text-align: center; }
}
`

export function PickleFundInfographicTemplate({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-pf-infographic', 'true')
    el.textContent = INFOGRAPHIC_CSS
    document.head.appendChild(el)
    return () => { if (document.head.contains(el)) document.head.removeChild(el) }
  }, [])

  return (
    <div className="pf-export-wrap">
      <article className="pf-infographic" id={id}>

        {/* HERO */}
        <section className="pf-hero">
          <div className="pf-hero-bg-shapes">
            <span className="pf-ball pf-ball-lg" />
            <span className="pf-ball pf-ball-sm" />
            <span className="pf-paddle pf-paddle-left" />
            <span className="pf-paddle pf-paddle-right" />
          </div>

          <div className="pf-hero-top">
            <div className="pf-sport-badge">
              <span className="pf-badge-dot" />
              PICKLEFUND · SPORT CLUB
            </div>
            <div className="pf-date-box">
              <span>Xuất ngày</span>
              <strong>{data.exportDate}</strong>
            </div>
          </div>

          <div className="pf-hero-main">
            <div>
              <h1>PICKLEFUND</h1>
              <p>BÁO CÁO TÀI CHÍNH</p>
              <div className="pf-fund-pill">📋 {data.periodLabel}</div>
            </div>
            <div className="pf-club-shield">
              <span>🏓</span>
              <strong>{data.clubName}</strong>
            </div>
          </div>

          <div className="pf-hero-stats">
            <div>
              <span>👥</span>
              <strong>{data.totalMembers}</strong>
              <small>thành viên</small>
            </div>
            <div>
              <span>📅</span>
              <strong>{data.totalSessions}</strong>
              <small>buổi tập</small>
            </div>
            <div>
              <span>✅</span>
              <strong>{data.paidMembers}/{data.totalMembers}</strong>
              <small>đã đóng quỹ</small>
            </div>
          </div>
        </section>

        {/* KPI SCOREBOARD */}
        <section className="pf-kpi-grid">
          <div className="pf-kpi-card pf-kpi-income">
            <div className="pf-kpi-icon">💰</div>
            <span>Tổng thu</span>
            <strong>{formatVND(data.totalIncome)}</strong>
            <small>{data.paidMembers}/{data.totalMembers} thành viên đóng</small>
          </div>
          <div className="pf-kpi-card pf-kpi-expense">
            <div className="pf-kpi-icon">📤</div>
            <span>Tổng chi</span>
            <strong>{formatVND(data.totalExpense)}</strong>
            <small>Tỷ lệ chi/thu: {Math.round(data.expenseIncomeRatio)}%</small>
          </div>
          <div className={`pf-kpi-card pf-kpi-balance${data.fundBalance < 0 ? ' negative' : ''}`}>
            <div className="pf-kpi-icon">{data.fundBalance < 0 ? '⚠️' : '🏦'}</div>
            <span>Số dư quỹ</span>
            <strong>{data.fundBalance < 0 ? '-' : '+'}{formatVND(Math.abs(data.fundBalance))}</strong>
            <small>{data.fundBalance < 0 ? 'Quỹ đang âm' : data.fundBalance === 0 ? 'Cân đối thu chi' : 'Quỹ dương'}</small>
          </div>
        </section>

        {/* RATIO */}
        <section className="pf-ratio-card">
          <div className="pf-section-head">
            <h2>Tỷ lệ chi / thu</h2>
            <span className="pf-warning-badge">{Math.round(data.expenseIncomeRatio)}% · {getRatioStatus(data.expenseIncomeRatio)}</span>
          </div>
          <div className="pf-ratio-track">
            <div className="pf-ratio-fill" style={{ width: `${getRatioWidth(data.expenseIncomeRatio)}%` }} />
            <div className="pf-ratio-pin" style={{ left: `${getRatioWidth(data.expenseIncomeRatio)}%` }} />
          </div>
          <div className="pf-ratio-meta">
            <span>Thu: <b>{formatVND(data.totalIncome)}</b></span>
            <span>Chi: <b>{formatVND(data.totalExpense)}</b></span>
          </div>
        </section>

        {/* MINI STATS */}
        <section className="pf-mini-stats">
          <div className="pf-mini-card">
            <span>👥</span>
            <small>Thành viên</small>
            <strong>{data.totalMembers}</strong>
          </div>
          <div className="pf-mini-card">
            <span>📅</span>
            <small>Buổi tập</small>
            <strong>{data.totalSessions}</strong>
          </div>
          <div className="pf-mini-card success">
            <span>✅</span>
            <small>Đã đóng</small>
            <strong>{data.paidMembers}/{data.totalMembers}</strong>
          </div>
          <div className="pf-mini-card danger">
            <span>⏳</span>
            <small>Chưa đóng</small>
            <strong>{data.unpaidMembers}</strong>
          </div>
        </section>

        {/* MEMBERS */}
        <section className="pf-members-section">
          <div className="pf-section-title-row">
            <h2>Chi tiết thành viên</h2>
            <div className="pf-status-pills">
              <span className="ok">✓ {data.paidMembers} đã đóng</span>
              <span className="wait">⏳ {data.unpaidMembers} chưa đóng</span>
            </div>
          </div>

          <div className="pf-member-grid">
            {data.members.map((member, idx) => {
              const pct = getAttendancePercent(member.attendedSessions, member.totalSessions)
              const note = getMemberNote(member.balance, member.isPaid)
              const statusCls = !member.isPaid ? 'unpaid' : member.balance < 0 ? 'negative' : 'paid'
              const balCls = member.balance < 0 ? 'pf-negative' : member.balance > 0 ? 'pf-positive' : ''
              return (
                <div key={member.id} className={`pf-member-card ${statusCls}`}>
                  <div className="pf-member-top">
                    <div className="pf-avatar">{getInitials(member.name)}</div>
                    <div className="pf-member-name-wrap">
                      <h3>{member.name}</h3>
                      <span className={`pf-member-badge ${member.isPaid ? 'paid' : 'unpaid'}`}>
                        {member.isPaid ? '✓ Đã đóng quỹ' : '⏳ Chưa đóng'}
                      </span>
                    </div>
                    <div className="pf-member-index">#{idx + 1}</div>
                  </div>

                  <div className="pf-attendance-row">
                    <span>Tham gia buổi tập</span>
                    <strong>{member.attendedSessions}/{member.totalSessions} · {pct}%</strong>
                  </div>
                  <div className="pf-progress">
                    <div style={{ width: `${pct}%` }} />
                  </div>

                  <div className="pf-member-money">
                    <div>
                      <small>Đã nộp</small>
                      <strong>{formatVND(member.paidAmount)}</strong>
                    </div>
                    <div>
                      <small>Tổng chi</small>
                      <strong>{formatVND(member.totalCost)}</strong>
                    </div>
                    <div>
                      <small>Số dư</small>
                      <strong className={balCls}>{member.balance >= 0 ? '+' : ''}{formatVND(member.balance)}</strong>
                    </div>
                  </div>

                  <div className={`pf-member-note ${note.cls}`}>
                    <span>{note.icon}</span>
                    <div>
                      <strong>{note.title}</strong>
                      <small>{note.subtitle}</small>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* SUMMARY */}
        <section className="pf-summary-card">
          <h2>📊 Tổng kết kỳ quỹ</h2>
          <div className="pf-summary-list">
            <div><span>Tổng thu quỹ</span><strong className="pf-positive">{formatVND(data.totalIncome)}</strong></div>
            <div><span>Tổng chi quỹ</span><strong className="pf-negative">{formatVND(data.totalExpense)}</strong></div>
            <div><span>Số dư cuối kỳ</span><strong className={data.fundBalance < 0 ? 'pf-negative' : 'pf-positive'}>{data.fundBalance >= 0 ? '+' : ''}{formatVND(data.fundBalance)}</strong></div>
          </div>
        </section>

        {/* FOOTER POSTER */}
        <section className="pf-footer-poster">
          <div className="pf-footer-art">
            <span className="pf-player-left" />
            <span className="pf-player-right" />
            <span className="pf-footer-ball" />
          </div>
          <h2>CHƠI HẾT MÌNH</h2>
          <h3>ĐÓNG QUỸ HẾT Ý</h3>
          <p>Cùng nhau xây dựng CLB ngày càng vững mạnh!</p>
        </section>

        <footer className="pf-footer">
          <strong>🥒 PickleFund</strong>
          <span>Xuất báo cáo: {data.exportDate} · {data.periodLabel}</span>
          <span>Lúc {data.generatedAt}</span>
        </footer>

      </article>
    </div>
  )
}
