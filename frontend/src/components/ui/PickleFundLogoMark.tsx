/**
 * Logo PickleFund mặc định (khi CLB chưa đặt logo riêng) — 2 phiên bản premium theo THEME:
 * light = con-quay tím/trắng, dark = con-quay tím/vàng. Đổi qua CSS theo [data-theme="dark"]
 * (xem index.css) nên bật/tắt dark là logo tự đổi, không cần đọc theme trong JS.
 */
export function PickleFundLogoMark({ size = 32 }: { size?: number }) {
  const s = { width: size, height: size, objectFit: 'contain' as const }
  return (
    <span style={{ display: 'inline-flex', width: size, height: size }} aria-label="PickleFund">
      <img src="/logo-pf-light.png" alt="PickleFund" style={s} className="pf-logomark-light" />
      <img src="/logo-pf-dark.png" alt="PickleFund" style={s} className="pf-logomark-dark" />
    </span>
  )
}
