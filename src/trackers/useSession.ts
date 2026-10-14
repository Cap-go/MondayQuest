import type { TrackerProps } from './useDay'
import type { TimerState } from '~/composables/useTimer'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useTimer } from '~/composables/useTimer'
import { tr } from '~/i18n/translate'
import { cancelTimerEnd, scheduleTimerEnd } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { endSessionActivity, startSessionActivity } from '~/services/widgets'
import { useDay } from './useDay'

interface SessionOpts {
  targetMs: number
  /** Copy for the Live Activity / end notification. */
  title: () => string
  subtitle?: () => string
  short?: string
  doneBody?: () => string
  keepAwake?: boolean
  /** Auto-tick the day when the target is reached (default true). */
  autoCheck?: boolean
  onComplete?: () => void
  /** Suggest locking the phone once the Live Activity is up (off when the screen is needed). */
  lockHint?: boolean
  /** Stop the clock at the target (default true). Off when the tracker needs overtime (dance groove). */
  stopAtTarget?: boolean
}

/**
 * Timed challenge session: persisted stopwatch + lock-screen Live Activity +
 * a backup notification if the phone is locked when the time is up.
 */
export function useSession(props: TrackerProps, opts: SessionOpts) {
  const day = useDay(props, { elapsed: 0, startedAt: undefined as number | undefined })
  const key = `${props.run.id}-${props.idx}`

  const state = computed<TimerState>(() => ({ elapsed: day.data.value.elapsed ?? 0, startedAt: day.data.value.startedAt }))
  const timer = useTimer(state, s => day.patch({ elapsed: s.elapsed, startedAt: s.startedAt } as any), opts.targetMs)

  let completed = day.done.value

  let hinted = false

  async function start() {
    if (!props.editable)
      return
    timer.start()
    sfx.play('chime', 0.7)
    if (opts.keepAwake)
      await KeepAwake.keepAwake().catch(() => {})
    const remaining = Math.max(0, opts.targetMs - timer.elapsed.value)
    void startSessionActivity({
      title: opts.title(),
      subtitle: opts.subtitle?.() ?? '',
      short: opts.short ?? '•',
      icon: props.challenge.icon,
      durationMs: remaining,
      startedAt: Date.now(),
    }).then((live) => {
      if (live && opts.lockHint !== false && !hinted) {
        hinted = true
        toast.info(tr('Lock your phone'), { message: tr('The timer stays on your lock screen.'), icon: 'lock.fill', duration: 4000 })
      }
    })
    if (remaining > 0)
      void scheduleTimerEnd(key, opts.title(), opts.doneBody?.() ?? '✓', remaining)
  }

  async function pause() {
    timer.pause()
    sfx.play('tick')
    void cancelTimerEnd(key)
    void endSessionActivity()
    if (opts.keepAwake)
      await KeepAwake.allowSleep().catch(() => {})
  }

  function toggle() {
    timer.running.value ? void pause() : void start()
  }

  // Immediate: a session that ran out while the tracker was closed (app killed, other tab)
  // is settled as soon as it mounts, not on a tick that never comes.
  watch(timer.progress, (p) => {
    if (p < 1)
      return
    // Target reached: stop the clock so the screen can sleep and pedometers stop with `running`.
    if (opts.stopAtTarget !== false && timer.running.value) {
      day.patch({ elapsed: opts.targetMs, startedAt: undefined } as any)
      if (opts.keepAwake)
        void KeepAwake.allowSleep().catch(() => {})
    }
    if (completed)
      return
    completed = true
    sfx.play('bell')
    void endSessionActivity()
    void cancelTimerEnd(key)
    if (opts.autoCheck !== false)
      day.markDone()
    opts.onComplete?.()
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (opts.keepAwake)
      void KeepAwake.allowSleep().catch(() => {})
  })

  return { ...day, ...timer, start, pause, toggle }
}
