/**
 * MemberCompeteModule — module "Thi đấu" cho MEMBER_VIEW: minigame, lịch sử thi đấu, bảng
 * điểm. Tái dùng màn đã có (view-only theo isMember/ủy quyền). Tự embedded.
 */
import { ModuleTabs } from '../../../components/shared'
import { MinigameList } from '../../admin/minigame/MinigameList'
import { MatchHistory } from '../../admin/minigame/MatchHistory'
import { MemberScoring } from '../../admin/MemberScoring'

export function MemberCompeteModule() {
  return (
    <ModuleTabs
      title="Thi đấu"
      tabs={[
        { key: 'minigame', label: 'Minigame', element: <MinigameList /> },
        { key: 'history', label: 'Lịch sử', element: <MatchHistory /> },
        { key: 'scoring', label: 'Bảng điểm', element: <MemberScoring /> },
      ]}
    />
  )
}
