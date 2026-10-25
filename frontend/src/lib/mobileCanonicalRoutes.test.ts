import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalMobileRoute } from './mobileCanonicalRoutes'
import { tournamentSectionLinks, tournamentSectionTarget } from './tournamentNavigation'
import type { MiniGame } from '../types/minigame'

test('legacy screens resolve to one role-appropriate module without dropping filters or anchors', () => {
  const admin = new URL(canonicalMobileRoute('CLUB_ADMIN','/expenses','?periodId=p1&from=aido','#row-3')!, 'https://picklefund.vn')
  assert.equal(admin.pathname,'/tai-chinh')
  assert.equal(admin.searchParams.get('tab'),'expense')
  assert.equal(admin.searchParams.get('periodId'),'p1')
  assert.equal(admin.searchParams.get('from'),'aido')
  assert.equal(admin.hash,'#row-3')
  assert.equal(canonicalMobileRoute('MEMBER_VIEW','/expenses'),'/member/tai-chinh?tab=expense')
  assert.equal(canonicalMobileRoute('CLUB_TREASURER','/treasurer/income'),'/treasurer/so-quy?tab=income')
  assert.equal(canonicalMobileRoute('MEMBER_VIEW','/member/receipt'),'/member/ca-nhan?tab=receipt')
})
test('canonicalization neither widens role access nor redirects already canonical routes in a loop', () => {
  assert.equal(canonicalMobileRoute('MEMBER_VIEW','/members'),null)
  assert.equal(canonicalMobileRoute('CLUB_TREASURER','/members'),null)
  assert.equal(canonicalMobileRoute('SUPER_ADMIN','/expenses'),null)
  assert.equal(canonicalMobileRoute(undefined,'/expenses'),null)
  for (const role of ['CLUB_ADMIN','MEMBER_VIEW','CLUB_TREASURER'] as const) {
    for (const legacy of ['/expenses','/minigames','/member/receipt','/treasurer/income','/settings']) {
      const destination = canonicalMobileRoute(role,legacy)
      if (!destination) continue
      const url = new URL(destination,'https://picklefund.vn')
      assert.equal(canonicalMobileRoute(role,url.pathname,url.search),null, destination)
    }
  }
})
test('removed competition pickers preserve the requested section in the single tournament library', () => {
  for (const section of ['schedule','results','standings']) {
    const url = new URL(canonicalMobileRoute('CLUB_ADMIN','/thi-dau',`?tab=${section}&sport=GOLF`)!, 'https://picklefund.vn')
    assert.equal(url.searchParams.get('tab'),'tournaments')
    assert.equal(url.searchParams.get('section'),section)
    assert.equal(url.searchParams.get('sport'),'GOLF')
    assert.equal(canonicalMobileRoute('CLUB_ADMIN',url.pathname,url.search),null)
  }
  assert.equal(canonicalMobileRoute('CLUB_ADMIN','/aido','?tab=ops-center&from=aido'),'/admin/ai-manager')
})
test('nested settings selection survives moving from the standalone page to the module', () => {
  const url = new URL(canonicalMobileRoute('CLUB_ADMIN','/settings','?tab=branding')!, 'https://picklefund.vn')
  assert.equal(url.searchParams.get('tab'),'settings')
  assert.equal(url.searchParams.get('view'),'branding')
})
test('tournament actions follow the existing sport and format screens, with no repeated destination', () => {
  for (const [sport,formatType,participantType] of [
    ['PICKLEBALL','RANDOM_DOUBLES','INDIVIDUAL'],['PICKLEBALL','FIXED_DOUBLES_ROUND_ROBIN','PAIR'],
    ['FOOTBALL','GROUP_STAGE','TEAM'],['BASKETBALL','KNOCKOUT','TEAM'],
    ['GOLF','STROKE_PLAY','INDIVIDUAL'],['RUNNING','TIME_TRIAL','INDIVIDUAL'],['PICKLEBALL','KNOCKOUT','INDIVIDUAL'],
  ]) {
    const mg = {id:'example',sport,formatType,participantType} as MiniGame
    const links = tournamentSectionLinks(mg)
    assert.equal(new Set(links.map(link=>link.to)).size, links.length)
    assert.ok(links.every(link=>link.to !== '/minigames/example'))
    if (sport === 'RUNNING' || (formatType === 'KNOCKOUT' && participantType === 'INDIVIDUAL')) assert.equal(links.length,0)
    if (sport === 'GOLF') assert.deepEqual(links.map(link=>link.label),['Điểm số','Xếp hạng'])
    if (sport === 'FOOTBALL') assert.equal(tournamentSectionTarget('standings',mg),'/minigames/example?view=standings')
  }
})
