// Run the app on port 5288, then: bun store/site-screenshots.mjs
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import sharp from 'sharp'

const base = JSON.parse(execFileSync('bun', ['store/seed.ts'], { encoding: 'utf8' }))
const current = base.runs.at(-1)
const water = {
  ...current,
  id: 'water-demo',
  challengeId: 'mq16',
  days: current.days.map(day => ({ done: day.done, data: { glasses: day.done ? 8 : 4 } })),
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell` })
try {
  for (const [name, route, state] of [
    ['1-today', '/today', base],
    ['2-track', '/challenge/mq16/track', { ...base, settings: { ...base.settings, unlockAll: true }, runs: [...base.runs.slice(0, -1), water] }],
    ['3-read', '/challenge/mq06/read', base],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'en-US' })
    await context.addInitScript(state => localStorage.setItem('CapacitorStorage.mq.state.v1', JSON.stringify(state)), state)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`http://localhost:5288${route}`)
    if (name === '2-track') await page.getByRole('button', { name: '+ A glass', exact: true }).waitFor()
    else await page.getByText('Forks up', { exact: false }).first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1200)
    if (errors.length) throw new Error(errors.join('\n'))
    await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(`site/public/img/${name}.webp`)
    await context.close()
  }
}
finally {
  await browser.close()
}
