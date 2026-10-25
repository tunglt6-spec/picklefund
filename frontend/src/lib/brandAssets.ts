/** Keep first-party assets on this app's origin after the domain migration. */
export function brandAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.hostname === 'app.picklefund.uk' && /^https?:$/.test(url.protocol)
      ? `${url.pathname}${url.search}${url.hash}` : value
  } catch { return value }
}
