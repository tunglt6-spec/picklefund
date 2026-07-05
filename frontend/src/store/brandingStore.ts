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
      set({ branding: BRANDING_FALLBACK, forClubId: clubId })
    }
  },
}))
