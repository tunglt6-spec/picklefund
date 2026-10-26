import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MobileIconContext, MobileIconThemeContext } from './MobileIconContext'
import { PlayfulIcon } from './PlayfulIcon'
import { glassLineColor } from './glassLineIcons'

function render(mobile: boolean, theme: 'light' | 'dark', variant: 'mono' | 'on-color') {
  return renderToStaticMarkup(createElement(MobileIconContext.Provider, { value: mobile },
    createElement(MobileIconThemeContext.Provider, { value: theme },
      createElement(PlayfulIcon, { name: 'members', variant, 'aria-label': 'Thành viên' }))))
}
test('mobile tiles use the approved palette while desktop keeps its existing artwork', () => {
  const mobile = render(true, 'light', 'on-color')
  assert.match(mobile, /data-pf-material="glass-line"/)
  assert.ok(mobile.includes(glassLineColor('members')))
  assert.match(mobile, /aria-label="Thành viên"/)
  const desktop = render(false, 'light', 'on-color')
  assert.match(desktop, /data-pf-material="glass"/)
  assert.ok(!desktop.includes('glass-line'))
})
test('dark icon palette follows the app theme and controls preserve their foreground color', () => {
  assert.ok(render(true, 'dark', 'on-color').includes(glassLineColor('members', true)))
  const control = render(true, 'light', 'mono')
  assert.match(control, /stop-color="currentColor"/)
  assert.ok(!control.includes(glassLineColor('members')))
  assert.ok(!control.includes('NaN'))
})
