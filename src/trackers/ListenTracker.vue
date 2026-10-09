<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TimerRing from '~/components/TimerRing.vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useSession } from './useSession'

// Full attention: the clock only runs while the phone lies flat on the table, face down.
// Afterwards, an honest four-point check: no advice, no "me too", open questions, reflecting back.
const props = defineProps<TrackerProps>()
const L = useL()
/** 5 minutes on day one to 20 on day seven. */
const MIN = Math.round(5 + props.idx * 2.5)
const GOAL = MIN * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('LEND AN EAR'),
  subtitle: () => L(`Listening · ${MIN} min`),
  short: '◉',
  doneBody: () => L('Time is up. Finish the conversation, then check in with yourself.'),
  autoCheck: false,
})
const { running, elapsed, progress, remaining, done, patch, markDone, data } = s

const who = ref(String((data.value as any).who ?? ''))
const CHECKS = [
  { key: 'noAdvice', en: 'I gave no advice' },
  { key: 'noMeToo', en: 'No "me too", I didn\'t make it about me' },
  { key: 'questions', en: 'I asked open questions' },
  { key: 'reflected', en: 'I reflected back what I heard' },
] as const
const checks = ref<Record<string, boolean>>({ ...((data.value as any).checks ?? {}) })
const score = computed(() => CHECKS.filter(c => checks.value[c.key]).length)
const timeDone = computed(() => elapsed.value >= GOAL)

// Phone-down detection
const armed = ref(false)
const flat = ref(true)
let handle: PluginListenerHandle | undefined
let sensorless = false
let samples = 0
let liftedAt = 0

function onSample(m: { x: number, y: number, z: number }) {
  samples++
  flat.value = Math.abs(m.z) > 0.85
  evaluate()
}

function evaluate() {
  if (!armed.value || timeDone.value)
    return
  if (sensorless || flat.value) {
    liftedAt = 0
    if (!running.value)
      void s.start()
    return
  }
  liftedAt ||= Date.now()
  // Picking the phone up pauses after 2 s (a glance is fine, scrolling is not).
  if (running.value && Date.now() - liftedAt > 2000) {
    void s.pause()
    haptic.buzz(60)
  }
}

async function arm() {
  if (!props.editable || done.value || !who.value.trim())
    return
  patch({ who: who.value.trim() } as any)
  armed.value = true
  samples = 0
  haptic.press()
  sfx.play('chime', 0.5)
  handle = await CapacitorAccelerometer.addListener('measurement', onSample).catch(() => undefined)
  await CapacitorAccelerometer.startMeasurementUpdates().catch(() => {})
  setTimeout(() => {
    sensorless = samples === 0
    evaluate()
  }, 1200)
}

function disarm() {
  armed.value = false
  void CapacitorAccelerometer.stopMeasurementUpdates().catch(() => {})
  void handle?.remove()
  handle = undefined
}

async function stop() {
  disarm()
  await s.pause()
}

function toggleCheck(key: string) {
  if (!props.editable || done.value)
    return
  haptic.select()
  checks.value = { ...checks.value, [key]: !checks.value[key] }
  patch({ checks: checks.value } as any)
}

function finish() {
  if (!timeDone.value || score.value < 3 || done.value)
    return
  disarm()
  sfx.play('stamp')
  markDone({ who: who.value.trim(), checks: checks.value, elapsed: elapsed.value } as any)
}

onMounted(() => {
  if (running.value && !done.value)
    void arm()
})
onBeforeUnmount(disarm)
</script>

<template>
  <div class="flex flex-col items-center">
    <TimerRing :progress="progress" :size="200" :ticks="MIN">
      <svg viewBox="0 0 48 48" class="w-10 h-10 mx-auto mb-1" :class="{ breathe: running }">
        <path d="M15 19a9 9 0 0 1 18 0c0 6-5 8-6 13a5 5 0 0 1-9 1M20 20a4 4 0 0 1 8 0c0 3-3 3.5-3 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      </svg>
      <p class="t-display text-4xl tabular-nums">
        {{ formatClock(running || elapsed ? remaining : GOAL) }}
      </p>
      <p class="t-label mt-1 text-graphite">
        {{ timeDone ? L('Time held') : armed && !running ? L('Put the phone down') : `${L('Today')} · ${MIN} min` }}
      </p>
    </TimerRing>

    <template v-if="!done && editable">
      <input v-if="!armed && !timeDone" v-model="who" class="ink-input w-full mt-4 text-center" :placeholder="L('Who are you listening to? (my sister, Sam…)')">
      <button v-if="!armed && !timeDone" class="btn btn-ink mt-3 w-60" :disabled="!who.trim()" @click="arm">
        {{ elapsed ? L('Keep listening') : L('Listening, phone down') }}
      </button>
      <button v-else-if="armed && !timeDone" class="btn mt-4 w-60" @click="stop">
        {{ L('Pause') }}
      </button>
      <p v-if="!timeDone" class="t-body text-xs text-pencil mt-3 text-center px-4">
        {{ L('Lay the phone flat, screen against the table. The clock only runs while it stays there.') }}
      </p>

      <div v-if="timeDone" class="w-full mt-5">
        <p class="t-label">
          {{ L('Honestly…') }}
        </p>
        <button v-for="c in CHECKS" :key="c.key" class="check-row" :class="{ on: checks[c.key] }" @click="toggleCheck(c.key)">
          <span class="box">{{ checks[c.key] ? '✓' : '' }}</span>
          <span class="t-body text-sm text-left">{{ L(c.en) }}</span>
        </button>
        <button class="btn btn-ink w-full mt-4" :disabled="score < 3" @click="finish">
          {{ score >= 3 ? L('I was really there') : L(`${score}/4 · at least 3`) }}
        </button>
      </div>
    </template>
    <p v-else-if="done" class="t-body text-sm text-center mt-4">
      {{ L(`You listened to ${(data as any).who}.`) }}
    </p>
  </div>
</template>

<style scoped>
.breathe {
  animation: breathe 3.2s ease-in-out infinite;
}

@keyframes breathe {
  50% {
    transform: scale(1.12);
  }
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 0;
  border-bottom: 1.5px dashed var(--color-rule);
}

.box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 2px solid var(--color-ink);
  font-weight: 800;
}

.check-row.on .box {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>
