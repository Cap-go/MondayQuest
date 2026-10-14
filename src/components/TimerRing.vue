<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ progress: number, size?: number, stroke?: number, ticks?: number, dashed?: boolean }>(), {
  size: 240,
  stroke: 8,
  ticks: 60,
  dashed: false,
})

const r = computed(() => (props.size - props.stroke * 2 - 14) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const center = computed(() => props.size / 2)
// Tick geometry depends on the size only: built once, not on every progress step.
const tickSegs = computed(() => Array.from({ length: props.ticks }, (_, i) => {
  const a = (i / props.ticks) * Math.PI * 2 - Math.PI / 2
  const r1 = r.value + props.stroke / 2 + 3
  const r2 = r1 + (i % 5 === 0 ? 7 : 3.5)
  const p = (n: number) => n.toFixed(2)
  return `M${p(center.value + Math.cos(a) * r1)} ${p(center.value + Math.sin(a) * r1)}L${p(center.value + Math.cos(a) * r2)} ${p(center.value + Math.sin(a) * r2)}`
}))
const lit = computed(() => {
  let n = 0
  while (n < props.ticks && n / props.ticks <= props.progress)
    n++
  return n
})
// Two paths (inked + blank) instead of one <line> per tick; they only change when a tick flips.
const onPath = computed(() => tickSegs.value.slice(0, lit.value).join(''))
const offPath = computed(() => tickSegs.value.slice(lit.value).join(''))
</script>

<template>
  <div class="relative inline-grid place-items-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="absolute inset-0 -rotate-90">
      <circle :cx="center" :cy="center" :r="r" fill="none" stroke="var(--color-rule)" :stroke-width="stroke" />
      <circle
        :cx="center" :cy="center" :r="r" fill="none" stroke="var(--color-ink)" :stroke-width="stroke"
        stroke-linecap="butt"
        :stroke-dasharray="c" :stroke-dashoffset="c * (1 - Math.min(1, progress))"
        style="transition: stroke-dashoffset 300ms linear"
      />
    </svg>
    <svg v-if="ticks" :width="size" :height="size" class="absolute inset-0">
      <path v-if="offPath" :d="offPath" fill="none" stroke="var(--color-rule)" stroke-width="1.5" stroke-linecap="round" />
      <path v-if="onPath" :d="onPath" fill="none" stroke="var(--color-ink)" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <div class="relative text-center">
      <slot />
    </div>
  </div>
</template>
