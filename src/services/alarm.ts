import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { CapgoAlarm } from '@capgo/capacitor-alarm'
import { toast } from '@capgo/capacitor-pretty-toast'
import { tr } from '~/i18n/translate'
import { addDays, formatHM, fromISO, toISO } from '~/lib/date'
import { dayIndex, WEEK } from '~/lib/progress'
import { useQuest } from '~/stores/quest'
import { knownCoords, sunriseHM, wakeHM } from './sun'

/** Alarms we own, one per slot: re-arming cancels the previous one instead of piling up duplicates. */
export type AlarmSlot = 'sunrise' | 'curfew'
interface Armed { id?: string, hm: string, day: string }
const slotKey = (slot: AlarmSlot) => `mq.alarm.${slot}`

async function armed(slot: AlarmSlot): Promise<Armed | null> {
  const { value } = await Preferences.get({ key: slotKey(slot) }).catch(() => ({ value: null }))
  try {
    return value ? JSON.parse(value) as Armed : null
  }
  catch {
    return null
  }
}

/** Day (YYYY-MM-DD) on which an alarm set now for hm rings next. */
function ringDay(hm: string, now = new Date()): string {
  const [h, m] = hm.split(':').map(Number)
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  if (d.getTime() <= now.getTime())
    d.setDate(d.getDate() + 1)
  return toISO(d)
}

function deniedToast() {
  toast.error(tr('Allow Alarms in Settings > Monday Quest'))
}

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
export async function setSystemAlarm(hm: string, label: string, slot?: AlarmSlot, quiet = false): Promise<boolean> {
  const [hour, minute] = hm.split(':').map(Number)
  const support = await alarmSupport()
  if (!support.native) {
    if (!quiet)
      toast.info(label, { message: hm })
    return false
  }
  const perm = quiet
    ? await CapgoAlarm.checkPermissions().catch(() => ({ granted: false }))
    : await CapgoAlarm.requestPermissions({ exactAlarm: true }).catch(() => ({ granted: false }))
  if (!perm.granted) {
    if (!quiet)
      deniedToast()
    return false
  }
  const previous = slot ? await armed(slot) : null
  if (previous?.id)
    await CapgoAlarm.cancelAlarm({ id: previous.id }).catch(() => {})
  const res: { success: boolean, id?: string } = await CapgoAlarm.createAlarm({ hour: hour!, minute: minute!, label, vibrate: true, skipUi: true }).catch(() => ({ success: false }))
  if (res.success && slot)
    await Preferences.set({ key: slotKey(slot), value: JSON.stringify({ id: res.id, hm, day: ringDay(hm) } satisfies Armed) }).catch(() => {})
  if (res.success && !quiet)
    toast.success(label, { message: hm, icon: 'alarm.fill' })
  return res.success
}

/** Wake-up time for the morning of that day (sunrise-based or the fixed time from Settings). */
export function wakeFor(day: string): string {
  const quest = useQuest()
  return quest.settings.wakeAuto ? wakeHM(fromISO(day), knownCoords()) : quest.settings.wakeAlarm
}

/**
 * Rising sun: arm the next wake-up by itself whenever its morning is a day of a live sunrise run,
 * including the Sunday night before a Monday start. Never prompts; one alarm, replaced when it changes.
 */
export async function armSunrise() {
  if (!Capacitor.isNativePlatform())
    return
  const quest = useQuest()
  const now = new Date()
  // The next morning that could ring: today if its wake time is still ahead, else tomorrow.
  const todayISO = toISO(now)
  const day = wakeFor(todayISO) > formatHM(now) ? todayISO : addDays(todayISO, 1)
  const run = quest.liveRuns.find((r) => {
    const idx = dayIndex(r, day)
    return quest.challenge(r.challengeId)?.tracker === 'sunrise' && idx >= 0 && idx < WEEK && !r.days[idx]?.done
  })
  if (!run)
    return
  const hm = wakeFor(day)
  const previous = await armed('sunrise')
  if (previous?.day === day && previous.hm === hm)
    return
  // The alarm rings at the next hm: only arm when that is the run day we want.
  if (ringDay(hm, now) !== day)
    return
  await setSystemAlarm(hm, tr(`Sunrise at ${sunriseHM(fromISO(day), knownCoords())} — up you get!`), 'sunrise', true)
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
