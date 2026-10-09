import { Capacitor } from '@capacitor/core'
import { toast } from '@capgo/capacitor-pretty-toast'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { ref } from 'vue'

export const bundleVersion = ref<string>('builtin')
export const nativeVersion = ref<string>('')

/** Must run as early as possible: Capgo rolls back a bundle that never says it's ready. */
export function notifyReady() {
  if (!Capacitor.isNativePlatform())
    return
  void CapacitorUpdater.notifyAppReady()
    .then(({ bundle }) => { bundleVersion.value = bundle.version })
    .catch(() => {})
  void CapacitorUpdater.getBuiltinVersion().then(v => (nativeVersion.value = v.version)).catch(() => {})
  CapacitorUpdater.addListener('downloadComplete', ({ bundle }) => {
    toast.info('Monday Quest', { message: `↻ ${bundle.version}`, icon: 'arrow.down.circle', duration: 2500 })
  })
}

export async function currentChannel(): Promise<string | undefined> {
  if (!Capacitor.isNativePlatform())
    return undefined
  const res = await CapacitorUpdater.getChannel().catch(() => null)
  return res?.channel
}
