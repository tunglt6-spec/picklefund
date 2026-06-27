import type { InfographicReportData } from './infographic.types'

const V = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'
const K = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  return (n / 1000).toFixed(0) + 'K'
}

function MascotSvg() {
  return (
    <svg width="72" height="88" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="68" cy="16" rx="10" ry="13" fill="#86EFAC" stroke="#4ADE80" strokeWidth="1.5" />
      <line x1="68" y1="8" x2="68" y2="24" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="62" y1="16" x2="74" y2="16" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="61" y1="27" x2="54" y2="44" stroke="#FCD34D" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 54 Q58 42 57 30" stroke="#BBF7D0" strokeWidth="7" strokeLinecap="round" fill="none" />
      <ellipse cx="34" cy="68" rx="23" ry="26" fill="#22C55E" />
      <ellipse cx="27" cy="60" rx="8" ry="11" fill="#86EFAC" opacity="0.5" />
      <circle cx="40" cy="74" r="2.5" fill="#15803D" opacity="0.4" />
      <circle cx="32" cy="80" r="1.8" fill="#15803D" opacity="0.3" />
      <rect x="28" y="40" width="12" height="10" rx="4" fill="#22C55E" />
      <circle cx="34" cy="30" r="20" fill="#4ADE80" />
      <ellipse cx="28" cy="22" rx="7" ry="9" fill="#BBF7D0" opacity="0.4" />
      <rect x="14" y="24" width="40" height="8" rx="4" fill="white" opacity="0.9" />
      <rect x="14" y="24" width="40" height="3.5" rx="1.5" fill="#FCD34D" />
      <circle cx="27" cy="32" r="5" fill="white" />
      <circle cx="41" cy="32" r="5" fill="white" />
      <circle cx="28.5" cy="33" r="2.8" fill="#0F172A" />
      <circle cx="42.5" cy="33" r="2.8" fill="#0F172A" />
      <circle cx="29.5" cy="32" r="1.1" fill="white" />
      <circle cx="43.5" cy="32" r="1.1" fill="white" />
      <path d="M25 40 Q34 47 43 40" stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="21" cy="38" r="3.5" fill="#FCA5A5" opacity="0.6" />
      <circle cx="47" cy="38" r="3.5" fill="#FCA5A5" opacity="0.6" />
      <path d="M13 58 Q8 68 14 76" stroke="#BBF7D0" strokeWidth="7" strokeLinecap="round" fill="none" />
      <ellipse cx="26" cy="92" rx="9" ry="4.5" fill="#15803D" />
      <ellipse cx="42" cy="92" rx="9" ry="4.5" fill="#15803D" />
      <circle cx="6" cy="82" r="7" fill="#FCD34D" />
      <path d="M2 82 Q6 77 10 82" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M2 82 Q6 87 10 82" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function StatusBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 99,
      fontSize: 8,
      fontWeight: 700,
      background: isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
      color: isPaid ? '#15803D' : '#B45309',
      border: `1px solid ${isPaid ? '#86EFAC' : '#FCD34D'}`,
    }}>
      {isPaid ? '✓ Đã đóng' : '⏳ Chưa đóng'}
    </span>
  )
}

