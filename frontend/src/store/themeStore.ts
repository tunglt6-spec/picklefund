/**
 * themeStore — dark/light (Elite). Điều khiển qua thuộc tính [data-theme="dark"] trên <html>
 * (KHÔNG dùng prefers-color-scheme OS). No-flash: index.html đã set data-theme trước render;
 * store đồng bộ + lưu localStorage 'pf-theme'. 'system' bám theo OS.
 */
import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  const root = document.documentElement
  if (dark) root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
}

function stored(): Theme {
  try {
    const t = localStorage.getItem('pf-theme')
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch {
    /* ignore */
  }
  return 'light'
}

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  /** Áp theme đã lưu + theo dõi OS khi 'system'. Gọi 1 lần lúc app khởi động. */
  init: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: stored(),
  setTheme: (t) => {
    try {
      localStorage.setItem('pf-theme', t)
    } catch {
      /* ignore */
    }
    applyTheme(t)
    set({ theme: t })
  },
  init: () => {
    applyTheme(get().theme)
    if (typeof window !== 'undefined') {
      // Đổi OS chỉ tác động khi đang ở chế độ 'system'.
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (get().theme === 'system') applyTheme('system')
        })
    }
  },
}))
