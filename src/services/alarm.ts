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

/**
 * One alarm per remaining hour today (HH:00), for the stand-up challenge.
 * Falls back to time-sensitive notifications where real alarms are not available.
 */
export async function scheduleHourlyAlarms(hours: number[], label: string, body: string): Promise<{ ids: string[], kind: 'alarm' | 'notification' | 'none' }> {
  if (!Capacitor.isNativePlatform() || !hours.length)
    return { ids: [], kind: 'none' }
  const support = await alarmSupport()
  if (support.native) {
    const perm = await CapgoAlarm.requestPermissions({ exactAlarm: true }).catch(() => ({ granted: false }))
    if (perm.granted) {
      const ids: string[] = []
      for (const hour of hours) {
        const res = await CapgoAlarm.createAlarm({ hour, minute: 0, label, vibrate: true, skipUi: true }).catch(() => ({ success: false, id: undefined }))
        if (res.success)
          ids.push(res.id ?? `${hour}`)
      }
      if (ids.length)
        return { ids, kind: 'alarm' }
    }
  }
  const { RichNotifications } = await import('@capgo/capacitor-rich-notifications')
  const ids: string[] = []
  const day = new Date()
  for (const hour of hours) {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0).getTime()
    if (at <= Date.now())
      continue
    const id = `mq-standup-${hour}-${day.toISOString().slice(0, 10)}`
    await RichNotifications.schedule({
      notification: { id, title: label, body, channelId: 'wake', interruptionLevel: 'timeSensitive' },
      trigger: { type: 'timestamp', timestamp: at },
    }).then(() => ids.push(id)).catch(() => {})
  }
  return { ids, kind: ids.length ? 'notification' : 'none' }
}

export async function cancelHourlyAlarms(ids: string[], kind: 'alarm' | 'notification' | 'none') {
  if (kind === 'alarm') {
    for (const id of ids)
      await CapgoAlarm.cancelAlarm({ id }).catch(() => {})
  }
  else if (kind === 'notification') {
    const { RichNotifications } = await import('@capgo/capacitor-rich-notifications')
    for (const id of ids)
      await RichNotifications.cancel({ id }).catch(() => {})
  }
}

export async function openSystemAlarms() {
  await CapgoAlarm.openAlarms().catch(() => {})
}
