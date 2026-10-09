<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { fromISO } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { cravings: 0 })

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval>
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const clean = computed(() => {
  const ms = Math.max(0, now.value - fromISO(props.run.start).getTime())
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return { d, h, m, s }
})

// Hold the glass to drink it: 3 seconds of water instead of the craving.
const fill = ref(0)
const holding = ref(false)
let raf = 0
let t0 = 0
function holdStart() {
  if (!props.editable)
    return
  holding.value = true
  t0 = performance.now()
  sfx.play('water', 0.6)
  const loop = () => {
    fill.value = Math.min(1, (performance.now() - t0) / 3000)
    if (Math.floor(fill.value * 10) !== Math.floor((fill.value - 0.016) * 10))
      haptic.tap()
    if (fill.value >= 1) {
      holding.value = false
      haptic.success()
      sfx.play('chime')
      patch({ cravings: (data.value.cravings ?? 0) + 1 })
      setTimeout(() => (fill.value = 0), 900)
      return
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}
function holdEnd() {
  if (!holding.value)
    return
  holding.value = false
  cancelAnimationFrame(raf)
  const from = fill.value
  const start = performance.now()
  const drain = () => {
    fill.value = Math.max(0, from - (performance.now() - start) / 400)
    if (fill.value > 0)
      raf = requestAnimationFrame(drain)
  }
  drain()
}
</script>

<template>
  <div>
    <p class="t-label text-center text-graphite">
      {{ L('Libre depuis', 'Free for') }}
    </p>
    <div class="flex justify-center gap-3 mt-1 tabular-nums">
      <div v-for="(v, k) in { d: clean.d, h: clean.h, m: clean.m, s: clean.s }" :key="k" class="text-center">
        <p class="t-display text-4xl">
          {{ String(v).padStart(2, '0') }}
        </p>
        <p class="t-label text-[0.6rem] text-pencil">
          {{ { d: L('jours', 'days'), h: 'h', m: 'min', s: 's' }[k] }}
        </p>
      </div>
    </div>

    <div class="flex items-end gap-5 mt-6">
      <button class="glass" :class="{ holding }" :disabled="!editable" @pointerdown.prevent="holdStart" @pointerup="holdEnd" @pointerleave="holdEnd" @pointercancel="holdEnd">
        <svg viewBox="0 0 60 84" class="w-20">
          <clipPath id="glass-clip"><path d="M6 4 L54 4 L48 80 L12 80 Z" /></clipPath>
          <g clip-path="url(#glass-clip)">
            <rect x="0" :y="84 - fill * 80" width="60" height="84" fill="var(--color-ice)" />
            <path :d="`M0 ${84 - fill * 80} q7.5 -4 15 0 t15 0 t15 0 t15 0 v6 h-60z`" fill="var(--color-ice)" class="wave" />
          </g>
          <path d="M6 4 L54 4 L48 80 L12 80 Z" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="flex-1">
        <p class="t-display text-lg leading-tight">
          {{ L('Une envie ?', 'A craving?') }}
        </p>
        <p class="t-body text-sm text-graphite">
          {{ L('Maintenez le verre appuyé : buvez un grand verre d\'eau à la place.', 'Hold the glass: drink a big glass of water instead.') }}
        </p>
        <p v-if="data.cravings" class="t-label mt-2">
          {{ data.cravings }} {{ L('envie(s) vaincue(s)', 'craving(s) beaten') }}
        </p>
      </div>
    </div>

    <button class="btn btn-ink w-full mt-6" :disabled="!editable || done" @click="markDone()">
      {{ done ? L('Journée propre ✓', 'Clean day ✓') : L('Aujourd\'hui : rien consommé', 'Today: nothing taken') }}
    </button>
  </div>
</template>

<style scoped>
.glass {
  transition: transform 200ms var(--ease-spring);
}

.glass.holding {
  transform: scale(1.06) rotate(-6deg);
}

.wave {
  animation: wave 1.2s linear infinite;
}

@keyframes wave {
  to {
    transform: translateX(-30px);
  }
}
</style>
