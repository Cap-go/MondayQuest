<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'
import { useSession } from './useSession'

// 15 minutes of music with a pendulum metronome to keep you honest.
const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 15 * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  keepAwake: true,
  title: () => L('FAUSSE NOTE', 'WRONG NOTE'),
  subtitle: () => L('Pratique · 15 min', 'Practice · 15 min'),
  short: '♪',
  doneBody: () => L('15 minutes de musique. Bravo, la case est cochée.', '15 minutes of music. Bravo, the box is ticked.'),
  onComplete: () => stopMetro(),
})
const { running, elapsed, progress, done, toggle } = s
const extra = useDay(props, { bpm: 80 })
const bpm = computed(() => extra.data.value.bpm)

// Metronome: each beat flips the pendulum to the other side.
const playing = ref(false)
const side = ref(1)
const beat = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

function tick() {
  side.value = -side.value
  beat.value++
  sfx.play('tick', beat.value % 4 === 1 ? 0.9 : 0.5)
  if (beat.value % 4 === 1)
    haptic.press()
  else
    haptic.tap()
  timer = setTimeout(tick, 60_000 / bpm.value)
}
function startMetro() {
  if (playing.value)
    return
  playing.value = true
  beat.value = 0
  tick()
}
function stopMetro() {
  playing.value = false
  clearTimeout(timer)
}
function toggleMetro() {
  playing.value ? stopMetro() : startMetro()
}
onBeforeUnmount(stopMetro)

// BPM tape: drag sideways, 1 bpm per 6px.
let x0 = 0
let b0 = 0
function tapeDown(e: PointerEvent) {
  if (!props.editable)
    return
  x0 = e.clientX
  b0 = bpm.value;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function tapeMove(e: PointerEvent) {
  if (!x0)
    return
  setBpm(Math.round(b0 - (e.clientX - x0) / 6))
}
function setBpm(v: number) {
  const next = Math.max(40, Math.min(208, v))
  if (next !== bpm.value) {
    haptic.select()
    extra.patch({ bpm: next })
  }
}
const tempo = computed(() => {
  const b = bpm.value
  return b < 66 ? 'Adagio' : b < 108 ? 'Andante' : b < 132 ? 'Allegro' : 'Presto'
})
const marks = computed(() => Array.from({ length: 41 }, (_, i) => bpm.value - 20 + i))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="flex items-center gap-5 w-full justify-center">
      <button class="metro" :class="{ playing }" :aria-label="L('Métronome', 'Metronome')" @click="toggleMetro">
        <svg viewBox="0 0 100 130" class="w-28">
          <path d="M34 8h32l24 116H10z" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="round" />
          <path d="M22 96h56" stroke="var(--color-ink)" stroke-width="2" />
          <rect x="16" :y="124 - 28 * progress" width="68" :height="28 * progress" fill="var(--color-sun)" opacity="0.5" />
          <g class="arm" :style="{ transform: `rotate(${playing ? side * 24 : 0}deg)`, transitionDuration: `${60_000 / bpm}ms` }">
            <line x1="50" y1="104" x2="50" y2="14" stroke="var(--color-ink)" stroke-width="3" />
            <rect x="43" :y="20 + (208 - bpm) / 3" width="14" height="10" fill="var(--color-ink)" />
          </g>
          <circle cx="50" cy="104" r="4" fill="var(--color-ink)" />
        </svg>
      </button>
      <div>
        <p class="t-display text-4xl tabular-nums">
          {{ formatClock(Math.max(0, GOAL - elapsed)) }}
        </p>
        <p class="t-label text-graphite">
          {{ done ? L('Séance jouée', 'Session played') : running ? L('On joue', 'Playing') : L('Temps de pratique', 'Practice time') }}
        </p>
        <p class="t-label text-pencil mt-3">
          {{ playing ? L('Touchez pour arrêter', 'Tap to stop') : L('Touchez le métronome', 'Tap the metronome') }}
        </p>
      </div>
    </div>

    <div class="tape mt-4" :class="{ off: !editable }" @pointerdown="tapeDown" @pointermove="tapeMove" @pointerup="x0 = 0" @pointercancel="x0 = 0">
      <div class="flex items-end justify-between h-6 px-1">
        <span v-for="m in marks" :key="m" class="mark" :class="{ big: m % 10 === 0, mid: m === bpm }" />
      </div>
      <p class="text-center mt-1">
        <span class="t-display text-2xl tabular-nums">{{ bpm }}</span>
        <span class="t-label text-graphite ml-1">BPM · {{ tempo }}</span>
      </p>
    </div>

    <button class="btn btn-ink mt-4 w-48" :disabled="!editable || done" @click="toggle">
      {{ done ? L('15 minutes ✓', '15 minutes ✓') : running ? L('Pause', 'Pause') : elapsed ? L('Reprendre', 'Resume') : L('Commencer', 'Start') }}
    </button>
  </div>
</template>

<style scoped>
.metro {
  transition: transform 200ms var(--ease-spring);
}

.metro:active {
  transform: scale(0.95);
}

.arm {
  transform-origin: 50px 104px;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
}

.arm rect {
  transition: y 200ms;
}

.tape {
  width: 100%;
  max-width: 300px;
  padding: 8px 6px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  touch-action: none;
  cursor: ew-resize;
  user-select: none;
}

.tape.off {
  pointer-events: none;
  opacity: 0.6;
}

.mark {
  width: 1.5px;
  height: 8px;
  background: var(--color-pencil);
}

.mark.big {
  height: 14px;
  background: var(--color-ink);
}

.mark.mid {
  width: 3px;
  height: 24px;
  background: var(--color-ink);
}
</style>
