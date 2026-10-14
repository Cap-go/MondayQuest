<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
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
/** 5-second get-ready countdown before the clock starts (time to put the phone down). */
const ready = ref(0)
let readyTimer: ReturnType<typeof setInterval> | undefined
let spoken = new Set<string>()
/** Whole seconds: the only part of the clock the template shows, so the tracker re-renders once a second. */
const sec = ref(0)
let ms = 0
let jitter = 0
let wobble = 0
let raf = 0
let t0 = 0
let lastBeat = 0
let last = { x: 0, y: 0, z: 0 }
let handle: PluginListenerHandle | undefined
let alive = true
const body = ref<SVGPathElement>()
const ring = ref<SVGCircleElement>()

const progress = computed(() => Math.min(1, sec.value / target.value))
const C = 2 * Math.PI * 120
const REST_PATH = 'M44 92 L110 80 L176 70 L230 64'
// Fatigue grows with time; real phone shake adds on top. Written straight to the DOM every frame.
function bodyPath(p: number) {
  const a = 0.4 + p * 2.6 + jitter * 6
  const y = (i: number) => (Math.sin(wobble * 1.7 + i * 2.1) * a).toFixed(1)
  return `M44 ${92 + +y(0)} L110 ${80 + +y(1)} L176 ${70 + +y(2)} L230 ${64 + +y(3)}`
}

async function listen() {
  const h = await CapacitorAccelerometer.addListener('measurement', ({ x, y, z }) => {
    const d = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z)
    last = { x, y, z }
    jitter += (Math.min(1, d) - jitter) * 0.15
  }).catch(() => undefined)
  // Dropped or left the page while the plugin was answering: do not leave a sensor running.
  if (!alive || !holding.value) {
    void h?.remove()
    return
  }
  handle = h
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
  if (!alive || !holding.value)
    stopListening()
}

function stopListening() {
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
  handle = undefined
  jitter = 0
}

function say(text: string) {
  void SpeechSynthesis.speak({ text, language: L.tag(), rate: 1, queueStrategy: 'Flush' }).catch(() => {})
}

/** Voice + haptic coaching so you never have to look at the phone. */
function coach() {
  const left = Math.ceil(target.value - ms / 1000)
  const cue = (key: string, text: string) => {
    if (spoken.has(key))
      return
    spoken.add(key)
    say(text)
  }
  if (left === Math.ceil(target.value / 2) && target.value >= 40)
    cue('half', L('Halfway'))
  if (left === 10 && target.value > 15)
    cue('10', L('Ten seconds'))
  if (left <= 5 && left >= 1) {
    if (!spoken.has(`n${left}`))
      haptic.press()
    cue(`n${left}`, String(left))
  }
  if (left <= 0)
    cue('done', L('Done! Keep going if you can.'))
}

function getReady() {
  if (!props.editable || holding.value || ready.value)
    return
  spoken = new Set()
  ready.value = 5
  haptic.press()
  void KeepAwake.keepAwake().catch(() => {})
  say(L('Get in position'))
  readyTimer = setInterval(() => {
    ready.value--
    if (ready.value > 0) {
      haptic.tap()
      sfx.play('tick', 0.6)
      if (ready.value <= 3)
        say(String(ready.value))
      return
    }
    clearInterval(readyTimer)
    say(L('Go'))
    start()
  }, 1000)
}

