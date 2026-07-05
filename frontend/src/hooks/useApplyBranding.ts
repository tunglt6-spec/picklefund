import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useBrandingStore } from '../store/brandingStore'
import { setExportBranding } from '../lib/export'

/**
 * EPIC10B: nạp branding theo CLB hiện tại và áp cấp document:
 * - document.title theo displayName
 * - CSS var --color-primary / --color-secondary (component dùng var sẽ đổi theo)
 * - meta theme-color + favicon (nếu có faviconUrl)
 * Bỏ trống → fallback PickleFund. Gọi 1 lần ở AppLayout.
 */
export function useApplyBranding() {
  const user = useAuthStore((s) => s.user)
  const branding = useBrandingStore((s) => s.branding)
  const load = useBrandingStore((s) => s.load)

  useEffect(() => {
    void load(user?.clubId ?? null)
  }, [user?.clubId, load])

  useEffect(() => {
    // EPIC10C: đẩy branding vào PDF/export (header displayName, footer pdfFooter).
    setExportBranding({
      displayName: branding.displayName,
      pdfFooter: branding.pdfFooter,
    })

    const root = document.documentElement
    root.style.setProperty('--color-primary', branding.primaryColor)
    root.style.setProperty('--color-secondary', branding.secondaryColor)

    document.title = branding.displayName
      ? `${branding.displayName} · PickleFund`
      : 'PickleFund · Sports Community Platform'

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', branding.primaryColor)

    // favicon: dùng của CLB nếu có; nếu không → khôi phục mặc định (tránh giữ
    // favicon CLB cũ khi chuyển sang CLB không đặt favicon).
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) link.href = branding.faviconUrl ?? '/favicon.svg'
    else if (branding.faviconUrl) {
      const el = document.createElement('link')
      el.rel = 'icon'
      el.href = branding.faviconUrl
      document.head.appendChild(el)
    }
  }, [branding])
}
