<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import { HomeIndicator } from '@capgo/capacitor-home-indicator'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 15 * 60_000
const zen = ref(false)

const s = useSession(props, {
  targetMs: GOAL,
  keepAwake: true,
  title: () => 'ZEN CHEF',
  subtitle: () => L('Méditation · 15 min', 'Meditation · 15 min'),
  short: '◯',
  doneBody: () => L('15 minutes de calme. Revenez doucement.', '15 minutes of calm. Come back gently.'),
  onComplete: () => void logMindful(),
})
const { running, elapsed, progress, done, start, pause } = s

// Breathing: 4s in, 6s out. The circle swells and a soft tick marks each turn.
const phase = computed(() => (elapsed.value % 10_000) / 10_000)
const inhale = computed(() => phase.value < 0.4)
const scale = computed(() => (inhale.value ? 0.55 + (phase.value / 0.4) * 0.45 : 1 - ((phase.value - 0.4) / 0.6) * 0.45))
watch(inhale, (v) => {
  if (running.value && v)
    haptic.tap()
})

async function begin() {
  zen.value = true
  sfx.play('bell', 0.8)
  await HomeIndicator.hide().catch(() => {})
  await start()
}

async function end() {
  await pause()
  zen.value = false
  await HomeIndicator.show().catch(() => {})
}

async function logMindful() {
  zen.value = false
  void HomeIndicator.show().catch(() => {})
  if (!Capacitor.isNativePlatform())
    return
  const ok = await Health.requestAuthorization({ write: ['mindfulness'] }).catch(() => null)
  if (!ok?.writeAuthorized.includes('mindfulness'))
    return
  await Health.saveSample({ dataType: 'mindfulness', value: 15, unit: 'minute', startDate: new Date(Date.now() - GOAL).toISOString(), endDate: new Date().toISOString(), mindfulnessSessionType: 'meditation' }).catch(() => {})
}

onBeforeUnmount(() => void HomeIndicator.show().catch(() => {}))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="breath" :style="{ '--s': running ? scale : 1 }">
      <svg viewBox="0 0 200 200" class="w-52 h-52">
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-rule)" stroke-width="2" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-ink)" stroke-width="3" :stroke-dasharray="578" :stroke-dashoffset="578 * (1 - progress)" transform="rotate(-90 100 100)" />
        <circle cx="100" cy="100" r="78" fill="var(--color-paper)" stroke="var(--color-pencil)" stroke-width="1.5" class="lung" />
      </svg>
      <div class="absolute inset-0 grid place-items-center text-center">
        <div>
          <p class="t-display text-3xl tabular-nums">
            {{ formatClock(Math.max(0, GOAL - elapsed)) }}
          </p>
          <p class="t-label text-graphite">
            {{ running ? (inhale ? L('Inspirez', 'Breathe in') : L('Expirez', 'Breathe out')) : L('Durée de méditation', 'Meditation time') }}
          </p>
        </div>
      </div>
    </div>
    <button class="btn btn-ink mt-5 w-48" :disabled="!editable || done" @click="running ? end() : begin()">
      {{ done ? L('Méditation faite ✓', 'Meditated ✓') : running ? L('Pause', 'Pause') : elapsed ? L('Reprendre', 'Resume') : L('S\'asseoir', 'Sit down') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('Écran gardé allumé · séance enregistrée dans Santé', 'Screen kept awake · session saved to Health') }}
    </p>

    <!-- full-screen zen mode -->
    <Teleport to="body">
      <Transition name="zen">
        <div v-if="zen && running" class="zen" @click="end">
          <div class="zen-circle" :style="{ transform: `scale(${scale})` }" />
          <p class="t-label text-paper/70 mt-10">
            {{ inhale ? L('Inspirez', 'Breathe in') : L('Expirez', 'Breathe out') }}
          </p>
          <p class="t-body text-paper/40 text-sm mt-2 tabular-nums">
            {{ formatClock(Math.max(0, GOAL - elapsed)) }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.breath {
  position: relative;
}

.lung {
  transform-origin: 100px 100px;
  transform: scale(var(--s));
  transition: transform 400ms linear;
}

.zen {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--color-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.zen-circle {
  width: 62vw;
  height: 62vw;
  border-radius: 50%;
  border: 2px solid var(--color-paper);
  transition: transform 400ms linear;
}

.zen-enter-active,
.zen-leave-active {
  transition: opacity 900ms ease;
}

.zen-enter-from,
.zen-leave-to {
  opacity: 0;
}
</style>
