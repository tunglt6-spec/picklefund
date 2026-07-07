import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

/** Member có được ủy quyền quản lý minigame không (Club.settings.minigameDelegateMemberIds). Admin luôn true. */
export function useMinigameDelegate() {
  const { user } = useAuthStore()
  const isStaff = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN'
  const [delegates, setDelegates] = useState<string[]>([])
  const [loading, setLoading] = useState(!isStaff)
  useEffect(() => {
    if (isStaff || !user) return
    let alive = true
    api.get('/clubs/me/minigame-delegates')
      .then(res => { if (alive) setDelegates(res.data?.data ?? []) })
      .catch(() => { /* mặc định không ủy quyền */ })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [isStaff, user])
  const canManage = isStaff || (!!user?.memberId && delegates.includes(user.memberId))
  return { canManage, delegates, setDelegates, loading, isStaff }
}
