import { chromium } from 'playwright'
const [w, h, tag, dsf, loc] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4], Number(process.argv[5] ?? 3), process.argv[6] ?? 'en-US']
const base = JSON.parse(await Bun.file('/tmp/mq-seed.json').text())
const iso = (d: Date) => d.toISOString().slice(0, 10)
const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }
const withRun = (run: any) => ({ ...base, settings: { ...base.settings, unlockAll: true }, runs: [...base.runs, run] })
const water = { id: 'w', challengeId: 'mq16', start: ago(3), days: Array.from({ length: 7 }, (_, i) => ({ done: i < 3, data: i < 3 ? { glasses: 7 } : i === 3 ? { glasses: 4 } : {} })) }
const sun = { id: 'sr', challengeId: 'mq02', start: ago(2), days: Array.from({ length: 7 }, (_, i) => ({ done: i < 3, data: i < 3 ? { wake: ['05:51', '05:48', '05:46'][i] } : {} })) }
const shots: [string, string, any][] = [
  ['1-today', '/today', base],
  ['2-levels', '/levels', base],
  ['3-read', '/challenge/mq06/read', base],
  ['4-water', '/challenge/mq16/track', withRun(water)],
  ['5-sunrise', '/challenge/mq02/track', { ...withRun(sun), runs: [...base.runs.filter((r: any) => r.challengeId !== 'mq02'), sun] }],
  ['6-notebook', '/journal', base],
]
const b = await chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell` })
const errs: string[] = []
for (const [n, u, st] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, locale: loc })
  await ctx.addInitScript(s => { localStorage.setItem('CapacitorStorage.mq.state.v1', s); localStorage.setItem('mq.coords', JSON.stringify({ lat: 48.86, lon: 2.35, at: Date.now() })) }, JSON.stringify(st))
  const p = await ctx.newPage()
  p.on('pageerror', e => errs.push(`${n}: ${e.message}`))
  await p.goto(`http://localhost:5288${u}`); await p.waitForTimeout(loc.startsWith('en') ? 1800 : 5000)
  await p.screenshot({ path: `duo/final-${tag}-${n}.png` })
  await ctx.close()
}
console.log(errs.join('\n') || 'no errors')
await b.close()
