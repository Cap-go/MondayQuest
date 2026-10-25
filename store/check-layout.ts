import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { state } from './seed'

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const url = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:5288'
try {
  const context = await browser.newContext({ viewport: { width: 466, height: 678 }, isMobile: true, hasTouch: true, locale: 'en-US' })
  const current = state.runs.at(-1)!
  await context.addInitScript(state => {
    localStorage.setItem('CapacitorStorage.mq.state.v1', JSON.stringify(state))
  }, {
    ...state,
    settings: { ...state.settings, unlockAll: true },
    runs: [...state.runs, { ...current, id: 'water-demo', challengeId: 'mq16', days: current.days.map(day => ({ done: day.done, data: { glasses: 4 } })) }],
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${url}/today`)
  await page.locator('.web-tabbar').waitFor()
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--cap-native-navigation-left', '12px')
    document.documentElement.style.setProperty('--cap-native-navigation-right', '84px')
  })
  const bounds = await page.evaluate(() => {
    const root = document.querySelector('.app-root')!.getBoundingClientRect()
    const tabs = document.querySelector('.web-tabbar')!.getBoundingClientRect()
    return { left: root.left, right: root.right, tabLeft: tabs.left, tabRight: tabs.right }
  })
  assert.ok(bounds.tabLeft >= bounds.left + 12, 'Tab bar overlaps the left safe area')
  assert.ok(bounds.tabRight <= bounds.right - 12, 'Tab bar overlaps the Duo side rail')
  for (const [index, route] of ['today', 'levels', 'journal', 'settings'].entries()) {
    await page.locator('.web-tabbar .tab').nth(index).click()
    await page.waitForURL(`${url}/${route}`)
    await page.locator('.page-body h1').last().waitFor({ state: 'visible' })
  }
  await page.goto(`${url}/challenge/mq16/track`)
  const addGlass = page.getByRole('button', { name: '+ A glass', exact: true })
  await addGlass.click()
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('CapacitorStorage.mq.state.v1')!)
    return state.runs.find((run: { id: string }) => run.id === 'water-demo').days.some((day: { data: { glasses: number } }) => day.data.glasses === 5)
  })
  for (const viewport of [{ width: 669, height: 951 }, { width: 951, height: 669 }, { width: 466, height: 678 }]) {
    await page.setViewportSize(viewport)
    await page.evaluate((folded) => {
      document.documentElement.style.setProperty('--cap-native-navigation-right', folded ? '84px' : '0px')
    }, viewport.width === 466)
    await page.evaluate(() => document.fonts.ready)
    const content = await page.locator('.cv').boundingBox()
    assert.ok(content && content.x >= 0 && content.x + content.width <= viewport.width, 'Challenge overflows after folding')
    assert.ok(await addGlass.isVisible(), 'Water tracker disappears after folding')
    assert.equal(await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('CapacitorStorage.mq.state.v1')!)
      return state.runs.find((run: { id: string }) => run.id === 'water-demo').days.filter((day: { data: { glasses: number } }) => day.data.glasses === 5).length
    }), 1, 'Progress changed after folding')
  }
  await page.goto(`${url}/levels`)
  await page.locator('.levels-page .page-body h1').waitFor({ state: 'visible' })
  await page.setViewportSize({ width: 951, height: 669 })
  assert.equal(await page.locator('.levels-page .page-body').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2, 'Unfolded Levels does not use two columns beside the native rail')
  await page.setViewportSize({ width: 466, height: 678 })
  assert.equal(await page.locator('.levels-page .page-body').evaluate(element => getComputedStyle(element).display), 'block', 'Folded Levels does not return to one column')
  assert.deepEqual(errors, [], 'Browser runtime errors')
  console.log('PASS: plugin side insets, all four tabs, tracking, state preservation, and adaptive Levels columns')
}
finally {
  await browser.close()
}
