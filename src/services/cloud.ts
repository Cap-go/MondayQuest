import { ICloudKV } from '@capgo/capacitor-icloud-kv'

// Progress follows the user to a new phone: iCloud key-value storage on iOS, Android Backup on Android.
// The store holds 1 MB, so photos and drawings (data URLs) stay on the device and are re-attached on load.
const KEY = 'mq.state.v1'
const LOCAL_ONLY = 'mq:local'
const MAX_BYTES = 950_000

export interface Stamped { savedAt?: number }

function strip(state: unknown): string {
  return JSON.stringify(state, (_k, v) => (typeof v === 'string' && v.startsWith('data:') && v.length > 2048 ? LOCAL_ONLY : v))
}

/** Put the device-only values (photos, drawings) back into a state that came from the cloud. */
export function reattachLocal<T>(cloud: T, local: unknown): T {
  const fill = (c: any, l: any): any => {
    if (c === LOCAL_ONLY)
      return typeof l === 'string' ? l : ''
    if (Array.isArray(c)) {
      const byId = new Map((Array.isArray(l) ? l : []).filter(x => x?.id).map(x => [x.id, x]))
      return c.map((x, i) => fill(x, x?.id ? byId.get(x.id) : l?.[i]))
    }
    if (c && typeof c === 'object')
      return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, fill(v, l?.[k])]))
    return c
  }
  return fill(cloud, local)
}

export async function readCloud<T extends Stamped>(): Promise<T | null> {
  try {
    const { value } = await Promise.race([
      ICloudKV.get({ key: KEY }),
      new Promise<{ value: null }>(r => setTimeout(r, 1500, { value: null })),
    ])
    return value ? JSON.parse(value) as T : null
  }
  catch {
    return null
  }
}

export async function writeCloud(state: Stamped): Promise<void> {
  const value = strip(state)
  if (value.length > MAX_BYTES)
    return
  await ICloudKV.set({ key: KEY, value }).catch(() => {})
}

export function flushCloud(): void {
  void ICloudKV.synchronize().catch(() => {})
}

/** Called when another device saved newer progress (iOS). */
export function onCloudChange(cb: () => void): void {
  void ICloudKV.addListener('change', ({ keys }) => {
    if (keys.includes(KEY))
      cb()
  }).catch(() => {})
}
