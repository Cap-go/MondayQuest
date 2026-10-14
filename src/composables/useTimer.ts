import type { Ref } from 'vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

export interface TimerState {
  /** Accumulated ms before the current running segment. */
  elapsed: number
  /** epoch ms when the current segment started, undefined when paused. */
  startedAt?: number
}

/** Clock resolution: enough for a m:ss readout and for TimerRing's 300ms CSS transition to glide between steps. */
const TICK_MS = 250

/**
 * A stopwatch whose state lives in the day entry so it survives app kills and
 * keeps counting while the phone is locked.
 *
 * `now` only moves every TICK_MS so timed trackers re-render 4 times a second, not 60.
 * Set `smooth` (option or returned ref) when a tracker animates straight from `elapsed`
 * (a figure dancing to the beat) and needs a value every frame.
 */
export function useTimer(state: Ref<TimerState>, save: (s: TimerState) => void, targetMs?: number, opts: { smooth?: boolean } = {}) {
  const now = ref(Date.now())
  const smooth = ref(!!opts.smooth)
  let raf = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const running = computed(() => state.value.startedAt != null)
  const elapsed = computed(() => state.value.elapsed + (state.value.startedAt ? now.value - state.value.startedAt : 0))
  const progress = computed(() => (targetMs ? Math.min(1, elapsed.value / targetMs) : 0))
  const remaining = computed(() => (targetMs ? Math.max(0, targetMs - elapsed.value) : 0))

  function stop() {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
  }

  function loop() {
    now.value = Date.now()
    if (smooth.value) {
      raf = requestAnimationFrame(loop)
      return
    }
    // Land on the next TICK_MS step of the elapsed time, so second readouts flip on time.
    const startedAt = state.value.startedAt ?? now.value
    const into = (((state.value.elapsed + now.value - startedAt) % TICK_MS) + TICK_MS) % TICK_MS
    timer = setTimeout(loop, TICK_MS - into)
  }

  watch([running, smooth], ([r]) => {
    stop()
    if (r)
      loop()
  }, { immediate: true })

  onBeforeUnmount(stop)

  function start() {
    if (running.value)
      return
    now.value = Date.now()
    save({ elapsed: state.value.elapsed, startedAt: Date.now() })
  }

  function pause() {
    if (!running.value)
      return
    now.value = Date.now()
    save({ elapsed: elapsed.value, startedAt: undefined })
  }

  function reset() {
    save({ elapsed: 0, startedAt: undefined })
  }

  function toggle() {
    running.value ? pause() : start()
  }

  return { running, elapsed, progress, remaining, smooth, start, pause, reset, toggle }
}
