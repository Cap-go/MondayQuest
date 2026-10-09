<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { CapacitorPedometer } from '@capgo/capacitor-pedometer'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimerRing from '~/components/TimerRing.vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 30 * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('LE FLÂNEUR', 'THE STROLLER'),
  subtitle: () => L('30 minutes de marche', '30-minute walk'),
  short: '👣',
  doneBody: () => L('30 minutes ! Vous pouvez rentrer, la case est cochée.', '30 minutes! Head home, the box is ticked.'),
})

const steps = ref<number>((s.data.value as any).steps ?? 0)
const todaySteps = ref<number | null>(null)
let handle: PluginListenerHandle | undefined
let base = steps.value

async function startPedometer() {
  if (!Capacitor.isNativePlatform())
    return
  const perm = await CapacitorPedometer.requestPermissions().catch(() => null)
  if (perm?.activityRecognition !== 'granted')
    return
  base = steps.value
  handle = await CapacitorPedometer.addListener('measurement', (m) => {
    if (m.numberOfSteps != null)
      steps.value = base + m.numberOfSteps
  })
  await CapacitorPedometer.startMeasurementUpdates().catch(() => {})
}

async function stopPedometer() {
  await CapacitorPedometer.stopMeasurementUpdates().catch(() => {})
  await handle?.remove()
  handle = undefined
  s.patch({ steps: steps.value } as any)
}

watch(s.running, r => (r ? startPedometer() : stopPedometer()))

onMounted(async () => {
  if (s.running.value)
    void startPedometer()
  if (!Capacitor.isNativePlatform() || !props.isToday)
    return
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const m = await CapacitorPedometer.getMeasurement({ start: start.getTime(), end: Date.now() }).catch(() => null)
  todaySteps.value = m?.numberOfSteps ?? null
})

onBeforeUnmount(() => {
  if (handle)
    void stopPedometer()
})

// footprints appear one by one along the ring, alternating left/right
const prints = computed(() => {
  const n = Math.floor(s.progress.value * 24)
  return Array.from({ length: n }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2
    const r = 82 + (i % 2 ? 7 : -7)
    return { x: 120 + Math.cos(a) * r, y: 120 + Math.sin(a) * r, rot: (a * 180) / Math.PI + 90, flip: i % 2 }
  })
})
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative">
      <TimerRing :progress="s.progress.value" :size="240" :ticks="30">
        <p class="t-display text-5xl tabular-nums">
          {{ formatClock(s.running.value || s.elapsed.value ? s.remaining.value : GOAL) }}
        </p>
        <p class="t-label mt-1 text-graphite">
          {{ steps }} {{ L('pas', 'steps') }}
        </p>
      </TimerRing>
      <svg class="absolute inset-0 pointer-events-none" width="240" height="240">
        <g v-for="(p, i) in prints" :key="i" :transform="`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.flip ? -1 : 1} 1)`" class="print">
          <ellipse cx="0" cy="0" rx="2.6" ry="4.4" fill="var(--color-ink)" />
          <circle cx="1.2" cy="-6.2" r="1" fill="var(--color-ink)" />
        </g>
      </svg>
    </div>
    <button class="btn btn-ink mt-5 w-48" :disabled="!editable || s.done.value" @click="s.toggle">
      {{ s.done.value ? L('Marche faite ✓', 'Walk done ✓') : s.running.value ? L('Pause', 'Pause') : s.elapsed.value ? L('Reprendre', 'Resume') : L('Je pars marcher', 'Start walking') }}
    </button>
    <p v-if="todaySteps != null" class="t-body text-sm text-graphite mt-3">
      {{ todaySteps.toLocaleString() }} {{ L('pas aujourd\'hui', 'steps today') }}
    </p>
    <p class="t-body text-xs text-pencil mt-2 text-center max-w-64">
      {{ L('Le chrono continue téléphone verrouillé. Suivez-le sur l\'écran de verrouillage.', 'The timer keeps running when locked. Follow it on your lock screen.') }}
    </p>
  </div>
</template>

<style scoped>
.print {
  animation: print-in 400ms var(--ease-spring) both;
}

@keyframes print-in {
  from {
    opacity: 0;
  }
}
</style>
