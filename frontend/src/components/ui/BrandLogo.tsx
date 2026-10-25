import { useState } from 'react'
import { brandAssetUrl } from '../../lib/brandAssets'
import { PickleFundLogoMark } from './PickleFundLogoMark'

export function BrandLogo({ src, size = 32, alt = '' }: { src?: string | null; size?: number; alt?: string }) {
  const url = brandAssetUrl(src)
  const [failed, setFailed] = useState<string | null>(null)
  return url && url !== failed
    ? <img src={url} alt={alt} width={size} height={size} className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} onError={() => setFailed(url)} />
    : <span className="shrink-0"><PickleFundLogoMark size={size} /></span>
}
