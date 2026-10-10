import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell` })
for (const [f, w, h] of [['header', 1920, 823], ['search', 1920, 1280]] as const) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await p.goto(`file:///tmp/mq-creative/${f}.html`); await p.waitForTimeout(600)
  await p.screenshot({ path: `/tmp/mq-creative/${f}.png` })
}
await b.close()
