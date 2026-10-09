/* eslint-disable no-console, antfu/no-top-level-await, node/prefer-global/process -- CLI script */
// Pre-translate every known string for common languages so most people never wait.
// Usage (from repo root): bun translate/warm.ts [lang ...]
import { CATEGORY_LABEL, CHALLENGES, LEVELS } from '../src/data/challenges'
import { allMessages } from '../src/i18n'
import staticStrings from '../src/i18n/static-strings.json'

const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'es', 'de', 'it', 'pt', 'pt-BR', 'nl', 'pl', 'sv', 'tr', 'ru', 'uk', 'ja', 'ko', 'zh-Hans', 'zh-Hant', 'id', 'vi', 'ar', 'hi', 'et']
const strings = new Set<string>([...allMessages(), ...staticStrings, ...LEVELS.map(l => l.text), ...Object.values(CATEGORY_LABEL)])
for (const c of CHALLENGES) {
  strings.add(c.text.title)
  strings.add(c.text.short)
  strings.add(c.text.tip)
  c.text.body.forEach(b => strings.add(b))
}
const all = [...strings].filter(s => /[a-z]/i.test(s))
console.log(`${all.length} strings × ${LANGS.length} languages`)
const TITLE_CONTEXT = 'Titles of weekly self-improvement challenges, often a playful name or pun (e.g. "The stroller" = someone who strolls/walks leisurely, "The James Bond shower" = ending a shower ice-cold). Translate the idea into a natural, catchy title.'
const LEVEL_CONTEXT = 'Names of the levels of a 52-week challenge journey, like chapters of a climb.'

async function send(lang: string, texts: string[], context?: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://translate.mondayquest.com/v1/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, texts, context }) })
    if (res.ok)
      return (await res.json() as { translations: string[] }).translations
    await new Promise(r => setTimeout(r, 5000))
  }
  return texts
}

for (const lang of LANGS) {
  // Same order as the app: titles and levels with their context first.
  for (let i = 0; i < CHALLENGES.length; i += 60)
    await send(lang, CHALLENGES.slice(i, i + 60).map(c => c.text.title), TITLE_CONTEXT)
  await send(lang, LEVELS.map(l => l.text), LEVEL_CONTEXT)
  let kept = 0
  for (let i = 0; i < all.length; i += 60) {
    const texts = all.slice(i, i + 60)
    const res = await fetch('https://translate.mondayquest.com/v1/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, texts }) })
    if (!res.ok) {
      console.log(lang, 'error', res.status, await res.text())
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    const { translations } = await res.json() as { translations: string[] }
    kept += translations.filter((t, j) => t === texts[j]).length
  }
  console.log(`${lang}: done (${kept} left in English)`)
}
