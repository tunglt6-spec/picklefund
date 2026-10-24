import { useEffect, useMemo, useState } from 'react'
import { useModerationPending } from '../hooks/useModerationPending'
import { Navigate } from 'react-router-dom'
import { ArrowUpDown, Check } from '../components/icons/mobileLucide'
import { useNotifStore } from '../store/notifStore'
import { homeByRole } from '../components/layout/navConfig'
import { APP_GROUPS, type AppItem } from '../components/mobile/hubApps'
import { HubSearch, HubSectionTitle, TileGrid, fold, useHubData, useIsWide } from '../components/mobile/HubParts'

/**
 * "Ứng dụng" (mobile) — toàn bộ chức năng, NHÓM THEO NGHIỆP VỤ. Ô tìm kiếm ở đây là tìm CHỨC NĂNG toàn app
 * (tìm dữ liệu nằm trong từng màn). Sắp xếp được trong từng nhóm, lưu theo tài khoản trên thiết bị. Tablet/desktop quay về trang chủ.
 */
export function MobileAppHub() {
  const { user, role } = useHubData()
  const unread = useNotifStore((s) => s.unreadCount)
  const wide = useIsWide()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)

  const orderKey = user ? `pf_hub_order_v1_${user.id ?? user.username}` : ''
  const [order, setOrder] = useState<string[]>([])
  useEffect(() => {
    if (!orderKey) return
    try {
      const v = JSON.parse(localStorage.getItem(orderKey) ?? '[]')
      setOrder(Array.isArray(v) ? v.filter((k) => typeof k === 'string') : [])
    } catch { setOrder([]) }
  }, [orderKey])
  const saveOrder = (next: string[]) => {
    setOrder(next)
    try { localStorage.setItem(orderKey, JSON.stringify(next)) } catch { /* noop */ }
  }

  const modPending = useModerationPending(role === 'CLUB_ADMIN')
  const groups = useMemo(() => {
    const rank = new Map(order.map((k, i) => [k, i]))
    return (role ? APP_GROUPS[role] : []).map((g) => ({
      ...g,
      items: [...g.items].map((a) => (a.key === 'moderation' && modPending > 0 ? { ...a, badgeCount: modPending } : a)).sort((a, b) => (rank.get(a.key) ?? 1e6 + g.items.indexOf(a)) - (rank.get(b.key) ?? 1e6 + g.items.indexOf(b))),
    }))
  }, [role, order, modPending])

  const q = fold(query.trim())
  const matches: AppItem[] = q ? groups.flatMap((g) => g.items).filter((a) => fold(a.label).includes(q) || fold(g_title(groups, a)).includes(q)) : []

  // Chuyển ô trong CÙNG nhóm (đổi chỗ với ô kề bên).
  const move = (groupKey: string, key: string, dir: -1 | 1) => {
    const g = groups.find((x) => x.key === groupKey)
    if (!g) return
    const keys = g.items.map((a) => a.key)
    const i = keys.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    // Giữ thứ tự mới của nhóm này, các nhóm khác không đổi.
    const others = order.filter((k) => !keys.includes(k))
    saveOrder([...others, ...keys])
  }

  if (!user || !role) return null
  if (wide) return <Navigate to={homeByRole[role]} replace />

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-[800] [color:var(--pf-text)]" style={{ letterSpacing: '-0.02em' }}>Ứng dụng</h1>
        {!q && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold [color:var(--pf-primary-text)] active:opacity-70"
          >
            {editing ? <Check size={16} aria-hidden /> : <ArrowUpDown size={16} aria-hidden />}
            {editing ? 'Xong' : 'Sắp xếp'}
          </button>
        )}
      </div>
      <div className="mt-2"><HubSearch value={query} onChange={setQuery} /></div>

      {q ? (
        <>
          <HubSectionTitle first>Kết quả ({matches.length})</HubSectionTitle>
          <TileGrid items={matches} unread={unread} empty={`Không tìm thấy chức năng “${query}”.`} />
        </>
      ) : (
        groups.map((g, gi) => (
          <section key={g.key} aria-label={g.title}>
            <HubSectionTitle first={gi === 0}>{g.title}</HubSectionTitle>
            <TileGrid items={g.items} unread={unread} editing={editing} onMove={(k, d) => move(g.key, k, d)} />
          </section>
        ))
      )}
    </div>
  )
}

function g_title(groups: { title: string; items: AppItem[] }[], a: AppItem) {
  return groups.find((g) => g.items.some((x) => x.key === a.key))?.title ?? ''
}
