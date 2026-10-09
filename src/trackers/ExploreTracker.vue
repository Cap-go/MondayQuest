<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapgoCompass } from '@capgo/capacitor-compass'
import { CapacitorShake } from '@capgo/capacitor-shake'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { street: '', target: -1 })
const heading = ref(0)
const street = ref(data.value.street)
const handles: Array<{ remove: () => Promise<void> } | PluginListenerHandle> = []
let lastAligned = false

const DIRS = computed(() => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(d => L(d)))
const target = computed(() => data.value.target)
const delta = computed(() => {
  if (target.value < 0)
    return 0
  return ((target.value - heading.value + 540) % 360) - 180
})
const aligned = computed(() => target.value >= 0 && Math.abs(delta.value) < 12)

onMounted(async () => {
  await CapgoCompass.requestPermissions().catch(() => {})
  const h = await CapgoCompass.addListener('headingChange', ({ value }) => {
    heading.value = value
    if (aligned.value && !lastAligned)
      haptic.success()
    lastAligned = aligned.value
  }).catch(() => null)
  if (h)
    handles.push(h)
  await CapgoCompass.startListening({ minInterval: 60, minHeadingChange: 1 }).catch(() => {})
  const sh = await CapacitorShake.addListener('shake', draw).catch(() => null)
  if (sh)
    handles.push(sh)
})
onBeforeUnmount(() => {
  void CapgoCompass.stopListening().catch(() => {})
  handles.forEach(h => void h.remove())
})

function draw() {
  if (!props.editable)
    return
  sfx.play('whoosh', 0.5)
  haptic.press()
  patch({ target: Math.floor(Math.random() * 8) * 45 })
}

function save() {
  if (street.value.trim())
    markDone({ street: street.value.trim() })
}
</script>

<template>
  <div>
    <div class="flex justify-center">
      <div class="compass">
        <svg viewBox="0 0 200 200" class="dial" :style="{ transform: `rotate(${-heading}deg)` }">
          <circle cx="100" cy="100" r="94" fill="none" stroke="var(--color-ink)" stroke-width="3" />
          <g v-for="i in 72" :key="i">
            <line x1="100" y1="8" x2="100" :y2="i % 9 === 1 ? 20 : 13" stroke="var(--color-ink)" :stroke-width="i % 9 === 1 ? 2.5 : 1" :transform="`rotate(${(i - 1) * 5} 100 100)`" />
          </g>
          <text v-for="(d, i) in DIRS" :key="d" x="100" y="40" text-anchor="middle" font-family="Archivo" font-weight="800" :font-size="i % 2 ? 10 : 15" :transform="`rotate(${i * 45} 100 100)`">{{ d }}</text>
          <path v-if="target >= 0" d="M100 22 l8 16 h-16z" fill="var(--color-ink)" :transform="`rotate(${target} 100 100)`" class="target" />
        </svg>
        <svg viewBox="0 0 200 200" class="absolute inset-0 needle" :class="{ aligned }">
          <path d="M100 52 L110 100 L100 148 L90 100 Z" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="round" />
          <path d="M100 52 L110 100 L90 100 Z" fill="var(--color-ink)" />
        </svg>
      </div>
    </div>
    <p class="t-label text-center mt-2">
      {{ Math.round(heading) }}° {{ target >= 0 ? (aligned ? L('· Go straight ahead') : L(`· turn ${delta > 0 ? 'right' : 'left'}`)) : '' }}
    </p>
    <button class="btn w-full mt-4" :disabled="!editable" @click="draw">
      {{ L('Draw a direction (or shake)') }}
    </button>
    <label class="block mt-4">
      <span class="t-label">{{ L('Street or path discovered') }}</span>
      <input v-model="street" class="ink-input mt-1" :disabled="!editable" :placeholder="L('Rose Alley')">
    </label>
    <button class="btn btn-ink w-full mt-4" :disabled="!editable || !street.trim() || (done && street === data.street)" @click="save">
      {{ done && street === data.street ? L('Explored ✓') : L('New path taken') }}
    </button>
  </div>
</template>

<style scoped>
.compass {
  position: relative;
  width: 210px;
  height: 210px;
}

.dial {
  width: 100%;
  height: 100%;
  transition: transform 160ms linear;
}

.needle {
  transition: transform 300ms var(--ease-spring);
}

.needle.aligned {
  transform: scale(1.08);
}

.target {
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  50% {
    opacity: 0.35;
  }
}
</style>
