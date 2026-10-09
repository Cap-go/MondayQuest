<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock, formatHM } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { cancelTimerEnd, scheduleTimerEnd } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { endSessionActivity, startSessionActivity } from '~/services/widgets'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
// The fast usually starts the evening before: carry yesterday's last meal over.
const carried = props.idx > 0 ? props.run.days[props.idx - 1]!.data.lastMeal : undefined
const { data, done, patch, markDone } = useDay(props, { fastStart: carried as number | undefined, fasted: 0, lastMeal: undefined as number | undefined })
const GOAL = 16 * 3_600_000
const key = `${props.run.id}-fast-${props.idx}`

const now = ref(Date.now())
let t: ReturnType<typeof setInterval>
onMounted(() => (t = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(t))

const fasting = computed(() => !!data.value.fastStart && !done.value)
const elapsed = computed(() => (data.value.fastStart ? now.value - data.value.fastStart : 0))
const progress = computed(() => Math.min(1, elapsed.value / GOAL))

// 24h clock face: the fasting arc is ink, the eating window stays paper.
const arc = computed(() => {
  const start = data.value.fastStart ? new Date(data.value.fastStart) : new Date(new Date().setHours(20, 0, 0, 0))
  const a0 = ((start.getHours() + start.getMinutes() / 60) / 24) * 360
  return { a0, a1: a0 + 240 }
})

function polar(a: number, r = 80) {
  const rad = ((a - 90) * Math.PI) / 180
  return `${100 + Math.cos(rad) * r} ${100 + Math.sin(rad) * r}`
}

function startFast() {
  const start = Date.now()
  patch({ fastStart: start })
  sfx.play('chime')
  haptic.press()
  void scheduleTimerEnd(key, L('SEIZE HUIT', 'SIXTEEN EIGHT'), L('16 heures de jeûne ! Bon appétit.', '16 hours fasted! Enjoy your meal.'), GOAL)
  void startSessionActivity({ title: L('SEIZE HUIT', 'SIXTEEN EIGHT'), subtitle: L('Jeûne en cours', 'Fasting'), short: '◔', icon: 'clock', durationMs: GOAL, startedAt: start })
}

function breakFast() {
  const fasted = elapsed.value
  void cancelTimerEnd(key)
  void endSessionActivity()
  if (fasted >= GOAL) {
    markDone({ fasted })
  }
  else {
    haptic.warning()
    patch({ fasted, fastStart: undefined })
  }
}

function lastMealNow() {
  patch({ lastMeal: Date.now() })
  haptic.tap()
  sfx.play('tick')
}
</script>

<template>
  <div class="flex flex-col items-center">
    <svg viewBox="0 0 200 200" class="w-56 h-56">
      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-rule)" stroke-width="16" />
      <path :d="`M ${polar(arc.a0)} A 80 80 0 1 1 ${polar(arc.a1)}`" fill="none" stroke="var(--color-ink)" stroke-width="16" :opacity="fasting || done ? 1 : 0.18" />
      <path v-if="fasting" :d="`M ${polar(arc.a0)} A 80 80 0 ${progress > 0.75 ? 1 : 0} 1 ${polar(arc.a0 + 240 * progress)}`" fill="none" stroke="var(--color-sun)" stroke-width="6" stroke-linecap="round" />
      <text v-for="h in [0, 6, 12, 18]" :key="h" :x="polar(h * 15, 58).split(' ')[0]" :y="Number(polar(h * 15, 58).split(' ')[1]) + 4" text-anchor="middle" font-family="Archivo" font-size="10" fill="var(--color-pencil)">{{ h }}h</text>
      <text x="100" y="100" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="24">{{ fasting ? formatClock(elapsed) : done ? '16:8 ✓' : '16:8' }}</text>
      <text x="100" y="120" text-anchor="middle" font-family="Archivo" font-size="10" fill="var(--color-graphite)">{{ fasting ? L(`depuis ${formatHM(new Date(data.fastStart!))}`, `since ${formatHM(new Date(data.fastStart!))}`) : L('jeûne · fenêtre', 'fast · window') }}</text>
    </svg>
    <div class="grid grid-cols-2 gap-3 w-full mt-3">
      <button v-if="!fasting" class="btn btn-ink col-span-2" :disabled="!editable || done" @click="startFast">
        {{ done ? L('Jeûne réussi ✓', 'Fast complete ✓') : L('Je commence à jeûner', 'Start fasting') }}
      </button>
      <template v-else>
        <button class="btn" @click="breakFast">
          {{ progress >= 1 ? L('Rompre le jeûne', 'Break the fast') : L('J\'arrête', 'Stop') }}
        </button>
        <div class="t-body text-sm text-center self-center tabular-nums">
          {{ formatClock(Math.max(0, GOAL - elapsed)) }} {{ L('restant', 'left') }}
        </div>
      </template>
    </div>
    <button v-if="done && isToday" class="t-label underline underline-offset-4 mt-4" @click="lastMealNow">
      {{ data.lastMeal ? L(`Dernier repas : ${formatHM(new Date(data.lastMeal))}`, `Last meal: ${formatHM(new Date(data.lastMeal))}`) : L('Noter mon dernier repas (démarre le jeûne de demain)', 'Log my last meal (starts tomorrow\'s fast)') }}
    </button>
  </div>
</template>
