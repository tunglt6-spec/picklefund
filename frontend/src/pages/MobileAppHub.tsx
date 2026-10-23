import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowUpDown, Check } from 'lucide-react'
import { useNotifStore } from '../store/notifStore'
import { homeByRole } from '../components/layout/navConfig'
import { APPS } from '../components/mobile/hubApps'
import {
  HubHeader, HubSearch, HubSectionTitle, TileGrid, FundAndCalendarCards, fold, useHubData, useIsWide,
} from '../components/mobile/HubParts'

/** Trang "Ứng dụng" (mobile/Fold gập): toàn bộ chức năng theo vai trò, tìm kiếm + sắp xếp được. Màn ≥1024px quay về trang chủ. */
export function MobileAppHub() {
  const { user, role, clubData, hasClub } = useHubData()
  const unread = useNotifStore((s) => s.unreadCount)
  const wide = useIsWide()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)

  // Thứ tự lưới do người dùng sắp xếp (lưu theo tài khoản trên thiết bị này).
  const orderKey = user ? `pf_hub_order_v1_${user.id ?? user.username}` : ''
  const [order, setOrder] = useState<string[]>([])
  useEffect(() => {
    if (!orderKey) return
    try { setOrder(JSON.parse(localStorage.getItem(orderKey) ?? '[]')) } catch { setOrder([]) }
  }, [orderKey])
  const saveOrder = (next: string[]) => {
    setOrder(next)
    try { localStorage.setItem(orderKey, JSON.stringify(next)) } catch { /* noop */ }
  }

  const apps = useMemo(() => {
    const base = role ? APPS[role] ?? [] : []
    const rank = new Map(order.map((k, i) => [k, i]))
    return [...base].sort((a, b) => (rank.get(a.key) ?? 1e6 + base.indexOf(a)) - (rank.get(b.key) ?? 1e6 + base.indexOf(b)))
  }, [role, order])

  const q = fold(query.trim())
  const shown = q ? apps.filter((a) => fold(a.label).includes(q)) : apps

  const move = (key: string, dir: -1 | 1) => {
    const keys = apps.map((a) => a.key)
    const i = keys.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    saveOrder(keys)
  }

  if (!user || !role) return null
  if (wide) return <Navigate to={homeByRole[role]} replace />

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
      <HubHeader hasClub={hasClub} clubName={clubData?.settings?.name} />
      <HubSearch value={query} onChange={setQuery} />
      {!q && <FundAndCalendarCards />}

      <HubSectionTitle
        right={!q && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold [color:var(--pf-primary)] active:opacity-70"
          >
            {editing ? <Check size={16} /> : <ArrowUpDown size={16} />}
            {editing ? 'Xong' : 'Sắp xếp'}
          </button>
        )}
      >
        {q ? `Kết quả (${shown.length})` : 'Ứng dụng của tôi'}
      </HubSectionTitle>
      <TileGrid items={shown} unread={unread} editing={editing && !q} onMove={move} empty={`Không tìm thấy chức năng “${query}”.`} />
    </div>
  )
}
