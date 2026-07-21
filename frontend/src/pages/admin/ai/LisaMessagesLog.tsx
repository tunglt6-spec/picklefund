/**
 * LisaMessagesLog — Lịch sử hỏi–đáp của Lisa (đọc TOÀN VĂN). Read-only.
 * Đọc GET /aido/lisa-messages (bảng lisa_messages, Phase 2). V2.2 Clean Modern SaaS.
 */
import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, User, Sparkles } from 'lucide-react'
import api from '../../../lib/api'
import {
  PageShell, PageHeader, MetricCard, EmptyState, LoadingState, ErrorState,
} from '../../../components/shared'

interface LisaMessage {
  id: string
  memberId?: string | null
  memberName?: string | null
  question: string
  answer: string
  createdAt: string
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

export function LisaMessagesLog() {
  const [items, setItems] = useState<LisaMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/aido/lisa-messages?limit=50')
      setItems((res.data?.data ?? []) as LisaMessage[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <PageShell>
      <PageHeader
        title="Lisa — Lịch sử hỏi–đáp"
        subtitle="Toàn văn câu hỏi của thành viên và câu trả lời của Lisa"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={24} />}
          title="Chưa có hội thoại nào"
          description="Khi thành viên đặt câu hỏi cho Lisa, nội dung hỏi–đáp sẽ lưu và hiển thị tại đây."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <MetricCard accent="blue" icon={<MessageSquare size={18} />} label="Lượt hỏi–đáp" value={items.length} />
          </div>

          <div className="flex flex-col gap-3">
            {items.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-text)]">
                    <User size={13} className="[color:var(--pf-color-muted)]" />
                    {m.memberName ?? 'Thành viên'}
                  </span>
                  <span className="text-[11px] [color:var(--pf-color-muted)]">{fmt(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-line rounded-xl px-3 py-2 text-sm [color:var(--pf-text)] [background:var(--pf-primary-soft)]">
                  {m.question}
                </p>
                <div className="mt-2 flex gap-2">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                    <Sparkles size={13} />
                  </span>
                  <p className="whitespace-pre-line text-sm leading-relaxed [color:var(--pf-text)]">{m.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
