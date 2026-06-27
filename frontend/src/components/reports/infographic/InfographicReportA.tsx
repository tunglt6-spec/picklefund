import type { InfographicReportData } from './infographic.types'

const VN = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

function getAvatarColor(name: string): string {
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F97316', '#EF4444', '#FACC15', '#06B6D4']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function ShieldBadge() {
  return (
    <svg width="72" height="84" viewBox="0 0 72 84" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M36 2 L6 14 V40 C6 58 20 70 36 80 C52 70 66 58 66 40 V14 Z"
        fill="#1A3A5C"
        stroke="#F59E0B"
        strokeWidth="2"
      />
      <path
        d="M36 8 L11 18 V40 C11 55 23 65 36 74 C49 65 61 55 61 40 V18 Z"
        fill="#0B2A4A"
      />
      <text x="36" y="20" fontSize="7" fill="#F59E0B" textAnchor="middle" fontWeight="700">★ ★ ★</text>
      <circle cx="36" cy="42" r="15" fill="#FACC15" />
      <path d="M22 36 Q30 42 22 48" stroke="white" strokeWidth="2" fill="none" />
      <path d="M50 36 Q42 42 50 48" stroke="white" strokeWidth="2" fill="none" />
      <rect x="12" y="65" width="48" height="14" rx="7" fill="#F59E0B" />
      <text x="36" y="76" fontSize="8" fontWeight="900" fill="#0B2A4A" textAnchor="middle">CLB</text>
    </svg>
  )
}

function CourtBgSVG() {
  return (
    <svg
      viewBox="0 0 540 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.08 }}
    >
      <rect x="20" y="10" width="500" height="160" stroke="white" strokeWidth="3" fill="none" />
      <line x1="270" y1="10" x2="270" y2="170" stroke="white" strokeWidth="2" />
      <line x1="20" y1="90" x2="140" y2="90" stroke="white" strokeWidth="1.5" />
      <line x1="140" y1="10" x2="140" y2="90" stroke="white" strokeWidth="1.5" />
      <line x1="270" y1="90" x2="400" y2="90" stroke="white" strokeWidth="1.5" />
      <line x1="400" y1="10" x2="400" y2="90" stroke="white" strokeWidth="1.5" />
      <line x1="20" y1="55" x2="140" y2="55" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="400" y1="55" x2="520" y2="55" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="20" y1="125" x2="140" y2="125" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="400" y1="125" x2="520" y2="125" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>
  )
}

function BigBallSVG() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 16, right: 16, opacity: 0.25 }}
    >
      <circle cx="40" cy="40" r="36" fill="#FACC15" />
      <path d="M14 28 Q30 40 14 52" stroke="white" strokeWidth="2" fill="none" />
      <path d="M66 28 Q50 40 66 52" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  )
}

