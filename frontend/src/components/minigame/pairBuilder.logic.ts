/**
 * Logic THUẦN cho PairBuilder (không React/DOM) — test bằng `node --test`.
 * Người được chọn có 3 loại: thành viên CLB | khách ĐÃ LƯU (có id) | khách MỚI gõ tay (chỉ có tên).
 */
export interface TeamLike {
  player1Id?: string | null
  player2Id?: string | null
  player1GuestId?: string | null
  player2GuestId?: string | null
  player1?: { id: string } | null
  player2?: { id: string } | null
}
export interface SavedGuest { id: string; name: string }

export type PickedPlayer =
  | { kind: 'member'; id: string; name: string }
  | { kind: 'saved'; id: string; name: string }
  | { kind: 'new'; name: string }

/** Tập id (thành viên + khách) đã thuộc một cặp. */
export function takenPlayerKeys(teams: TeamLike[]): Set<string> {
  const out = new Set<string>()
  for (const t of teams) {
    for (const x of [t.player1Id, t.player2Id, t.player1GuestId, t.player2GuestId, t.player1?.id, t.player2?.id]) {
      if (x) out.add(x)
    }
  }
  return out
}

/** Khách đã lưu nhưng CHƯA thuộc cặp nào (hiện ở chip "Khách đã thêm"). */
export function unpairedSavedGuests(saved: SavedGuest[], teams: TeamLike[]): SavedGuest[] {
  const taken = takenPlayerKeys(teams)
  return saved.filter(g => !taken.has(g.id))
}

/** Gom lựa chọn thống nhất theo thứ tự: thành viên → khách đã lưu → khách mới (bỏ tên mới trùng nhau). */
export function collectPicks(
  members: { id: string; fullName: string }[],
  pickIds: string[],
  saved: SavedGuest[],
  savedPickIds: string[],
  newGuests: string[],
): PickedPlayer[] {
  const out: PickedPlayer[] = []
  for (const id of pickIds) {
    const m = members.find(x => x.id === id)
    out.push({ kind: 'member', id, name: m?.fullName ?? 'Thành viên' })
  }
  for (const id of savedPickIds) {
    const g = saved.find(x => x.id === id)
    if (g) out.push({ kind: 'saved', id, name: g.name })
  }
  const seen = new Set<string>()
  for (const n of newGuests) {
    const k = n.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push({ kind: 'new', name: n.trim() })
  }
  return out
}

const slot = (n: 1 | 2, p: PickedPlayer) =>
  p.kind === 'new' ? { [`player${n}Guest`]: p.name } : { [`player${n}Id`]: p.id }

/** Payload POST /teams — chỉ khi ĐÚNG 2 người (bất kỳ loại). */
export function buildManualPayload(name: string, picks: PickedPlayer[]): Record<string, string> | null {
  if (picks.length !== 2) return null
  return { name, ...slot(1, picks[0]), ...slot(2, picks[1]) } as Record<string, string>
}

/** Payload POST /pairs/auto. */
export function buildAutoPayload(picks: PickedPlayer[], pairingMode: string) {
  return {
    memberIds: picks.filter(p => p.kind === 'member').map(p => (p as { id: string }).id),
    guestIds: picks.filter(p => p.kind === 'saved').map(p => (p as { id: string }).id),
    guests: picks.filter(p => p.kind === 'new').map(p => ({ name: p.name })),
    pairingMode,
  }
}

/** Thông điệp kết quả ghép tự động. */
export function describeAutoResult(res: { pairedCount?: number; unpaired?: { name: string }[] } | null | undefined): string {
  const n = res?.pairedCount ?? 0
  const left = res?.unpaired ?? []
  const base = `Đã ghép ${n} cặp`
  return left.length > 0 ? `${base} — còn ${left.length} người chưa ghép (${left.map(x => x.name).join(', ')})` : base
}

/** Tên đội kế tiếp "Đôi N" (N = số lớn nhất hiện có + 1). */
export function nextPairName(existingNames: string[]): string {
  const max = existingNames.reduce((m, nm) => {
    const n = parseInt(String(nm).replace(/\D/g, ''), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `Đôi ${max + 1}`
}
