import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMinigameStore } from '../store/minigameStore'
import api from '../lib/api'
import type { MiniGame, MiniGameParticipant } from '../types/minigame'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

export function useMinigameDetailSync(minigameId: string | undefined) {
  const { accessToken } = useAuthStore()
  const { syncMinigameDetail } = useMinigameStore()
  const syncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!minigameId || !accessToken) return
    if (isLocalToken(accessToken)) return
    const key = `${minigameId}:${accessToken}`
    if (syncedRef.current === key) return
    syncedRef.current = key

    api.get(`/minigames/${minigameId}`).then(res => {
      const m = res.data?.data ?? res.data
      if (!m) return

      const mg: MiniGame = {
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
      }

      const participants: MiniGameParticipant[] = (m.participants ?? []).map((p: any) => ({
        id: p.id ?? p.memberId,
        minigameId: m.id,
        memberId: p.memberId ?? p.member?.id,
        memberName: p.member?.fullName ?? p.memberName ?? '',
        status: p.status ?? 'ACTIVE',
        skillLevel: p.skillLevel ?? undefined,
        gender: p.gender ?? undefined,
      }))

      syncMinigameDetail(mg, participants)
    }).catch(() => { /* keep local store */ })
  }, [minigameId, accessToken, syncMinigameDetail])
}
