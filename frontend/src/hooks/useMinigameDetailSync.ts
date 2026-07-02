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

      // Member CLB thật (từ bảng minigame_participants)
      const memberParticipants: MiniGameParticipant[] = (m.participants ?? []).map((p: any) => ({
        id: p.id ?? p.memberId,
        minigameId: m.id,
        memberId: p.memberId ?? p.member?.id,
        memberName: p.member?.fullName ?? p.memberName ?? '',
        status: p.status ?? 'ACTIVE',
        skillLevel: p.skillLevel ?? undefined,
        gender: p.gender ?? undefined,
        isGuest: false,
      }))

      // Khách mời (từ Minigame.settings.guests) → participant đầy đủ trong store, dùng
      // `guest-<uuid>` làm player key. Nhờ vậy guest chảy qua draw/team/match/score/standings
      // (đều operate trên participants[memberId]) và KHÔNG bị mất khi reload (fix persistence).
      const guestParticipants: MiniGameParticipant[] = (m.settings?.guests ?? []).map((g: any) => ({
        id: g.id,
        minigameId: m.id,
        memberId: g.id,
        memberName: g.name ?? 'Khách',
        status: 'ACTIVE',
        isGuest: true,
      }))

      syncMinigameDetail(mg, [...memberParticipants, ...guestParticipants])
    }).catch(() => { /* keep local store */ })
  }, [minigameId, accessToken, syncMinigameDetail])
}
