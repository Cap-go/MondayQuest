<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { VolumeButtons } from '@capgo/capacitor-volume-buttons'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { best: 0, tries: 0 })
const MIN = 30_000

const startedAt = ref<number | null>(null)
const now = ref(Date.now())
let raf = 0
let lastShiver = 0
let vol: PluginListenerHandle | undefined

const elapsed = computed(() => (startedAt.value ? now.value - startedAt.value : 0))
const frost = computed(() => Math.min(1, elapsed.value / 90_000))
const crystals = Array.from({ length: 18 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, s: 10 + Math.random() * 26, r: Math.random() * 60, t: Math.random() }))

function loop() {
  now.value = Date.now()
  if (now.value - lastShiver > 10_000) {
    lastShiver = now.value
    haptic.shiver()
    sfx.play('freeze', 0.5)
  }
  raf = requestAnimationFrame(loop)
}

async function go() {
  if (!props.editable)
    return
  startedAt.value = Date.now()
  lastShiver = Date.now()
  sfx.play('freeze')
  haptic.shiver(10)
  loop()
  await KeepAwake.keepAwake().catch(() => {})
  // wet hands: any volume button stops the stopwatch
  vol = await VolumeButtons.addListener('volumeButtonPressed', () => stop())
}

function stop() {
  if (!startedAt.value)
    return
  cancelAnimationFrame(raf)
  const d = Date.now() - startedAt.value
  startedAt.value = null
  void vol?.remove()
  void KeepAwake.allowSleep().catch(() => {})
  const best = Math.max(data.value.best ?? 0, d)
  patch({ best, tries: (data.value.tries ?? 0) + 1 })
  if (d >= MIN)
    markDone({ best })
  else
    haptic.warning()
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  void vol?.remove()
  void KeepAwake.allowSleep().catch(() => {})
})
</script>

<template>
  <div class="cold" :style="{ '--f': frost }">
    <div class="frost">
      <svg v-for="(c, i) in crystals" :key="i" class="crystal" :style="{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.s}px`, opacity: frost > c.t ? 0.75 : 0, rotate: `${c.r}deg` }" viewBox="0 0 20 20">
        <path d="M10 0v20M0 10h20M3 3l14 14M17 3L3 17M10 3l-2-2M10 3l2-2M10 17l-2 2M10 17l2 2" stroke="var(--color-ink)" stroke-width="1" fill="none" />
      </svg>
    </div>
    <div class="relative text-center py-4">
      <p class="t-label text-graphite">
        {{ startedAt ? L('Tenez bon', 'Hold on') : L('Eau glacée', 'Ice-cold water') }}
      </p>
      <p class="t-display text-6xl tabular-nums my-2" :class="{ shiver: startedAt }">
        {{ formatClock(elapsed) }}
      </p>
      <div class="h-1.5 bg-rule mx-8 relative">
        <div class="h-full bg-ink" :style="{ width: `${Math.min(100, elapsed / MIN * 100)}%` }" />
        <span class="absolute -top-5 right-0 t-label text-[0.6rem]">30 s</span>
      </div>
      <button v-if="!startedAt" class="btn btn-ink mt-6 w-52" :disabled="!editable" @click="go">
        {{ L('L\'eau devient froide', 'Turn it cold') }}
      </button>
      <button v-else class="btn btn-ink mt-6 w-52" @click="stop">
        {{ L('Je sors', 'I\'m out') }}
      </button>
      <p class="t-body text-xs text-pencil mt-3">
        {{ L('Mains mouillées ? Appuyez sur un bouton de volume pour arrêter.', 'Wet hands? Press a volume button to stop.') }}
      </p>
      <p v-if="data.best" class="t-label mt-3">
        {{ L('Record du jour', 'Today\'s best') }} : {{ formatClock(data.best) }} {{ done ? '✓' : '' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.cold {
  position: relative;
  margin: -8px;
  padding: 8px;
  background: color-mix(in oklab, var(--color-ice) calc(var(--f) * 100%), transparent);
  transition: background 1s;
}

.frost {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.crystal {
  position: absolute;
  transition: opacity 1.5s;
}

.shiver {
  animation: shiver 120ms linear infinite;
}

@keyframes shiver {
  25% {
    transform: translateX(-1.5px);
  }
  75% {
    transform: translateX(1.5px);
  }
}
</style>
