import { create } from 'zustand'
import api from '../lib/api'
import { BRANDING_FALLBACK, type ClubBranding } from '../hooks/useBranding'

/**
 * EPIC10B: nguồn branding dùng chung cho app chrome (sidebar/header/title/favicon/CSS).
 * Nạp 1 lần theo clubId; đổi clubId (login CLB khác) → nạp lại. Lỗi/không có → fallback PickleFund.
 */
interface BrandingState {
  branding: ClubBranding
  forClubId: string | null
  load: (clubId: string | null) => Promise<void>
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: BRANDING_FALLBACK,
  forClubId: null,
  load: async (clubId) => {
    if (get().forClubId === clubId && get().branding !== BRANDING_FALLBACK) return
    if (!clubId) {
      set({ branding: BRANDING_FALLBACK, forClubId: null })
      return
    }
    try {
      const res = await api.get('/clubs/me/branding')
      const data = (res.data?.data ?? res.data) as ClubBranding
      set({ branding: { ...BRANDING_FALLBACK, ...data }, forClubId: clubId })
    } catch {
      // Mọi role đọc được /clubs/me → vẫn lấy ĐÚNG tên + logo CLB (không rơi về "PickleFund" khi /me/branding lỗi/chưa phân quyền).
      try {
        const me = await api.get('/clubs/me')
        const c = (me.data?.data ?? me.data) as { name?: string | null; logoUrl?: string | null } | null
        if (c?.name) {
          set({ branding: { ...BRANDING_FALLBACK, displayName: c.name, logoUrl: c.logoUrl ?? null }, forClubId: clubId })
          return
        }
      } catch { /* bỏ qua */ }
      set({ branding: BRANDING_FALLBACK, forClubId: clubId })
    }
  },
}))

/** Tên CLB cho fallback xuất file: ưu tiên tên thương hiệu đã nạp, không có thì 'CLB' (không hard-code "CLB Pickleball"). */
export function getBrandClubName(): string {
  return useBrandingStore.getState().branding.displayName?.trim() || 'CLB'
}
