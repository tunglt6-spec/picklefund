/**
 * CompeteModule — module "Thi đấu" (gom Minigame/Lịch sử/Chấm điểm thành tab con). Chỉ tái
 * dùng page ĐÃ CÓ, không đổi nghiệp vụ. Tab "Xếp lịch đấu" là điểm vào Minigame; chi tiết
 * từng giải vẫn mở full-page qua /minigames/:id/* (giữ nguyên route).
 */
import { ModuleTabs } from '../../../components/shared'
import { MinigameList } from '../minigame/MinigameList'
import { MatchHistory } from '../minigame/MatchHistory'
import { MemberScoring } from '../MemberScoring'

export function CompeteModule() {
  return (
    <ModuleTabs
      title="Thi đấu"
      tabs={[
        { key: 'schedule', label: 'Xếp lịch đấu', element: <MinigameList /> },
        { key: 'history', label: 'Lịch sử', element: <MatchHistory /> },
        { key: 'scoring', label: 'Bảng điểm', element: <MemberScoring /> },
      ]}
    />
  )
}
