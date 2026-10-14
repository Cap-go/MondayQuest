import type { SvgTemplateDefinition } from '@capgo/capacitor-widget-kit'
import { Capacitor } from '@capacitor/core'
import { CapgoWidgetKit } from '@capgo/capacitor-widget-kit'
import { CATEGORY_LABEL } from '~/data/challenges'
import { tr } from '~/i18n/translate'
import { today as todayISO } from '~/lib/date'
import { checkedCount, dayIndex, runStatus } from '~/lib/progress'
import { useQuest } from '~/stores/quest'

const native = Capacitor.isNativePlatform()
const TODAY_ID = 'mq-today'
const SESSION_ID = 'mq-session'

// The SwiftUI widget renders from `state`; the SVG is a fallback for Android's
// bitmap renderer and for previews. Keep both in sync.
const TODAY_DEFINITION: SvgTemplateDefinition = {
  id: 'mq-today',
  version: '1',
  actions: [
    {
      id: 'check',
      eventName: 'mq.check',
      label: '✓',
      patches: [
        { op: 'set', path: 'state.done', value: true },
        { op: 'increment', path: 'state.checked', amount: 1 },
        // Fill today's square in the week row too. checkPath is a safe key when today is outside the run.
        { op: 'set', path: 'state.{{state.checkPath}}', value: true },
      ],
    },
  ],
  layouts: {
    homeScreen: {
      width: 170,
      height: 170,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 170"><rect width="170" height="170" fill="#f6f4ef"/><text x="14" y="28" font-family="Archivo" font-weight="800" font-size="11" fill="#141414">{{state.dayLabel}}</text><text x="14" y="62" font-family="Archivo" font-weight="800" font-size="18" fill="#141414">{{state.title}}</text><text x="14" y="150" font-family="Archivo" font-size="11" fill="#141414">{{state.checked}}/7</text><rect x="112" y="112" width="44" height="44" fill="none" stroke="#141414" stroke-width="3"/></svg>`,
      hotspots: [{ id: 'box', actionId: 'check', x: 112, y: 112, width: 44, height: 44, label: '✓', role: 'button' }],
    },
    lockScreen: {
      width: 160,
      height: 70,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 70"><text x="4" y="24" font-weight="800" font-size="14">{{state.title}}</text><text x="4" y="50" font-size="12">{{state.dayLabel}} · {{state.checked}}/7</text></svg>`,
    },
  },
}

