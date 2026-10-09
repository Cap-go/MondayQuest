<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { what: '', before: 7, after: 0 as number })
const what = ref(data.value.what)
const stage = ref<'before' | 'after'>(data.value.after ? 'after' : 'before')

function setLevel(k: 'before' | 'after', v: number) {
  if (Math.round(v) !== Math.round(data.value[k]))
    haptic.select()
  patch({ [k]: v } as any)
}

function leap() {
  if (!what.value.trim())
    return
  patch({ what: what.value.trim() })
  stage.value = 'after'
  haptic.thud()
}

function landed() {
  markDone({ what: what.value.trim(), after: data.value.after || 1 })
}

const shrink = computed(() => data.value.before - (data.value.after || data.value.before))
</script>

<template>
  <div>
    <label class="block">
      <span class="t-label">{{ L('Ce qui me fait peur aujourd\'hui', 'What scares me today') }}</span>
      <input v-model="what" class="ink-input mt-1" :disabled="!editable || stage === 'after'" :placeholder="L('Prendre la parole en réunion', 'Speak up in the meeting')">
    </label>

    <div class="flex items-end justify-center gap-10 mt-6">
      <div v-for="k in (['before', 'after'] as const)" :key="k" class="flex flex-col items-center" :class="{ 'opacity-30': k === 'after' && stage === 'before' }">
        <svg viewBox="0 0 48 48" class="flame" :style="{ width: `${28 + (data[k] || 0) * 6}px` }">
          <path d="M24 42c-7 0-12-5-12-11.5 0-6 4-9 6-14 1 3 2.5 4.5 4 5-1-6 2-12 7-16-.5 6 3 9 5.5 12.5 1.5 2.5 2.5 5 2.5 8C37 37 31 42 24 42z" :fill="k === 'before' ? 'var(--color-ink)' : 'none'" stroke="var(--color-ink)" stroke-width="2.4" />
        </svg>
        <input type="range" min="0" max="10" step="1" class="slider mt-2" :value="data[k]" :disabled="!editable || (k === 'after' && stage === 'before') || (k === 'before' && stage === 'after')" @input="setLevel(k, Number(($event.target as HTMLInputElement).value))">
        <p class="t-label text-xs mt-1">
          {{ k === 'before' ? L('Avant', 'Before') : L('Après', 'After') }} · {{ data[k] }}/10
        </p>
      </div>
    </div>

    <button v-if="stage === 'before'" class="btn btn-ink w-full mt-6" :disabled="!editable || !what.trim()" @click="leap">
      {{ L('J\'y vais', 'Here I go') }}
    </button>
    <button v-else class="btn btn-ink w-full mt-6" :disabled="!editable || done" @click="landed">
      {{ done ? L('Saut réussi ✓', 'Leap made ✓') : L('Je l\'ai fait', 'I did it') }}
    </button>
    <p v-if="done && shrink > 0" class="t-body text-sm text-center mt-3">
      {{ L(`Votre peur a fondu de ${shrink} points.`, `Your fear shrank by ${shrink} points.`) }}
    </p>
  </div>
</template>

<style scoped>
.flame {
  transition: width 300ms var(--ease-spring);
  animation: flicker 1.4s ease-in-out infinite;
  transform-origin: bottom center;
}

@keyframes flicker {
  50% {
    transform: scaleY(1.06) skewX(-2deg);
  }
}

.slider {
  width: 110px;
  accent-color: var(--color-ink);
}
</style>
