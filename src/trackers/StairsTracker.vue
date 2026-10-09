<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { CapacitorBarometer } from '@capgo/capacitor-barometer'
import { CapacitorPedometer } from '@capgo/capacitor-pedometer'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { floors: 0 })
// 5 floors on day one, one more every day, 11 on day seven.
const GOAL = 5 + props.idx
// the staircase drawing always spans 112 px, whatever today's floor count
const W = 112 / GOAL
const outline = `M4 116 ${Array.from({ length: GOAL }, (_, i) => `V${116 - (i + 1) * W} H${4 + (i + 1) * W}`).join(' ')} H116`
const FLOOR_M = 3

const tracking = ref(false)
const altitude = ref(0)
let lastAlt: number | null = null
let ascent = 0
let handle: PluginListenerHandle | undefined

function addFloors(n: number) {
  const floors = Math.max(0, data.value.floors + n)
  if (n > 0) {
    sfx.play('tick')
    haptic.press()
  }
  patch({ floors })
  if (floors >= GOAL && !done.value)
    markDone({ floors })
}

async function toggle() {
  if (tracking.value)
    return stop()
  if (!Capacitor.isNativePlatform())
    return
  const { isAvailable } = await CapacitorBarometer.isAvailable().catch(() => ({ isAvailable: false }))
  if (!isAvailable)
    return
  await CapacitorBarometer.requestPermissions().catch(() => {})
  tracking.value = true
  lastAlt = null
  ascent = 0
  handle = await CapacitorBarometer.addListener('measurement', (m) => {
    altitude.value = m.relativeAltitude
    if (lastAlt != null && m.relativeAltitude > lastAlt)
      ascent += m.relativeAltitude - lastAlt
    lastAlt = m.relativeAltitude
    if (ascent >= FLOOR_M) {
      ascent -= FLOOR_M
      addFloors(1)
    }
  })
  await CapacitorBarometer.startMeasurementUpdates().catch(() => {})
}

async function stop() {
  tracking.value = false
  await CapacitorBarometer.stopMeasurementUpdates().catch(() => {})
  await handle?.remove()
}

onMounted(async () => {
  // iOS counts floors natively — import today's count from the motion coprocessor.
  if (!Capacitor.isNativePlatform() || !props.isToday)
    return
  const start = new Date().setHours(0, 0, 0, 0)
  const m = await CapacitorPedometer.getMeasurement({ start, end: Date.now() }).catch(() => null)
  if (m?.floorsAscended && m.floorsAscended > data.value.floors)
    addFloors(m.floorsAscended - data.value.floors)
})
onBeforeUnmount(() => {
  if (tracking.value)
    void stop()
})

const steps = computed(() => Array.from({ length: GOAL }, (_, i) => i < data.value.floors))
</script>

<template>
  <div>
    <div class="flex items-end gap-5">
      <svg viewBox="0 0 120 120" class="w-32 shrink-0">
        <path d="M4 116 H16" stroke="var(--color-ink)" stroke-width="3" />
        <g v-for="(on, i) in steps" :key="i">
          <rect :x="4 + i * W" :y="116 - (i + 1) * W" :width="W" :height="(i + 1) * W" :fill="on ? 'var(--color-ink)' : 'none'" class="step" :style="{ transitionDelay: `${i * 30}ms` }" />
        </g>
        <path :d="outline" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        <circle :cx="4 + (Math.min(data.floors, GOAL - 1) + 0.5) * W" :cy="110 - (Math.min(data.floors, GOAL - 1) + 1) * W" r="4" fill="var(--color-ink)" class="climber" />
      </svg>
      <div>
        <p class="t-display text-5xl tabular-nums">
          {{ data.floors }}<span class="text-pencil text-2xl">/{{ GOAL }}</span>
        </p>
        <p class="t-label text-graphite">
          {{ L('étages gravis', 'floors climbed') }}
        </p>
        <p class="t-label text-pencil mt-1">
          {{ L('Aujourd\'hui', 'Today') }} · {{ GOAL }} {{ L('étages', 'floors') }}
        </p>
        <p v-if="tracking" class="t-body text-xs mt-1 tabular-nums">
          {{ L('Altitude', 'Altitude') }} {{ altitude >= 0 ? '+' : '' }}{{ altitude.toFixed(1) }} m
        </p>
      </div>
    </div>
    <div class="flex gap-2 mt-5">
      <button class="btn btn-ink flex-1" :disabled="!editable" @click="toggle">
        {{ tracking ? L('Arrêter le baromètre', 'Stop barometer') : L('Je monte', 'I\'m climbing') }}
      </button>
      <button class="btn px-4" :disabled="!editable" @click="addFloors(1)">
        +1
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Le baromètre détecte chaque étage (≈ 3 m) pendant que vous montez.', 'The barometer detects each floor (≈ 3 m) as you climb.') }}
    </p>
  </div>
</template>

<style scoped>
.step {
  transition: fill 300ms;
}

.climber {
  transition:
    cx 500ms var(--ease-spring),
    cy 500ms var(--ease-spring);
}
</style>
