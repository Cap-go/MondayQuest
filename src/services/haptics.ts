import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

let enabled = true

export function setHapticsEnabled(v: boolean) {
  enabled = v
}

function safe(fn: () => Promise<unknown>) {
  if (!enabled)
    return
  fn().catch(() => {})
}

export const haptic = {
  tap: () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  press: () => safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  thud: () => safe(() => Haptics.impact({ style: ImpactStyle.Heavy })),
  select: () => safe(() => Haptics.selectionChanged()),
  success: () => safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  error: () => safe(() => Haptics.notification({ type: NotificationType.Error })),
  buzz: (ms = 300) => safe(() => Haptics.vibrate({ duration: ms })),
  /** Hand-written check: a short scratch followed by a firmer landing. */
  async check() {
    if (!enabled)
      return
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}), 110)
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 260)
  },
  /** Shivering pattern for the cold shower. */
  shiver(times = 6) {
    if (!enabled)
      return
    for (let i = 0; i < times; i++)
      setTimeout(() => Haptics.impact({ style: i % 2 ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => {}), i * 70)
  },
  /** Heartbeat-like double pulse used for breathing / holds. */
  heartbeat() {
    if (!enabled)
      return
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}), 160)
  },
}
