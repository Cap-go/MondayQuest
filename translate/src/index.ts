// mondayquest-translate: translates Monday Quest's English copy into any language with
// Workers AI and caches every string forever in KV. The app sends batches of strings,
// gets them back in order, and keeps its own copy on the device.

interface Env {
  AI: Ai
  CACHE: KVNamespace
  LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> }
}

/** Bump to retranslate everything (new prompt or model). */
const VERSION = 'v5'
const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'
const MAX_TEXTS = 100
const MAX_CHARS = 30_000
const BATCH = 12
const PARALLEL = 4
const PROTECTED = ['Monday Quest', 'DONE', 'Capgo', 'Telegram', 'TED', 'Apple Health', 'Health Connect', '16:8', '007']

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors } })

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function languageName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
  }
  catch {
    return code
  }
}

/** Swap brand names and {placeholders} for tokens the model must copy verbatim. */
function protect(text: string) {
  const kept: string[] = []
  let out = text.replace(/\{\w+\}/g, (m) => {
    kept.push(m)
    return `__MQ_${kept.length - 1}__`
  })
  for (const p of PROTECTED) {
    if (out.includes(p)) {
      out = out.split(p).join(`__MQ_${kept.length}__`)
      kept.push(p)
    }
  }
  return { text: out, kept }
}

function restore(translated: string, kept: string[]): string | null {
  let out = translated
  for (let i = 0; i < kept.length; i++) {
    const token = `__MQ_${i}__`
    if (!out.includes(token))
      return null
    out = out.split(token).join(kept[i]!)
  }
  return /__MQ_\d+__/.test(out) ? null : out
}

/** Reject obviously broken output (empty, absurd length) so English is kept instead. */
function plausible(src: string, out: string) {
  if (!out.trim())
    return false
  if (src.length < 12)
    return out.length < 80
  const r = out.length / src.length
  return r > 0.25 && r < 3.5
}

function system(lang: string, context?: string) {
  return [
    `You translate the interface and content of Monday Quest, a minimalist mobile app of 52 weekly self-improvement challenges (walks, cold showers, journaling, forgiving someone, listening...). Target language: ${languageName(lang)} (${lang}).`,
    'Translate naturally and idiomatically, like a native copywriter, not word for word. Keep the tone warm, direct and a little playful.',
    'Always address the reader with the informal you, consistently across every string (German du, Spanish tú, Italian tu, Dutch je, Portuguese você/tu as is natural, Japanese plain friendly style); the one exception is French, which uses vous everywhere, matching the existing French copy. Never mix formal and informal.',
    'Keep it about the same length. Short UI labels (buttons, tabs) must stay short. Keep capitalisation style (ALL CAPS stays caps), punctuation, emoji, numbers, times and units.',
    'Instructions to the user are in the imperative mood (e.g. French "Faites", German "Mach"), grammatically correct. Short first-person labels like "I\'m up" or "I\'m stepping in" are buttons the user taps to say what they are doing right now (getting out of bed, stepping into the shower): translate the situation, not the idiom.',
    'Translate every word, including short ones next to tokens (e.g. "Day __MQ_0__" becomes the natural phrase for "day N" in the target language). Never leave English words except the tokens.',
    'Copy every token like __MQ_0__ exactly as is, in a natural position. Do not add explanations, quotes or notes.',
    'Return a JSON object {"translations": [...]} with exactly one translated string per input item, in the same order.',
    ...(context ? [`What these strings are: ${context}`] : []),
  ].join('\n')
}

async function translateBatch(env: Env, lang: string, items: string[], context?: string): Promise<(string | null)[]> {
  const prepared = items.map(protect)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await env.AI.run(MODEL as any, {
        temperature: 0.1,
        max_tokens: 4096,
        response_format: {
          type: 'json_schema',
          json_schema: { type: 'object', properties: { translations: { type: 'array', items: { type: 'string' }, minItems: items.length, maxItems: items.length } }, required: ['translations'] },
        },
        messages: [
          { role: 'system', content: system(lang, context) + (attempt ? '\nYour previous answer was rejected: return exactly one string per item and keep every __MQ_n__ token.' : '') },
          { role: 'user', content: JSON.stringify({ items: prepared.map(p => p.text) }) },
        ],
      } as any) as any
      const raw = res?.response
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      const list: unknown = parsed?.translations
      if (!Array.isArray(list) || list.length !== items.length)
        continue
      return list.map((t, i) => {
        if (typeof t !== 'string')
          return null
        const back = restore(t.trim(), prepared[i]!.kept)
        return back && plausible(items[i]!, back) ? back : null
      })
    }
    catch {}
  }
  return items.map(() => null)
}

async function translateAll(env: Env, lang: string, texts: string[], context?: string): Promise<string[]> {
  const keys = await Promise.all(texts.map(t => sha256(`${VERSION}\n${lang}\n${t}`)))
  const cached = await Promise.all(keys.map(k => env.CACHE.get(k)))
  const out = texts.map((t, i) => cached[i] ?? '')
  const missing = [...new Set(texts.filter((_, i) => cached[i] == null))]
  const batches: string[][] = []
  for (let i = 0; i < missing.length; i += BATCH)
    batches.push(missing.slice(i, i + BATCH))
  const done = new Map<string, string>()
  for (let i = 0; i < batches.length; i += PARALLEL) {
    const results = await Promise.all(batches.slice(i, i + PARALLEL).map(b => translateBatch(env, lang, b, context)))
    batches.slice(i, i + PARALLEL).forEach((b, j) => b.forEach((src, k) => {
      const v = results[j]![k]
      if (v)
        done.set(src, v)
    }))
  }
  await Promise.all(texts.map(async (t, i) => {
    if (cached[i] != null)
      return
    const v = done.get(t)
    out[i] = v ?? t
    if (v)
      await env.CACHE.put(keys[i]!, v)
  }))
  return out
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS')
      return new Response(null, { headers: cors })
    const url = new URL(req.url)
    if (url.pathname === '/health')
      return json({ ok: true, version: VERSION, model: MODEL })
    if (req.method !== 'POST' || url.pathname !== '/v1/translate')
      return json({ error: 'not found' }, 404)

    if (env.LIMITER) {
      const ip = req.headers.get('cf-connecting-ip') ?? 'anon'
      const { success } = await env.LIMITER.limit({ key: ip })
      if (!success)
        return json({ error: 'slow down' }, 429)
    }

    let body: { lang?: string, texts?: unknown, context?: unknown }
    try {
      body = await req.json()
    }
    catch {
      return json({ error: 'invalid json' }, 400)
    }
    const lang = String(body.lang ?? '')
    if (!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang))
      return json({ error: 'invalid lang' }, 400)
    const texts = Array.isArray(body.texts) ? body.texts.filter((t): t is string => typeof t === 'string') : []
    if (!texts.length || texts.length > MAX_TEXTS || texts.reduce((n, t) => n + t.length, 0) > MAX_CHARS)
      return json({ error: `send 1-${MAX_TEXTS} strings, at most ${MAX_CHARS} characters` }, 400)
    if (lang === 'en')
      return json({ translations: texts })

    const context = typeof body.context === 'string' ? body.context.slice(0, 300) : undefined
    return json({ translations: await translateAll(env, lang, texts, context) })
  },
} satisfies ExportedHandler<Env>
