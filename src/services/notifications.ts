import type { Challenge, TrackerKind } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { Capacitor } from '@capacitor/core'
import { RichNotifications } from '@capgo/capacitor-rich-notifications'
import { i18n } from '~/i18n'
import { dateOfDay, dayIndex, WEEK } from '~/lib/progress'
import { useQuest } from '~/stores/quest'

const native = Capacitor.isNativePlatform()
const PREFIX = 'mq-'

/** Trackers whose day entry is a short text: the notification lets you answer inline. */
const INLINE_TEXT: Partial<Record<TrackerKind, string>> = {
  gratitude: 'items',
  yes: 'note',
  toss: 'object',
  ted: 'topic',
  stranger: 'note',
  messenger: 'who',
}

/** Trackers that fit an evening reminder instead of a morning one. */
const EVENING: TrackerKind[] = ['gratitude', 'curfew', 'complain', 'sober', 'sugar', 'hold', 'yes', 'fast', 'nospend', 'detox', 'kindness', 'compliment', 'sunset', 'memory', 'review']

function t(key: string, params?: Record<string, unknown>) {
  return i18n.global.t(key, params ?? {})
}

function at(isoDay: string, hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  const [y, mo, d] = isoDay.split('-').map(Number)
  return new Date(y!, mo! - 1, d!, h, m).getTime()
}

export async function notificationsAllowed(): Promise<boolean> {
  const { status } = await RichNotifications.checkPermission().catch(() => ({ status: 'unavailable' as const }))
  return status === 'granted'
}

export async function requestNotifications(): Promise<boolean> {
  const { status } = await RichNotifications.requestPermission().catch(() => ({ status: 'unavailable' as const }))
  return status === 'granted'
}

/** Ask once a challenge starts (or from onboarding) and schedule the week's reminders. */
export async function ensureReminders(): Promise<boolean> {
  if (!native)
    return false
  const ok = (await notificationsAllowed()) || (await requestNotifications())
  if (ok)
    await rescheduleAll()
  return ok
}

export async function initNotifications() {
  await RichNotifications.createChannel({ id: 'quest', name: 'Monday Quest', description: 'Daily challenge reminders', importance: 'default', vibration: true }).catch(() => {})
  await RichNotifications.createChannel({ id: 'wake', name: 'Réveil', description: 'Wake-up and timed challenges', importance: 'high', vibration: true }).catch(() => {})
  await RichNotifications.registerActions({
    id: 'daily',
    actions: [
      { id: 'done', title: t('notif.actionDone') },
      { id: 'later', title: t('notif.actionLater') },
    ],
  }).catch(() => {})
  await RichNotifications.registerActions({
    id: 'write',
    actions: [
      { id: 'write', title: '✎', input: { placeholder: '…' } },
      { id: 'later', title: t('notif.actionLater') },
    ],
  }).catch(() => {})

  RichNotifications.addListener('press', e => handlePress(e.id, e.actionId, e.input))
  const initial = await RichNotifications.getInitialNotification().catch(() => ({ notification: null }))
  if (initial.notification)
    handlePress(initial.notification.id, initial.notification.actionId, initial.notification.input)
}

let onOpen: ((path: string) => void) | undefined
export function onNotificationOpen(fn: (path: string) => void) {
  onOpen = fn
}

function handlePress(id: string, actionId?: string, input?: string) {
  // ids look like mq-<kind>-<runId>-<idx>
  const m = id.match(/^mq-(\w+)-(.+)-(\d)$/)
  if (!m)
    return
  const [, , runId, idxStr] = m
  const quest = useQuest()
  const run = quest.runs.find(r => r.id === runId)
  if (!run)
    return
  const idx = Number(idxStr)
  const c = quest.challenge(run.challengeId)
  if (actionId === 'done') {
    quest.toggleDay(run, idx, true)
    return
  }
  if (actionId === 'write' && input && c) {
    const field = INLINE_TEXT[c.tracker]
    if (field === 'items') {
      const items = [...(run.days[idx]!.data.items ?? ['', '', ''])]
      const free = items.findIndex((s: string) => !s)
      items[free >= 0 ? free : items.length - 1] = input
      quest.patchDay(run, idx, { items })
    }
    else if (field) {
      quest.toggleDay(run, idx, true, { [field]: input })
    }
    return
  }
  if (actionId !== 'later')
    onOpen?.(`/challenge/${run.challengeId}/track`)
}

