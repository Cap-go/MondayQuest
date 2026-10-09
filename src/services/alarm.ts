import { Capacitor } from '@capacitor/core'
import { CapgoAlarm } from '@capgo/capacitor-alarm'
import { toast } from '@capgo/capacitor-pretty-toast'

export interface AlarmSupport {
  native: boolean
  version?: string
}

export async function alarmSupport(): Promise<AlarmSupport> {
  if (!Capacitor.isNativePlatform())
    return { native: false }
  const info = await CapgoAlarm.getOSInfo().catch(() => null)
  return { native: !!info?.supportsNativeAlarms, version: info?.version }
}

/**
 * Creates a real system alarm (AlarmKit on iOS 26+, Clock app intent on Android)
 * so the phone actually rings, even in silent mode.
 */
export async function setSystemAlarm(hm: string, label: string): Promise<boolean> {
  const [hour, minute] = hm.split(':').map(Number)
  const support = await alarmSupport()
  if (!support.native) {
    toast.info(label, { message: hm })
    return false
  }
  const perm = await CapgoAlarm.requestPermissions({ exactAlarm: true }).catch(() => ({ granted: false }))
  if (!perm.granted)
    return false
  const res = await CapgoAlarm.createAlarm({ hour: hour!, minute: minute!, label, vibrate: true, skipUi: true }).catch(() => ({ success: false }))
  if (res.success)
    toast.success(label, { message: hm, icon: 'alarm.fill' })
  return res.success
}

/** AlarmKit (iOS 26+) / exact alarms (Android) permission, asked from onboarding. */
export async function requestAlarmPermission(): Promise<boolean> {
  if (!(await alarmSupport()).native)
    return false
  const perm = await CapgoAlarm.requestPermissions({ exactAlarm: true }).catch(() => ({ granted: false }))
  return perm.granted
}

export async function openSystemAlarms() {
  await CapgoAlarm.openAlarms().catch(() => {})
}
