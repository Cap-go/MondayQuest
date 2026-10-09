<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { LightSensor } from '@capgo/capacitor-light-sensor'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
// 15 minutes on day one, building up to 30 on day seven. One leaf a minute.
const MIN = 15 + Math.round(props.idx * 2.5)
const GOAL = MIN * 60_000
const LEAVES = MIN

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('AU VERT', 'INTO THE GREEN'),
  subtitle: () => L(`${MIN} minutes dehors`, `${MIN} minutes outside`),
  short: '🌿',
  doneBody: () => L(`${MIN} minutes au grand air. La case est cochée.`, `${MIN} minutes of fresh air. The box is ticked.`),
})

const lux = ref<number | null>(null)
const peak = computed(() => Math.max(lux.value ?? 0, (s.data.value as any).peakLux ?? 0))
let handle: PluginListenerHandle | undefined

// leaves scattered in the canopy, revealed one per minute
const leaves = Array.from({ length: LEAVES }, (_, i) => {
  const a = i * 2.39996
  const r = 14 + Math.sqrt(i / LEAVES) * 58
  return { x: 130 + Math.cos(a) * r * 1.15, y: 92 + Math.sin(a) * r * 0.8, rot: (a * 57) % 360 }
})
const shown = computed(() => (s.done.value ? LEAVES : Math.floor(s.progress.value * LEAVES)))
watch(shown, (n, o) => {
  if (n > o && !s.done.value && s.running.value) {
    haptic.tap()
    sfx.play('pop', 0.3)
  }
})

const light = computed(() => {
  const v = peak.value
  if (!v)
    return null
  if (v > 10_000)
    return L('plein soleil', 'full sun')
  if (v > 1_000)
    return L('lumière du jour', 'daylight')
  if (v > 200)
    return L('ciel couvert', 'overcast')
  return L('à l\'ombre', 'in the shade')
})

async function startLight() {
  if (!Capacitor.isNativePlatform() || handle)
    return
  const { available } = await LightSensor.isAvailable().catch(() => ({ available: false }))
  if (!available)
    return
  await LightSensor.start({ updateInterval: 1000 }).catch(() => {})
  handle = await LightSensor.addListener('lightSensorChange', d => (lux.value = d.illuminance)).catch(() => undefined)
}

async function stopLight() {
  if (lux.value != null && lux.value > ((s.data.value as any).peakLux ?? 0))
    s.patch({ peakLux: Math.round(lux.value) } as any)
  await handle?.remove().catch(() => {})
  handle = undefined
  await LightSensor.stop().catch(() => {})
}

watch(s.running, r => (r ? startLight() : stopLight()))
onMounted(() => {
  if (s.running.value)
    void startLight()
})
onBeforeUnmount(() => {
  if (handle)
    void stopLight()
})
</script>

<template>
  <div class="flex flex-col items-center select-none">
    <svg viewBox="0 0 260 240" width="260" height="240">
      <circle v-if="peak > 1000" cx="222" cy="30" r="14" fill="var(--color-sun)" stroke="var(--color-ink)" stroke-width="2.5" class="sun" />
      <!-- trunk and branches -->
      <path d="M122 226 L126 150 L128 120 M134 226 L132 150 L130 120 M127 150 L96 112 M131 140 L166 104 M129 124 L112 86 M130 120 L150 78" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linecap="square" />
      <line x1="60" y1="226" x2="200" y2="226" stroke="var(--color-ink)" stroke-width="3" />
      <path d="M80 226 l-6 -8 M88 226 l2 -9 M176 226 l-4 -7 M184 226 l5 -9" stroke="var(--color-graphite)" stroke-width="2" />
      <!-- leaves -->
      <g v-for="(l, i) in leaves.slice(0, shown)" :key="i" :transform="`translate(${l.x} ${l.y}) rotate(${l.rot})`">
        <path class="leaf" d="M0 0 C4 -7 12 -8 16 -2 C11 3 4 3 0 0 Z" :fill="s.done.value ? 'var(--color-ink)' : 'var(--color-sheet)'" stroke="var(--color-ink)" stroke-width="2" />
      </g>
    </svg>
    <p class="t-display text-5xl tabular-nums">
      {{ s.done.value ? formatClock(GOAL) : formatClock(s.running.value || s.elapsed.value ? s.remaining.value : GOAL) }}
    </p>
    <p class="t-label text-graphite mt-1">
      {{ L('Aujourd\'hui', 'Today') }} · {{ MIN }} min · {{ shown }}/{{ LEAVES }} {{ L('feuilles', 'leaves') }}
      <template v-if="light">
        · {{ L('lumière', 'sunlight') }} : {{ light }}
      </template>
    </p>
    <button class="btn btn-ink mt-5 w-52" :disabled="!editable || s.done.value" @click="s.toggle">
      {{ s.done.value ? L('Bol d\'air pris ✓', 'Fresh air taken ✓') : s.running.value ? L('Pause', 'Pause') : s.elapsed.value ? L('Reprendre', 'Resume') : L('Je suis dehors', 'I\'m outside') }}
    </button>
    <p v-if="editable && !s.done.value" class="t-body text-xs text-pencil mt-2 text-center max-w-64">
      {{ L('Une feuille par minute. Rangez le téléphone, l\'arbre pousse sans vous.', 'One leaf a minute. Pocket the phone, the tree grows on its own.') }}
    </p>
  </div>
</template>

<style scoped>
.leaf {
  animation: leaf-in 600ms var(--ease-spring) both;
  transform-origin: 0 0;
}

@keyframes leaf-in {
  from {
    transform: scale(0);
  }
}

.sun {
  animation: leaf-in 800ms var(--ease-spring) both;
  transform-origin: 222px 30px;
}
</style>
