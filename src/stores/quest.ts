import type { Challenge, Locale } from '~/data/challenges'
import type { ISODate } from '~/lib/date'
import type { Run } from '~/lib/progress'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { CHALLENGES, LEVELS } from '~/data/challenges'
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
  hardcore: boolean
  onboarded: boolean
  privacy: boolean
  /** Debug menu unlocked (TestFlight, or 7 taps on the version box). */
  debug: boolean
  /** Debug: every level open. */
  unlockAll: boolean
}

interface Persisted {
  version: 1
  runs: Run[]
  custom: Challenge[]
  settings: Settings
}

const KEY = 'mq.state.v1'

export const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  sound: true,
  haptics: true,
  reminder: '09:00',
  evening: '21:30',
  wakeAlarm: '05:45',
  hardcore: false,
  onboarded: false,
  privacy: false,
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

  const locale = computed<Locale>(() => {
    if (settings.value.locale !== 'auto')
      return settings.value.locale
    return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  })

  const liveRuns = computed(() => runs.value.filter(r => isLive(r, today.value)))

  const activeRuns = computed(() => liveRuns.value.filter(r => runStatus(r, today.value) !== 'upcoming'))

  const completedIds = computed(() => new Set(runs.value.filter(r => r.completedAt).map(r => r.challengeId)))

  const currentStreak = computed(() => streak(runs.value, today.value))

  const totalChecks = computed(() => runs.value.reduce((n, r) => n + r.days.filter(d => d.done).length, 0))

  /** First level with an uncompleted challenge — the book asks to finish a level before moving on. */
  const currentLevel = computed(() => {
    for (const l of LEVELS) {
      const ids = CHALLENGES.filter(c => c.level === l.n).map(c => c.id)
      if (ids.some(id => !completedIds.value.has(id)))
        return l.n
    }
    return LEVELS.length
  })

  /** Book rule: a level opens once the previous one is finished. Future challenges stay readable. */
  function isLocked(c: Challenge): boolean {
    return !settings.value.unlockAll && c.level <= LEVELS.length && c.level > currentLevel.value && !completedIds.value.has(c.id) && !runFor(c.id)
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
    return CHALLENGES.filter(c => c.level === level && completedIds.value.has(c.id)).length
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
    if (allChecked(run))
      replace(completeRun(run))
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
    settings.value = { ...DEFAULT_SETTINGS, onboarded: true }
  }

  async function load() {
    const data = await loadJSON<Persisted>(KEY, { version: 1, runs: [], custom: [], settings: { ...DEFAULT_SETTINGS } })
    runs.value = data.runs
    // Custom challenges used to sit on level 7, which is now a real level.
    custom.value = data.custom.map(c => ({ ...c, level: CUSTOM_LEVEL }))
    settings.value = { ...DEFAULT_SETTINGS, ...data.settings }
    ready.value = true
    setInterval(tick, 60_000)
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch([runs, custom, settings], () => {
    if (!ready.value)
      return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveJSON(KEY, { version: 1, runs: runs.value, custom: custom.value, settings: settings.value } satisfies Persisted)
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
