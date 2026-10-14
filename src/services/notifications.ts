import type { Challenge, TrackerKind } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { Capacitor } from '@capacitor/core'
import { RichNotifications } from '@capgo/capacitor-rich-notifications'
import { CHALLENGES } from '~/data/challenges'
import { i18n } from '~/i18n'
import { tr } from '~/i18n/translate'
import { addDays, fromISO } from '~/lib/date'
import { dateOfDay, dayIndex, WEEK } from '~/lib/progress'
import { useQuest } from '~/stores/quest'

const native = Capacitor.isNativePlatform()
const PREFIX = 'mq-'
/** Ids rebuilt by rescheduleAll. Timers (mq-timer-), stand-up alarms (mq-standup-) and snoozes are left alone. */
const OWNED = ['daily', 'catchup', 'start', 'next'].map(k => `${PREFIX}${k}-`)
const SNOOZE_MS = 30 * 60_000

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
const EVENING: TrackerKind[] = ['gratitude', 'curfew', 'complain', 'sober', 'sugar', 'hold', 'yes', 'fast', 'nospend', 'detox', 'kindness', 'compliment', 'sunset', 'memory', 'review', 'forgive']

function t(key: string, params?: Record<string, unknown>) {
  return i18n.global.t(key, params ?? {})
}

function at(isoDay: string, hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  const [y, mo, d] = isoDay.split('-').map(Number)
  return new Date(y!, mo! - 1, d!, h, m).getTime()
}

export async function notificationStatus() {
  const { status } = await RichNotifications.checkPermission().catch(() => ({ status: 'unavailable' as const }))
  return status
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await notificationStatus()) === 'granted'
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

/** First challenge not cleared and not running: the one Today suggests next. */
export function nextChallenge(): Challenge | undefined {
  const quest = useQuest()
  return CHALLENGES.find(c => !quest.clearedIds.has(c.id) && !quest.runFor(c.id))
}

/** Channel names and action titles, (re)sent when the language changes. */
export async function localizeNotifications() {
  await RichNotifications.createChannel({ id: 'quest', name: t('notif.channelQuest'), description: t('notif.channelQuestHint'), importance: 'default', vibration: true }).catch(() => {})
  await RichNotifications.createChannel({ id: 'wake', name: t('notif.channelWake'), description: t('notif.channelWakeHint'), importance: 'high', vibration: true }).catch(() => {})
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
      { id: 'write', title: t('notif.actionWrite'), input: { placeholder: '…' } },
      { id: 'later', title: t('notif.actionLater') },
    ],
  }).catch(() => {})
}

export async function initNotifications() {
  await localizeNotifications()

  // Cold start: Android replays the tap to the listener (retained event) and both platforms also keep it
  // for getInitialNotification, so the same tap arrives twice. iOS also stores every warm tap as "initial".
  RichNotifications.addListener('press', (e) => {
    handleOnce(e.id, e.actionId, e.input)
    // Consume the stored copy so it is not replayed on the next launch.
    void RichNotifications.getInitialNotification().catch(() => {})
  })
  const initial = await RichNotifications.getInitialNotification().catch(() => ({ notification: null }))
  if (initial.notification)
    handleOnce(initial.notification.id, initial.notification.actionId, initial.notification.input)
}

const handled = new Map<string, number>()
function handleOnce(id: string, actionId?: string, input?: string) {
  const key = `${id}|${actionId ?? ''}|${input ?? ''}`
  const now = Date.now()
  if (now - (handled.get(key) ?? 0) < 10_000)
    return
  handled.set(key, now)
  handlePress(id, actionId, input)
}

let onOpen: ((path: string) => void) | undefined
export function onNotificationOpen(fn: (path: string) => void) {
  onOpen = fn
}

function handlePress(id: string, actionId?: string, input?: string) {
  // ids look like mq-<kind>-<runId|key|challengeId>-<idx>
  const m = id.match(/^mq-(\w+)-(.+)-(\d)$/)
  const kind = m?.[1] ?? id.match(/^mq-(\w+)-/)?.[1]
  const quest = useQuest()
  if (kind === 'next') {
    if (m && quest.challenge(m[2]!))
      onOpen?.(`/challenge/${m[2]}/read`)
    return
  }
  if (kind === 'standup') {
    const run = quest.liveRuns.find(r => quest.challenge(r.challengeId)?.tracker === 'standup')
    if (run)
      onOpen?.(`/challenge/${run.challengeId}/track`)
    return
  }
  if (!m)
    return
  const [, , ref, idxStr] = m
  // Timer keys are `<runId>-<idx>` or `<runId>-fast-<idx>`: match the run by prefix.
  const run = kind === 'timer'
    ? quest.runs.find(r => ref!.startsWith(`${r.id}-`))
    : quest.runs.find(r => r.id === ref)
  if (!run)
    return
  if (kind === 'timer') {
    onOpen?.(`/challenge/${run.challengeId}/track`)
    return
  }
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
  if (actionId === 'later') {
    if (c && !run.days[idx]?.done)
      void snooze(run, c, idx)
    return
  }
  onOpen?.(`/challenge/${run.challengeId}/track`)
}

