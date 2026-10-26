import { createContext } from 'react'

/** Set only by AppLayout; public pages and wide layouts retain their original icons. */
export const MobileIconContext = createContext(false)
export const MobileIconThemeContext = createContext<'light' | 'dark'>('light')