function PlayerLeft() {
  return (
    <svg width="92" height="130" viewBox="0 0 92 130" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="46" cy="126" rx="28" ry="4.5" fill="rgba(0,0,0,0.3)" />
      <ellipse cx="34" cy="118" rx="10" ry="5" fill="white" />
      <ellipse cx="54" cy="120" rx="10" ry="5" fill="white" />
      <path d="M36 88 Q32 100 32 118" stroke="#1E3A5F" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M50 88 Q54 100 54 118" stroke="#1E3A5F" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M28 60 Q28 50 46 50 Q64 50 64 60 L60 90 Q46 95 32 90 Z" fill="#059669" />
      <path d="M64 60 Q74 68 72 80" stroke="#FBBF24" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M28 60 Q16 66 12 78" stroke="#FBBF24" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="10" cy="82" rx="11" ry="14" fill="#2563EB" transform="rotate(-20 10 82)" />
      <line x1="4" y1="76" x2="16" y2="88" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="8" y1="72" x2="14" y2="92" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="2" y1="82" x2="18" y2="82" stroke="white" strokeWidth="1" opacity="0.7" />
      <path d="M16 90 L20 100" stroke="#92400E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="36" r="15" fill="#FBBF24" />
      <path d="M32 30 Q34 20 46 18 Q58 20 60 30 Q55 24 46 24 Q37 24 32 30Z" fill="#7C2D12" />
      <path d="M31 31 Q34 26 46 26 Q58 26 61 31" stroke="#DC2626" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="35" r="3" fill="white" />
      <circle cx="52" cy="35" r="3" fill="white" />
      <circle cx="41" cy="35" r="1.5" fill="#1E293B" />
      <circle cx="53" cy="35" r="1.5" fill="#1E293B" />
      <path d="M41 42 Q46 46 51 42" stroke="#7C2D12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function PlayerRight() {
  return (
    <svg width="86" height="126" viewBox="0 0 86 126" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="43" cy="122" rx="26" ry="4.5" fill="rgba(0,0,0,0.3)" />
      <ellipse cx="31" cy="116" rx="10" ry="5" fill="white" />
      <ellipse cx="52" cy="114" rx="10" ry="5" fill="white" />
      <path d="M32 86 Q28 98 30 116" stroke="#1E3A5F" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M46 86 Q50 98 52 114" stroke="#1E3A5F" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M24 58 Q24 48 43 48 Q62 48 62 58 L58 88 Q43 93 28 88 Z" fill="#EC4899" />
      <path d="M24 58 Q14 66 16 78" stroke="#FBBF24" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M62 58 Q74 64 78 76" stroke="#FBBF24" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="80" cy="80" rx="11" ry="14" fill="#8B5CF6" transform="rotate(20 80 80)" />
      <line x1="74" y1="74" x2="86" y2="86" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="72" y1="80" x2="88" y2="80" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="76" y1="70" x2="82" y2="90" stroke="white" strokeWidth="1" opacity="0.7" />
      <path d="M70 88 L66 98" stroke="#92400E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="43" cy="34" r="15" fill="#FBBF24" />
      <path d="M28 28 Q30 16 43 16 Q56 16 58 28 Q53 22 43 22 Q33 22 28 28 Z" fill="#1C1917" />
      <path d="M57 20 Q66 16 64 28" stroke="#1C1917" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="37" cy="33" r="3" fill="white" />
      <circle cx="49" cy="33" r="3" fill="white" />
      <circle cx="38" cy="33" r="1.5" fill="#1E293B" />
      <circle cx="50" cy="33" r="1.5" fill="#1E293B" />
      <path d="M39 40 Q43 44 48 40" stroke="#7C2D12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function InfographicReportA({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  const totalIncome = data.totalIncome
  const totalExpense = data.totalExpense
  const fundBalance = totalIncome - totalExpense
  const courtTotal = data.members.reduce((s, m) => s + m.courtFee, 0)
  const livingTotal = data.members.reduce((s, m) => s + m.livingFee, 0)
  const courtRatio = courtTotal + livingTotal > 0 ? (courtTotal / (courtTotal + livingTotal)) * 100 : 50
  const paidMembers = data.members.filter(m => m.isPaid).length
  const unpaidMembers = data.members.length - paidMembers
  const avgAttendance = data.members.length > 0 ? data.members.reduce((s, m) => s + m.attendanceRate, 0) / data.members.length : 0
  const balPos = fundBalance >= 0

  return (
    <div
      id={id}
      style={{
        width: 540,
        background: '#061529',
        fontFamily: "'Arial', sans-serif",
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* SECTION 1 — HEADER */}
      <div
        style={{
          backgroundImage: 'linear-gradient(145deg, #061529 0%, #0B2A4A 50%, #0D3060 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '22px 20px 20px',
        }}
      >
        <CourtBgSVG />
        <BigBallSVG />
        <div style={{ position: 'absolute', top: 14, left: 14, opacity: 0.9 }}>
          <ShieldBadge />
        </div>
        <div style={{ paddingLeft: 82 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: -1.5, lineHeight: 1 }}>
            PICKLEFUND
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#FACC15', marginTop: 2 }}>
            BÁO CÁO TÀI CHÍNH
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {data.clubName}
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 14, paddingLeft: 82, gap: 12, alignItems: 'center' }}>
          <div
            style={{
              background: 'rgba(250,204,21,0.15)',
              border: '1px solid rgba(250,204,21,0.4)',
              borderRadius: 99,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#FACC15',
            }}
          >
            {data.periodLabel}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{data.exportDate}</div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            background: 'rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 20px',
            marginLeft: -20,
            marginRight: -20,
            marginBottom: -20,
          }}
        >
          {[
            { label: 'THÀNH VIÊN', value: String(data.totalMembers) },
            { label: 'BUỔI CHƠI', value: String(data.totalSessions) },
            { label: 'ĐÃ ĐÓNG QUỸ', value: String(data.paidMembers) },
          ].map((col, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{col.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginTop: 2 }}>{col.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 — KPI CARDS */}
      <div style={{ display: 'flex', padding: '16px 20px 0', gap: 12 }}>
        <div
          style={{
            backgroundImage: 'linear-gradient(145deg, #0D1F35, #152A45)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 16px',
            flex: 1,
          }}
        >
          <div style={{ height: 3, borderRadius: 99, backgroundImage: 'linear-gradient(to right, #10B981, #34D399)', marginBottom: 10 }} />
          <div style={{ fontSize: 18 }}>💰</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.5 }}>Tổng thu</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#34D399', marginTop: 4 }}>{VN(totalIncome)}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tổng quỹ thu được</div>
        </div>

        <div
          style={{
            backgroundImage: 'linear-gradient(145deg, #0D1F35, #152A45)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 16px',
            flex: 1,
          }}
        >
          <div style={{ height: 3, borderRadius: 99, backgroundImage: 'linear-gradient(to right, #F97316, #FACC15)', marginBottom: 10 }} />
          <div style={{ fontSize: 18 }}>📤</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.5 }}>Tổng chi</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#F97316', marginTop: 4 }}>{VN(totalExpense)}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tổng chi phí kỳ này</div>
        </div>

        <div
          style={{
            backgroundImage: 'linear-gradient(145deg, #0D1F35, #152A45)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 16px',
            flex: 1,
          }}
        >
          <div
            style={{
              height: 3,
              borderRadius: 99,
              backgroundImage: balPos
                ? 'linear-gradient(to right, #10B981, #34D399)'
                : 'linear-gradient(to right, #EF4444, #F97316)',
              marginBottom: 10,
            }}
          />
          <div style={{ fontSize: 18 }}>{balPos ? '🐷' : '⚠️'}</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.5 }}>Số dư quỹ</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: balPos ? '#34D399' : '#EF4444',
              marginTop: 4,
            }}
          >
            {fundBalance >= 0 ? '+' : '-'}{VN(Math.abs(fundBalance))}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {balPos ? 'Quỹ dư dương' : 'Quỹ bị âm'}
          </div>
        </div>
      </div>

      {/* SECTION 3 — RATIO BAR */}
      <div style={{ margin: '12px 20px 0' }}>
        <div
          style={{
            backgroundImage: 'linear-gradient(145deg, #0D1F35, #152A45)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>⚡ Cơ cấu chi phí</div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
              Sân {courtRatio.toFixed(0)}% / Sinh hoạt {(100 - courtRatio).toFixed(0)}%
            </div>
          </div>
          <div
            style={{
              height: 12,
              borderRadius: 99,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.1)',
              marginTop: 10,
              display: 'flex',
            }}
          >
            <div style={{ background: '#10B981', width: `${courtRatio}%` }} />
            <div style={{ background: '#F97316', flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#10B981', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>Chi phí sân</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>{VN(courtTotal)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#F97316', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>Sinh hoạt</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>{VN(livingTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — STAT BOXES */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 20px 0' }}>
        {[
          { icon: '✅', value: String(paidMembers), color: '#34D399', label: 'ĐÃ ĐÓNG' },
          { icon: '⏳', value: String(unpaidMembers), color: '#F97316', label: 'CHƯA ĐÓNG' },
          { icon: '📅', value: String(data.totalSessions), color: '#60A5FA', label: 'BUỔI CHƠI' },
          { icon: '🏆', value: `${avgAttendance.toFixed(0)}%`, color: '#FACC15', label: 'TB THAM GIA' },
        ].map((box, i) => (
          <div
            key={i}
            style={{
              backgroundImage: 'linear-gradient(145deg, #0D1F35, #152A45)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              flex: 1,
              padding: '10px 6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16 }}>{box.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: box.color, marginTop: 4 }}>{box.value}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 3, letterSpacing: 0.5 }}>{box.label}</div>
          </div>
        ))}
      </div>

      {/* SECTION 5 — MEMBER TABLE */}
      <div style={{ margin: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>👥 Chi tiết thành viên</div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 99,
              padding: '2px 10px',
              fontSize: 9,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {data.members.length} người
          </div>
        </div>
        <div
          style={{
            background: '#0D1F35',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            marginTop: 10,
          }}
        >
          {/* Header row */}
          <div
            style={{
              background: '#152A45',
              padding: '8px 8px',
              display: 'grid',
              gridTemplateColumns: '20px 106px 52px 58px 54px 50px 60px 70px',
              gap: 2,
            }}
          >
            {['#', 'Thành viên', 'Buổi TG', 'Trạng thái', 'Phí sân', 'Sinh hoạt', 'Tổng chi', 'Số dư'].map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {/* Member rows */}
          {data.members.map((m, index) => {
            const mBalPos = m.paidAmount - m.totalCost
            return (
              <div
                key={m.id}
                style={{
                  background: index % 2 === 1 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  padding: '8px 8px',
                  display: 'grid',
                  gridTemplateColumns: '20px 106px 52px 58px 54px 50px 60px 70px',
                  gap: 2,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'center',
                }}
              >
                {/* Col 1 — index */}
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{index + 1}</div>

                {/* Col 2 — avatar + name */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: getAvatarColor(m.name),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 7,
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {m.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: 'white',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {m.name}
                  </div>
                </div>

                {/* Col 3 — sessions */}
                <div>
                  <div style={{ fontSize: 9, color: 'white' }}>
                    {m.attendedSessions}/{m.totalSessions}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>
                    ({m.attendanceRate.toFixed(0)}%)
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 99,
                      marginTop: 2,
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${m.attendanceRate}%`,
                        background: '#10B981',
                        borderRadius: 99,
                        height: 3,
                      }}
                    />
                  </div>
                </div>

                {/* Col 4 — status badge */}
                <div>
                  <span
                    style={
                      m.isPaid
                        ? {
                            background: 'rgba(16,185,129,0.2)',
                            color: '#34D399',
                            border: '1px solid rgba(16,185,129,0.3)',
                            padding: '2px 6px',
                            borderRadius: 99,
                            fontSize: 8,
                            fontWeight: 700,
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }
                        : {
                            background: 'rgba(245,158,11,0.2)',
                            color: '#FCD34D',
                            border: '1px solid rgba(245,158,11,0.3)',
                            padding: '2px 6px',
                            borderRadius: 99,
                            fontSize: 8,
                            fontWeight: 700,
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }
                    }
                  >
                    {m.isPaid ? '✓ Đã đóng' : '⏳ Chưa'}
                  </span>
                </div>

                {/* Col 5 — court fee */}
                <div style={{ fontSize: 9, color: 'white', textAlign: 'right' }}>{VN(m.courtFee)}</div>

                {/* Col 6 — living fee */}
                <div style={{ fontSize: 9, color: 'white', textAlign: 'right' }}>{VN(m.livingFee)}</div>

                {/* Col 7 — total cost */}
                <div style={{ fontSize: 9, color: 'white', textAlign: 'right' }}>{VN(m.totalCost)}</div>

                {/* Col 8 — member balance */}
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: mBalPos >= 0 ? '#34D399' : '#EF4444',
                    textAlign: 'right',
                  }}
                >
                  {mBalPos >= 0 ? '+' : ''}{VN(mBalPos)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 6 — FOOTER */}
      <div
        style={{
          marginTop: 20,
          backgroundImage: 'linear-gradient(145deg, #040E1C 0%, #0B2A4A 40%, #0A3D2E 80%, #065F46 100%)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 140,
          padding: '20px 120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 12 }}>
          <PlayerLeft />
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 12 }}>
          <PlayerRight />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18 }}>🏓</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'white', letterSpacing: 3, marginTop: 6 }}>
            CHƠI HẾT MÌNH
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FACC15', letterSpacing: 2, marginTop: 2 }}>
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{ width: 80, height: 1, background: 'rgba(255,255,255,0.2)', margin: '12px auto' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>PickleFund Sport Club</div>
          <div style={{ color: '#10B981', fontSize: 10, marginTop: 6, letterSpacing: 4 }}>●●●</div>
        </div>
      </div>

      {/* SECTION 7 — BOTTOM BAR */}
      <div
        style={{
          background: '#020810',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 900, color: '#10B981' }}>PickleFund</div>
        <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>{data.generatedAt}</div>
      </div>
    </div>
  )
}
