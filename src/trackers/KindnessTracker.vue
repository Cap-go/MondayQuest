<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { what: '' })
const what = ref(data.value.what)
const sprouted = ref(false)

// one leaf per kind day of the week, in order
const leaves = computed(() => props.run.days
  .map((d, day) => ({ day, done: day === props.idx ? done.value : d.done }))
  .filter(d => d.done)
  .map((d, k) => ({ ...d, y: 196 - (k + 1) * 21, left: k % 2 === 0 })))
const stage = computed(() => leaves.value.length)
const top = computed(() => (stage.value ? 196 - stage.value * 21 - 14 : 196))

function plant() {
  if (!props.editable)
    return
  if (done.value) {
    sprouted.value = false
    return unmark()
  }
  if (!what.value.trim())
    return
  sprouted.value = true
  markDone({ what: what.value.trim() })
  setTimeout(() => {
    sfx.play('water', 0.5)
    haptic.heartbeat()
  }, 380)
}
</script>

<template>
  <div class="flex flex-col items-center">
    <svg viewBox="0 0 220 250" width="220" height="250">
      <!-- stem: drawn up to the current stage -->
      <path d="M110 200 C104 170 116 140 108 110 C102 80 116 60 110 40" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray="1" :stroke-dashoffset="1 - (stage ? Math.min(1, (stage * 21 + 14) / 160) : 0)" class="stem" />
      <!-- leaves -->
      <g v-for="l in leaves" :key="l.day" :transform="`translate(${109} ${l.y}) scale(${l.left ? -1 : 1} 1)`">
        <g class="leaf" :class="{ unfurl: sprouted && l.day === idx }">
          <path d="M0 0 C10 -16 30 -16 40 -6 C28 4 12 6 0 0 Z" :fill="l.day === idx ? 'var(--color-ice)' : 'var(--color-sheet)'" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M2 -1 C14 -7 26 -8 36 -6" fill="none" stroke="var(--color-ink)" stroke-width="1.5" />
        </g>
      </g>
      <!-- seed, or bud, or flower -->
      <ellipse v-if="!stage" cx="110" cy="194" rx="8" ry="5" fill="var(--color-ink)" />
      <g v-else-if="stage >= 7" :transform="`translate(110 ${top})`" class="bloom">
        <circle v-for="p in 6" :key="p" :cx="Math.cos(p * Math.PI / 3) * 11" :cy="Math.sin(p * Math.PI / 3) * 11" r="8" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="2.5" />
        <circle r="6" fill="var(--color-sun)" stroke="var(--color-ink)" stroke-width="2.5" />
      </g>
      <path v-else :d="`M110 ${top + 8} C104 ${top} 106 ${top - 8} 110 ${top - 10} C114 ${top - 8} 116 ${top} 110 ${top + 8} Z`" fill="var(--color-ink)" class="bud" />
      <!-- pot -->
      <path d="M70 200 L150 200 L142 244 L78 244 Z" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="miter" />
      <line x1="64" y1="200" x2="156" y2="200" stroke="var(--color-ink)" stroke-width="3" />
    </svg>
    <p class="t-label text-graphite mt-1">
      {{ L('Étape', 'Stage') }} {{ stage }}/7
    </p>

    <div class="w-64 mt-4">
      <label class="t-label text-graphite">{{ L('Votre bonne action du jour', 'Today\'s act of kindness') }}</label>
      <textarea v-model="what" rows="2" class="ink-input mt-1 resize-none" :disabled="!editable || done" :placeholder="L('J\'ai porté les courses de ma voisine', 'Carried my neighbour\'s shopping')" @change="patch({ what: what.trim() })" />
    </div>
    <button class="btn mt-4 w-56" :class="{ 'btn-ink': !done }" :disabled="!editable || (!done && !what.trim())" @click="plant">
      {{ done ? L('Une feuille de plus ✓', 'One more leaf ✓') : L('Faire pousser', 'Make it grow') }}
    </button>
  </div>
</template>

<style scoped>
.stem {
  transition: stroke-dashoffset 900ms var(--ease-out-quint);
}

.leaf.unfurl {
  animation: unfurl 900ms 250ms var(--ease-spring) both;
  transform-origin: 0 0;
}

@keyframes unfurl {
  from {
    transform: scale(0.05, 0.05) rotate(40deg);
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
}

.bloom {
  animation: bloom 900ms var(--ease-spring) both;
}

@keyframes bloom {
  from {
    opacity: 0;
  }
}
</style>
