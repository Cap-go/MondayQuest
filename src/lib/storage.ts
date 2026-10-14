import { Preferences } from '@capacitor/preferences'

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  let raw: string | null = null
  try {
    raw = (await Preferences.get({ key })).value
    return raw ? { ...fallback, ...JSON.parse(raw) } as T : fallback
  }
  catch {
    // Unreadable copy: the next save overwrites it with the fallback, so keep the raw string aside first.
    if (raw)
      await Preferences.set({ key: `${key}.corrupt.${Date.now()}`, value: raw }).catch(() => {})
    return fallback
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) })
}
