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
import { CLOUD_TIMEOUT, onCloudChange, readCloud, reattachLocal, writeCloud } from '~/services/cloud'

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
  /** Earned by sharing the app with a friend, at most once per calendar month. ('repeat' entries are legacy and no longer count.) */
  earned: { kind: 'share' | 'repeat', at: number, ref?: string }[]
  /** A joker clears a challenge you don't want to do: it counts for unlocking the next level. */
  used: { challengeId: string, at: number }[]
}

/** Jokers are earned, never given: one per month for sharing Monday Quest with someone. */
export const STARTING_JOKERS = 0

/** Local calendar month (YYYY-MM): the share joker resets at local midnight on the 1st, not UTC. */
function monthOf(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Persisted {
  version: 1
  runs: Run[]
  custom: Challenge[]
  settings: Settings
  jokers?: Jokers
  /** Last local change, used to pick the newest copy between this phone and iCloud. */
  savedAt?: number
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
  const shareEarns = computed(() => jokers.value.earned.filter(e => e.kind === 'share'))
  const jokerBalance = computed(() => Math.max(0, STARTING_JOKERS + shareEarns.value.length - jokers.value.used.length))
  const skippedIds = computed(() => new Set(jokers.value.used.map(u => u.challengeId)))
  /** Can sharing earn a joker right now (none earned yet this month)? */
  const canEarnShareJoker = computed(() => !shareEarns.value.some(e => monthOf(e.at) === monthOf(clock.value)))
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

  /**
   * Callers often hold a snapshot (a tracker's props.run is only refreshed on the next render),
   * so every mutation starts from the stored copy: two writes in one handler both land.
   */
  function latest(run: Run): Run | undefined {
    return runs.value.find(r => r.id === run.id)
  }

  function toggleDay(run: Run, idx: number, done: boolean, data?: Record<string, any>) {
    const cur = latest(run)
    if (cur)
      replace(setDay(cur, idx, done, data))
  }

  function patchDay(run: Run, idx: number, data: Record<string, any>) {
    const cur = latest(run)
    if (cur)
      replace(patchDayData(cur, idx, data))
  }

  function todayIndex(run: Run): number {
    return dayIndex(run, today.value)
  }

  function complete(run: Run) {
    const cur = latest(run)
    if (!cur || !allChecked(cur))
      return
    replace(completeRun(cur))
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

  /** Returns false when a joker was already earned by sharing this month. */
  function earnShareJoker(): boolean {
    if (!canEarnShareJoker.value)
      return false
    jokers.value.earned.push({ kind: 'share', at: Date.now() })
    return true
  }

  function abandon(run: Run) {
    const cur = latest(run)
    if (cur)
      replace({ ...cur, abandonedAt: Date.now() })
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

  /** Last change written by this device (or adopted from the cloud). */
  let savedAt = 0
  /** What was last saved or adopted: opening the app or applying another device's copy is not a change. */
  let lastContent = ''
  const content = () => JSON.stringify([runs.value, custom.value, settings.value, jokers.value])

  function apply(data: Persisted) {
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
    savedAt = data.savedAt ?? 0
    lastContent = content()
  }

  function snapshot(): Persisted {
    return { version: 1, runs: runs.value, custom: custom.value, settings: settings.value, jokers: jokers.value, savedAt }
  }

  /** Take the iCloud copy when another device saved after this one (new phone, reinstall, iPad). */
  /** Set when iCloud was too slow to answer: its copy may be newer, so don't back this phone up over it. */
  let cloudUnknown = false

  async function pullCloud(local: Persisted): Promise<Persisted> {
    const cloud = await readCloud<Persisted>()
    cloudUnknown = cloud === CLOUD_TIMEOUT
    if (cloud === CLOUD_TIMEOUT || !cloud?.runs || (cloud.savedAt ?? 0) <= (local.savedAt ?? 0))
      return local
    return reattachLocal(cloud, local)
  }

  async function load() {
    const local = await loadJSON<Persisted>(KEY, { version: 1, runs: [], custom: [], settings: { ...DEFAULT_SETTINGS } })
    const data = await pullCloud(local)
    apply(data)
    if (data !== local) {
      void saveJSON(KEY, snapshot())
    }
    else if (!cloudUnknown && (runs.value.length || settings.value.onboarded)) {
      // This phone is the newest copy (or progress from before iCloud sync): back it up now.
      savedAt ||= 1
      void writeCloud(snapshot())
    }
    ready.value = true
    setInterval(tick, 60_000)
    onCloudChange(async () => {
      // An edit still inside the save debounce is the newest copy: stamp and write it before comparing.
      flushSave()
      const next = await pullCloud(snapshot())
      // A local edit made while iCloud was being read wins too (it saves with a later stamp).
      if (content() !== lastContent)
        return
      if (next.savedAt !== savedAt) {
        apply(next)
        void saveJSON(KEY, snapshot())
      }
    })
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  function persist() {
    saveTimer = undefined
    const c = content()
    if (c === lastContent)
      return
    lastContent = c
    savedAt = Date.now()
    const state = snapshot()
    void saveJSON(KEY, state satisfies Persisted)
    void writeCloud(state)
  }

  /** Write a pending debounced save right now. */
  function flushSave() {
    if (saveTimer === undefined)
      return
    clearTimeout(saveTimer)
    persist()
  }

  watch([runs, custom, settings, jokers], () => {
    if (!ready.value)
      return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 250)
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
    canEarnShareJoker,
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
