import type { Ref } from 'vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

export interface TimerState {
  /** Accumulated ms before the current running segment. */
  elapsed: number
  /** epoch ms when the current segment started, undefined when paused. */
  startedAt?: number
}

/**
 * A stopwatch whose state lives in the day entry so it survives app kills and
 * keeps counting while the phone is locked.
 */
export function useTimer(state: Ref<TimerState>, save: (s: TimerState) => void, targetMs?: number) {
  const now = ref(Date.now())
  let raf = 0

  const running = computed(() => state.value.startedAt != null)
  const elapsed = computed(() => state.value.elapsed + (state.value.startedAt ? now.value - state.value.startedAt : 0))
  const progress = computed(() => (targetMs ? Math.min(1, elapsed.value / targetMs) : 0))
  const remaining = computed(() => (targetMs ? Math.max(0, targetMs - elapsed.value) : 0))

  function loop() {
    now.value = Date.now()
    raf = requestAnimationFrame(loop)
  }

  watch(running, (r) => {
    cancelAnimationFrame(raf)
    if (r)
      loop()
  }, { immediate: true })

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  function start() {
    if (running.value)
      return
    now.value = Date.now()
    save({ elapsed: state.value.elapsed, startedAt: Date.now() })
  }

  function pause() {
    if (!running.value)
      return
    save({ elapsed: elapsed.value, startedAt: undefined })
  }

  function reset() {
    save({ elapsed: 0, startedAt: undefined })
  }

  function toggle() {
    running.value ? pause() : start()
  }

  return { running, elapsed, progress, remaining, start, pause, reset, toggle }
}
