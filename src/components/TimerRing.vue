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
const tickList = computed(() => Array.from({ length: props.ticks }, (_, i) => {
  const a = (i / props.ticks) * Math.PI * 2 - Math.PI / 2
  const r1 = r.value + props.stroke / 2 + 3
  const r2 = r1 + (i % 5 === 0 ? 7 : 3.5)
  return { x1: center.value + Math.cos(a) * r1, y1: center.value + Math.sin(a) * r1, x2: center.value + Math.cos(a) * r2, y2: center.value + Math.sin(a) * r2, on: i / props.ticks <= props.progress }
}))
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
      <line v-for="(t, i) in tickList" :key="i" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" :stroke="t.on ? 'var(--color-ink)' : 'var(--color-rule)'" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <div class="relative text-center">
      <slot />
    </div>
  </div>
</template>
