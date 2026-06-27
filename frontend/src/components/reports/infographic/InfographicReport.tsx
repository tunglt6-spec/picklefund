import type { InfographicReportData } from './infographic.types'

const VN = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

const AVATAR_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function CourtSVG() {
  return (
    <svg
      viewBox="0 0 540 185"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1 }}
    >
      <rect x="60" y="20" width="420" height="145" fill="none" stroke="white" strokeWidth="2" />
      <line x1="270" y1="20" x2="270" y2="165" stroke="white" strokeWidth="2" />
      <rect x="120" y="20" width="300" height="70" fill="none" stroke="white" strokeWidth="1.5" />
      <rect x="120" y="95" width="300" height="70" fill="none" stroke="white" strokeWidth="1.5" />
      <line x1="60" y1="92" x2="480" y2="92" stroke="white" strokeWidth="2" />
      <rect x="210" y="55" width="120" height="75" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
    </svg>
  )
}

function PaddleSVG() {
  return (
    <svg
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 12, right: 16, width: 60, height: 75, opacity: 0.2 }}
    >
      <ellipse cx="40" cy="38" rx="30" ry="34" fill="white" />
      <ellipse cx="40" cy="38" rx="22" ry="25" fill="none" stroke="#065F46" strokeWidth="2" />
      <line x1="26" y1="38" x2="54" y2="38" stroke="#065F46" strokeWidth="1.5" />
      <line x1="40" y1="14" x2="40" y2="62" stroke="#065F46" strokeWidth="1.5" />
      <rect x="36" y="70" width="8" height="25" rx="4" fill="white" />
    </svg>
  )
}

function PlayerSilhouette({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right' ? 'scale(-1,1) translate(-80,0)' : ''
  return (
    <svg
      viewBox="0 0 80 110"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        bottom: 0,
        [side]: 16,
        width: 64,
        height: 88,
        opacity: 0.18,
      }}
    >
      <g transform={flip}>
        <circle cx="36" cy="14" r="10" fill="white" />
        <rect x="22" y="26" width="28" height="36" rx="6" fill="white" />
        <rect x="10" y="28" width="14" height="30" rx="5" fill="white" transform="rotate(-15 10 28)" />
        <rect x="44" y="28" width="12" height="28" rx="5" fill="white" transform="rotate(10 44 28)" />
        <rect x="24" y="60" width="12" height="42" rx="5" fill="white" />
        <rect x="38" y="60" width="12" height="42" rx="5" fill="white" />
      </g>
    </svg>
  )
}

interface MemberCardProps {
  member: InfographicReportData['members'][number]
  index: number
}

