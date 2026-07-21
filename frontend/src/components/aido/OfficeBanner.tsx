/**
 * OfficeBanner — hero "Văn phòng AI" dùng CHUNG cho AIDO (admin) và trang xem của MEMBER.
 * GIẢI PHÁP DỨT ĐIỂM: ảnh nằm TRONG <svg> (<image>) → ảnh + viền chạy + radar chung MỘT hệ
 * toạ độ viewBox 1832×602 ⇒ không bao giờ lệch, co giãn đồng bộ desktop/tablet/mobile.
 * VIỀN CHẠY (comet) + RADAR ping quanh mỗi thẻ = "agent đang làm việc". Toạ độ = 1 nguồn.
 */
import type { ReactNode } from 'react'

/** Khung THẺ (bbox px trong office-banner-v3.webp 1832×602) dò CHÍNH XÁC từ pixel.
 *  dx/dy = TÂM chấm trạng thái xanh → radar đặt đúng tâm chấm. Mỗi agent 1 màu. */
const BANNER_CARD: { key: string; x: number; y: number; w: number; h: number; dx: number; dy: number; color: string; dur: string; delay: string }[] = [
  { key: 'MAIKA', x: 74, y: 80, w: 245, h: 226, dx: 103, dy: 181, color: '#6D5DFB', dur: '6.4s', delay: '0s' },
  { key: 'LISA', x: 469, y: 80, w: 232, h: 226, dx: 498, dy: 181, color: '#2563EB', dur: '7.2s', delay: '.5s' },
  { key: 'HERMES', x: 818, y: 80, w: 230, h: 226, dx: 844, dy: 182, color: '#059669', dur: '6.0s', delay: '1s' },
  { key: 'MIT_DAT', x: 1189, y: 80, w: 204, h: 226, dx: 1216, dy: 181, color: '#EA580C', dur: '7.6s', delay: '.3s' },
  { key: 'NOTIFICATION', x: 1498, y: 80, w: 237, h: 227, dx: 1528, dy: 181, color: '#C026D3', dur: '6.8s', delay: '.8s' },
]

export function OfficeBanner({ badge, caption }: { badge?: ReactNode; caption?: ReactNode }) {
  return (
    <div>
      <style>{`
        @keyframes aido-run { to { stroke-dashoffset: -100; } }
        @keyframes aido-radar { 0% { r: 5; opacity: .85; } 100% { r: 26; opacity: 0; } }
        .aido-radar { animation: aido-radar 2.2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .aido-run, .aido-radar { animation: none; } }
      `}</style>
      <div
        className="relative mx-auto w-full overflow-hidden rounded-[20px] border [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
        style={{ maxWidth: 1832 }}
      >
        <svg
          role="img"
          aria-label="AIDO — Văn phòng AI"
          className="block w-full"
          viewBox="0 0 1832 602"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <image href="/aido-media/office-banner-v3.webp" x={0} y={0} width={1832} height={602} preserveAspectRatio="none" />
          {BANNER_CARD.map((c) => (
            <g key={c.key}>
              {/* radar ping — đúng tâm chấm trạng thái */}
              <circle cx={c.dx} cy={c.dy} r={6} fill="none" stroke={c.color} strokeWidth={2.5}
                className="aido-radar" style={{ animationDelay: c.delay }} />
              {/* viền đầy đủ bao khít thẻ */}
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={16} ry={16}
                fill="none" stroke={c.color} strokeOpacity={0.55} strokeWidth={3} />
              {/* đoạn sáng chạy vòng (đang làm việc) */}
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={16} ry={16}
                fill="none" stroke={c.color} strokeWidth={4} strokeLinecap="round"
                pathLength={100} strokeDasharray="24 76"
                className="aido-run"
                style={{ animation: `aido-run ${c.dur} linear infinite`, animationDelay: c.delay, filter: `drop-shadow(0 0 4px ${c.color})` }}
              />
            </g>
          ))}
        </svg>
        {badge}
      </div>
      <p className="mt-1.5 text-center text-xs [color:var(--pf-color-muted)]">
        {caption ?? 'Văn phòng AI · viền chạy quanh thẻ = agent đang làm việc'}
      </p>
    </div>
  )
}
