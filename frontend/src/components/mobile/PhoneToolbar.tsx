import { useState, useEffect, isValidElement, type ReactNode } from 'react'
import { useNarrowPhone } from '../../hooks/useNarrowPhone'
import { Modal } from '../ui/Modal'

export interface PhoneTool {
  key: string
  label: string
  icon: ReactNode
  detail?: string
  active?: boolean
  primary?: boolean
  disabled?: boolean
  onClick?: () => void
  content?: ReactNode | ((close: () => void) => ReactNode)
}

/** Narrow-phone controls share one row. Wider mobile layouts render their existing toolbar. */
export function PhoneToolbar({ tools, more, moreLabel = 'Tác vụ', fallback, label = 'Công cụ màn hình' }: {
  tools: PhoneTool[]
  more?: ReactNode
  moreLabel?: string
  fallback: ReactNode
  label?: string
}) {
  const phone = useNarrowPhone()
  const [opened, setOpened] = useState<string | null>(null)
  useEffect(() => { if (!phone) setOpened(null) }, [phone])
  if (!phone) return <>{fallback}</>
  const hasMore = !!more && !(isValidElement<{items?: unknown[]}>(more) && Array.isArray(more.props.items) && more.props.items.length === 0)
  if (!tools.length && !hasMore) return null
  const current = tools.find(tool => tool.key === opened)
  const close = () => setOpened(null)
  return <>
    <div className="pf-phone-toolbar" role="toolbar" aria-label={label}
      style={{ gridTemplateColumns: `repeat(${tools.length + (hasMore ? 1 : 0)}, minmax(0, 1fr))`, maxWidth: (tools.length + (hasMore ? 1 : 0)) * 78 - 6 }}>
      {tools.map(tool => <button key={tool.key} type="button" disabled={tool.disabled}
        aria-label={tool.detail ? `${tool.label}: ${tool.detail}` : tool.label}
        aria-haspopup={tool.content ? 'dialog' : undefined}
        aria-expanded={tool.content ? opened === tool.key : undefined}
        data-primary={tool.primary || undefined} data-active={tool.active || undefined}
        onClick={() => tool.content ? setOpened(tool.key) : tool.onClick?.()}>
        {tool.icon}<span>{tool.label}</span>{tool.active && <i aria-hidden />}
      </button>)}
      {hasMore && <div className="pf-phone-toolbar-more">{more}<span aria-hidden>{moreLabel}</span></div>}
    </div>
    {current?.content && <Modal open title={current.label} subtitle={current.detail} onClose={close} size="sm"
      footer={<button type="button" className="pf-mobile-chip" onClick={close}>Xong</button>}>
      <div className="pf-phone-tool-content">
        {typeof current.content === 'function' ? current.content(close) : current.content}
      </div>
    </Modal>}
  </>
}
