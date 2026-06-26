import { create } from 'zustand'

interface NotifState {
  unreadCount: number
  setUnreadCount: (n: number) => void
  decrement: () => void
  reset: () => void
}

export const useNotifStore = create<NotifState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  decrement: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  reset: () => set({ unreadCount: 0 }),
}))
