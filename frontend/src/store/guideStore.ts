/**
 * guideStore — trạng thái mở/đóng tài liệu "Hướng dẫn sử dụng" dùng chung.
 * Gom về 1 nơi để nút ở header (desktop/mobile) và auto-open lần đầu (AppLayout)
 * cùng điều khiển MỘT modal duy nhất (tránh 2 header cùng bật).
 */
import { create } from 'zustand'

interface GuideState {
  open: boolean
  openGuide: () => void
  closeGuide: () => void
}

export const useGuideStore = create<GuideState>((set) => ({
  open: false,
  openGuide: () => set({ open: true }),
  closeGuide: () => set({ open: false }),
}))
