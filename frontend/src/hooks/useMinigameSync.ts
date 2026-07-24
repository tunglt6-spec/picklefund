import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMinigameStore } from '../store/minigameStore'
import api from '../lib/api'
import { deriveMinigameDates, type MiniGame } from '../types/minigame'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

export function useMinigameSync() {
  const { user, accessToken, isAuthenticated } = useAuthStore()
  const { setMinigamesFromApi } = useMinigameStore()
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.clubId || !accessToken) return
    if (isLocalToken(accessToken)) return
    if (syncedRef.current) return

    const clubId = user.clubId
    syncedRef.current = true

    api.get('/minigames').then(res => {
      const raw: any[] = res.data?.data ?? []
      const minigames: MiniGame[] = raw.map(m => ({
        id: m.id,
        clubId: m.clubId,
        name: m.name,
        description: m.description ?? undefined,
        ...deriveMinigameDates(m),
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
        // pairingMode nằm trong settings — PHẢI carry qua, nếu không FixedDoubles dashboard
        // hiểu nhầm chế độ THỦ CÔNG thành TỰ ĐỘNG (isManual=false) → hiện nút ghép tự động bị BE chặn.
        pairingMode: m.settings?.pairingMode ?? undefined,
      }))
      setMinigamesFromApi(clubId, minigames)
    }).catch(() => { /* keep local store data */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.clubId, setMinigamesFromApi])
}
