<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { fruits: ['', ''] as string[], veggies: ['', ''] as string[] })

const FRUITS = ['Apple', 'Banana', 'Orange', 'Kiwi', 'Pear', 'Strawberries', 'Grapes', 'Clementine', 'Blueberries', 'Mango', 'Pineapple', 'Plum']
const VEGGIES = ['Carrot', 'Tomato', 'Courgette', 'Broccoli', 'Spinach', 'Lettuce', 'Pepper', 'Green beans', 'Cucumber', 'Cauliflower', 'Leek', 'Beetroot']

const focus = ref<{ kind: 'fruits' | 'veggies', i: number }>({ kind: 'fruits', i: 0 })
const suggestions = computed(() => (focus.value.kind === 'fruits' ? FRUITS : VEGGIES).map(x => L(x)))

const filled = computed(() => [...data.value.fruits, ...data.value.veggies].map(s => !!s.trim()))
const valid = computed(() => {
  const f = data.value.fruits.map(s => s.trim().toLowerCase()).filter(Boolean)
  const v = data.value.veggies.map(s => s.trim().toLowerCase()).filter(Boolean)
  return f.length >= 2 && v.length >= 2 && new Set(f).size === f.length && new Set(v).size === v.length
})

function set(kind: 'fruits' | 'veggies', i: number, value: string) {
  const list = [...data.value[kind]]
  const was = !!list[i]?.trim()
  list[i] = value
  patch({ [kind]: list } as any)
  if (!was && value.trim()) {
    sfx.play('pop')
    haptic.tap()
  }
  check()
}

function check() {
  if (valid.value && !done.value)
    markDone()
  else if (!valid.value && done.value)
    unmark()
}

function pickSuggestion(s: string) {
  set(focus.value.kind, focus.value.i, s)
  // move focus to the next empty slot
  const order: Array<{ kind: 'fruits' | 'veggies', i: number }> = [{ kind: 'fruits', i: 0 }, { kind: 'fruits', i: 1 }, { kind: 'veggies', i: 0 }, { kind: 'veggies', i: 1 }]
  const next = order.find(o => !data.value[o.kind][o.i]?.trim())
  if (next)
    focus.value = next
}

// the plate: four slices filling up
const slices = [
  { d: 'M60 60 L60 14 A46 46 0 0 1 106 60 Z' },
  { d: 'M60 60 L106 60 A46 46 0 0 1 60 106 Z' },
  { d: 'M60 60 L60 106 A46 46 0 0 1 14 60 Z' },
  { d: 'M60 60 L14 60 A46 46 0 0 1 60 14 Z' },
]
</script>

<template>
  <div>
    <div class="flex items-center gap-4">
      <svg viewBox="0 0 120 120" class="w-28 h-28 shrink-0">
        <circle cx="60" cy="60" r="56" fill="none" stroke="var(--color-ink)" stroke-width="2.5" />
        <path v-for="(s, i) in slices" :key="i" :d="s.d" class="slice" :class="{ on: filled[i] }" :fill="i < 2 ? 'var(--color-ink)' : 'url(#hatch)'" stroke="var(--color-ink)" stroke-width="2" />
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-ink)" stroke-width="2.4" />
          </pattern>
        </defs>
      </svg>
      <div class="flex-1 grid grid-cols-2 gap-x-3 text-sm">
        <div>
          <p class="t-label mb-1">
            {{ L('Fruits') }}
          </p>
          <label v-for="i in 2" :key="i" class="flex items-baseline gap-1">
            <span class="text-xs">{{ i }}.</span>
            <input class="ink-input text-sm" :value="data.fruits[i - 1]" :disabled="!editable" :placeholder="L(FRUITS[i * 3]!)" @focus="focus = { kind: 'fruits', i: i - 1 }" @change="set('fruits', i - 1, ($event.target as HTMLInputElement).value)">
          </label>
        </div>
        <div>
          <p class="t-label mb-1">
            {{ L('Veggies') }}
          </p>
          <label v-for="i in 2" :key="i" class="flex items-baseline gap-1">
            <span class="text-xs">{{ i }}.</span>
            <input class="ink-input text-sm" :value="data.veggies[i - 1]" :disabled="!editable" :placeholder="L(VEGGIES[i * 4]!)" @focus="focus = { kind: 'veggies', i: i - 1 }" @change="set('veggies', i - 1, ($event.target as HTMLInputElement).value)">
          </label>
        </div>
      </div>
    </div>
    <div v-if="editable" class="flex gap-2 overflow-x-auto no-scrollbar mt-4 -mx-1 px-1 pb-1">
      <button v-for="s in suggestions" :key="s" class="chip" @click="pickSuggestion(s)">
        {{ s }}
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Two different fruits and two different veggies. The box ticks itself.') }}
    </p>
  </div>
</template>

<style scoped>
.slice {
  opacity: 0;
  transform-origin: 60px 60px;
  transform: scale(0.6);
  transition:
    opacity 300ms,
    transform 420ms var(--ease-spring);
}

.slice.on {
  opacity: 1;
  transform: scale(1);
}

.chip {
  flex-shrink: 0;
  border: 1.5px solid var(--color-ink);
  padding: 6px 12px;
  font-size: 0.85rem;
  background: var(--color-sheet);
  transition: transform 150ms var(--ease-spring);
}

.chip:active {
  transform: scale(0.92);
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>
