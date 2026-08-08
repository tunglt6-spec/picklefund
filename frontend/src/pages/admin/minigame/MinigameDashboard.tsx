import { useParams } from 'react-router-dom'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { MinigameDashboardPage } from './MinigameDashboardPage'
import { FixedDoublesDashboardPage } from './FixedDoublesDashboardPage'
import { GroupStageDashboardPage } from './GroupStageDashboardPage'
import { FootballDashboardPage } from './FootballDashboardPage'
import { GolfDashboardPage } from './GolfDashboardPage'
import { KnockoutDashboardPage } from './KnockoutDashboardPage'

export function MinigameDashboard() {
  const { id } = useParams<{ id: string }>()
  const { getMinigame } = useMinigameStore()
  const { resync } = useMinigameDetailSync(id)
  const mg = getMinigame(id!)

  // Môn đồng đội (bóng đá, bóng rổ): dùng chung dashboard đội-roster (trận có điểm, BXH/knockout).
  if (mg?.sport === 'FOOTBALL' || mg?.sport === 'BASKETBALL') {
    return <FootballDashboardPage resync={resync} />
  }
  // Golf: dashboard bảng điểm (golfer cá nhân + tổng gậy).
  if (mg?.sport === 'GOLF') {
    return <GolfDashboardPage resync={resync} />
  }
  if (mg?.formatType === 'FIXED_DOUBLES_ROUND_ROBIN') {
    return <FixedDoublesDashboardPage />
  }
  if (mg?.formatType === 'GROUP_STAGE') {
    return <GroupStageDashboardPage resync={resync} />
  }
  // M3: Loại trực tiếp nhóm vợt/đơn (single-elimination).
  if (mg?.formatType === 'KNOCKOUT') {
    return <KnockoutDashboardPage />
  }
  return <MinigameDashboardPage resync={resync} />
}
