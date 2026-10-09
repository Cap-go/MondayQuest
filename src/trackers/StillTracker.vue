<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
// 5 minutes on day one, one more every day, 11 on day seven.
const MIN = 5 + props.idx
const GOAL = MIN * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  keepAwake: true,
  title: () => L('DEAD CALM'),
  subtitle: () => L(`Do nothing · ${MIN} min`),
  short: '~',
  doneBody: () => L(`${MIN} minutes of nothing. Well done.`),
  onComplete: () => {
    disarm()
    haptic.success()
  },
})
const { running, elapsed, progress, done } = s

const armed = ref(false)
const motion = ref(0) // smoothed agitation, 0 calm → 1 shaking
const flat = ref(false)
const resets = ref(0)
let sensorless = false
let samples = 0
let calmSince = 0
let last: { x: number, y: number, z: number } | undefined
let handle: PluginListenerHandle | undefined
let probe: ReturnType<typeof setTimeout> | undefined

function onSample(m: { x: number, y: number, z: number }) {
  samples++
  const d = last ? Math.abs(m.x - last.x) + Math.abs(m.y - last.y) + Math.abs(m.z - last.z) : 0
  last = m
  motion.value += (Math.min(1, d * 6) - motion.value) * 0.15
  flat.value = Math.abs(m.z) > 0.85
  evaluate()
}

function evaluate() {
  if (!armed.value || done.value)
    return
  const calm = sensorless || (flat.value && motion.value < 0.15)
  if (calm) {
    calmSince ||= Date.now()
    if (!running.value && Date.now() - calmSince > 1500)
      void s.start()
    return
  }
  calmSince = 0
  if (running.value) {
    void s.pause()
    s.reset()
    resets.value++
    haptic.buzz(70)
    sfx.play('erase', 0.4)
  }
}

async function arm() {
  if (!props.editable || done.value || armed.value)
    return
  armed.value = true
  samples = 0
  haptic.press()
  handle = await CapacitorAccelerometer.addListener('measurement', onSample).catch(() => undefined)
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
  probe = setTimeout(() => {
    sensorless = samples === 0
    evaluate()
  }, 1500)
}

function disarm() {
  armed.value = false
  clearTimeout(probe)
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
  handle = undefined
}

async function stop() {
  disarm()
  await s.pause()
}

onMounted(() => {
  if (running.value && !done.value)
    void arm()
})
onBeforeUnmount(disarm)

// Ripples: loud while you move, settling to a mirror when you are still.
const agitation = computed(() => (done.value ? 0 : armed.value ? motion.value : 0.35))
const hint = computed(() => {
  if (done.value)
    return L('Dead calm. Nothing at all.')
  if (!armed.value)
    return elapsed.value ? L('Paused') : L('Ready to do nothing?')
  if (!sensorless && !flat.value)
    return L('Lay the phone face down')
  return running.value ? L('Stay still…') : L('The water settles…')
})
</script>

<template>
  <div class="flex flex-col items-center">
    <svg viewBox="0 0 300 150" class="w-full max-w-[320px]">
      <defs>
        <clipPath id="still-pond"><ellipse cx="150" cy="80" rx="128" ry="52" /></clipPath>
      </defs>
      <ellipse cx="150" cy="80" rx="128" ry="52" fill="var(--color-ice)" :fill-opacity="0.25 + progress * 0.45" />
      <g clip-path="url(#still-pond)">
        <ellipse
          v-for="i in 4" :key="i" class="ring" cx="150" cy="80" :rx="28 * i" :ry="11 * i"
          fill="none" stroke="var(--color-ink)" stroke-width="1.5"
          :style="{ opacity: agitation * (1 - i * 0.18), animationDuration: `${2.4 - agitation * 1.6}s`, animationDelay: `${i * -0.5}s` }"
        />
        <line x1="40" x2="260" y1="80" y2="80" stroke="var(--color-ink)" stroke-width="1.5" :style="{ opacity: 1 - agitation }" class="mirror" />
        <circle cx="210" cy="56" r="7" fill="var(--color-sun)" :style="{ opacity: done ? 1 : 0.15 + progress * 0.6 }" />
      </g>
      <ellipse cx="150" cy="80" rx="128" ry="52" fill="none" stroke="var(--color-ink)" stroke-width="3" />
      <path d="M48 46 v-30 M56 50 v-38 M64 52 v-22" stroke="var(--color-ink)" stroke-width="2" stroke-linecap="square" />
      <path d="M236 108 v-28 M244 106 v-36" stroke="var(--color-ink)" stroke-width="2" />
      <rect x="20" y="140" width="260" height="4" fill="none" stroke="var(--color-rule)" stroke-width="1.5" />
      <rect x="20" y="140" :width="260 * progress" height="4" fill="var(--color-ink)" />
    </svg>
    <p class="t-display text-4xl tabular-nums mt-2">
      {{ formatClock(Math.max(0, GOAL - elapsed)) }}
    </p>
    <p class="t-label text-pencil">
      {{ L('Today') }} · {{ MIN }} min
    </p>
    <p class="t-label text-graphite mt-1">
      {{ hint }}
    </p>
    <p v-if="resets && !done" class="t-body text-xs text-pencil mt-1">
      {{ L(`Started over ${resets}×`) }}
    </p>
    <button v-if="!done" class="btn btn-ink mt-4 w-52" :disabled="!editable" @click="armed ? stop() : arm()">
      {{ armed ? L('Stop') : elapsed ? L('Resume') : L('Do nothing') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 text-center px-4">
      {{ done ? L(`${MIN} minutes of nothing, box ticked.`) : L('The clock only runs while the phone lies still, face down.') }}
    </p>
  </div>
</template>

<style scoped>
.ring {
  transform-origin: 150px 80px;
  animation: spread linear infinite;
  transition: opacity 900ms ease;
}

.mirror {
  transition: opacity 1200ms ease;
}

@keyframes spread {
  from {
    transform: scale(0.6);
  }
  to {
    transform: scale(1.25);
  }
}
</style>
