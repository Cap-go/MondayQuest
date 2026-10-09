<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// Padlock every feed in the morning, swear you kept them shut at night.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { locked: [] as string[], urges: 0, slipped: false })

const APPS: { id: string, d: string }[] = [
  { id: 'photo', d: 'M6 9h4l2-3h8l2 3h4v15H6zM16 13a4 4 0 1 0 0 8 4 4 0 1 0 0-8' },
  { id: 'video', d: 'M5 8h22v16H5zM14 12v8l6-4z' },
  { id: 'bird', d: 'M6 22c8 2 16-2 18-12l3-2-3 0c-2-2-6-1-6 3-5 0-8-2-11-5-1 4 0 7 3 9-2 0-3 0-4-1 0 3 3 5 5 6-2 1-4 2-5 2z' },
  { id: 'chat', d: 'M5 7h22v13H14l-6 5v-5H5zM10 13h12' },
  { id: 'note', d: 'M13 24a3 3 0 1 1-3-3h3V8l10-2v14a3 3 0 1 1-3-3h3' },
  { id: 'news', d: 'M6 7h20v18H6zM10 11h12M10 15h12M10 19h8' },
]

const allLocked = computed(() => APPS.every(a => data.value.locked.includes(a.id)))

function lock(id: string) {
  if (!props.editable || done.value || data.value.locked.includes(id))
    return
  const locked = [...data.value.locked, id]
  sfx.play('stamp', 0.6)
  haptic.press()
  patch({ locked })
  if (locked.length === APPS.length)
    setTimeout(() => haptic.success(), 200)
}

function setUrges(v: number) {
  if (v !== data.value.urges)
    haptic.select()
  patch({ urges: v })
}

function clean() {
  if (!allLocked.value)
    return
  markDone({ slipped: false, urges: data.value.urges })
}

function slip() {
  if (!props.editable)
    return
  sfx.play('erase')
  haptic.warning()
  patch({ slipped: true })
}

// Clean days in a row, ending today.
const streak = computed(() => {
  let n = 0
  for (let i = props.idx; i >= 0; i--) {
    if (props.run.days[i]?.done)
      n++
    else if (i !== props.idx)
      break
  }
  return n
})
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-3">
      <button v-for="(a, i) in APPS" :key="a.id" class="tile" :class="{ locked: data.locked.includes(a.id) || done }" :style="{ '--d': `${i * 40}ms` }" :disabled="!editable" :aria-label="a.id" @click="lock(a.id)">
        <svg viewBox="0 0 32 32" class="w-10 h-10 app" fill="none" stroke="var(--color-ink)" stroke-width="2.2" stroke-linejoin="round"><path :d="a.d" /></svg>
        <svg viewBox="0 0 32 32" class="lock" fill="none" stroke="var(--color-ink)" stroke-width="2.6">
          <path class="shackle" d="M11 15V11a5 5 0 0 1 10 0v4" />
          <rect x="8" y="15" width="16" height="12" fill="var(--color-sheet)" />
          <path d="M16 19v4" />
        </svg>
      </button>
    </div>
    <p class="t-label text-graphite text-center mt-3">
      {{ done ? L('Journée sans réseaux', 'A feed-free day') : allLocked ? L('Tout est cadenassé', 'Everything is padlocked') : L(`Cadenassez vos applis · ${data.locked.length}/${APPS.length}`, `Padlock your apps · ${data.locked.length}/${APPS.length}`) }}
    </p>

    <Transition name="rise">
      <div v-if="allLocked && !done" class="checkin">
        <p class="t-display text-lg">
          {{ L('Le soir venu', 'Come evening') }}
        </p>
        <label class="t-label text-graphite block mt-2">
          {{ L('Tentations ressenties', 'Urges felt') }} · <span class="tabular-nums text-ink">{{ data.urges }}{{ data.urges >= 10 ? '+' : '' }}</span>
        </label>
        <input type="range" min="0" max="10" class="w-full ink-range" :value="data.urges" :disabled="!editable" @input="setUrges(+($event.target as HTMLInputElement).value)">
        <div class="flex gap-2 mt-3">
          <button class="btn btn-ink flex-1" :disabled="!editable || data.slipped" @click="clean">
            {{ L('Je ne les ai pas ouvertes', 'I didn\'t open them') }}
          </button>
          <button class="btn px-3" :disabled="!editable" @click="slip">
            {{ L('Craqué', 'Slipped') }}
          </button>
        </div>
        <p v-if="data.slipped" class="t-body text-xs text-graphite mt-2">
          {{ L('Pas grave. Refermez-les et repartez demain.', 'No big deal. Shut them again and go again tomorrow.') }}
        </p>
      </div>
    </Transition>

    <div class="flex items-center justify-center gap-1.5 mt-4">
      <span v-for="(d, i) in run.days" :key="i" class="pip" :class="{ on: d.done, today: i === idx }" />
      <span class="t-label text-graphite ml-2 tabular-nums">{{ L(`${streak} j propres`, `${streak} clean days`) }}</span>
    </div>
    <p v-if="done && data.urges" class="t-body text-xs text-pencil text-center mt-2">
      {{ L(`${data.urges} tentations repoussées`, `${data.urges} urges resisted`) }}
    </p>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  transition: transform 200ms var(--ease-spring);
}

.tile:active {
  transform: scale(0.94);
}

.app {
  transition:
    opacity 300ms,
    filter 300ms;
}

.locked .app {
  opacity: 0.25;
}

.lock {
  position: absolute;
  width: 34px;
  height: 34px;
  right: -8px;
  bottom: -8px;
  opacity: 0;
  transform: translateY(-14px) scale(1.4);
  transition:
    opacity 200ms,
    transform 380ms var(--ease-spring);
}

.locked .lock {
  opacity: 1;
  transform: none;
  transition-delay: var(--d);
}

.shackle {
  transform: translateY(-4px);
  transition: transform 260ms var(--ease-spring) 180ms;
}

.locked .shackle {
  transform: none;
}

.checkin {
  margin-top: 16px;
  padding: 14px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
}

.ink-range {
  accent-color: var(--color-ink);
}

.pip {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--color-ink);
}

.pip.on {
  background: var(--color-ink);
}

.pip.today {
  outline: 2px solid var(--color-sun);
  outline-offset: 1px;
}

.rise-enter-active {
  transition: all 450ms var(--ease-out-quint);
}

.rise-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
</style>