/**
 * Local notifications only support one-shot timestamps, so we (re)build the
 * next 7 days of reminders every time progress or settings change.
 */
export async function rescheduleAll() {
  if (!native)
    return
  if (!(await notificationsAllowed()))
    return
  const quest = useQuest()
  const pending = await RichNotifications.getPending().catch(() => ({ notifications: [] }))
  await Promise.all(pending.notifications.filter(n => n.id.startsWith(PREFIX)).map(n => RichNotifications.cancel({ id: n.id }).catch(() => {})))

  const now = Date.now()
  const jobs: Promise<unknown>[] = []
  for (const run of quest.liveRuns) {
    const c = quest.challenge(run.challengeId)
    if (!c)
      continue
    jobs.push(...scheduleRun(run, c, now))
  }
  await Promise.all(jobs)
}

function scheduleRun(run: Run, c: Challenge, now: number): Promise<unknown>[] {
  const quest = useQuest()
  const title = c.text[quest.locale].title
  const jobs: Promise<unknown>[] = []
  const startIdx = Math.max(0, dayIndex(run, quest.today))

  // Monday morning kickoff for upcoming runs
  if (startIdx === 0 && dayIndex(run, quest.today) < 0) {
    const ts = at(run.start, '07:30')
    if (ts > now) {
      jobs.push(RichNotifications.schedule({
        notification: { id: `${PREFIX}start-${run.id}-0`, title: t('notif.mondayTitle'), body: t('notif.mondayBody', { title }), channelId: 'quest', interruptionLevel: 'timeSensitive' },
        trigger: { type: 'timestamp', timestamp: ts },
      }).catch(() => {}))
    }
  }

  for (let idx = startIdx; idx < WEEK; idx++) {
    if (run.days[idx]?.done)
      continue
    const day = dateOfDay(run, idx)
    const evening = EVENING.includes(c.tracker)
    const ts = at(day, evening ? quest.settings.evening : quest.settings.reminder)
    if (ts <= now)
      continue
    const inline = INLINE_TEXT[c.tracker]
    jobs.push(RichNotifications.schedule({
      notification: {
        id: `${PREFIX}daily-${run.id}-${idx}`,
        title: t('notif.dailyTitle', { title, n: idx + 1 }),
        body: evening ? t('notif.eveningBody') : t('notif.dailyBody'),
        channelId: 'quest',
        categoryId: inline ? 'write' : 'daily',
        groupId: run.id,
        badge: 1,
      },
      trigger: { type: 'timestamp', timestamp: ts },
    }).catch(() => {}))
  }
  return jobs
}

/** Immediate notification, e.g. a timer finishing while the app is in background. */
export async function notifyNow(title: string, body: string, wake = false) {
  await RichNotifications.display({ id: `${PREFIX}now-${Date.now()}-0`, title, body, channelId: wake ? 'wake' : 'quest', interruptionLevel: wake ? 'timeSensitive' : 'active' }).catch(() => {})
}

/** Schedule a one-off "your timer is done" in case the user locks the phone mid-session. */
export async function scheduleTimerEnd(key: string, title: string, body: string, inMs: number) {
  await RichNotifications.schedule({
    notification: { id: `${PREFIX}timer-${key}-0`, title, body, channelId: 'wake', interruptionLevel: 'timeSensitive' },
    trigger: { type: 'timestamp', timestamp: Date.now() + inMs },
  }).catch(() => {})
}

export async function cancelTimerEnd(key: string) {
  await RichNotifications.cancel({ id: `${PREFIX}timer-${key}-0` }).catch(() => {})
}

export async function clearBadge() {
  await RichNotifications.setBadge({ count: 0 }).catch(() => {})
}
