import { Capacitor } from '@capacitor/core'
import { NativePurchases } from '@capgo/native-purchases'
import { ref } from 'vue'

export type BuildEnv = 'web' | 'dev' | 'testflight' | 'store' | 'android'

/** Where this binary came from. TestFlight builds report the StoreKit "Sandbox" environment. */
export const buildEnv = ref<BuildEnv>(import.meta.env.DEV ? 'dev' : 'web')
export const isTestBuild = ref(import.meta.env.DEV)

export async function detectBuildEnv() {
  const platform = Capacitor.getPlatform()
  if (platform === 'web')
    return
  if (platform === 'android') {
    buildEnv.value = 'android'
    return
  }
  // Older binaries without the plugin: stay "store" so the menu never leaks; 7 taps still unlock it.
  const res = await NativePurchases.getAppTransaction().catch(() => null)
  if (!res) {
    buildEnv.value = 'store'
    return
  }
  const env = res.appTransaction.environment
  buildEnv.value = env === 'Production' ? 'store' : env === 'Xcode' ? 'dev' : 'testflight'
  isTestBuild.value = buildEnv.value !== 'store'
}
