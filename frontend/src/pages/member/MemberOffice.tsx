/**
 * MemberOffice — Văn phòng AI cho MEMBER_VIEW, ĐỒNG BỘ giao diện Office View của admin AIDO:
 * banner + dải "Kết quả hôm nay" (SỐ THẬT từng agent) + thẻ đội ngũ có trạng thái sống.
 * Read-only: dữ liệu từ DUY NHẤT endpoint tổng hợp /aido/member-office (mở riêng cho member),
 * KHÔNG gọi endpoint quản trị (duyệt/workflow/KPI là màn của admin). Poll 60s + refresh khi
 * quay lại tab; lỗi mạng → giữ banner + báo gọn (không xoá trắng màn).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import { PageShell, PageHeader, ActionButton } from '../../components/shared'
import { OfficeBanner } from '../../components/aido/OfficeBanner'

/** Kết quả công việc trong ngày của từng agent — cùng shape với admin AIDO. */
interface AgentResults {
  maika: { actionsToday: number; briefsToday: number; insightsToday: number; recentInsights: { type: string; title: string; createdAt: string }[] }
  lisa: { remindersToday: number; answeredToday: number }
  hermes: { runsToday: number; waitingApproval: number; running: number; completedToday: number; failedToday: number }
  mitDac: { executedToday: number; running: number; failedToday: number; averageExecutionMs: number }
  notification: { sentToday: number; byChannel: { IN_APP: number; EMAIL: number; TELEGRAM: number }; failedToday: number }
}
const fmtLatency = (ms?: number) =>
  typeof ms === 'number' && ms > 0 ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`) : '—'

export function MemberOffice() {
  const [results, setResults] = useState<AgentResults | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState(false)
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const res = await api.get('/aido/member-office', { timeout: 12_000 })
      const data = res.data?.data ?? {}
      setResults(data.results ?? null)
      setUpdatedAt(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      loadingRef.current = false
    }
  }, [])

  // Nạp lần đầu + poll 60s + refresh khi quay lại tab (member không dùng socket quản trị).
  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const r = results
  // Dải "Kết quả hôm nay" — cùng bố cục/màu với admin AIDO; Maika hiển thị số phân tích
  // (health-score là số liệu điều hành, không đưa xuống member).
  const resultCards = [
    {
      key: 'MAIKA', name: 'Maika', color: '#6D5DFB',
      value: String(r?.maika.insightsToday ?? 0), unit: 'phân tích',
      headline: 'Phân tích hôm nay',
      details: [
        `${r?.maika.briefsToday ?? 0} báo cáo · ${r?.maika.actionsToday ?? 0} đề xuất`,
        r?.maika.recentInsights?.[0] ? `Gần nhất: ${r.maika.recentInsights[0].title}` : 'Theo dõi sức khỏe CLB',
      ],
    },
    {
      key: 'LISA', name: 'Lisa', color: '#2563EB',
      value: String(r?.lisa.answeredToday ?? 0), unit: 'lượt',
      headline: 'Lisa trả lời hôm nay',
      details: [`${r?.lisa.remindersToday ?? 0} nhắc nhở đã gửi`, 'Hỗ trợ thành viên & giải đáp'],
    },
    {
      key: 'HERMES', name: 'Hermes', color: '#059669',
      value: String(r?.hermes.runsToday ?? 0), unit: 'workflow',
      headline: 'Điều phối hôm nay',
      details: [`${r?.hermes.completedToday ?? 0} hoàn tất · ${r?.hermes.failedToday ?? 0} lỗi`, 'Workflow & lịch tự động'],
    },
    {
      key: 'MIT_DAT', name: 'Mít Đặc', color: '#EA580C',
      value: String(r?.mitDac.executedToday ?? 0), unit: 'tác vụ',
      headline: 'Đã thực thi hôm nay',
      details: [
        `${r?.mitDac.running ?? 0} đang chạy · ${r?.mitDac.failedToday ?? 0} lỗi`,
        `Thời gian TB ${fmtLatency(r?.mitDac.averageExecutionMs)}`,
      ],
    },
    {
      key: 'NOTIFICATION', name: 'Thông báo', color: '#C026D3',
      value: String(r?.notification.sentToday ?? 0), unit: 'đã gửi',
      headline: 'Thông báo gửi hôm nay',
      details: [
        `In-app ${r?.notification.byChannel.IN_APP ?? 0} · Email ${r?.notification.byChannel.EMAIL ?? 0}`,
        `Telegram ${r?.notification.byChannel.TELEGRAM ?? 0} · ${r?.notification.failedToday ?? 0} lỗi`,
      ],
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Văn phòng AI"
        subtitle="Đội ngũ AI đang làm việc phục vụ CLB của bạn"
        actions={
          <div className="flex items-center gap-2">
            {updatedAt && (
              <span className="hidden sm:inline text-xs [color:var(--pf-color-muted)]">
                Cập nhật {updatedAt.toLocaleTimeString('vi-VN')}
              </span>
            )}
            <ActionButton variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
              Làm mới
            </ActionButton>
          </div>
        }
      />

      <div className="space-y-5">
        <OfficeBanner
          caption="Văn phòng AI · viền chạy quanh thẻ = agent đang làm việc · kết quả THẬT ở bảng dưới"
          badge={
            <div
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ background: 'rgba(17,24,39,0.72)' }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full animate-pulse"
                style={{ background: error ? 'var(--pf-accent-amber, #F59E0B)' : 'var(--pf-green)' }}
              />
              {error ? 'MẤT KẾT NỐI' : 'ĐỊNH KỲ'}{updatedAt ? ` · ${updatedAt.toLocaleTimeString('vi-VN')}` : ''}
            </div>
          }
        />

        {error && !results && (
          <div
            className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border p-5 text-center [border-color:var(--pf-border)]"
            style={{ background: 'var(--pf-surface)' }}
          >
            <p className="text-sm font-medium [color:var(--pf-color)]">Không tải được số liệu Văn phòng AI</p>
            <p className="text-xs [color:var(--pf-color-muted)]">Kết nối đang chập chờn — hệ thống sẽ tự thử lại.</p>
            <ActionButton onClick={() => void load()}>Thử lại</ActionButton>
          </div>
        )}

        {/* Kết quả công việc THẬT hôm nay — đồng bộ bố cục dải kết quả của admin AIDO. */}
        {results && (
          <div>
            <h3 className="mb-2 text-sm font-semibold [color:var(--pf-text)]">Kết quả hôm nay của từng Agent</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {resultCards.map((c) => (
                <div
                  key={c.key}
                  className="rounded-2xl border p-3.5"
                  style={{
                    background: `color-mix(in srgb, ${c.color} 7%, var(--pf-surface))`,
                    borderColor: `color-mix(in srgb, ${c.color} 22%, var(--pf-border))`,
                    borderTop: `3px solid ${c.color}`,
                  }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: c.color }}>{c.name}</span>
                  <p className="mt-1 text-2xl font-bold leading-none" style={{ color: c.color }}>
                    {c.value}
                    {c.unit && <span className="ml-1 text-xs font-medium [color:var(--pf-color-muted)]">{c.unit}</span>}
                  </p>
                  <p className="mt-1 text-[11px] font-medium [color:var(--pf-color-muted)]">{c.headline}</p>
                  <div className="mt-2 space-y-0.5 border-t pt-2" style={{ borderColor: `color-mix(in srgb, ${c.color} 15%, var(--pf-border))` }}>
                    {c.details.map((d, i) => (
                      <p key={i} className="text-[11px] leading-snug [color:var(--pf-color-muted)]">{d}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageShell>
  )
}
