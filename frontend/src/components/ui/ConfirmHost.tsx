import { useEffect, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { ActionButton } from '../shared/ActionButton'

interface ConfirmOpts { title?: string; message?: string; confirmLabel?: string; variant?: 'danger' | 'warning' }
type Req =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; title: string; label: string; placeholder?: string; resolve: (v: string | null) => void }
  | { kind: 'notice'; title: string; message: string; resolve: () => void }

let push: ((r: Req) => void) | null = null

export const confirmDialog = (opts: ConfirmOpts = {}) =>
  new Promise<boolean>((resolve) => (push ? push({ kind: 'confirm', opts, resolve }) : resolve(false)))
export const promptDialog = (title: string, label: string, placeholder?: string) =>
  new Promise<string | null>((resolve) => (push ? push({ kind: 'prompt', title, label, placeholder, resolve }) : resolve(null)))
export const noticeDialog = (title: string, message: string) =>
  new Promise<void>((resolve) => (push ? push({ kind: 'notice', title, message, resolve }) : resolve()))

export function ConfirmHost() {
  const [req, setReq] = useState<Req | null>(null)
  const [text, setText] = useState('')
  useEffect(() => {
    push = (r) => { setText(''); setReq(r) }
    return () => { push = null }
  }, [])
  const close = () => setReq(null)

  if (!req) return null
  if (req.kind === 'confirm') {
    const done = (v: boolean) => { req.resolve(v); close() }
    return <ConfirmDialog open title={req.opts.title} message={req.opts.message} confirmLabel={req.opts.confirmLabel} variant={req.opts.variant} onConfirm={() => done(true)} onCancel={() => done(false)} />
  }
  if (req.kind === 'prompt') {
    const done = (v: string | null) => { req.resolve(v); close() }
    return (
      <Modal open onClose={() => done(null)} title={req.title} size="sm" footer={
        <>
          <ActionButton variant="ghost" className="min-h-11" onClick={() => done(null)}>Hủy</ActionButton>
          <ActionButton variant="primary" className="min-h-11" onClick={() => done(text.trim() || null)}>Đồng ý</ActionButton>
        </>
      }>
        <label htmlFor="pf-prompt-input" className="mb-2 block text-sm font-medium [color:var(--pf-text)]">{req.label}</label>
        <input id="pf-prompt-input" autoFocus value={text} placeholder={req.placeholder} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') done(text.trim() || null) }}
          className="h-11 w-full rounded-xl border px-3 text-sm outline-none [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]" />
      </Modal>
    )
  }
  const done = () => { req.resolve(); close() }
  return (
    <Modal open onClose={done} title={req.title} size="sm" footer={<ActionButton variant="primary" className="min-h-11" onClick={done}>Đóng</ActionButton>}>
      <p className="whitespace-pre-line text-sm [color:var(--pf-text)]">{req.message}</p>
    </Modal>
  )
}
