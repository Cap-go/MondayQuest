import type { TrackerProps } from '../src/trackers/useDay'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useQuest } from '../src/stores/quest'
import { useDay } from '../src/trackers/useDay'
import { useSession } from '../src/trackers/useSession'

vi.mock('~/services/cloud', () => ({
  onCloudChange: vi.fn(),
  readCloud: vi.fn(async () => null),
  reattachLocal: (c: unknown) => c,
  writeCloud: vi.fn(async () => {}),
}))
vi.mock('~/lib/storage', () => ({ loadJSON: vi.fn(async (_k: string, f: unknown) => f), saveJSON: vi.fn(async () => {}) }))
vi.mock('~/services/sound', () => ({ sfx: { play: vi.fn() }, suspendSounds: vi.fn() }))
vi.mock('~/services/haptics', () => ({ haptic: new Proxy({}, { get: () => vi.fn(async () => {}) }) }))
vi.mock('~/services/notifications', () => ({ scheduleTimerEnd: vi.fn(async () => {}), cancelTimerEnd: vi.fn(async () => {}) }))
vi.mock('~/services/widgets', () => ({ startSessionActivity: vi.fn(async () => false), endSessionActivity: vi.fn(async () => {}) }))
vi.mock('@capgo/capacitor-keep-awake', () => ({ KeepAwake: { keepAwake: vi.fn(async () => {}), allowSleep: vi.fn(async () => {}) } }))
vi.mock('@capgo/capacitor-pretty-toast', () => ({ toast: { info: vi.fn() } }))

function setup() {
  const quest = useQuest()
  const run = quest.start('walk', '2026-10-12')
  const props: TrackerProps = { run, challenge: quest.challenge('walk')!, idx: 0, editable: true, isToday: true }
  return { quest, run, props }
}

describe('quest store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps both of two writes made from the same stale run', () => {
    const { quest, run } = setup()
    quest.patchDay(run, 0, { lunch: true })
    quest.patchDay(run, 0, { dinner: true })
    quest.toggleDay(run, 1, true)
    const day = quest.runs[0]!.days
    expect(day[0]!.data).toEqual({ lunch: true, dinner: true })
    expect(day[1]!.done).toBe(true)
  })

  it('useDay reads its own write in the same handler (meals: second meal ticks the day)', () => {
    const { quest, props } = setup()
    const day = useDay(props, { lunch: false, dinner: false })
    day.patch({ lunch: true })
    day.patch({ dinner: true })
    expect(day.data.value).toMatchObject({ lunch: true, dinner: true })
    day.markDone()
    expect(quest.runs[0]!.days[0]).toMatchObject({ done: true, data: { lunch: true, dinner: true } })
  })
})

describe('useSession', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ticks and stops a session that ran out while the tracker was closed', () => {
    const { quest, run, props } = setup()
    const target = 30 * 60_000
    quest.patchDay(run, 0, { elapsed: 0, startedAt: Date.now() - target - 5_000 })
    mount(defineComponent({
      setup() {
        useSession(props, { targetMs: target, title: () => 'WALK' })
        return () => h('div')
      },
    }))
    expect(quest.runs[0]!.days[0]).toMatchObject({ done: true, data: { elapsed: target, startedAt: undefined } })
  })
})
