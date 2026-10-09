import type { Challenge, ChallengeText } from '~/data/challenges'
import { CATEGORY_LABEL, CHALLENGES, LEVELS } from '~/data/challenges'
import { allMessages } from '~/i18n'
import staticStrings from './static-strings.json'
import { deviceTag, languageOf, prefetch, setLanguage, tr } from './translate'

/** A challenge's copy in the current language. */
export function ct(c: Challenge): ChallengeText {
  return { title: tr(c.text.title), short: tr(c.text.short), body: c.text.body.map(tr), tip: tr(c.text.tip) }
}

/** Every string we know at build time, fetched in one go when a new language is used. */
export function knownStrings(): string[] {
  const out = new Set<string>([...allMessages(), ...staticStrings, ...LEVELS.map(l => l.text), ...Object.values(CATEGORY_LABEL)])
  for (const c of CHALLENGES) {
    out.add(c.text.title)
    out.add(c.text.short)
    out.add(c.text.tip)
    c.text.body.forEach(b => out.add(b))
  }
  return [...out]
}

/** 'auto' follows the phone; any other value is a language code chosen in Settings. */
export async function applyLanguage(setting: string) {
  const tag = setting === 'auto' ? deviceTag() : setting
  await setLanguage(languageOf(tag), tag)
  // Titles are puns and short names: give the translator the context, before everything else.
  prefetch(CHALLENGES.map(c => c.text.title), 'Titles of weekly self-improvement challenges, often a playful name or pun (e.g. "The stroller" = someone who strolls/walks leisurely, "The James Bond shower" = ending a shower ice-cold). Translate the idea into a natural, catchy title.')
  prefetch(LEVELS.map(l => l.text), 'Names of the levels of a 52-week challenge journey, like chapters of a climb.')
  prefetch(knownStrings())
}
