export function PickleFundLogoMark({ size = 32 }: { size?: number }) {
  const cx = 16, cy = 16, orbit = 10
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI * 2) / 8 - Math.PI / 2
    return { x: cx + orbit * Math.cos(a), y: cy + orbit * Math.sin(a) }
  })
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#lgNet)" />
      {nodes.map((n, i) => (
        <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke="rgba(255,255,255,0.35)" strokeWidth="0.9" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="2.2" fill="rgba(255,255,255,0.75)" />
      ))}
      <circle cx={cx} cy={cy} r="5" fill="white" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="6" fontWeight="800" fill="#4F46E5" fontFamily="Inter,system-ui,sans-serif">P</text>
      <defs>
        <linearGradient id="lgNet" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  )
}
