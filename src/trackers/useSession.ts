import type { TrackerProps } from './useDay'
import type { TimerState } from '~/composables/useTimer'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useTimer } from '~/composables/useTimer'
import { cancelTimerEnd, scheduleTimerEnd } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { endSessionActivity, startSessionActivity } from '~/services/widgets'
import { useQuest } from '~/stores/quest'
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
        const fr = useQuest().locale === 'fr'
        toast.info(fr ? 'Verrouillez le téléphone' : 'Lock your phone', { message: fr ? 'Le chrono reste sur l\'écran de verrouillage.' : 'The timer stays on your lock screen.', icon: 'lock.fill', duration: 4000 })
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

  watch(timer.progress, (p) => {
    if (p >= 1 && !completed) {
      completed = true
      sfx.play('bell')
      void endSessionActivity()
      void cancelTimerEnd(key)
      if (opts.autoCheck !== false)
        day.markDone()
      opts.onComplete?.()
    }
  })

  onBeforeUnmount(() => {
    if (opts.keepAwake)
      void KeepAwake.allowSleep().catch(() => {})
  })

  return { ...day, ...timer, start, pause, toggle }
}
