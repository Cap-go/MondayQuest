<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { who: '', digits: '' })

const C = 130
const R = 86
const STOP = 62 // finger stop angle, degrees clockwise from 3 o'clock
const STEP = 28
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const holes = DIGITS.map((d, i) => {
  const a = ((STOP - 32 - i * STEP) * Math.PI) / 180
  return { d, i, x: C + Math.cos(a) * R, y: C + Math.sin(a) * R, max: 32 + i * STEP }
})

// Dial angle: written straight to the SVG on every pointer move / frame, never re-rendering the tracker.
let angle = 0
const dial = ref<SVGGElement>()
function setAngle(a: number) {
  angle = a
  dial.value?.setAttribute('transform', `rotate(${a} ${C} ${C})`)
}
const who = ref(data.value.who)
const svg = ref<SVGSVGElement>()
const spun = computed(() => data.value.digits.length > 0)
let active: (typeof holes)[number] | null = null
let last = 0
let stopped = false
let raf = 0

function polar(e: PointerEvent) {
  const r = svg.value!.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * 260 - C
  const y = ((e.clientY - r.top) / r.height) * 260 - C
  return { a: (Math.atan2(y, x) * 180) / Math.PI, d: Math.hypot(x, y) }
}

function down(e: PointerEvent) {
  if (!props.editable || done.value || raf)
    return
  const p = polar(e)
  const r = svg.value!.getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * 260
  const py = ((e.clientY - r.top) / r.height) * 260
  active = holes.find(h => Math.hypot(h.x - px, h.y - py) < 24) ?? null
  if (!active)
    return
  const el = e.currentTarget as Element
  el.setPointerCapture(e.pointerId)
  last = p.a
  stopped = false
  haptic.tap()
}

function move(e: PointerEvent) {
  if (!active)
    return
  const a = polar(e).a
  let d = a - last
  if (d > 180)
    d -= 360
  if (d < -180)
    d += 360
  last = a
  const prev = angle
  setAngle(Math.max(0, Math.min(active.max, prev + d)))
  if (Math.floor(angle / STEP) !== Math.floor(prev / STEP))
    haptic.select()
  if (angle >= active.max && !stopped) {
    stopped = true
    haptic.thud()
  }
}

function up() {
  if (!active)
    return
  const hole = active
  active = null
  if (angle >= hole.max - 4) {
    const digits = (data.value.digits + hole.d).slice(-10)
    patch({ digits })
  }
  release()
}

// the dial whirrs back to rest, clicking once per hole
function release() {
  const from = angle
  const t0 = performance.now()
  const dur = Math.max(160, from * 4)
  let ticks = Math.floor(from / STEP)
  const frame = (t: number) => {
    const k = Math.min(1, (t - t0) / dur)
    setAngle(from * (1 - k))
    const left = Math.floor(angle / STEP)
    if (left < ticks) {
      ticks = left
      sfx.play('tick', 0.5)
      haptic.select()
    }
    raf = k < 1 ? requestAnimationFrame(frame) : 0
  }
  raf = requestAnimationFrame(frame)
}

function hangUp() {
  if (!props.editable)
    return
  if (done.value)
    return unmark()
  if (!spun.value || !who.value.trim())
    return
  sfx.play('bell', 0.5)
  markDone({ who: who.value.trim() })
}

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="flex flex-col items-center select-none">
    <svg ref="svg" viewBox="0 0 260 260" width="260" height="260" class="touch-none" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <circle :cx="C" :cy="C" r="122" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="3" />
      <text v-for="h in holes" :key="h.d" :x="h.x" :y="h.y + 6" text-anchor="middle" font-size="17" font-weight="800" fill="var(--color-ink)">{{ h.d }}</text>
      <g ref="dial" :transform="`rotate(0 ${C} ${C})`">
        <circle :cx="C" :cy="C" r="108" fill="none" stroke="var(--color-ink)" stroke-width="2.5" />
        <circle v-for="h in holes" :key="h.d" :cx="h.x" :cy="h.y" r="17" fill="none" stroke="var(--color-ink)" stroke-width="2.5" />
        <circle :cx="C" :cy="C" r="56" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" />
      </g>
      <!-- finger stop -->
      <path :d="`M${C + Math.cos(STOP * Math.PI / 180) * 100} ${C + Math.sin(STOP * Math.PI / 180) * 100} L${C + Math.cos(STOP * Math.PI / 180) * 128} ${C + Math.sin(STOP * Math.PI / 180) * 128}`" stroke="var(--color-ink)" stroke-width="5" stroke-linecap="square" />
      <text :x="C" :y="C - 6" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="var(--color-pencil)">{{ done ? L('CALLED') : L('DIAL') }}</text>
      <text :x="C" :y="C + 16" text-anchor="middle" font-size="15" font-weight="700" fill="var(--color-ink)" class="tabular-nums">{{ data.digits || '· · ·' }}</text>
    </svg>

    <p v-if="editable && !spun" class="t-body text-xs text-pencil mt-1 text-center">
      {{ L('Drag a hole round to the stop to dial.') }}
    </p>
    <div class="w-64 mt-4">
      <label class="t-label text-graphite">{{ L('Who did you call?') }}</label>
      <input v-model="who" class="ink-input mt-1" :disabled="!editable || done" :placeholder="L('Grandma, Paul, an old friend…')" @change="patch({ who: who.trim() })">
    </div>
    <button class="btn mt-5 w-56" :class="{ 'btn-ink': !done }" :disabled="!editable || (!done && (!spun || !who.trim()))" @click="hangUp">
      {{ done ? L('Call made ✓') : L('Hang up') }}
    </button>
  </div>
</template>
