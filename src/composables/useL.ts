import type { Locale } from '~/data/challenges'
import { useQuest } from '~/stores/quest'

/** Inline bilingual copy for tracker-specific microcopy: L('Bonjour', 'Hello'). */
export function useL() {
  const quest = useQuest()
  const L = (fr: string, en: string) => (quest.locale === 'fr' ? fr : en)
  L.locale = (): Locale => quest.locale
  L.tag = (): string => (quest.locale === 'fr' ? 'fr-FR' : 'en-GB')
  return L
}
