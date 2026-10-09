<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, ref } from 'vue'
import InkCheck from '~/components/InkCheck.vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { lunch: false, dinner: false, bites: 0 })

function setMeal(meal: 'lunch' | 'dinner', v: boolean) {
  patch({ [meal]: v } as any)
  const both = (meal === 'lunch' ? v : data.value.lunch) && (meal === 'dinner' ? v : data.value.dinner)
  if (both && !done.value)
    markDone()
  else if (!both && done.value)
    unmark()
}

// Chew pacer: put the fork down, chew ~20 times, pick it up again.
const pacing = ref(false)
const chew = ref(0)
const forkDown = ref(true)
const CHEWS = 20
let timer: ReturnType<typeof setInterval> | undefined

function startPacer() {
  pacing.value = true
  chew.value = 0
  forkDown.value = true
  sfx.play('tick')
  timer = setInterval(() => {
    chew.value++
    haptic.select()
    if (chew.value >= CHEWS) {
      forkDown.value = false
      haptic.heartbeat()
      sfx.play('pop', 0.6)
      clearInterval(timer)
    }
  }, 700)
}

function nextBite() {
  patch({ bites: (data.value.bites ?? 0) + 1 })
  clearInterval(timer)
  startPacer()
}

function stopPacer() {
  pacing.value = false
  clearInterval(timer)
}

onBeforeUnmount(() => clearInterval(timer))

const jaw = computed(() => (chew.value % 2 ? 4 : 0))
</script>

<template>
  <div>
    <div class="flex justify-around">
      <InkCheck :model-value="data.lunch" :label="L('Lunch')" :size="64" :disabled="!editable" @update:model-value="v => setMeal('lunch', v)" />
      <InkCheck :model-value="data.dinner" :label="L('Dinner')" :size="64" :disabled="!editable" @update:model-value="v => setMeal('dinner', v)" />
    </div>

    <div class="mt-6 border-t-2 border-dashed border-ink pt-5">
      <div v-if="!pacing" class="text-center">
        <p class="t-body text-sm text-graphite mb-3">
          {{ L('At the table? The pacer helps you put your cutlery down.') }}
        </p>
        <button class="btn btn-ink" :disabled="!editable" @click="startPacer">
          {{ L('Start the pacer') }}
        </button>
      </div>
      <div v-else class="flex flex-col items-center">
        <svg viewBox="0 0 120 80" class="w-40">
          <g class="fork" :class="[{ up: !forkDown }]">
            <path d="M30 70 L30 30 M24 30 v-14 M30 30 v-14 M36 30 v-14 M24 30 q6 8 12 0" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linecap="round" />
          </g>
          <ellipse cx="82" :cy="44 + jaw / 2" rx="22" :ry="10 + jaw" fill="none" stroke="var(--color-ink)" stroke-width="3" class="mouth" />
          <line x1="10" y1="74" x2="110" y2="74" stroke="var(--color-ink)" stroke-width="3" />
        </svg>
        <p class="t-display text-4xl tabular-nums mt-2">
          {{ Math.min(chew, CHEWS) }}<span class="text-pencil text-xl">/{{ CHEWS }}</span>
        </p>
        <p class="t-label mt-1">
          {{ forkDown ? L('Cutlery down. Chew…') : L('Next bite') }}
        </p>
        <div class="flex gap-3 mt-4">
          <button class="btn" @click="stopPacer">
            {{ L('Meal over') }}
          </button>
          <button class="btn btn-ink" :disabled="forkDown" @click="nextBite">
            {{ L('Bite') }} →
          </button>
        </div>
        <p v-if="data.bites" class="t-body text-xs text-pencil mt-3">
          {{ data.bites }} {{ L('bites savoured') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fork {
  transition: transform 500ms var(--ease-spring);
  transform-origin: 30px 70px;
}

.fork.up {
  transform: translateY(-6px) rotate(-12deg);
}

.mouth {
  transition:
    ry 300ms,
    cy 300ms;
}
</style>
