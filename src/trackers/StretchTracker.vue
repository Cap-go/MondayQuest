<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import { computed, ref, watch } from 'vue'
import TimerRing from '~/components/TimerRing.vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 15 * 60_000

// Top of the body down to the legs, as the booklet advises.
const STEPS = computed(() => L.locale() === 'fr'
  ? ['Nuque', 'Épaules', 'Bras et poignets', 'Dos', 'Flancs', 'Hanches', 'Ischios', 'Mollets et chevilles']
  : ['Neck', 'Shoulders', 'Arms and wrists', 'Back', 'Sides', 'Hips', 'Hamstrings', 'Calves and ankles'])
const STEP_MS = GOAL / 8

const s = useSession(props, {
  targetMs: GOAL,
  keepAwake: true,
  title: () => L('FELINE FLEXIBILITY'),
  subtitle: () => STEPS.value[0]!,
  short: '⤢',
  doneBody: () => L('15 minutes of stretching. Nicely done!'),
})
const { running, elapsed, progress, done, toggle } = s

const voice = ref(true)
const stepIdx = computed(() => Math.min(7, Math.floor(elapsed.value / STEP_MS)))
const stepLeft = computed(() => STEP_MS - (elapsed.value % STEP_MS))

watch(stepIdx, (i, old) => {
  if (!running.value || i === old)
    return
  sfx.play('chime', 0.8)
  haptic.heartbeat()
  if (voice.value)
    void SpeechSynthesis.speak({ text: STEPS.value[i]!, language: L.tag(), rate: 0.9, queueStrategy: 'Flush' }).catch(() => {})
})

watch(running, (r) => {
  if (r && voice.value)
    void SpeechSynthesis.speak({ text: STEPS.value[stepIdx.value]!, language: L.tag(), rate: 0.9, queueStrategy: 'Flush' }).catch(() => {})
})
</script>

<template>
  <div class="flex flex-col items-center">
    <TimerRing :progress="progress" :size="220" :ticks="8">
      <p class="t-label text-graphite">
        {{ stepIdx + 1 }}/8
      </p>
      <p class="t-display text-2xl px-6 leading-tight">
        {{ STEPS[stepIdx] }}
      </p>
      <p class="t-body tabular-nums mt-1">
        {{ formatClock(stepLeft) }}
      </p>
    </TimerRing>
    <ol class="flex gap-1.5 mt-4">
      <li v-for="(_, i) in STEPS" :key="i" class="w-6 h-1.5" :class="i < stepIdx || done ? 'bg-ink' : i === stepIdx ? 'bg-graphite animate-pulse' : 'bg-rule'" />
    </ol>
    <div class="flex items-center gap-3 mt-5">
      <button class="btn btn-ink w-44" :disabled="!editable || done" @click="toggle">
        {{ done ? L('Stretched ✓') : running ? L('Pause') : elapsed ? L('Resume') : L('Start') }}
      </button>
      <button class="btn px-4" :class="{ 'btn-ink': voice }" :aria-pressed="voice" @click="voice = !voice">
        🗣
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ formatClock(elapsed) }} / 15:00 · {{ L('voice guidance') }}
    </p>
  </div>
</template>
