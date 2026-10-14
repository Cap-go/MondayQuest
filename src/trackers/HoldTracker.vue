<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// Self-control made physical: hold the dot until the ring closes.
const props = defineProps<TrackerProps>()
const L = useL()
const { done, markDone } = useDay(props, {})

const HOLD = 2400
const C = 2 * Math.PI * 70
/** Rest size of the core, scaled up to 22 while holding (transform, not `r`, so it stays on the compositor). */
const CORE_REST = `scale(${12 / 22})`
let progress = 0
const holding = ref(false)
const arc = ref<SVGCircleElement>()
const core = ref<SVGCircleElement>()
let raf = 0
let t0 = 0
let lastBeat = 0

function start() {
  if (!props.editable || done.value)
    return
  holding.value = true
  t0 = performance.now()
  lastBeat = 0
  const loop = (t: number) => {
    progress = Math.min(1, (t - t0) / HOLD)
    paint(progress)
    if (t - lastBeat > 600) {
      haptic.heartbeat()
      lastBeat = t
    }
    if (progress >= 1) {
      holding.value = false
      markDone()
      return
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function stop() {
  if (!holding.value)
    return
  holding.value = false
  cancelAnimationFrame(raf)
  if (progress < 1) {
    sfx.play('tick')
    progress = 0
    paint(0)
  }
}

// Written from the frame loop: the tracker does not re-render while the ring closes.
function paint(p: number) {
  arc.value?.setAttribute('stroke-dashoffset', String(C * (1 - p)))
  if (core.value)
    core.value.style.transform = p ? `scale(${(12 + p * 10) / 22})` : CORE_REST
}

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="flex flex-col items-center py-2">
    <button class="hold" :class="{ holding, done }" :disabled="!editable" @pointerdown.prevent="start" @pointerup="stop" @pointerleave="stop" @pointercancel="stop">
      <svg viewBox="0 0 160 160" class="w-44 h-44">
        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--color-rule)" stroke-width="5" />
        <circle ref="arc" cx="80" cy="80" r="70" fill="none" stroke="var(--color-ink)" stroke-width="5" :stroke-dasharray="C" :stroke-dashoffset="done ? 0 : C" transform="rotate(-90 80 80)" />
        <circle ref="core" cx="80" cy="80" r="22" fill="var(--color-ink)" class="core" :style="{ transform: done ? 'none' : CORE_REST }" />
      </svg>
    </button>
    <p class="t-display text-lg mt-3">
      {{ done ? L('Held.') : L('Hold') }}
    </p>
    <p class="t-body text-sm text-graphite text-center mt-1 max-w-64">
      {{ done ? L('One more day of self-control.') : L('Keep your finger down to validate the day, like keeping your course.') }}
    </p>
  </div>
</template>

<style scoped>
.hold {
  transition: transform 300ms var(--ease-spring);
}

.hold.holding {
  transform: scale(0.94);
}

.core {
  transform-origin: 80px 80px;
  transition: transform 200ms;
}

.hold.done .core {
  animation: settle 600ms var(--ease-spring);
}

@keyframes settle {
  from {
    transform: scale(1.5455); /* r 34 over the 22 rest radius */
  }
}
</style>
