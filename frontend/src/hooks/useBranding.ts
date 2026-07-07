import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'

/** EPIC10A: branding trắng nhãn theo CLB (đồng bộ backend ClubBranding). */
export interface ClubBranding {
  displayName: string | null
  shortName: string | null
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  loginBackground: string | null
  pdfFooter: string
  faviconUrl: string | null
}

export const BRANDING_FALLBACK: ClubBranding = {
  displayName: 'PickleFund',
  shortName: null,
  logoUrl: null,
  primaryColor: '#6D5DFB',
  secondaryColor: '#5B4BE8',
  loginBackground: null,
  pdfFooter: 'PickleFund',
  faviconUrl: null,
}

/**
 * useBranding — đọc/ghi branding của CLB hiện tại (self-scope theo JWT qua
 * /clubs/me/branding). available=false nếu không tải được (quyền/đăng nhập).
 * EPIC10A chỉ cung cấp dữ liệu + lưu (admin form). Áp vào UI/PDF ở 10B/10C.
 */
export function useBranding() {
  const [branding, setBranding] = useState<ClubBranding>(BRANDING_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/clubs/me/branding')
      const data = (res.data?.data ?? res.data) as ClubBranding
      setBranding({ ...BRANDING_FALLBACK, ...data })
      setAvailable(true)
    } catch {
      setBranding(BRANDING_FALLBACK)
      setAvailable(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { branding, loading, available, reload: load }
}

/** Lưu branding (chỉ gửi field có giá trị). Trả branding hiệu lực sau lưu. */
export async function saveBranding(
  patch: Partial<ClubBranding>,
): Promise<ClubBranding> {
  const body: Record<string, string> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === 'string' && v.length > 0) body[k] = v
  }
  const res = await api.put('/clubs/me/branding', body)
  return (res.data?.data ?? res.data) as ClubBranding
}
