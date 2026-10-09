<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { switches: 0, wrist: 'left' as 'left' | 'right', since: 0 })

const now = ref(Date.now())
let t: ReturnType<typeof setInterval>
onMounted(() => (t = setInterval(() => (now.value = Date.now()), 30_000)))
onBeforeUnmount(() => clearInterval(t))

const since = computed(() => data.value.since || new Date(new Date().setHours(0, 0, 0, 0)).getTime())
const cleanFor = computed(() => {
  const m = Math.floor((now.value - since.value) / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m} min`
})

function complained() {
  if (!props.editable)
    return
  haptic.error()
  sfx.play('whoosh', 0.6)
  patch({ switches: data.value.switches + 1, wrist: data.value.wrist === 'left' ? 'right' : 'left', since: Date.now() })
}
</script>

<template>
  <div>
    <div class="arms">
      <div v-for="side in (['left', 'right'] as const)" :key="side" class="wrist" :class="side">
        <svg viewBox="0 0 80 120" class="w-20">
          <path :d="side === 'left' ? 'M30 120 V40 q0 -24 14 -30 q14 6 14 30 V120' : 'M22 120 V40 q0 -24 14 -30 q14 6 14 30 V120'" fill="none" stroke="var(--color-ink)" stroke-width="3" />
          <ellipse v-if="data.wrist === side" :key="data.switches" cx="40" cy="78" rx="22" ry="7" fill="none" stroke="var(--color-ink)" stroke-width="6" class="band" />
        </svg>
        <p class="t-label text-center text-xs">
          {{ side === 'left' ? L('Gauche', 'Left') : L('Droit', 'Right') }}
        </p>
      </div>
    </div>
    <p class="t-body text-center mt-3">
      <span class="t-display">{{ cleanFor }}</span> {{ L('sans plainte', 'without complaining') }}
    </p>
    <p v-if="data.switches" class="t-label text-center text-graphite mt-1">
      {{ data.switches }} {{ L('changement(s) de poignet', 'wrist switch(es)') }}
    </p>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn" :disabled="!editable" @click="complained">
        {{ L('Je me suis plaint', 'I complained') }}
      </button>
      <button class="btn btn-ink" :disabled="!editable || done" @click="markDone()">
        {{ done ? L('Journée ✓', 'Day ✓') : L('Zéro plainte', 'Zero complaints') }}
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('Une plainte = changez le bracelet de poignet et le compteur repart.', 'One complaint = switch wrists and the counter restarts.') }}
    </p>
  </div>
</template>

<style scoped>
.arms {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.band {
  animation: slip 600ms var(--ease-spring);
}

@keyframes slip {
  from {
    transform: translateY(-60px);
    opacity: 0;
  }
}
</style>
