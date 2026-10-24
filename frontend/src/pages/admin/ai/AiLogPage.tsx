/**
 * AiLogPage — "Nhật ký AI" gộp 3 mục: Mít Đặc (thực thi) · Maika (phân tích) · Lisa (hỏi–đáp).
 * Là màn đứng riêng (route /admin/ai-log) để AI Operations Center trỏ tới qua card "AI Dispatch".
 */
import { useState } from 'react'
import { Bot, BarChart3, MessageSquare } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { MitDacExecutionLog } from './MitDacExecutionLog'
import { MaikaInsightsLog } from './MaikaInsightsLog'
import { LisaMessagesLog } from './LisaMessagesLog'

const TABS = [
  { key: 'mitdac', label: 'Mít Đặc · thực thi' },
  { key: 'maika', label: 'Maika · phân tích' },
  { key: 'lisa', label: 'Lisa · hỏi–đáp' },
] as const

export function AiLogPage() {
  const [tab, setTab] = useState<'mitdac' | 'maika' | 'lisa'>('mitdac')
  const mobile = useIsMobile(1024)
  // Mobile (<1024px): ba nhật ký là ba màn riêng, chọn bằng lưới icon (không dùng nút kiểu tab).
  if (mobile) {
    return (
      <ModuleTabs
        title="Nhật ký AI"
        module="ai"
        menuBack="/admin/ai-manager"
        tabs={[
          { key: 'mitdac', icon: Bot, label: 'Mít Đặc · thực thi', menuLabel: 'Nhật ký thực thi (Mít Đặc)', element: <MitDacExecutionLog /> },
          { key: 'maika', icon: BarChart3, label: 'Maika · phân tích', menuLabel: 'Nhật ký phân tích (Maika)', element: <MaikaInsightsLog /> },
          { key: 'lisa', icon: MessageSquare, label: 'Lisa · hỏi–đáp', menuLabel: 'Nhật ký hỏi–đáp (Lisa)', element: <LisaMessagesLog /> },
        ]}
      />
    )
  }
  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      <div className="flex flex-wrap gap-2 px-4 pt-4 sm:px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            style={
              tab === t.key
                ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on, #fff)' }
                : { background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'mitdac' && <MitDacExecutionLog />}
      {tab === 'maika' && <MaikaInsightsLog />}
      {tab === 'lisa' && <LisaMessagesLog />}
    </div>
  )
}