function start() {
  if (!props.editable || holding.value)
    return
  holding.value = true
  ms = 0
  sec.value = 0
  wobble = 0
  t0 = performance.now()
  lastBeat = 0
  sfx.play('whoosh', 0.6)
  haptic.thud()
  void KeepAwake.keepAwake().catch(() => {})
  void listen()
  const loop = (t: number) => {
    ms = t - t0
    const s = Math.floor(ms / 1000)
    if (s !== sec.value)
      sec.value = s
    const p = Math.min(1, ms / 1000 / target.value)
    wobble += 0.6 + p * 0.9
    body.value?.setAttribute('d', bodyPath(p))
    ring.value?.setAttribute('stroke-dashoffset', String(C * (1 - p)))
    const tens = Math.floor(ms / 10_000)
    if (tens > lastBeat) {
      lastBeat = tens
      haptic.heartbeat()
      sfx.play('tick', 0.5)
    }
    coach()
    if (ms / 1000 >= target.value && !done.value) {
      sfx.play('bell')
      markDone({ best: Math.max(data.value.best, s) })
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function drop() {
  if (ready.value) {
    clearInterval(readyTimer)
    ready.value = 0
    void KeepAwake.allowSleep().catch(() => {})
    return
  }
  if (!holding.value)
    return
  cancelAnimationFrame(raf)
  holding.value = false
  stopListening()
  body.value?.setAttribute('d', REST_PATH)
  void KeepAwake.allowSleep().catch(() => {})
  const s = Math.floor(ms / 1000)
  haptic.thud()
  sfx.play(s >= target.value ? 'stamp' : 'erase')
  if (s > data.value.best)
    patch({ best: s })
}

onBeforeUnmount(() => {
  alive = false
  clearInterval(readyTimer)
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
      {{ L('Today\'s target') }} · {{ fmt(target) }}
    </p>
    <p class="t-display text-6xl tabular-nums mt-1" :class="{ 'text-ice': holding && progress >= 1 }">
      {{ fmt(holding ? sec : data.best) }}
    </p>
    <svg viewBox="0 0 280 130" class="w-full max-w-[320px] mt-2" :class="{ shake: holding }">
      <line x1="10" y1="112" x2="270" y2="112" stroke="var(--color-rule)" stroke-width="2" />
      <!-- forearm + head -->
      <path d="M232 112 L232 84 M232 112 L262 112" stroke="var(--color-ink)" stroke-width="3" fill="none" stroke-linecap="square" />
      <circle cx="244" cy="50" r="11" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" />
      <!-- body line -->
      <path ref="body" :d="REST_PATH" stroke="var(--color-ink)" stroke-width="3.5" fill="none" stroke-linejoin="round" />
      <path d="M44 92 L30 112" stroke="var(--color-ink)" stroke-width="3" fill="none" />
      <!-- progress rule -->
      <line x1="10" y1="124" :x2="10 + 260 * (holding ? progress : Math.min(1, data.best / target))" y2="124" stroke="var(--color-ink)" stroke-width="3" class="bar" />
    </svg>
    <button
      class="btn mt-4 w-52 select-none" :class="holding ? '' : 'btn-ink'" :disabled="!editable"
      @click="holding ? drop() : getReady()"
    >
      {{ holding ? L('Drop') : done ? L('Once more') : L('Get in position') }}
    </button>
    <div class="flex gap-6 mt-4 t-label text-graphite">
      <span>{{ L('Today') }} {{ fmt(data.best) }}</span>
      <span>{{ L('Best') }} {{ fmt(record) }}</span>
    </div>
    <p v-if="!holding && !done" class="t-body text-xs text-pencil mt-2 text-center px-4">
      {{ L('5 seconds to get in place, then a voice guides you. Tap the screen to drop.') }}
    </p>
    <p v-if="done && !holding" class="t-body text-xs text-pencil mt-2">
      {{ L('Held. Tomorrow, 10 more seconds.') }}
    </p>

    <!-- Full-screen coach, readable from the floor. Tap anywhere to drop. -->
    <Teleport to="body">
      <div v-if="ready || holding" class="coach" @pointerdown="drop">
        <template v-if="ready">
          <p class="t-label text-paper/70">
            {{ L('Get in position') }}
          </p>
          <p :key="ready" class="t-display tabular-nums text-paper count-in">
            {{ ready }}
          </p>
        </template>
        <template v-else>
          <svg viewBox="0 0 260 260" class="ring">
            <circle cx="130" cy="130" r="120" fill="none" stroke="rgb(255 255 255 / 0.15)" stroke-width="10" />
            <circle
              ref="ring"
              cx="130" cy="130" r="120" fill="none" stroke="var(--color-paper)" stroke-width="10"
              :stroke-dasharray="C" :stroke-dashoffset="C" transform="rotate(-90 130 130)"
            />
          </svg>
          <div class="center">
            <p class="t-display tabular-nums text-paper big">
              {{ sec < target ? fmt(target - sec) : `+${fmt(sec - target)}` }}
            </p>
            <p class="t-label text-paper/70 mt-2">
              {{ sec < target ? L('to hold') : L('bonus') }} · {{ fmt(target) }}
            </p>
          </div>
          <p class="t-label text-paper/60 hint">
            {{ L('Tap to drop') }}
          </p>
        </template>
      </div>
    </Teleport>
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

.coach {
  position: fixed;
  inset: 0;
  z-index: 200;
  padding-inline: var(--safe-left) var(--safe-right);
  background: var(--color-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.count-in {
  font-size: 46vw;
  line-height: 1;
  animation: pop 900ms var(--ease-out-quint) both;
}

@keyframes pop {
  from {
    transform: scale(1.6);
    opacity: 0;
  }
}

.ring {
  width: min(78vw, 360px);
  transition: stroke-dashoffset 200ms linear;
}

.center {
  position: absolute;
  text-align: center;
}

.big {
  font-size: min(20vw, 96px);
  line-height: 1;
}

.hint {
  position: absolute;
  bottom: calc(var(--safe-bottom) + 40px);
}
</style>
