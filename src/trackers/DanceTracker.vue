<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'
import { useSession } from './useSession'

// One full song: 3 minutes, and at least 2 of them actually moving.
const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 3 * 60_000
const NEED = 2 * 60_000

const s = useSession(props, {
  lockHint: false,
  targetMs: GOAL,
  autoCheck: false,
  // The song can run over while the groove catches up: the tracker stops the clock itself.
  stopAtTarget: false,
  keepAwake: true,
  title: () => L('DANCE FLOOR'),
  subtitle: () => L('One full song'),
  short: '♫',
  doneBody: () => L('Song over! Come back to tick it.'),
})
// The dancer moves at 2 beats per second: needs the per-frame clock.
s.smooth.value = true
const { running, elapsed, done, start, pause } = s
const extra = useDay(props, { groove: 0 })
const groove = ref<number>(extra.data.value.groove)

// Movement energy: how far the acceleration strays from plain gravity.
const energy = ref(0)
let sensed = false
let handle: PluginListenerHandle | undefined
let unmounted = false
onMounted(async () => {
  handle = await CapacitorAccelerometer.addListener('measurement', ({ x, y, z }) => {
    sensed = true
    const e = Math.abs(Math.hypot(x, y, z) - 1)
    energy.value += (Math.min(1, e / 0.6) - energy.value) * 0.15
  }).catch(() => undefined)
  // Left before the listener was ready: don't start a sensor nobody will stop.
  if (unmounted)
    return void handle?.remove()
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
  if (unmounted)
    void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
})

const moving = computed(() => !sensed || energy.value > 0.18)
const nudge = ref(false)
let last = 0
let still = 0
let saved = 0
let lastNudge = 0
watch(elapsed, (t) => {
  if (!running.value || done.value) {
    last = t
    return
  }
  const dt = Math.max(0, Math.min(500, t - last))
  last = t
  if (moving.value) {
    groove.value += dt
    still = 0
    nudge.value = false
  }
  else {
    still += dt
    if (still > 4000 && t - lastNudge > 6000) {
      lastNudge = t
      nudge.value = true
      haptic.buzz(80)
      sfx.play('pop', 0.5)
    }
  }
  if (groove.value - saved > 2000) {
    saved = groove.value
    extra.patch({ groove: groove.value })
  }
  if (t >= GOAL && groove.value >= NEED) {
    void pause()
    extra.markDone({ groove: groove.value })
    haptic.success()
  }
})

onBeforeUnmount(() => {
  unmounted = true
  if (running.value)
    extra.patch({ groove: groove.value })
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
})

function go() {
  if (running.value) {
    extra.patch({ groove: groove.value })
    void pause()
  }
  else {
    sfx.play('whoosh')
    haptic.press()
    void start()
  }
}

// The stick figure bounces harder the more you move.
const amp = computed(() => (running.value ? (sensed ? energy.value : 0.6) : done.value ? 0.3 : 0))
const ph = computed(() => (elapsed.value / 1000) * Math.PI * 2 * 2)
const bob = computed(() => Math.abs(Math.sin(ph.value)) * -10 * amp.value)
const armL = computed(() => -30 - Math.sin(ph.value) * 70 * amp.value)
const armR = computed(() => 30 + Math.cos(ph.value) * 70 * amp.value)
const legL = computed(() => Math.sin(ph.value) * 20 * amp.value)
const legR = computed(() => -Math.sin(ph.value) * 20 * amp.value)
const grooveP = computed(() => Math.min(1, groove.value / NEED))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="flex items-end gap-4">
      <svg viewBox="0 0 120 150" class="w-32" :class="{ shake: nudge }">
        <line x1="6" y1="146" x2="114" y2="146" stroke="var(--color-rule)" stroke-width="3" />
        <g :transform="`translate(0 ${bob})`" stroke="var(--color-ink)" stroke-width="3.5" stroke-linecap="round" fill="none">
          <circle cx="60" cy="24" r="12" fill="var(--color-sheet)" />
          <line x1="60" y1="36" x2="60" y2="88" />
          <line x1="60" y1="48" x2="60" y2="80" :transform="`rotate(${armL} 60 48)`" />
          <line x1="60" y1="48" x2="60" y2="80" :transform="`rotate(${armR} 60 48)`" />
          <line x1="60" y1="88" x2="60" y2="140" :transform="`rotate(${20 + legL} 60 88)`" />
          <line x1="60" y1="88" x2="60" y2="140" :transform="`rotate(${-20 + legR} 60 88)`" />
        </g>
      </svg>
      <div class="meter" :aria-label="L('Groove')">
        <div class="fill" :style="{ height: `${(running ? amp : 0) * 100}%` }" />
      </div>
    </div>

    <p class="t-display text-4xl tabular-nums mt-3">
      {{ formatClock(Math.max(0, GOAL - elapsed)) }}
    </p>
    <p class="t-label mt-1" :class="nudge ? 'text-ink' : 'text-graphite'">
      {{ done ? L('You danced') : nudge ? L('Move! Sitting doesn\'t count') : running ? L('Dance, phone in your pocket') : L('One song, three minutes') }}
    </p>

    <div class="w-full max-w-72 mt-4">
      <div class="flex justify-between t-label text-graphite">
        <span>{{ L('Time moving') }}</span>
        <span class="tabular-nums">{{ formatClock(Math.min(groove, NEED)) }} / 2:00</span>
      </div>
      <div class="bar mt-1">
        <div class="bar-fill" :style="{ width: `${grooveP * 100}%` }" />
      </div>
    </div>

    <button class="btn btn-ink mt-5 w-48" :disabled="!editable || done" @click="go">
      {{ done ? L('Danced ✓') : running ? L('Pause') : elapsed ? L('Resume') : L('Drop the beat') }}
    </button>
    <p v-if="elapsed >= GOAL && !done" class="t-body text-xs text-graphite mt-2 text-center">
      {{ L('The song is over but you need more movement. A bit more!') }}
    </p>
  </div>
</template>

<style scoped>
.meter {
  position: relative;
  width: 16px;
  height: 120px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  margin-bottom: 4px;
}

.fill {
  position: absolute;
  inset: auto 0 0;
  background: var(--color-sun);
  transition: height 120ms linear;
}

.bar {
  height: 14px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
}

.bar-fill {
  height: 100%;
  background: var(--color-ink);
  transition: width 400ms var(--ease-out-quint);
}

.shake {
  animation: shake 400ms ease-in-out;
}

@keyframes shake {
  25% {
    transform: translateX(-6px) rotate(-3deg);
  }
  75% {
    transform: translateX(6px) rotate(3deg);
  }
}
</style>
