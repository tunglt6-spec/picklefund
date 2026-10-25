import { useLocation } from 'react-router-dom'
import { PlayfulIcon } from '../icons/PlayfulIcon'
import { tileIconName } from '../icons/tileIconMap'
import { WORKSPACE_DESIGN, workspaceForLocation } from '../../lib/workspaceDesign'
import type { ModuleKey } from './hubApps'

export function WorkspaceMark({ title, module }: { title: string; module?: ModuleKey }) {
  const location = useLocation()
  const family = module ?? workspaceForLocation(location.pathname, location.search)
  const name = tileIconName({ key: '', label: title, module: family }) ?? WORKSPACE_DESIGN[family].icon
  return <span data-mod={family} className="pf-tile-ico pf-workspace-mark" aria-hidden>
    <PlayfulIcon name={name} size={23} variant="on-color" />
  </span>
}
