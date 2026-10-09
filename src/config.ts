/** Community group (Telegram invite link). Empty hides every community entry point. */
export const COMMUNITY_URL = ''

/** Open an external link outside the app (universal links like t.me hand over to their app). */
export function openExternal(url: string) {
  window.open(url, '_blank')
}
