import { Preferences } from '@capacitor/preferences'
import { reactive, ref } from 'vue'

// All copy is written once, in English. Any other language is translated by the
// mondayquest-translate worker (Workers AI, cached per string at the edge) and cached
// again on the device, so the app works offline after the first run.

const API = 'https://translate.mondayquest.com/v1/translate'
const CHUNK = 60

/** Active UI language (BCP 47 primary tag, plus script/region where it matters). */
export const lang = ref('en')
/** Full device tag for Intl formatting (dates, numbers). */
export const langTag = ref('en-GB')

const dict = reactive(new Map<string, string>())
/** Strings on screen right now: sent first. */
const urgent = new Set<string>()
/** Prefetch of everything else, grouped by an optional context hint for the translator. */
const bulk = new Map<string, string | undefined>()
const inflight = new Set<string>()
const PARALLEL = 3
let flushTimer: ReturnType<typeof setTimeout> | undefined
let saveTimer: ReturnType<typeof setTimeout> | undefined
let running = 0

/** Normalize a device tag to what we translate into (zh-Hant vs zh-Hans, pt-BR vs pt). */
export function languageOf(tag: string): string {
  const t = tag.toLowerCase()
  if (t.startsWith('zh'))
    return /hant|tw|hk|mo/.test(t) ? 'zh-Hant' : 'zh-Hans'
  if (t.startsWith('pt'))
    return t.includes('br') ? 'pt-BR' : 'pt'
  return t.split(/[-_]/)[0] || 'en'
}

export function deviceTag(): string {
  return (typeof navigator !== 'undefined' && navigator.language) || 'en-GB'
}

const translatable = (t: string) => !!t && /[a-z]/i.test(t)

/** Translate an English string. Returns English until the translation arrives (reactive). */
export function tr(en: string): string {
  if (lang.value === 'en' || !translatable(en))
    return en
  const hit = dict.get(en)
  if (hit !== undefined)
    return hit
  if (!inflight.has(en)) {
    urgent.add(en)
    bulk.delete(en)
    schedule()
  }
  return en
}

/** Ask for many strings at once (every known string on first launch in a new language). */
export function prefetch(texts: Iterable<string>, context?: string) {
  if (lang.value === 'en')
    return
  for (const t of texts) {
    if (translatable(t) && !dict.has(t) && !urgent.has(t) && !inflight.has(t))
      bulk.set(t, context)
  }
  schedule()
}

function schedule() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(pump, 80)
}

/** Next chunk: urgent strings first, then bulk strings sharing the same context. */
function take(): { texts: string[], context?: string } | null {
  if (urgent.size) {
    const texts = [...urgent].slice(0, CHUNK)
    texts.forEach(t => urgent.delete(t))
    return { texts }
  }
  if (!bulk.size)
    return null
  const [, context] = bulk.entries().next().value as [string, string | undefined]
  const texts: string[] = []
  for (const [t, c] of bulk) {
    if (c !== context)
      continue
    texts.push(t)
    if (texts.length >= CHUNK)
      break
  }
  texts.forEach(t => bulk.delete(t))
  return { texts, context }
}

function pump() {
  while (running < PARALLEL) {
    const job = take()
    if (!job)
      return
    running++
    void send(job.texts, job.context).finally(() => {
      running--
      pump()
    })
  }
}

async function send(texts: string[], context?: string) {
  const target = lang.value
  texts.forEach(t => inflight.add(t))
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: target, texts, context }) })
    if (!res.ok)
      throw new Error(String(res.status))
    const { translations } = await res.json() as { translations: string[] }
    if (lang.value !== target)
      return
    texts.forEach((t, j) => {
      const v = translations[j]
      if (typeof v === 'string' && v)
        dict.set(t, v)
    })
    persistSoon()
  }
  catch {
    // Offline or worker error: stay in English for these, retry on next launch.
  }
  finally {
    texts.forEach(t => inflight.delete(t))
  }
}

function key(l: string) {
  return `mq.i18n.${l}`
}

function persistSoon() {
  clearTimeout(saveTimer)
  const l = lang.value
  saveTimer = setTimeout(() => {
    void Preferences.set({ key: key(l), value: JSON.stringify(Object.fromEntries(dict)) })
  }, 800)
}

/** Switch language: load the device cache, then fill the gaps from the worker. */
export async function setLanguage(code: string, tag = code) {
  lang.value = code
  langTag.value = tag
  dict.clear()
  urgent.clear()
  bulk.clear()
  if (code === 'en')
    return
  const { value } = await Preferences.get({ key: key(code) }).catch(() => ({ value: null }))
  if (value) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(value) as Record<string, string>))
        dict.set(k, v)
    }
    catch {}
  }
  if (typeof document !== 'undefined')
    document.documentElement.lang = code
}
