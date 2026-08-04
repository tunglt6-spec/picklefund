/**
 * ThemeToggle — nút chuyển sáng/tối (Elite). Dựng sẵn; GẮN vào header ở lô cuối
 * (sau khi token-hoá đủ) để tránh bật dark khi UI chưa sẵn sàng.
 */
import { Sun, Moon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThemeStore } from '../../store/themeStore'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
      title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
        '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] hover:[color:var(--pf-text)]',
        className,
      )}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
