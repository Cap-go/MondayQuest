import type { Challenge, Locale } from '~/data/challenges'
import type { ISODate } from '~/lib/date'
import type { Run } from '~/lib/progress'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { CHALLENGES, LEVELS } from '~/data/challenges'
import { lang } from '~/i18n/translate'
import { today as todayISO } from '~/lib/date'
import { allChecked, completeRun, dayIndex, isLive, newRun, patchDayData, runStatus, setDay, streak } from '~/lib/progress'
import { loadJSON, saveJSON } from '~/lib/storage'

/** Bonus level for user-made challenges, never locked. */
export const CUSTOM_LEVEL = 99

export interface Settings {
  locale: Locale | 'auto'
  sound: boolean
  haptics: boolean
  /** Daily nudge "have you done today's quest?" */
  reminder: string
  /** Evening reflection for gratitude / curfew style challenges */
  evening: string
  /** Wake-up alarm used by Soleil levant */
  wakeAlarm: string
  /** Follow the sunrise at the user's location (default) instead of the fixed wakeAlarm time. */
  wakeAuto: boolean
  hardcore: boolean
  onboarded: boolean
  /** Set once the language moved to automatic + translated (see load). */
  i18nV2?: boolean
  /** Debug menu unlocked (TestFlight, or 7 taps on the version box). */
  debug: boolean
  /** Debug: every level open. */
  unlockAll: boolean
}

export interface Jokers {
  /** +1 each: shared the app with a friend (capped), finished a challenge for the second time. */
  earned: { kind: 'share' | 'repeat', at: number, ref?: string }[]
  /** A joker clears a challenge you don't want to do: it counts for unlocking the next level. */
  used: { challengeId: string, at: number }[]
}

/** Every notebook starts with two jokers. */
export const STARTING_JOKERS = 2
/** Sharing can't be farmed: at most this many jokers come from shares. */
export const MAX_SHARE_JOKERS = 3

interface Persisted {
  version: 1
  runs: Run[]
  custom: Challenge[]
  settings: Settings
  jokers?: Jokers
}

const KEY = 'mq.state.v1'

export const DEFAULT_SETTINGS: Settings = {
  locale: 'auto',
  sound: true,
  haptics: true,
  reminder: '09:00',
  evening: '21:30',
  wakeAlarm: '05:45',
  wakeAuto: true,
  hardcore: false,
  onboarded: false,
  debug: false,
  unlockAll: false,
}