function sessionDefinition(durationMs: number): SvgTemplateDefinition {
  return {
    id: 'mq-session',
    version: '1',
    timers: [{ id: 'main', durationMs, autoStart: true }],
    actions: [{ id: 'stop', eventName: 'mq.stop', label: '■', timerMutations: [{ op: 'stop', timerId: 'main' }] }],
    layouts: {
      lockScreen: {
        width: 360,
        height: 90,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90"><text x="16" y="34" font-weight="800" font-size="18">{{state.title}}</text><text x="16" y="66" font-size="28">{{timers.main.remainingText}}</text></svg>`,
        hotspots: [{ id: 'stop', actionId: 'stop', x: 300, y: 20, width: 44, height: 44, label: '■', role: 'button' }],
      },
      dynamicIslandExpanded: { width: 360, height: 80, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80"><text x="10" y="30">{{state.title}}</text><text x="10" y="64">{{timers.main.remainingText}}</text></svg>` },
      dynamicIslandCompactLeading: { width: 40, height: 40, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="4" y="26">{{state.short}}</text></svg>` },
      dynamicIslandCompactTrailing: { width: 60, height: 40, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><text x="4" y="26">{{timers.main.remainingText}}</text></svg>` },
      dynamicIslandMinimal: { width: 40, height: 40, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="4" y="26">{{state.short}}</text></svg>` },
    },
  }
}

/** Push today's quest to the home-screen widget. */
export async function syncTodayWidget() {
  if (!native)
    return
  const quest = useQuest()
  const run = quest.activeRuns[0] ?? quest.liveRuns[0]
  const c = run ? quest.challenge(run.challengeId) : undefined
  const idx = run ? quest.todayIndex(run) : -1
  const fr = quest.locale === 'fr'
  const state = run && c
    ? {
        title: tr(c.text.title).toUpperCase(),
        short: tr(c.text.short),
        category: tr(CATEGORY_LABEL[c.category]),
        icon: c.icon,
        number: c.n,
        day: Math.min(7, Math.max(1, idx + 1)),
        dayLabel: idx < 0 ? (fr ? 'LUNDI' : 'MONDAY') : `${fr ? 'JOUR' : 'DAY'} ${Math.min(7, idx + 1)}`,
        checked: checkedCount(run),
        days: run.days.map(d => d.done),
        done: idx >= 0 && idx < 7 ? run.days[idx]!.done : false,
        status: runStatus(run, quest.today),
        streak: quest.currentStreak,
        runId: run.id,
        dayIndex: idx,
        checkPath: idx >= 0 && idx < 7 ? `days.${idx}` : 'outside',
        locale: quest.locale,
      }
    : {
        title: 'MONDAY QUEST',
        short: fr ? 'Choisissez votre prochain challenge.' : 'Pick your next challenge.',
        category: '',
        icon: 'star',
        number: 0,
        day: 0,
        dayLabel: fr ? 'LUNDI MATIN' : 'MONDAY MORNING',
        checked: 0,
        days: [false, false, false, false, false, false, false],
        done: false,
        status: 'none',
        streak: quest.currentStreak,
        runId: '',
        dayIndex: -1,
        checkPath: 'outside',
        locale: quest.locale,
      }

  const existing = await CapgoWidgetKit.getTemplateActivity({ activityId: TODAY_ID }).catch(() => ({ activity: null }))
  if (existing.activity)
    await CapgoWidgetKit.updateTemplateActivity({ activityId: TODAY_ID, definition: TODAY_DEFINITION, state, openUrl: 'mondayquest://today' }).catch(() => {})
  else
    await CapgoWidgetKit.startTemplateWidget({ activityId: TODAY_ID, definition: TODAY_DEFINITION, state, openUrl: 'mondayquest://today' }).catch(() => {})
  await CapgoWidgetKit.reloadWidgets().catch(() => {})
}

/** Apply ticks done from the widget's interactive button (iOS 17+). */
export async function consumeWidgetEvents() {
  if (!native)
    return
  const { events } = await CapgoWidgetKit.listTemplateEvents({ activityId: TODAY_ID, unacknowledgedOnly: true }).catch(() => ({ events: [] }))
  if (!events.length)
    return
  const quest = useQuest()
  for (const e of events) {
    if (e.actionId !== 'check')
      continue
    // Ticks can sit in the queue past midnight: they belong to the day (and run) they were tapped on.
    const runId = (e.state as { runId?: unknown } | undefined)?.runId
    const run = typeof runId === 'string' && runId
      ? quest.runs.find(r => r.id === runId)
      : quest.activeRuns[0]
    if (!run || run.abandonedAt || run.completedAt)
      continue
    const idx = dayIndex(run, todayISO(new Date(e.createdAt)))
    if (idx >= 0 && idx < 7 && !run.days[idx]!.done)
      quest.toggleDay(run, idx, true, { via: 'widget' })
  }
  await CapgoWidgetKit.acknowledgeTemplateEvents({ activityId: TODAY_ID }).catch(() => {})
}

export interface SessionInfo {
  title: string
  subtitle: string
  short: string
  icon: string
  durationMs: number
  startedAt: number
}

/** Live Activity on the lock screen + Dynamic Island for timed sessions (walk, meditation, cold shower…). */
/** Returns true when the Live Activity is showing on the lock screen / Dynamic Island. */
export async function startSessionActivity(info: SessionInfo): Promise<boolean> {
  if (!native)
    return false
  const { supported } = await CapgoWidgetKit.areActivitiesSupported().catch(() => ({ supported: false }))
  if (!supported)
    return false
  await CapgoWidgetKit.endTemplateActivity({ activityId: SESSION_ID }).catch(() => {})
  return CapgoWidgetKit.startTemplateActivity({
    activityId: SESSION_ID,
    definition: sessionDefinition(info.durationMs),
    state: { ...info, endsAt: info.startedAt + info.durationMs },
    openUrl: 'mondayquest://today',
    startLiveActivity: true,
  }).then(() => true).catch(() => false)
}

export async function updateSessionActivity(patch: Partial<SessionInfo> & Record<string, string | number | boolean>) {
  if (!native)
    return
  const current = await CapgoWidgetKit.getTemplateActivity({ activityId: SESSION_ID }).catch(() => ({ activity: null }))
  if (!current.activity)
    return
  await CapgoWidgetKit.updateTemplateActivity({ activityId: SESSION_ID, state: { ...(current.activity.state as object), ...patch } }).catch(() => {})
}

export async function endSessionActivity() {
  if (!native)
    return
  await CapgoWidgetKit.endTemplateActivity({ activityId: SESSION_ID }).catch(() => {})
}
