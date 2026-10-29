/**
 * PageHeader (UDP-01) — tiêu đề màn hình + mô tả ngắn + slot phụ (weather/next match)
 * + chuông thông báo + primary action. Responsive: action xuống dòng trên mobile.
 *
 * variant:
 *  - 'inline' (mặc định): khối tiêu đề inline (chữ lớn, không chrome) — chuẩn hiện đại,
 *    nằm trong padding nội dung trang.
 *  - 'bar': app-bar edge-to-edge (nền surface + viền dưới + px-6) — GIỮ tương thích 17 màn
 *    cũ từng dùng layout/PageHeader (nay là shim gọi variant="bar"). KHÔNG đổi render.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useEmbedded } from './ModuleTabs'
import { useIsMobile } from '../../hooks/useIsMobile'
import { WorkspaceMark } from '../mobile/WorkspaceMark'
import { MobileFunctionHeader } from '../mobile/ModuleNav'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Slot card phụ bên phải (vd weather, next match) — ẩn trên mobile hẹp nếu cần. */
  aside?: ReactNode
  /** Primary action (vd ActionButton) + chuông. */
  actions?: ReactNode
  className?: string
  /** Kiểu hiển thị: 'inline' (mặc định) hoặc 'bar' (app-bar viền dưới, tương thích cũ). */
  variant?: 'inline' | 'bar'
  mobileBackTo?: string
  mobileParent?: string
}

export function PageHeader({
  title,
  subtitle,
  aside,
  actions,
  className,
  variant = 'inline',
  mobileBackTo,
  mobileParent = 'Hệ thống',
}: PageHeaderProps) {
  const navigate = useNavigate()
  const embedded = useEmbedded()
  // Mobile: bỏ emoji đầu tiêu đề (chuẩn Luxury SaaS dùng icon, không dùng emoji); desktop giữ nguyên.
  const isMobile = useIsMobile(1024)
  const shownTitle = isMobile ? title.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '') : title

  if (isMobile && mobileBackTo && !embedded) return <>
    <MobileFunctionHeader title={shownTitle} parent={mobileParent} onBack={() => navigate(mobileBackTo)} />
    {subtitle && <p className="mb-3 text-sm [color:var(--pf-color-muted)]">{subtitle}</p>}
    {(actions || aside) && <div className="mb-4 flex min-w-0 flex-wrap items-center justify-end gap-2">{aside}{actions}</div>}
  </>

  // ── Variant 'bar' — app-bar edge-to-edge (khớp layout/PageHeader cũ, zero render change) ──
  if (variant === 'bar') {
    if (embedded) {
      if (!subtitle && !actions && !aside) return null
      return (
        <div className={cn('pf-glass-bar border-b px-6 py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between', className)}>
          {subtitle ? <p className="text-xs [color:var(--pf-color-muted)] min-w-0 truncate">{subtitle}</p> : <span />}
          {(aside || actions) && (
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
              {actions}
            </div>
          )}
        </div>
      )
    }
    return (
      <div className={cn('pf-glass-bar border-b px-6 py-4 max-lg:px-4 max-lg:py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between', className)}>
        <div className="min-w-0">
          <h1 className="text-base font-bold [color:var(--pf-text)] max-lg:text-[20px] max-lg:font-[800]"><span className="pf-workspace-title">{isMobile && <WorkspaceMark title={shownTitle} />}<span>{shownTitle}</span></span></h1>
          {subtitle && <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {(aside || actions) && (
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
            {actions}
          </div>
        )}
      </div>
    )
  }

  // ── Variant 'inline' (mặc định) — tiêu đề hiện đại, chữ lớn, không chrome ──
  // Trong module (embedded): module + tab đã định danh → BỎ h1 trùng, GIỮ phụ đề + actions.
  if (embedded) {
    if (!subtitle && !actions && !aside) return null
    return (
      <header
        data-pf-toolbar={subtitle || aside ? 'context' : 'actions'}
        className={cn(
          'mb-4 flex flex-col gap-2 min-[600px]:flex-row min-[600px]:flex-wrap min-[600px]:items-center min-[600px]:justify-between lg:gap-2',
          actions ? 'pf-toolbar' : '',
          className,
        )}
      >
        {subtitle ? (
          <p className="min-w-0 flex-1 min-[600px]:basis-56 text-sm [color:var(--pf-color-muted)]">{subtitle}</p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 flex-wrap min-[600px]:ml-auto min-[600px]:justify-end max-lg:min-w-0 max-lg:max-w-full lg:shrink-0 lg:flex-nowrap">
          {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
          {actions}
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        'mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between max-lg:mb-3 max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:gap-x-3 max-lg:gap-y-2',
        className,
      )}
    >
      <div className="min-w-0 max-lg:flex-1 max-lg:basis-48">
        <h1
          className="text-xl font-bold sm:text-2xl [color:var(--pf-text)] max-lg:text-[22px] max-lg:font-[800]"
          style={{ letterSpacing: '-0.02em' }}
        >
          <span className="pf-workspace-title">{isMobile && <WorkspaceMark title={shownTitle} />}<span>{shownTitle}</span></span>
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm [color:var(--pf-color-muted)]">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap max-lg:min-w-0 max-lg:max-w-full">
        {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
        {actions}
      </div>
    </header>
  )
}
