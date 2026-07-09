import { useParams } from 'react-router-dom'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { MinigameDashboardPage } from './MinigameDashboardPage'
import { FixedDoublesDashboardPage } from './FixedDoublesDashboardPage'
import { GroupStageDashboardPage } from './GroupStageDashboardPage'

export function MinigameDashboard() {
  const { id } = useParams<{ id: string }>()
  const { getMinigame } = useMinigameStore()
  const { resync } = useMinigameDetailSync(id)
  const mg = getMinigame(id!)

  if (mg?.formatType === 'FIXED_DOUBLES_ROUND_ROBIN') {
    return <FixedDoublesDashboardPage />
  }
  if (mg?.formatType === 'GROUP_STAGE') {
    return <GroupStageDashboardPage />
  }
  return <MinigameDashboardPage resync={resync} />
}
