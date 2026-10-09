import type { Challenge } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { computed } from 'vue'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

export interface TrackerProps {
  run: Run
  challenge: Challenge
  idx: number
  editable: boolean
  isToday: boolean
}

export function useDay<T extends Record<string, any>>(props: TrackerProps, defaults: T) {
  const quest = useQuest()
  const entry = computed(() => props.run.days[props.idx]!)
  const data = computed<T>(() => ({ ...defaults, ...entry.value.data }) as T)
  const done = computed(() => entry.value.done)

  function patch(d: Partial<T>) {
    if (!props.editable)
      return
    quest.patchDay(props.run, props.idx, d)
  }

  /** Tick the day with the full ink-check feedback. */
  function markDone(d?: Partial<T>) {
    if (!props.editable)
      return
    if (!done.value) {
      sfx.play('check')
      void haptic.check()
    }
    quest.toggleDay(props.run, props.idx, true, d)
  }

  function unmark() {
    if (!props.editable)
      return
    quest.toggleDay(props.run, props.idx, false)
  }

  return { entry, data, done, patch, markDone, unmark }
}