export function InfographicReport({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  const balance = data.fundBalance
  const ratio = data.totalIncome > 0 ? Math.min((data.totalExpense / data.totalIncome) * 100, 200) : 0
  const ratioDisplay = data.totalIncome > 0 ? Math.round((data.totalExpense / data.totalIncome) * 100) : 0
  const paidCount = data.members.filter(m => m.isPaid).length
  const unpaidCount = data.totalMembers - paidCount
  const balancePositive = balance >= 0

  const indicatorLeft = Math.min(ratio / 2, 96)

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: '#F0FDF4',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #047857 100%)',
        padding: '16px 20px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          {/* Mascot */}
          <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '6px 8px' }}>
            <MascotSvg />
          </div>

          {/* Brand + period */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#A7F3D0', letterSpacing: -1 }}>Pickle</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#6EE7B7', letterSpacing: -1 }}>Fund</span>
              <span style={{ fontSize: 12, color: '#A7F3D0', marginLeft: 4, fontWeight: 500, opacity: 0.7 }}>🥒</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: '#6EE7B7', marginBottom: 8, opacity: 0.9 }}>
              BÁO CÁO TÀI CHÍNH
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                background: '#059669',
                color: 'white',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 10,
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                📋 {data.periodLabel}
              </span>
              <span style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#A7F3D0',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 9,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                📅 {data.exportDate}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {[
              { icon: '👥', val: data.totalMembers, label: 'thành viên' },
              { icon: '📅', val: data.totalSessions, label: 'buổi tập' },
              { icon: '✅', val: `${paidCount}/${data.totalMembers}`, label: 'đã đóng' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{s.val}</span>
                <span style={{ fontSize: 9, color: '#A7F3D0' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ KPI STRIP ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid #D1FAE5' }}>
        {/* Tổng thu */}
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#A7F3D0', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>💰 Tổng thu</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{V(data.totalIncome)}</div>
          <div style={{ fontSize: 8, color: '#A7F3D0', marginTop: 3 }}>{paidCount}/{data.totalMembers} tv đã đóng</div>
        </div>
        {/* Tổng chi */}
        <div style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#FECACA', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>👛 Tổng chi</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{V(data.totalExpense)}</div>
          <div style={{ fontSize: 8, color: '#FECACA', marginTop: 3 }}>Chi / thu: {ratioDisplay}%</div>
        </div>
        {/* Số dư */}
        <div style={{ background: balancePositive ? 'linear-gradient(135deg, #0369A1, #0284C7)' : 'linear-gradient(135deg, #7C3AED, #6D28D9)', padding: '12px 14px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#BAE6FD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>🐷 Số dư quỹ</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{V(balance)}</div>
          <div style={{ fontSize: 8, color: '#BAE6FD', marginTop: 3 }}>{balancePositive ? '✓ Quỹ còn dư' : '⚠ Cần bổ sung'}</div>
        </div>
      </div>

      {/* ══ RATIO BAR ══ */}
      <div style={{ background: 'white', margin: '10px 14px', borderRadius: 12, border: '1px solid #D1FAE5', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', letterSpacing: 0.8, textTransform: 'uppercase' }}>📊 Tỷ lệ chi / thu</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: ratio <= 70 ? '#059669' : ratio <= 100 ? '#D97706' : '#DC2626' }}>
            {ratioDisplay}% {ratio <= 70 ? '🟢 Tốt' : ratio <= 100 ? '🟡 Ổn' : '🔴 Vượt'}
          </span>
        </div>
        <div style={{ height: 14, borderRadius: 99, background: 'linear-gradient(to right, #22C55E 0%, #86EFAC 35%, #FCD34D 60%, #F97316 80%, #EF4444 100%)', position: 'relative', marginBottom: 5 }}>
          <div style={{
            position: 'absolute',
            left: `${indicatorLeft}%`,
            top: -3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'white',
            border: '3px solid #374151',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transform: 'translateX(-50%)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#9CA3AF' }}>
          <span>Thu: <strong style={{ color: '#059669' }}>{V(data.totalIncome)}</strong></span>
          <span style={{ color: '#9CA3AF' }}>Chi: <strong style={{ color: '#DC2626' }}>{V(data.totalExpense)}</strong></span>
          <span>Dư: <strong style={{ color: balancePositive ? '#059669' : '#DC2626' }}>{V(balance)}</strong></span>
        </div>
      </div>

      {/* ══ MEMBER TABLE ══ */}
      <div style={{ margin: '0 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#065F46', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            👤 Chi tiết thành viên
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 8.5, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 99, fontWeight: 700, border: '1px solid #86EFAC' }}>
              ✓ {paidCount} đã đóng
            </span>
            <span style={{ fontSize: 8.5, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 99, fontWeight: 700, border: '1px solid #FCD34D' }}>
              ⏳ {unpaidCount} chưa đóng
            </span>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #D1FAE5', overflow: 'hidden', boxShadow: '0 1px 4px rgba(5,150,105,0.06)' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '22px 1fr 52px 60px 60px 65px 68px',
            background: 'linear-gradient(135deg, #065F46, #047857)',
            padding: '7px 10px',
            gap: 4,
          }}>
            {['#', 'Thành viên', 'Buổi', 'Phí sân', 'S. hoạt', 'Tổng chi', 'Số dư'].map((h, i) => (
              <div key={i} style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#A7F3D0',
                letterSpacing: 0.5,
                textAlign: i <= 1 ? 'left' : 'right',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {data.members.map((m, i) => {
            const attended = `${m.attendedSessions}/${m.totalSessions}`
            const attPct = m.totalSessions > 0 ? (m.attendedSessions / m.totalSessions) * 100 : 0
            return (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr 52px 60px 60px 65px 68px',
                padding: '6px 10px',
                gap: 4,
                background: i % 2 === 0 ? 'white' : '#F0FDF4',
                borderBottom: i < data.members.length - 1 ? '1px solid #ECFDF5' : 'none',
                alignItems: 'center',
              }}>
                {/* # */}
                <div style={{ fontSize: 8.5, color: '#9CA3AF', textAlign: 'center', fontWeight: 600 }}>{i + 1}</div>
                {/* Tên + badge */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{m.name}</div>
                  <StatusBadge isPaid={m.isPaid} />
                </div>
                {/* Buổi + bar */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: '#374151' }}>{attended}</div>
                  <div style={{ height: 3, background: '#E5E7EB', borderRadius: 99, marginTop: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${attPct}%`, background: attPct >= 70 ? '#22C55E' : attPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 99 }} />
                  </div>
                </div>
                {/* Phí sân */}
                <div style={{ fontSize: 8.5, color: '#374151', textAlign: 'right', fontWeight: 500 }}>{K(m.courtFee)}</div>
                {/* Sinh hoạt */}
                <div style={{ fontSize: 8.5, color: '#374151', textAlign: 'right', fontWeight: 500 }}>{K(m.livingFee)}</div>
                {/* Tổng chi */}
                <div style={{ fontSize: 8.5, color: '#374151', textAlign: 'right', fontWeight: 600 }}>{K(m.totalCost)}</div>
                {/* Số dư */}
                <div style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  textAlign: 'right',
                  color: m.balance >= 0 ? '#059669' : '#DC2626',
                }}>
                  {m.balance >= 0 ? '+' : ''}{K(m.balance)}
                </div>
              </div>
            )
          })}

          {/* Summary row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '22px 1fr 52px 60px 60px 65px 68px',
            padding: '7px 10px',
            gap: 4,
            background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
            borderTop: '2px solid #A7F3D0',
            alignItems: 'center',
          }}>
            <div />
            <div style={{ fontSize: 9, fontWeight: 800, color: '#065F46' }}>Tổng cộng</div>
            <div />
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#065F46', textAlign: 'right' }}>
              {K(data.members.reduce((s, m) => s + m.courtFee, 0))}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#065F46', textAlign: 'right' }}>
              {K(data.members.reduce((s, m) => s + m.livingFee, 0))}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#065F46', textAlign: 'right' }}>
              {K(data.totalExpense)}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: balance >= 0 ? '#059669' : '#DC2626', textAlign: 'right' }}>
              {balance >= 0 ? '+' : ''}{K(balance)}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #022C22, #064E3B)',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🥒</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: 0.3 }}>PickleFund</div>
            <div style={{ fontSize: 8.5, color: '#6EE7B7' }}>Quản lý tài chính CLB Pickleball</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: '#A7F3D0', fontWeight: 600 }}>Tạo bởi PickleFund • {data.generatedAt}</div>
          <div style={{ fontSize: 8, color: '#6EE7B7', marginTop: 1 }}>{data.exportDate}</div>
        </div>
        <span style={{ fontSize: 20 }}>🏓</span>
      </div>
    </div>
  )
}