function MemberCard({ member, index }: MemberCardProps) {
  const color = getAvatarColor(member.name)
  const initials = getInitials(member.name)
  const rate = Math.min(100, Math.max(0, member.attendanceRate))
  const mBalPos = member.balance >= 0

  const barColor = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        breakInside: 'avoid',
      }}
    >
      {/* Top accent strip */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${color} 0%, ${color}99 100%)`,
        }}
      />

      <div style={{ padding: '14px 16px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          {/* Jersey number decoration */}
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: color,
              opacity: 0.15,
              lineHeight: 1,
              minWidth: 28,
              userSelect: 'none',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>

          {/* Avatar */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 14 }}>{initials}</span>
          </div>

          {/* Name + Badge column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#0F172A',
                wordBreak: 'break-word',
                lineHeight: 1.3,
              }}
            >
              {member.name}
            </span>
            <span
              style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                background: member.isPaid ? '#DCFCE7' : '#FEF3C7',
                color: member.isPaid ? '#16A34A' : '#92400E',
                alignSelf: 'flex-start',
                whiteSpace: 'nowrap',
              }}
            >
              {member.isPaid ? '✓ Đã đóng' : '⏳ Chưa đóng'}
            </span>
          </div>
        </div>

        {/* Attendance */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Tham gia</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#0F172A',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 99,
                padding: '2px 8px',
              }}
            >
              {member.attendedSessions}/{member.totalSessions} buổi ({Math.round(rate)}%)
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 99,
              background: '#F1F5F9',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${rate}%`,
                borderRadius: 99,
                background: barColor,
              }}
            />
          </div>
        </div>

        {/* Financial box */}
        <div
          style={{
            marginTop: 12,
            background: '#F8FAFC',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 7,
              borderBottom: '1px dashed #E2E8F0',
            }}
          >
            <span style={{ fontSize: 10, color: '#64748B' }}>Chi phí sân</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{VN(member.courtFee)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 7,
              paddingBottom: 7,
              borderBottom: '1px dashed #E2E8F0',
            }}
          >
            <span style={{ fontSize: 10, color: '#64748B' }}>Sinh hoạt</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{VN(member.livingFee)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 7,
            }}
          >
            <span style={{ fontSize: 10, color: '#0F172A', fontWeight: 700 }}>Tổng chi phí</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#F97316' }}>{VN(member.totalCost)}</span>
          </div>
        </div>

        {/* Balance highlight */}
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            background: mBalPos ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${mBalPos ? '#BBF7D0' : '#FECACA'}`,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 10, color: mBalPos ? '#16A34A' : '#EF4444', fontWeight: 600 }}>
            {mBalPos ? '💚 Số dư còn lại' : '⚠️ Cần nộp thêm'}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: mBalPos ? '#16A34A' : '#EF4444',
            }}
          >
            {VN(Math.abs(member.balance))}
          </span>
        </div>
      </div>
    </div>
  )
}

export function InfographicReport({
  data,
  id = 'infographic-export-canvas',
}: {
  data: InfographicReportData
  id?: string
}) {
  const totalRevenue = data.members.reduce((s, m) => s + m.paidAmount, 0)
  const totalExpense = data.members.reduce((s, m) => s + m.totalCost, 0)
  const overallBalance = totalRevenue - totalExpense
  const balPos = overallBalance >= 0

  const paidCount = data.members.filter((m) => m.isPaid).length
  const unpaidCount = data.members.length - paidCount
  const totalSessions = data.members[0]?.totalSessions ?? 0
  const avgRate =
    data.members.length > 0
      ? data.members.reduce((s, m) => s + m.attendanceRate, 0) / data.members.length
      : 0

  const courtTotal = data.members.reduce((s, m) => s + m.courtFee, 0)
  const livingTotal = data.members.reduce((s, m) => s + m.livingFee, 0)
  const courtPct = totalExpense > 0 ? (courtTotal / totalExpense) * 100 : 0
  const livingPct = totalExpense > 0 ? (livingTotal / totalExpense) * 100 : 0

  return (
    <div
      id={id}
      style={{
        width: 540,
        background: '#F0FDF4',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── 1. HERO HEADER ── */}
      <div
        style={{
          position: 'relative',
          minHeight: 185,
          background: 'linear-gradient(145deg, #065F46 0%, #059669 50%, #10B981 80%, #34D399 100%)',
          overflow: 'hidden',
        }}
      >
        <CourtSVG />
        <PaddleSVG />

        <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px 0' }}>
          {/* Sport badge */}
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              🏓 PICKLEFUND · SPORT CLUB
            </span>
          </div>

          {/* Club name */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: -1.2,
              lineHeight: 1.05,
            }}
          >
            PICKLEFUND
          </div>

          {/* Report subtitle */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#A7F3D0',
              letterSpacing: 3.5,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            BÁO CÁO TÀI CHÍNH
          </div>

          {/* Period + Date row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {data.periodName ?? 'Kỳ quỹ hiện tại'}
            </span>
            <span style={{ color: '#A7F3D0', fontSize: 10, fontWeight: 500 }}>
              {data.reportDate ?? new Date().toLocaleDateString('vi-VN')}
            </span>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              background: 'rgba(0,0,0,0.22)',
              borderRadius: '14px 14px 0 0',
              overflow: 'hidden',
            }}
          >
            {[
              { label: 'Thành viên', value: data.members.length, unit: 'người' },
              { label: 'Số buổi', value: totalSessions, unit: 'buổi' },
              { label: 'Tham dự TB', value: `${Math.round(avgRate)}%`, unit: '' },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 4px',
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: '#A7F3D0', fontWeight: 500, marginTop: 2 }}>
                  {s.label}
                  {s.unit ? ` (${s.unit})` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. KPI CARDS ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
          padding: '14px 20px 0',
        }}
      >
        {[
          {
            emoji: '💰',
            label: 'TỔNG THU',
            amount: VN(totalRevenue),
            sub: `${paidCount}/${data.members.length} thành viên`,
            accent: '#10B981',
          },
          {
            emoji: '📤',
            label: 'TỔNG CHI',
            amount: VN(totalExpense),
            sub: 'Sân + sinh hoạt',
            accent: '#F97316',
          },
          {
            emoji: balPos ? '🐷' : '⚠️',
            label: 'SỐ DƯ',
            amount: VN(Math.abs(overallBalance)),
            sub: balPos ? 'Dư quỹ' : 'Thiếu quỹ',
            accent: balPos ? '#2563EB' : '#EF4444',
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
              border: '1px solid #E2E8F0',
              borderTop: `4px solid ${card.accent}`,
              padding: '12px 10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <span style={{ fontSize: 22 }}>{card.emoji}</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {card.label}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>
              {card.amount}
            </div>
            <div style={{ fontSize: 9, color: '#64748B' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 3. RATIO BAR ── */}
      <div
        style={{
          margin: '12px 20px 0',
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #E2E8F0',
          padding: '14px 18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Cơ cấu chi phí</span>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { color: '#10B981', label: 'Sân', pct: courtPct },
              { color: '#F97316', label: 'Sinh hoạt', pct: livingPct },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 9, color: '#64748B' }}>
                  {item.label} {Math.round(item.pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 99,
            background: '#F1F5F9',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${courtPct}%`,
              background: '#10B981',
              borderRadius: '99px 0 0 99px',
            }}
          />
          <div
            style={{
              height: '100%',
              width: `${livingPct}%`,
              background: '#F97316',
              borderRadius: courtPct > 0 ? '0 99px 99px 0' : 99,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 9, color: '#64748B' }}>🏸 Sân: {VN(courtTotal)}</span>
          <span style={{ fontSize: 9, color: '#64748B' }}>🎉 Sinh hoạt: {VN(livingTotal)}</span>
        </div>
      </div>

      {/* ── 4. STAT BOXES ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
          margin: '12px 20px 0',
        }}
      >
        {[
          { emoji: '✅', label: 'Đã đóng', value: paidCount, accent: '#10B981' },
          { emoji: '⏳', label: 'Chưa đóng', value: unpaidCount, accent: '#F59E0B' },
          { emoji: '📅', label: 'Số buổi', value: totalSessions, accent: '#3B82F6' },
          { emoji: '📊', label: 'TB tham dự', value: `${Math.round(avgRate)}%`, accent: '#8B5CF6' },
        ].map((box, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: 16,
              borderTop: `4px solid ${box.accent}`,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20 }}>{box.emoji}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{box.value}</div>
            <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{box.label}</div>
          </div>
        ))}
      </div>

      {/* ── 5. MEMBER PLAYER CARDS ── */}
      <div style={{ marginTop: 16, padding: '0 20px' }}>
        {/* Section title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ width: 4, height: 20, background: '#10B981', borderRadius: 99 }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', flex: 1 }}>
            Chi tiết thành viên
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: '#DCFCE7',
              color: '#16A34A',
              padding: '2px 8px',
              borderRadius: 99,
            }}
          >
            ✓ {paidCount} đã đóng
          </span>
          {unpaidCount > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#92400E',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              ⏳ {unpaidCount} chưa đóng
            </span>
          )}
        </div>

        {/* 2-col grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {data.members.map((member, index) => (
            <MemberCard key={member.id} member={member} index={index} />
          ))}
        </div>
      </div>

      {/* ── 6. SUMMARY CARD ── */}
      <div
        style={{
          margin: '16px 20px 0',
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            padding: '14px 18px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>📊 Tổng kết kỳ quỹ</span>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Tổng thu', value: VN(totalRevenue), color: '#10B981' },
            { label: 'Tổng chi', value: VN(totalExpense), color: '#F97316' },
            {
              label: balPos ? 'Dư quỹ' : 'Thiếu quỹ',
              value: VN(Math.abs(overallBalance)),
              color: balPos ? '#16A34A' : '#EF4444',
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: i < 2 ? 10 : 0,
                borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: i === 2 ? 700 : 500 }}>
                {row.label}
              </span>
              <span style={{ fontSize: i === 2 ? 16 : 13, fontWeight: 900, color: row.color }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. FOOTER ── */}
      <div
        style={{
          marginTop: 20,
          background: 'linear-gradient(145deg, #0B2A4A 0%, #0A3D2E 60%, #065F46 100%)',
          padding: '22px 20px',
          minHeight: 145,
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <PlayerSilhouette side="left" />
        <PlayerSilhouette side="right" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', letterSpacing: 1 }}>
            CHƠI HẾT MÌNH
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#FACC15',
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{ fontSize: 10, color: '#A7F3D0', marginTop: 6, fontWeight: 500 }}>
            Báo cáo được tạo tự động bởi PickleFund
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {['#10B981', '#FACC15', '#FFFFFF'].map((c, i) => (
              <div
                key={i}
                style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.8 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. BOTTOM BAR ── */}
      <div
        style={{
          background: '#022C22',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 9, color: '#6EE7B7', fontWeight: 600 }}>© PickleFund</span>
        <span style={{ fontSize: 9, color: '#6EE7B7' }}>picklefund.app</span>
      </div>
    </div>
  )
}
