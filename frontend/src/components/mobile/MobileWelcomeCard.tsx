import { Network } from 'lucide-react'

interface MobileWelcomeCardProps {
  title: string
  subtitle: string
  stats: { label: string; value: number | string }[]
}

export function MobileWelcomeCard({ title, subtitle, stats }: MobileWelcomeCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[20px] p-[18px]"
      style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#06B6D4 100%)' }}>
      {/* Background icon */}
      <Network
        size={120}
        className="absolute -right-6 -top-6 opacity-[0.08] text-white pointer-events-none"
        strokeWidth={1}
      />

      <p className="text-[13px] font-semibold text-white/70 uppercase tracking-widest mb-1">{subtitle}</p>
      <h2 className="text-[22px] font-[700] text-white leading-tight mb-4">{title}</h2>

      <div className="flex gap-4 flex-wrap">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col">
            <span className="text-[22px] font-[800] text-white leading-none tabular-nums">{s.value}</span>
            <span className="text-[11px] text-white/70 mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
