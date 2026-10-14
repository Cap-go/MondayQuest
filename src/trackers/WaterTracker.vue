<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { glasses: 0 })
// 6 glasses on day one, one more every two days, 8 from day five.
const GOAL = Math.min(8, 6 + Math.floor(props.idx / 2))

// The water surface follows the phone's tilt.
const tilt = ref(0)
let handle: PluginListenerHandle | undefined
let unmounted = false
onMounted(async () => {
  handle = await CapacitorAccelerometer.addListener('measurement', ({ x }) => {
    tilt.value += (Math.max(-1, Math.min(1, x)) * 28 - tilt.value) * 0.2
  }).catch(() => undefined)
  // Left before the listener was ready: don't start a sensor nobody will stop.
  if (unmounted)
    return void handle?.remove()
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
  if (unmounted)
    void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
})
onBeforeUnmount(() => {
  unmounted = true
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
})

const level = computed(() => Math.min(1, data.value.glasses / GOAL))
const surfaceY = computed(() => 150 - level.value * 128)

function drink() {
  if (!props.editable)
    return
  const glasses = Math.min(GOAL, data.value.glasses + 1)
  sfx.play('water')
  haptic.tap()
  patch({ glasses })
  if (glasses >= GOAL && !done.value)
    markDone({ glasses })
}

function undo() {
  if (data.value.glasses > 0 && props.editable) {
    haptic.select()
    patch({ glasses: data.value.glasses - 1 })
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <svg viewBox="0 0 100 160" class="w-20 shrink-0">
      <defs>
        <clipPath id="bottle"><path d="M38 4h24v14c0 6 14 10 14 24v106c0 4-3 8-8 8H32c-5 0-8-4-8-8V42c0-14 14-18 14-24z" /></clipPath>
      </defs>
      <g clip-path="url(#bottle)">
        <g :style="{ transform: `rotate(${-tilt}deg)`, transformOrigin: `50px ${surfaceY}px`, transition: 'transform 120ms linear' }">
          <rect x="-60" :y="surfaceY" width="220" height="200" fill="var(--color-ice)" class="water" />
          <path :d="`M-60 ${surfaceY} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 v4 h-220z`" fill="var(--color-ice)" class="ripple" />
        </g>
      </g>
      <path d="M38 4h24v14c0 6 14 10 14 24v106c0 4-3 8-8 8H32c-5 0-8-4-8-8V42c0-14 14-18 14-24z" fill="none" stroke="var(--color-ink)" stroke-width="3" />
      <line v-for="i in GOAL - 1" :key="i" x1="70" :x2="76" :y1="150 - i * 128 / GOAL" :y2="150 - i * 128 / GOAL" stroke="var(--color-ink)" stroke-width="1.5" />
    </svg>
    <div class="flex-1 min-w-0">
      <p class="t-display text-5xl tabular-nums">
        {{ data.glasses }}<span class="text-pencil text-2xl">/{{ GOAL }}</span>
      </p>
      <p class="t-label text-graphite">
        {{ L('Today') }} · {{ GOAL }} {{ L('glasses of water') }}
      </p>
      <div class="grid grid-cols-4 gap-1.5 mt-3">
        <span v-for="i in GOAL" :key="i" class="h-3 border-[1.5px] border-ink" :class="i <= data.glasses ? 'bg-ink' : ''" />
      </div>
      <div class="flex gap-2 mt-4">
        <button class="btn btn-ink flex-1" :disabled="!editable || data.glasses >= GOAL" @click="drink">
          + {{ L('A glass') }}
        </button>
        <button class="btn px-4" :disabled="!editable || !data.glasses" @click="undo">
          −
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.water {
  transition: y 600ms var(--ease-spring);
}

.ripple {
  animation: ripple 2s linear infinite;
}

@keyframes ripple {
  to {
    transform: translateX(40px);
  }
}
</style>