export const useQuest = defineStore('quest', () => {
  const runs = ref<Run[]>([])
  const custom = ref<Challenge[]>([])
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const ready = ref(false)
  /** Bumped every minute so "today" stays fresh across midnight. */
  const clock = ref(Date.now())

  const today = computed<ISODate>(() => todayISO(new Date(clock.value)))

  const allChallenges = computed(() => [...CHALLENGES, ...custom.value])

  /** Active UI language (phone language unless chosen in Settings). */
  const locale = computed<Locale>(() => lang.value)

  const liveRuns = computed(() => runs.value.filter(r => isLive(r, today.value)))

  const activeRuns = computed(() => liveRuns.value.filter(r => runStatus(r, today.value) !== 'upcoming'))

  const completedIds = computed(() => new Set(runs.value.filter(r => r.completedAt).map(r => r.challengeId)))

  const jokers = ref<Jokers>({ earned: [], used: [] })
  const jokerBalance = computed(() => STARTING_JOKERS + jokers.value.earned.length - jokers.value.used.length)
  const skippedIds = computed(() => new Set(jokers.value.used.map(u => u.challengeId)))
  const shareJokersLeft = computed(() => MAX_SHARE_JOKERS - jokers.value.earned.filter(e => e.kind === 'share').length)
  /** Done or skipped with a joker: what level unlocking looks at. */
  const clearedIds = computed(() => new Set([...completedIds.value, ...skippedIds.value]))

  const currentStreak = computed(() => streak(runs.value, today.value))

  const totalChecks = computed(() => runs.value.reduce((n, r) => n + r.days.filter(d => d.done).length, 0))

  /** First level with an uncompleted challenge — the book asks to finish a level before moving on. */
  const currentLevel = computed(() => {
    for (const l of LEVELS) {
      const ids = CHALLENGES.filter(c => c.level === l.n).map(c => c.id)
      if (ids.some(id => !clearedIds.value.has(id)))
        return l.n
    }
    return LEVELS.length
  })

  /** Book rule: a level opens once the previous one is finished. Future challenges stay readable. */
  function isLocked(c: Challenge): boolean {
    return !settings.value.unlockAll && c.level <= LEVELS.length && c.level > currentLevel.value && !clearedIds.value.has(c.id) && !runFor(c.id)
  }

  function challenge(id: string): Challenge | undefined {
    return allChallenges.value.find(c => c.id === id)
  }

  function runFor(challengeId: string): Run | undefined {
    return liveRuns.value.find(r => r.challengeId === challengeId)
  }

  function lastRun(challengeId: string): Run | undefined {
    return [...runs.value].reverse().find(r => r.challengeId === challengeId)
  }

  function levelDone(level: number): number {
    return CHALLENGES.filter(c => c.level === level && clearedIds.value.has(c.id)).length
  }

  function start(challengeId: string, startDate: ISODate): Run {
    const existing = runFor(challengeId)
    if (existing)
      return existing
    const run = newRun(challengeId, startDate)
    runs.value.push(run)
    return run
  }

  function replace(run: Run) {
    const i = runs.value.findIndex(r => r.id === run.id)
    if (i >= 0)
      runs.value.splice(i, 1, run)
  }

  function toggleDay(run: Run, idx: number, done: boolean, data?: Record<string, any>) {
    replace(setDay(run, idx, done, data))
  }

  function patchDay(run: Run, idx: number, data: Record<string, any>) {
    replace(patchDayData(run, idx, data))
  }

  function todayIndex(run: Run): number {
    return dayIndex(run, today.value)
  }

  function complete(run: Run) {
    if (!allChecked(run))
      return
    // Doing a challenge again earns a joker to skip one you don't like.
    const repeat = completedIds.value.has(run.challengeId) && !jokers.value.earned.some(e => e.ref === run.id)
    replace(completeRun(run))
    if (repeat)
      jokers.value.earned.push({ kind: 'repeat', at: Date.now(), ref: run.id })
    return repeat
  }

  function canUseJoker(c: Challenge): boolean {
    return c.source !== 'custom' && jokerBalance.value > 0 && !clearedIds.value.has(c.id) && !runFor(c.id) && !isLocked(c)
  }

  function useJoker(c: Challenge): boolean {
    if (!canUseJoker(c))
      return false
    jokers.value.used.push({ challengeId: c.id, at: Date.now() })
    return true
  }

  /** Returns false once the share cap is reached. */
  function earnShareJoker(): boolean {
    if (shareJokersLeft.value <= 0)
      return false
    jokers.value.earned.push({ kind: 'share', at: Date.now() })
    return true
  }

  function abandon(run: Run) {
    replace({ ...run, abandonedAt: Date.now() })
  }

  function addCustom(c: Omit<Challenge, 'id' | 'n' | 'source' | 'level'>) {
    const n = 100 + custom.value.length + 1
    const created: Challenge = { ...c, id: `custom-${Date.now().toString(36)}`, n, level: CUSTOM_LEVEL, source: 'custom' }
    custom.value.push(created)
    return created
  }

  function removeCustom(id: string) {
    custom.value = custom.value.filter(c => c.id !== id)
    runs.value = runs.value.filter(r => r.challengeId !== id)
  }

  function resetAll() {
    runs.value = []
    custom.value = []
    jokers.value = { earned: [], used: [] }
    settings.value = { ...DEFAULT_SETTINGS, onboarded: true }
  }

  async function load() {
    const data = await loadJSON<Persisted>(KEY, { version: 1, runs: [], custom: [], settings: { ...DEFAULT_SETTINGS } })
    runs.value = data.runs
    // Custom challenges used to sit on level 7, which is now a real level.
    custom.value = data.custom.map(c => ({ ...c, level: CUSTOM_LEVEL }))
    settings.value = { ...DEFAULT_SETTINGS, ...data.settings }
    // v2: the language follows the phone by default (was a fr/en switch).
    if (!data.settings?.i18nV2) {
      settings.value.locale = 'auto'
      settings.value.i18nV2 = true
    }
    jokers.value = { earned: [], used: [], ...data.jokers }
    ready.value = true
    setInterval(tick, 60_000)
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch([runs, custom, settings, jokers], () => {
    if (!ready.value)
      return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveJSON(KEY, { version: 1, runs: runs.value, custom: custom.value, settings: settings.value, jokers: jokers.value } satisfies Persisted)
    }, 250)
  }, { deep: true })

  function tick() {
    clock.value = Date.now()
  }

  return {
    runs,
    custom,
    settings,
    ready,
    today,
    locale,
    allChallenges,
    liveRuns,
    activeRuns,
    completedIds,
    clearedIds,
    skippedIds,
    jokers,
    jokerBalance,
    shareJokersLeft,
    canUseJoker,
    useJoker,
    earnShareJoker,
    currentStreak,
    totalChecks,
    currentLevel,
    isLocked,
    challenge,
    runFor,
    lastRun,
    levelDone,
    start,
    toggleDay,
    patchDay,
    todayIndex,
    complete,
    abandon,
    addCustom,
    removeCustom,
    resetAll,
    load,
    tick,
  }
})
