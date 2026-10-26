import { playfulGlyphs, type PlayfulIconName } from './playfulGlyphs'

/** Open silhouettes: colored strokes and translucent internal planes, without a tile behind them. */
const familyColors: Record<string, string> = {
  '#2563EB': '#2768D9', '#2863D7': '#2768D9', '#078666': '#008E85',
  '#0783A6': '#008EBC', '#CE661F': '#D9730D', '#CE4378': '#D62F86',
  '#7950CE': '#7851D5', '#526581': '#2679B7', '#405875': '#526A85',
}
const accents: Partial<Record<PlayfulIconName, string>> = {
  income: '#008E85', expense: '#E24758', debt: '#D9730D', bank: '#1684C5',
  transfer: '#1684C5', qr: '#D62F86', 'fund-period': '#008E85', receipt: '#00A098',
  'payment-approval': '#008E85', 'member-rating': '#D9730D', calendar: '#008EBC',
  registration: '#008E85', attendance: '#008E85', 'check-in': '#1684C5',
  tournament: '#D9730D', medal: '#D9730D', ranking: '#7851D5',
  notifications: '#E24758', like: '#D62F86', subscription: '#D62F86',
  settings: '#1684C5', check: '#008E85', delete: '#E24758', alerts: '#D9730D',
  lisa: '#D62F86', aido: '#7851D5', 'nav-community': '#D62F86',
}
function mix(a: string, b: string, amount: number): string {
  const c = (h: string, offset: number) => parseInt(h.slice(offset, offset + 2), 16)
  return '#' + [1, 3, 5].map(i => Math.round(c(a, i) * (1 - amount) + c(b, i) * amount).toString(16).padStart(2, '0')).join('')
}
export function glassLineColor(name: PlayfulIconName, dark = false): string {
  const color = accents[name] ?? familyColors[playfulGlyphs[name].color] ?? '#2768D9'
  return dark ? mix(color, '#CDEEFF', 0.4) : color
}
export function glassLineMarkup(name: PlayfulIconName, prefix: string, dark = false, inheritColor = false): string {
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'icon'
  const color = inheritColor ? 'currentColor' : glassLineColor(name, dark)
  const edge = `${id}-edge`, glass = `${id}-glass`, accent = `${id}-accent`, shadow = `${id}-shadow`
  const body = playfulGlyphs[name].body
    .replaceAll('{p}', color).replaceAll('{s}', `url(#${glass})`).replaceAll('{a}', `url(#${accent})`)
  return `<defs>
    <linearGradient id="${edge}" x1="0" y1="0" x2="0.6" y2="1"><stop stop-color="${inheritColor ? color : mix(color, '#FFFFFF', 0.12)}"/><stop offset="0.4" stop-color="${color}"/><stop offset="1" stop-color="${inheritColor ? color : mix(color, '#142848', dark ? 0 : 0.12)}"/></linearGradient>
    <linearGradient id="${glass}" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#FFFFFF" stop-opacity="${dark ? '.26' : '.78'}"/><stop offset=".4" stop-color="${color}" stop-opacity=".035"/><stop offset="1" stop-color="${color}" stop-opacity=".17"/></linearGradient>
    <linearGradient id="${accent}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#FFFFFF" stop-opacity="${dark ? '.38' : '.9'}"/><stop offset=".48" stop-color="${color}" stop-opacity=".13"/><stop offset="1" stop-color="${color}" stop-opacity=".32"/></linearGradient>
    <filter id="${shadow}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy=".65" stdDeviation=".5" flood-color="${color}" flood-opacity=".14"/></filter>
  </defs><g stroke="url(#${edge})" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#${shadow})">${body}</g>`
}
export function glassLineSvg(name: PlayfulIconName, dark = false): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="-2 -2 36 36" fill="none" role="img" aria-label="${playfulGlyphs[name].label.replaceAll('&', '&amp;')}">${glassLineMarkup(name, name, dark)}</svg>`
}
