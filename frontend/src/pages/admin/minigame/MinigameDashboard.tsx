import { useParams } from 'react-router-dom'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { MinigameDashboardPage } from './MinigameDashboardPage'
import { FixedDoublesDashboardPage } from './FixedDoublesDashboardPage'
import { GroupStageDashboardPage } from './GroupStageDashboardPage'
import { FootballDashboardPage } from './FootballDashboardPage'
import { GolfDashboardPage } from './GolfDashboardPage'

export function MinigameDashboard() {
  const { id } = useParams<{ id: string }>()
  const { getMinigame } = useMinigameStore()
  const { resync } = useMinigameDetailSync(id)
  const mg = getMinigame(id!)

  // Đa bộ môn: bóng đá dùng dashboard riêng (đội + cầu thủ, không phụ thuộc thể thức đôi).
  if (mg?.sport === 'FOOTBALL') {
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
  return <MinigameDashboardPage resync={resync} />
}
