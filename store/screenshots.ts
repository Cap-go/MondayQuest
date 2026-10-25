import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { state } from './seed'

const device = process.env.IOS_DEVICE_ID
if (!device)
  throw new Error('Set IOS_DEVICE_ID to a dedicated, booted iPhone Duo simulator with Monday Quest installed.')
const locale = process.env.SCREENSHOT_LOCALE ?? 'en-US'
if (!['en-US', 'fr-FR'].includes(locale))
  throw new Error('SCREENSHOT_LOCALE must be en-US or fr-FR.')
const bundle = 'ee.forgr.mondayquest'
const duoctl = process.env.DUOCTL_PATH ?? 'duoctl'
const output = resolve('store/screenshots', locale, 'duo')
const rawOutput = resolve('store/screenshots/raw', locale)
const env = { ...process.env, DUOCTL_UDID: device }
const run = (command: string, args: string[]) => execFileSync(command, args, { env, encoding: 'utf8', timeout: 120_000 }).trim()
const simctl = (...args: string[]) => run('xcrun', ['simctl', ...args])
const fold = (...args: string[]) => run(duoctl, ['-d', device, ...args])
const settle = () => new Promise(resolve => setTimeout(resolve, 2500))
const recognizer = '/tmp/mondayquest-screenshot-recognizer'
run('xcrun', ['swiftc', 'store/recognize.swift', '-o', recognizer, '-framework', 'Vision', '-framework', 'AppKit'])
const recognize = (path: string) => run(recognizer, [path]).split('\n').map(line => {
  const [text = '', x, y] = line.split('\t')
  return { text, x: Number(x), y: Number(y) }
})

if (process.env.SCREENSHOT_SEED === '1') {
  const container = simctl('get_app_container', device, bundle, 'data')
  simctl('shutdown', device)
  const preferences = `${container}/Library/Preferences/${bundle}.plist`
  const current = state.runs.at(-1)!
  const demo = {
    ...state,
    savedAt: Date.now(),
    settings: { ...state.settings, locale: locale === 'fr-FR' ? 'fr' : 'en', sound: false, haptics: false, unlockAll: true, wakeAuto: false, reminder: '', evening: '' },
    runs: [...state.runs, {
      ...current, id: 'water-demo', challengeId: 'mq16',
      days: current.days.map(day => ({ done: day.done, data: { glasses: day.done ? 8 : 4 } })),
    }],
  }
  const value = JSON.stringify(demo)
  const key = 'CapacitorStorage.mq.state.v1'
  run('python3', ['-c', 'import plistlib,sys; path,key,value=sys.argv[1:]; data=plistlib.load(open(path,"rb")); data[key]=value; plistlib.dump(data,open(path,"wb"),fmt=plistlib.FMT_BINARY)', preferences, key, value])
  if (run('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, preferences]) !== value)
    throw new Error('Native demo preferences were not saved correctly.')
  simctl('boot', device)
  simctl('bootstatus', device, '-b')
}

await mkdir(output, { recursive: true })
await mkdir(rawOutput, { recursive: true })
simctl('status_bar', device, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--batteryState', 'charged', '--batteryLevel', '100')
simctl('launch', device, bundle)
await settle()
const shots = [
  { name: 'today', route: 'today' },
  { name: 'levels', route: 'levels' },
  { name: 'water', route: 'challenge/mq16/track' },
]
const modes = ['outer', 'inner-portrait', 'inner-landscape']
const captures = []
for (const [index, mode] of modes.entries()) {
  fold(mode === 'outer' ? 'close' : 'open')
  fold('rotate', mode === 'inner-landscape' ? 'landscape' : 'portrait')
  await settle()
  for (const [shotIndex, shot] of shots.entries()) {
    simctl('openurl', device, `mondayquest://${shot.route}`)
    await settle()
    const preview = '/tmp/mondayquest-before-capture.png'
    for (let attempt = 0; attempt < 4; attempt++) {
      fold('screenshot', preview)
      const recognized = recognize(preview)
      if (!recognized.some(item => /open in|ouvrir dans/i.test(item.text)))
        break
      const button = recognized.find(item => /^(open|ouvrir)$/i.test(item.text))
      if (!button || !Number.isFinite(button.x) || !Number.isFinite(button.y))
        throw new Error('Cannot locate the native Open confirmation button.')
      const png = await readFile(preview)
      fold('tap', String(button.x * png.readUInt32BE(16) / 3), String(button.y * png.readUInt32BE(20) / 3))
      await settle()
    }
    const name = `${index + 1}-${shotIndex + 1}-${mode}-${shot.name}.png`
    const path = resolve(output, name)
    const rawPath = resolve(rawOutput, name)
    fold('screenshot', rawPath)
    const recognized = recognize(rawPath).map(item => item.text).join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
    const expected = shot.name === 'today' ? /TODAY|AUJOURD/ : shot.name === 'levels' ? /LEVELS|NIVEAUX/ : /A GLASS|UN VERRE/
    if (/OPEN IN|OUVRIR DANS/.test(recognized) || !expected.test(recognized))
      throw new Error(`Wrong native screen for ${name}: ${recognized.slice(0, 200)}`)
    run(recognizer, [rawPath, path])
    const png = await readFile(path)
    captures.push({ name, route: shot.route, mode, width: png.readUInt32BE(16), height: png.readUInt32BE(20), rawSha256: createHash('sha256').update(await readFile(rawPath)).digest('hex'), sha256: createHash('sha256').update(png).digest('hex') })
    console.log(path)
  }
}
await writeFile(resolve(output, '..', 'capture.json'), `${JSON.stringify({ provider: 'iOS Simulator via duoctl', bundle, device, locale, capturedAt: new Date().toISOString(), captures }, null, 2)}\n`)
