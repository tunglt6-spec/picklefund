import { useParams } from 'react-router-dom'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { MinigameDashboardPage } from './MinigameDashboardPage'
import { FixedDoublesDashboardPage } from './FixedDoublesDashboardPage'
import { GroupStageDashboardPage } from './GroupStageDashboardPage'
import { FootballDashboardPage } from './FootballDashboardPage'
import { GolfDashboardPage } from './GolfDashboardPage'
import { RunningDashboardPage } from './RunningDashboardPage'
import { KnockoutDashboardPage } from './KnockoutDashboardPage'

export function MinigameDashboard() {
  const { id } = useParams<{ id: string }>()
  const { getMinigame } = useMinigameStore()
  const { resync } = useMinigameDetailSync(id)
  const mg = getMinigame(id!)

  // Môn đồng đội (bóng đá/bóng rổ/bóng chuyền/bóng chuyền hơi) HOẶC nội dung ĐÔI (cặp = đội 2 người):
  // dùng chung dashboard đội-roster (tạo cặp/đội + chia bảng + RR/knockout + BXH theo cặp/đội).
  if (['FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'AIR_VOLLEYBALL'].includes(mg?.sport ?? '')
    || (mg as unknown as { participantType?: string })?.participantType === 'PAIR') {
    return <FootballDashboardPage resync={resync} />
  }
  // Golf leaderboard (stroke/stableford). Golf Match-Play (format KNOCKOUT) → xuống nhánh knockout.
  if (mg?.sport === 'GOLF' && mg?.formatType !== 'KNOCKOUT') {
    return <GolfDashboardPage resync={resync} />
  }
  // Chạy bộ: leaderboard theo thời gian (M5).
  if (mg?.sport === 'RUNNING') {
    return <RunningDashboardPage />
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
