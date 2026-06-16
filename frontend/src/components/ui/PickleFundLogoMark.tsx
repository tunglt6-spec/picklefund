export function PickleFundLogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#lgLogo)" />
      <path d="M16 5L7 8.5v7c0 6 4.2 11.5 9 12.5 4.8-1 9-6.5 9-12.5v-7L16 5z"
        fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
      <circle cx="13" cy="14" r="1.6" fill="white" opacity="0.85" />
      <circle cx="16" cy="12" r="1.6" fill="white" opacity="0.85" />
      <circle cx="19" cy="14" r="1.6" fill="white" opacity="0.85" />
      <circle cx="13" cy="18" r="1.6" fill="white" opacity="0.85" />
      <circle cx="16" cy="20" r="1.6" fill="white" opacity="0.85" />
      <circle cx="19" cy="18" r="1.6" fill="white" opacity="0.85" />
      <defs>
        <linearGradient id="lgLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C896" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  )
}
