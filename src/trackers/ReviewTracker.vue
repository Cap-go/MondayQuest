<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { challengesOfLevel, LEVELS } from '~/data/challenges'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const quest = useQuest()
const { data, done, markDone } = useDay(props, { note: '' })

// Levels I–X over seven days: two per day at first, then one.
const PLAN = [[1, 2], [3, 4], [5, 6], [7], [8], [9], [10]]
const levels = computed(() => PLAN[props.idx] ?? [10])
const page = ref(0)
const dir = ref<'next' | 'prev'>('next')
const level = computed(() => LEVELS.find(l => l.n === levels.value[page.value])!)

const rows = computed(() => challengesOfLevel(level.value.n).map((c) => {
  const runs = quest.runs.filter(r => r.challengeId === c.id)
  const best = Math.max(0, ...runs.map(r => r.days.filter(d => d.done).length))
  return { c, title: c.text[quest.locale].title, completed: quest.completedIds.has(c.id), best, tried: runs.length > 0 }
}))
const score = computed(() => rows.value.filter(r => r.completed).length)

function flip(d: 1 | -1) {
  const n = page.value + d
  if (n < 0 || n >= levels.value.length)
    return
  dir.value = d > 0 ? 'next' : 'prev'
  page.value = n
  sfx.play('page')
  haptic.select()
}

const note = ref(data.value.note)
function save() {
  if (!props.editable || !note.value.trim())
    return
  sfx.play('stamp', 0.6)
  markDone({ note: note.value.trim() })
}
</script>

<template>
  <div>
    <div class="book">
      <Transition :name="`turn-${dir}`" mode="out-in">
        <div :key="level.n" class="leaf">
          <div class="flex items-baseline justify-between">
            <p class="t-label text-graphite">
              {{ L('Niveau', 'Level') }} {{ level.roman }}
            </p>
            <p class="t-label text-pencil text-[10px]">
              {{ score }}/{{ rows.length }}
            </p>
          </div>
          <h3 class="t-display text-2xl leading-none mt-1">
            {{ level.text[quest.locale] }}
          </h3>
          <ul class="mt-3 divide-y-[1.5px] divide-rule">
            <li v-for="r in rows" :key="r.c.id" class="flex items-center gap-2 py-1.5">
              <QuestIcon :name="r.c.icon" :size="22" :stroke="2" class="shrink-0" :class="{ 'opacity-40': !r.completed }" />
              <span class="t-body text-sm flex-1 truncate" :class="{ 'text-pencil line-through': !r.completed && !r.tried }">{{ r.title }}</span>
              <svg viewBox="0 0 20 20" class="w-5 h-5 shrink-0">
                <rect x="2" y="2" width="16" height="16" fill="none" stroke="var(--color-ink)" stroke-width="2" />
                <path v-if="r.completed" d="M5 10 l4 4 l7 -10" fill="none" stroke="var(--color-ink)" stroke-width="2.5" />
                <text v-else-if="r.tried" x="10" y="14" text-anchor="middle" font-size="10" font-weight="800" fill="var(--color-graphite)">{{ r.best }}</text>
              </svg>
            </li>
          </ul>
        </div>
      </Transition>
      <div v-if="levels.length > 1" class="flex justify-between mt-2">
        <button class="btn px-3 py-1" :disabled="page === 0" :aria-label="L('Page précédente', 'Previous page')" @click="flip(-1)">
          ←
        </button>
        <span class="t-label text-pencil self-center text-[10px]">{{ page + 1 }} / {{ levels.length }}</span>
        <button class="btn px-3 py-1" :disabled="page === levels.length - 1" :aria-label="L('Page suivante', 'Next page')" @click="flip(1)">
          →
        </button>
      </div>
    </div>
    <p class="t-label text-graphite mt-4">
      {{ L('Ce qui a changé', 'What changed') }}
    </p>
    <p v-if="done || !editable" class="t-body text-sm mt-1 italic">
      {{ data.note || '—' }}
    </p>
    <div v-else class="flex items-end gap-2 mt-1">
      <input v-model="note" class="ink-input flex-1" :placeholder="L('Je marche encore tous les matins', 'I still walk every morning')" @keyup.enter="save">
      <button class="btn btn-ink" :disabled="!note.trim()" @click="save">
        {{ L('Noter', 'Save') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.book {
  border: 2.5px solid var(--color-ink);
  padding: 12px 14px;
  background: var(--color-sheet);
  perspective: 900px;
}

.leaf {
  transform-origin: left center;
}

.turn-next-enter-active,
.turn-next-leave-active,
.turn-prev-enter-active,
.turn-prev-leave-active {
  transition:
    transform 260ms var(--ease-out-quint),
    opacity 260ms ease;
}

.turn-next-leave-to,
.turn-prev-enter-from {
  transform: rotateY(-70deg);
  opacity: 0;
}

.turn-next-enter-from,
.turn-prev-leave-to {
  transform: rotateY(25deg) translateX(20px);
  opacity: 0;
}
</style>
