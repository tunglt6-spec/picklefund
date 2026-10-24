import type { InputHTMLAttributes } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

type Kind = 'date' | 'time' | 'datetime-local'

const PLACEHOLDER: Record<Kind, string> = { date: 'dd/mm/yyyy', time: 'HH:mm', 'datetime-local': 'dd/mm/yyyy HH:mm' }

/** Chuỗi hiển thị chuẩn Việt Nam: ngày dd/mm/yyyy, giờ 24h HH:mm (không phụ thuộc ngôn ngữ thiết bị). */
export function formatFieldValue(kind: Kind, v: string): string {
  if (!v) return ''
  if (kind === 'time') return v.slice(0, 5)
  const [d, t] = v.split('T')
  const date = d.slice(0, 10).split('-').reverse().join('/')
  return kind === 'datetime-local' && t ? `${date} ${t.slice(0, 5)}` : date
}

function Field({ kind, ...props }: InputHTMLAttributes<HTMLInputElement> & { kind: Kind }) {
  const compact = useIsMobile(1024)
  if (!compact) return <input {...props} type={kind} />
  const text = formatFieldValue(kind, String(props.value ?? ''))
  return (
    <div className="relative w-full min-w-0">
      {/* Ô gốc vẫn xử lý chọn ngày/giờ; chữ gốc được che, thay bằng chữ định dạng Việt Nam bên dưới. */}
      <input {...props} type={kind} className={`${props.className ?? ''} pf-dt-mask`} />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 right-10 flex items-center truncate px-3 text-base ${text ? '[color:var(--pf-text)]' : '[color:var(--pf-color-muted)]'}`}
      >
        {text || PLACEHOLDER[kind]}
      </span>
    </div>
  )
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Field kind="date" {...props} /> }
export function TimeInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Field kind="time" {...props} /> }
export function DateTimeInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Field kind="datetime-local" {...props} /> }
