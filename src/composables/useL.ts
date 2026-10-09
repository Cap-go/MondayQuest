import { lang, langTag, tr } from '~/i18n/translate'

/** Inline copy, written in English and translated on the fly: L('Hello'). */
export function useL() {
  const L = (en: string) => tr(en)
  L.locale = (): string => lang.value
  L.tag = (): string => langTag.value
  return L
}
