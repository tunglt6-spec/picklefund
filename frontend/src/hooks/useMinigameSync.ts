import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMinigameStore } from '../store/minigameStore'
import api from '../lib/api'
import type { MiniGame } from '../types/minigame'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

export function useMinigameSync() {
  const { user, accessToken, isAuthenticated } = useAuthStore()
  const { setMinigamesFromApi } = useMinigameStore()
  const syncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.clubId || !accessToken) return
    if (isLocalToken(accessToken)) return
    if (syncedRef.current === accessToken) return

    const clubId = user.clubId
    syncedRef.current = accessToken

    api.get('/minigames').then(res => {
      const raw: any[] = res.data?.data ?? []
      const minigames: MiniGame[] = raw.map(m => ({
        id: m.id,
        clubId: m.clubId,
        name: m.name,
        description: m.description ?? undefined,
        startDate: m.scheduledAt ? m.scheduledAt.slice(0, 10) : (m.startDate ?? ''),
        endDate: m.endDate ?? undefined,
        status: m.status ?? 'DRAFT',
        groupSize: m.settings?.groupSize ?? 4,
        allowDraw: m.settings?.allowDraw ?? false,
        winPoints: m.settings?.winPoints ?? 3,
        drawPoints: m.settings?.drawPoints ?? 1,
        lossPoints: m.settings?.lossPoints ?? 0,
        notes: m.notes ?? undefined,
        createdBy: m.createdById ?? '',
        createdAt: m.createdAt ?? '',
        formatType: m.format ?? 'GROUP_STAGE',
        drawMode: m.settings?.drawMode ?? 'RANDOM',
      }))
      setMinigamesFromApi(clubId, minigames)
    }).catch(() => { /* keep local store data */ })
  }, [isAuthenticated, user?.clubId, accessToken, setMinigamesFromApi])
}
