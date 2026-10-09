<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 10 * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('LE JONGLEUR', 'THE JUGGLER'),
  subtitle: () => L('10 min d\'entraînement', '10 min of practice'),
  short: '◦◦◦',
  doneBody: () => L('10 minutes de jonglage. Les balles vous remercient.', '10 minutes of juggling. The balls thank you.'),
})
const { running, elapsed, progress, done } = s
const extra = useDay(props, { best: 0, catches: 0 })

const streak = ref(0)
const pop = ref(0)
let lastTap = 0

// Cascade animation: phase advances one third of a beat per catch, so the
// balls fly as fast as you tap.
const phase = ref(0)
let rate = 0.25
let raf = 0
let prev = 0
function frame(t: number) {
  const dt = prev ? Math.min(0.05, (t - prev) / 1000) : 0
  prev = t
  if (performance.now() - lastTap > 1600)
    rate += (0.15 - rate) * 0.03
  phase.value = (phase.value + dt * rate) % 2
  raf = requestAnimationFrame(frame)
}
onMounted(() => (raf = requestAnimationFrame(frame)))
onBeforeUnmount(() => cancelAnimationFrame(raf))

const balls = computed(() => [0, 1, 2].map((i) => {
  const p = (phase.value + (i * 2) / 3) % 2
  const u = p % 1
  const fromRight = p < 1
  const x = fromRight ? 200 - u * 120 : 80 + u * 120
  const y = 150 - 4 * u * (1 - u) * 110
  return { x, y }
}))

function tap() {
  if (!props.editable)
    return
  if (!running.value && !done.value)
    void s.start()
  const now = performance.now()
  const gap = now - lastTap
  lastTap = now
  streak.value = gap < 1500 ? streak.value + 1 : 1
  if (gap < 1500)
    rate += (Math.min(2, 1000 / gap / 3) - rate) * 0.5
  pop.value++
  haptic.tap()
  sfx.play('tick', 0.35)
  const best = Math.max(extra.data.value.best, streak.value)
  if (best > extra.data.value.best && best % 5 === 0)
    sfx.play('pop', 0.6)
  extra.patch({ best, catches: extra.data.value.catches + 1 })
}

function drop() {
  if (!streak.value)
    return
  streak.value = 0
  lastTap = 0
  haptic.warning()
  sfx.play('erase', 0.5)
}
</script>

<template>
  <div class="flex flex-col items-center">
    <button class="pad" :disabled="!editable" :aria-label="L('Rattraper', 'Catch')" @click="tap">
      <svg viewBox="0 0 280 190" class="w-full">
        <circle v-for="(b, i) in balls" :key="i" :cx="b.x" :cy="b.y" r="11" :fill="i === 0 ? 'var(--color-sun)' : i === 1 ? 'var(--color-ice)' : 'var(--color-paper)'" stroke="var(--color-ink)" stroke-width="2.5" />
        <path d="M60 162 q20 14 40 0" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        <path d="M180 162 q20 14 40 0" fill="none" stroke="var(--color-ink)" stroke-width="3" />
        <line x1="20" x2="260" y1="184" y2="184" stroke="var(--color-rule)" stroke-width="2" />
      </svg>
      <span :key="pop" class="t-display text-5xl tabular-nums count">{{ streak }}</span>
    </button>
    <p class="t-label text-graphite mt-1">
      {{ L('Tapez à chaque rattrapage', 'Tap on every catch') }}
    </p>
    <div class="grid grid-cols-3 w-full mt-4 text-center">
      <div>
        <p class="t-display text-xl tabular-nums">
          {{ extra.data.value.best }}
        </p>
        <p class="t-label text-pencil text-[10px]">
          {{ L('Record', 'Best') }}
        </p>
      </div>
      <div>
        <p class="t-display text-xl tabular-nums">
          {{ formatClock(Math.max(0, GOAL - elapsed)) }}
        </p>
        <p class="t-label text-pencil text-[10px]">
          {{ done ? L('Fait', 'Done') : L('Restant', 'Left') }}
        </p>
      </div>
      <div>
        <p class="t-display text-xl tabular-nums">
          {{ extra.data.value.catches }}
        </p>
        <p class="t-label text-pencil text-[10px]">
          {{ L('Rattrapages', 'Catches') }}
        </p>
      </div>
    </div>
    <div class="h-1 w-full bg-rule mt-3">
      <div class="h-full bg-ink" :style="{ width: `${progress * 100}%`, transition: 'width 300ms linear' }" />
    </div>
    <div class="flex gap-2 w-full mt-4">
      <button class="btn flex-1" :disabled="!editable || !streak" @click="drop">
        {{ L('Tombée !', 'Dropped!') }}
      </button>
      <button v-if="!done" class="btn btn-ink flex-1" :disabled="!editable" @click="s.toggle()">
        {{ running ? L('Pause', 'Pause') : elapsed ? L('Reprendre', 'Resume') : L('Démarrer', 'Start') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pad {
  position: relative;
  width: 100%;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  padding: 8px 8px 0;
  transition: transform 120ms var(--ease-spring);
}

.pad:active:not(:disabled) {
  transform: scale(0.98);
}

.count {
  position: absolute;
  top: 10px;
  right: 14px;
  animation: bump 260ms var(--ease-spring);
}

@keyframes bump {
  from {
    transform: scale(1.35);
  }
}
</style>
