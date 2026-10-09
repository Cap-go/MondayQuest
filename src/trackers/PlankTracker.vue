<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// Hold the line: 30s on day one, +10s each day. The body line shakes as you tire.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { best: 0 })

const target = computed(() => 30 + props.idx * 10)
const record = computed(() => Math.max(0, ...props.run.days.map(d => Number(d.data?.best) || 0)))

const holding = ref(false)
const ms = ref(0)
const jitter = ref(0)
const wobble = ref(0)
let raf = 0
let t0 = 0
let lastBeat = 0
let last = { x: 0, y: 0, z: 0 }
let handle: PluginListenerHandle | undefined

const secs = computed(() => ms.value / 1000)
const progress = computed(() => Math.min(1, secs.value / target.value))
// Fatigue grows with time; real phone shake adds on top.
const amp = computed(() => (holding.value ? 0.4 + progress.value * 2.6 + jitter.value * 6 : 0))
const bodyPath = computed(() => {
  const a = amp.value
  const w = wobble.value
  const y = (i: number) => (Math.sin(w * 1.7 + i * 2.1) * a).toFixed(1)
  return `M44 ${92 + +y(0)} L110 ${80 + +y(1)} L176 ${70 + +y(2)} L230 ${64 + +y(3)}`
})

async function listen() {
  handle = await CapacitorAccelerometer.addListener('measurement', ({ x, y, z }) => {
    const d = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z)
    last = { x, y, z }
    jitter.value += (Math.min(1, d) - jitter.value) * 0.15
  }).catch(() => undefined)
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
}

function stopListening() {
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
  handle = undefined
  jitter.value = 0
}

function start() {
  if (!props.editable || holding.value)
    return
  holding.value = true
  ms.value = 0
  t0 = performance.now()
  lastBeat = 0
  sfx.play('whoosh', 0.6)
  haptic.thud()
  void KeepAwake.keepAwake().catch(() => {})
  void listen()
  const loop = (t: number) => {
    ms.value = t - t0
    wobble.value += 0.6 + progress.value * 0.9
    const tens = Math.floor(ms.value / 10_000)
    if (tens > lastBeat) {
      lastBeat = tens
      haptic.heartbeat()
      sfx.play('tick', 0.5)
    }
    if (secs.value >= target.value && !done.value) {
      sfx.play('bell')
      markDone({ best: Math.max(data.value.best, Math.floor(secs.value)) })
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function drop() {
  if (!holding.value)
    return
  cancelAnimationFrame(raf)
  holding.value = false
  stopListening()
  void KeepAwake.allowSleep().catch(() => {})
  const s = Math.floor(secs.value)
  haptic.thud()
  sfx.play(s >= target.value ? 'stamp' : 'erase')
  if (s > data.value.best)
    patch({ best: s })
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (holding.value)
    void KeepAwake.allowSleep().catch(() => {})
  stopListening()
})

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
</script>

<template>
  <div class="flex flex-col items-center">
    <p class="t-label text-graphite">
      {{ L('Objectif du jour', 'Today\'s target') }} · {{ fmt(target) }}
    </p>
    <p class="t-display text-6xl tabular-nums mt-1" :class="{ 'text-ice': holding && progress >= 1 }">
      {{ fmt(holding ? secs : data.best) }}
    </p>
    <svg viewBox="0 0 280 130" class="w-full max-w-[320px] mt-2" :class="{ shake: holding }">
      <line x1="10" y1="112" x2="270" y2="112" stroke="var(--color-rule)" stroke-width="2" />
      <!-- forearm + head -->
      <path d="M232 112 L232 84 M232 112 L262 112" stroke="var(--color-ink)" stroke-width="3" fill="none" stroke-linecap="square" />
      <circle cx="244" cy="50" r="11" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" />
      <!-- body line -->
      <path :d="bodyPath" stroke="var(--color-ink)" stroke-width="3.5" fill="none" stroke-linejoin="round" />
      <path d="M44 92 L30 112" stroke="var(--color-ink)" stroke-width="3" fill="none" />
      <!-- progress rule -->
      <line x1="10" y1="124" :x2="10 + 260 * (holding ? progress : Math.min(1, data.best / target))" y2="124" stroke="var(--color-ink)" stroke-width="3" class="bar" />
    </svg>
    <button
      class="btn mt-4 w-52 select-none" :class="holding ? '' : 'btn-ink'" :disabled="!editable"
      @click="holding ? drop() : start()"
    >
      {{ holding ? L('Je lâche', 'Drop') : done ? L('Encore une', 'Once more') : L('En position', 'Get in position') }}
    </button>
    <div class="flex gap-6 mt-4 t-label text-graphite">
      <span>{{ L('Aujourd\'hui', 'Today') }} {{ fmt(data.best) }}</span>
      <span>{{ L('Record', 'Best') }} {{ fmt(record) }}</span>
    </div>
    <p v-if="done && !holding" class="t-body text-xs text-pencil mt-2">
      {{ L('Tenu. Demain, 10 secondes de plus.', 'Held. Tomorrow, 10 more seconds.') }}
    </p>
  </div>
</template>

<style scoped>
.shake {
  animation: shake 180ms linear infinite;
}

@keyframes shake {
  50% {
    transform: translateX(0.6px);
  }
}

.bar {
  transition: x2 300ms var(--ease-spring);
}
</style>
