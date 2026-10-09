<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// Pull the duvet all the way up, then fluff the pillow.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { duvet: 0, fluffs: 0, madeAt: undefined as number | undefined })
const FLUFFS = 3

const live = ref<number | null>(null)
const p = computed(() => (done.value ? 1 : live.value ?? data.value.duvet))
const smooth = computed(() => data.value.duvet >= 1 || done.value)
const top = computed(() => 140 - p.value * 82)
const wobble = computed(() => (1 - p.value) * 9)

// Duvet edge: wavy while crumpled, straight once pulled up.
const edge = computed(() => {
  const y = top.value
  const w = wobble.value
  return `M30 ${y + w} Q47 ${y - w} 65 ${y + w * 0.6} T100 ${y} T135 ${y + w * 0.8} T170 ${y - w * 0.4} V150 H30Z`
})

let y0 = 0
let p0 = 0
let scale = 1
let lastStep = 0
function down(e: PointerEvent) {
  if (!props.editable || smooth.value)
    return
  const el = e.currentTarget as SVGElement
  scale = 160 / el.getBoundingClientRect().height
  y0 = e.clientY
  p0 = data.value.duvet
  live.value = p0
  el.setPointerCapture(e.pointerId)
  haptic.tap()
}
function move(e: PointerEvent) {
  if (live.value == null)
    return
  const next = Math.max(0, Math.min(1, p0 + ((y0 - e.clientY) * scale) / 82))
  live.value = next
  const step = Math.floor(next * 6)
  if (step !== lastStep) {
    lastStep = step
    haptic.select()
  }
  if (next >= 0.97)
    finishDuvet()
}
function up() {
  if (live.value == null)
    return
  patch({ duvet: live.value })
  live.value = null
}
function finishDuvet() {
  live.value = null
  sfx.play('whoosh')
  haptic.thud()
  patch({ duvet: 1 })
}

const puff = ref(false)
function fluff() {
  if (!props.editable || done.value || !smooth.value)
    return
  const fluffs = data.value.fluffs + 1
  puff.value = false
  requestAnimationFrame(() => (puff.value = true))
  sfx.play('pop', 0.6)
  haptic.press()
  if (fluffs >= FLUFFS)
    markDone({ fluffs, madeAt: Date.now() })
  else
    patch({ fluffs })
}

const madeAt = computed(() => (data.value.madeAt ? new Date(data.value.madeAt).toLocaleTimeString(L.tag(), { hour: '2-digit', minute: '2-digit' }) : ''))
</script>

<template>
  <div class="flex flex-col items-center">
    <svg viewBox="0 0 200 160" class="w-64 bed" :class="{ made: done }" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <!-- frame -->
      <rect x="22" y="10" width="156" height="12" fill="var(--color-ink)" />
      <rect x="30" y="20" width="140" height="130" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" />
      <!-- pillow -->
      <g class="pillow" :class="{ puff, ready: smooth && !done }" @animationend="puff = false" @pointerdown.stop @click="fluff">
        <path :d="`M50 ${30 - data.fluffs} Q100 ${24 - data.fluffs * 2} 150 ${30 - data.fluffs} Q154 42 150 ${54 + data.fluffs} Q100 ${58 + data.fluffs * 2} 50 ${54 + data.fluffs} Q46 42 50 ${30 - data.fluffs}Z`" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="2.5" />
        <path v-if="!done && data.fluffs < 2" d="M70 40 l12 4 M118 38 l10 6" stroke="var(--color-pencil)" stroke-width="1.5" />
      </g>
      <!-- duvet -->
      <path :d="edge" fill="var(--color-ice)" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="round" class="duvet" :class="{ settle: live == null }" />
      <g :opacity="1 - p" stroke="var(--color-ink)" stroke-width="1.8" fill="none" stroke-linecap="round">
        <path :d="`M48 ${top + 18} q14 8 26 -2 M96 ${top + 26} q16 10 30 0 M60 ${top + 44} q20 -8 40 4 M120 ${top + 50} q14 6 28 -6`" />
      </g>
      <line v-if="smooth" x1="30" :y1="top + 12" x2="170" :y2="top + 12" stroke="var(--color-ink)" stroke-width="2" class="fold" />
    </svg>

    <p class="t-display text-lg mt-3">
      {{ done ? L('Lit fait', 'Bed made') : smooth ? L(`Tapotez l'oreiller · ${data.fluffs}/${FLUFFS}`, `Fluff the pillow · ${data.fluffs}/${FLUFFS}`) : L('Remontez la couette', 'Pull the duvet up') }}
    </p>
    <p class="t-body text-sm text-graphite mt-1 text-center">
      {{ done ? L(`Au carré à ${madeAt}. Première victoire du jour.`, `Squared away at ${madeAt}. First win of the day.`) : smooth ? L('Trois petites tapes et c\'est fini.', 'Three little pats and you\'re done.') : editable ? L('Faites glisser vers le haut, du pied du lit à l\'oreiller.', 'Drag upwards, from the foot of the bed to the pillow.') : L('Lit pas fait ce jour-là.', 'Bed left unmade that day.') }}
    </p>
  </div>
</template>

<style scoped>
.bed {
  touch-action: none;
  user-select: none;
}

.duvet.settle {
  transition: d 450ms var(--ease-spring);
}

.pillow {
  transform-origin: 100px 42px;
  transition: transform 300ms var(--ease-spring);
}

.pillow.ready {
  cursor: pointer;
  animation: invite 1.6s ease-in-out infinite;
}

.pillow.puff {
  animation: puff 420ms var(--ease-spring);
}

@keyframes invite {
  50% {
    transform: scale(1.04);
  }
}

@keyframes puff {
  0% {
    transform: scale(0.88, 0.8);
  }
  60% {
    transform: scale(1.12, 1.18);
  }
}

.fold {
  stroke-dasharray: 140;
  animation: draw 500ms var(--ease-ink);
}

@keyframes draw {
  from {
    stroke-dashoffset: 140;
  }
}

.made {
  animation: made 600ms var(--ease-spring);
}

@keyframes made {
  40% {
    transform: scale(1.03);
  }
}
</style>
