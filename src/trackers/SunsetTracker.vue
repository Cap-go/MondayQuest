<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, markDone } = useDay(props, { setAt: '' })

const HORIZON = 120
const R = 22
const TOP = 40
const SET = HORIZON + R + 4

const svg = ref<SVGSVGElement>()
const sunY = ref(done.value ? SET : TOP)
const dragging = ref(false)
let lastStep = 0

// 0 = high noon on paper, 1 = gone, sky fully warm.
const p = computed(() => Math.max(0, Math.min(1, (sunY.value - TOP) / (SET - TOP))))
const sky = computed(() => `color-mix(in oklab, var(--color-sun) ${Math.round(p.value * 70)}%, var(--color-paper))`)

function toY(e: PointerEvent) {
  const r = svg.value!.getBoundingClientRect()
  return ((e.clientY - r.top) / r.height) * 200
}

function down(e: PointerEvent) {
  if (!props.editable || done.value)
    return
  dragging.value = true
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  haptic.press()
}

function move(e: PointerEvent) {
  if (!dragging.value)
    return
  sunY.value = Math.max(TOP, Math.min(SET, toY(e)))
  const step = Math.floor(sunY.value / 10)
  if (step !== lastStep) {
    lastStep = step
    haptic.select()
  }
  if (sunY.value >= SET)
    finish()
}

function up() {
  if (!dragging.value)
    return
  dragging.value = false
  if (!done.value)
    sunY.value = TOP // floats back up: not set yet
}

function finish() {
  dragging.value = false
  sunY.value = SET
  const now = new Date()
  const setAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  sfx.play('chime', 0.8)
  haptic.success()
  markDone({ setAt })
}

const waves = [136, 150, 164, 178, 192]
</script>

<template>
  <div class="flex flex-col items-center">
    <svg
      ref="svg" viewBox="0 0 300 200" class="w-full max-w-[320px] touch-none select-none border-[2.5px] border-ink"
      @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"
    >
      <defs>
        <clipPath id="sunset-sky"><rect x="0" y="0" width="300" :height="HORIZON" /></clipPath>
      </defs>
      <rect x="0" y="0" width="300" :height="HORIZON" :style="{ fill: sky }" class="sky" />
      <g clip-path="url(#sunset-sky)">
        <circle cx="150" :cy="sunY" :r="R" fill="var(--color-sun)" stroke="var(--color-ink)" stroke-width="2.5" :class="{ glide: !dragging }" />
        <g v-if="!done" stroke="var(--color-ink)" stroke-width="2" :style="{ opacity: 1 - p }">
          <line v-for="a in 8" :key="a" :x1="150 + Math.cos(a * Math.PI / 4) * (R + 6)" :y1="sunY + Math.sin(a * Math.PI / 4) * (R + 6)" :x2="150 + Math.cos(a * Math.PI / 4) * (R + 13)" :y2="sunY + Math.sin(a * Math.PI / 4) * (R + 13)" />
        </g>
      </g>
      <line x1="0" x2="300" :y1="HORIZON" :y2="HORIZON" stroke="var(--color-ink)" stroke-width="3" />
      <line
        v-for="(y, i) in waves" :key="y" :x1="150 - (60 - i * 9) * (1 - p * 0.6)" :x2="150 + (60 - i * 9) * (1 - p * 0.6)" :y1="y" :y2="y"
        stroke="var(--color-sun)" stroke-width="3" stroke-dasharray="10 6" :style="{ opacity: 0.25 + p * 0.75 }"
      />
      <line v-for="y in waves" :key="`r${y}`" x1="12" x2="70" :y1="y + 4" :y2="y + 4" stroke="var(--color-rule)" stroke-width="1.5" />
      <path d="M40 60 q8 -6 16 0 q8 -6 16 0 M214 44 q6 -5 12 0 q6 -5 12 0" fill="none" stroke="var(--color-ink)" stroke-width="2" />
    </svg>
    <p class="t-display text-3xl mt-3">
      {{ done ? data.setAt || '—' : L('Couchez le soleil', 'Set the sun') }}
    </p>
    <p class="t-label text-graphite mt-1 text-center">
      {{ done ? L('Soleil couché, vu de vos yeux', 'Sun set, seen with your own eyes') : editable ? L('Glissez-le sous l\'horizon quand il disparaît', 'Drag it below the horizon as it disappears') : L('Pas de coucher ce jour-là', 'No sunset that day') }}
    </p>
  </div>
</template>

<style scoped>
.glide {
  transition: cy 700ms var(--ease-spring);
}

.sky {
  transition: fill 400ms ease;
}
</style>