/** "Later": the same reminder again in 30 minutes. */
async function snooze(run: Run, c: Challenge, idx: number) {
  await RichNotifications.schedule({
    notification: dailyNotification(run, c, idx, `${PREFIX}snooze-${run.id}-${idx}`),
    trigger: { type: 'timestamp', timestamp: Date.now() + SNOOZE_MS },
  }).catch(() => {})
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
  const stale = pending.notifications.filter(n => OWNED.some(p => n.id.startsWith(p)) || snoozeDone(n.id))
  await Promise.all(stale.map(n => RichNotifications.cancel({ id: n.id }).catch(() => {})))

  const now = Date.now()
  const jobs: Promise<unknown>[] = []
  for (const run of quest.liveRuns) {
    const c = quest.challenge(run.challengeId)
    if (!c)
      continue
    jobs.push(...scheduleRun(run, c, now))
  }
  if (!quest.liveRuns.length)
    jobs.push(...scheduleNext(now))
  await Promise.all(jobs)
}

/** A snoozed reminder whose day got ticked (or whose run is gone) since. */
function snoozeDone(id: string): boolean {
  const m = id.match(/^mq-snooze-(.+)-(\d)$/)
  if (!m)
    return false
  const run = useQuest().liveRuns.find(r => r.id === m[1])
  return !run || !!run.days[Number(m[2])]?.done
}

/**
 * Nothing running: a standing notice for the next challenge, Sunday 19:00 ("Tomorrow: …")
 * and Monday 08:00. Starting it changes the runs, which reschedules and drops these.
 */
function scheduleNext(now: number): Promise<unknown>[] {
  const quest = useQuest()
  const c = nextChallenge()
  if (!c)
    return []
  const title = tr(c.text.title)
  let sunday: number | undefined
  let monday: number | undefined
  for (let i = 0; i <= 7; i++) {
    const day = addDays(quest.today, i)
    const dow = fromISO(day).getDay()
    if (dow === 0 && sunday == null && at(day, '19:00') > now)
      sunday = at(day, '19:00')
    if (dow === 1 && monday == null && at(day, '08:00') > now)
      monday = at(day, '08:00')
  }
  const jobs: Promise<unknown>[] = []
  if (sunday != null) {
    jobs.push(RichNotifications.schedule({
      notification: { id: `${PREFIX}next-${c.id}-0`, title: t('notif.nextTitle', { title }), body: c.text.short ? tr(c.text.short) : t('notif.nextBody'), channelId: 'quest' },
      trigger: { type: 'timestamp', timestamp: sunday },
    }).catch(() => {}))
  }
  if (monday != null) {
    jobs.push(RichNotifications.schedule({
      notification: { id: `${PREFIX}next-${c.id}-1`, title: t('notif.mondayTitle'), body: t('notif.nextMondayBody', { title }), channelId: 'quest', interruptionLevel: 'timeSensitive' },
      trigger: { type: 'timestamp', timestamp: monday },
    }).catch(() => {}))
  }
  return jobs
}

/** The daily (or evening) reminder of one day; the body is the challenge's own tip when it has one. */
function dailyNotification(run: Run, c: Challenge, idx: number, id: string) {
  const evening = EVENING.includes(c.tracker)
  const source = c.text.tip || c.text.short
  const own = source ? tr(source) : ''
  return {
    id,
    title: t('notif.dailyTitle', { title: tr(c.text.title), n: idx + 1 }),
    body: own || (evening ? t('notif.eveningBody') : t('notif.dailyBody')),
    channelId: 'quest',
    categoryId: INLINE_TEXT[c.tracker] ? 'write' : 'daily',
    groupId: run.id,
    badge: 1,
  }
}

function scheduleRun(run: Run, c: Challenge, now: number): Promise<unknown>[] {
  const quest = useQuest()
  const title = tr(c.text.title)
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
    if (ts > now) {
      jobs.push(RichNotifications.schedule({
        notification: dailyNotification(run, c, idx, `${PREFIX}daily-${run.id}-${idx}`),
        trigger: { type: 'timestamp', timestamp: ts },
      }).catch(() => {}))
    }
    // One evening catch-up for morning-reminder challenges whose box is still empty
    // (evening trackers already got theirs). Ticking the day reschedules and drops it.
    const late = at(day, quest.settings.evening)
    if (!evening && late > now && late > at(day, quest.settings.reminder)) {
      jobs.push(RichNotifications.schedule({
        notification: { ...dailyNotification(run, c, idx, `${PREFIX}catchup-${run.id}-${idx}`), body: t('notif.catchupBody') },
        trigger: { type: 'timestamp', timestamp: late },
      }).catch(() => {}))
    }
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
