<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

interface Card { w: string, t: string }

// A few flashcards a day: write the word, flip to check the meaning, hear it.
// 3 words on day one, one more every day, 9 on day seven.
const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 3 + props.idx
const { data, done, patch, markDone } = useDay(props, { lang: '', cards: [] as Card[] })
// Always show today's slots (or more, if an older day stored more cards).
const cards = computed<Card[]>(() => Array.from({ length: Math.max(GOAL, data.value.cards.length) }, (_, i) => data.value.cards[i] ?? { w: '', t: '' }))

// Carry yesterday's language over so the user only picks it once.
const lang = computed(() => data.value.lang || [...props.run.days.slice(0, props.idx)].reverse().find(d => d.data?.lang)?.data.lang || 'es-ES')
const LANGS: [string, string, string][] = [
  ['es-ES', 'Espagnol', 'Spanish'],
  ['it-IT', 'Italien', 'Italian'],
  ['de-DE', 'Allemand', 'German'],
  ['pt-PT', 'Portugais', 'Portuguese'],
  ['nl-NL', 'Néerlandais', 'Dutch'],
  ['ja-JP', 'Japonais', 'Japanese'],
  ['zh-CN', 'Chinois', 'Chinese'],
  ['ar-SA', 'Arabe', 'Arabic'],
  ['ru-RU', 'Russe', 'Russian'],
  ['en-GB', 'Anglais', 'English'],
  ['fr-FR', 'Français', 'French'],
]

const flipped = ref<number[]>([])
const editing = ref<number | null>(null)
const w = ref('')
const t = ref('')
const count = computed(() => cards.value.filter(c => c.w.trim() && c.t.trim()).length)

function tapCard(i: number) {
  const c = cards.value[i]!
  if (!c.w.trim()) {
    if (!props.editable)
      return
    editing.value = i
    w.value = ''
    t.value = ''
    haptic.tap()
    return
  }
  flipped.value = flipped.value.includes(i) ? flipped.value.filter(j => j !== i) : [...flipped.value, i]
  sfx.play('page', 0.6)
  haptic.select()
}

function save() {
  const i = editing.value
  if (i == null || !w.value.trim() || !t.value.trim())
    return
  const next = cards.value.map((c, j) => (j === i ? { w: w.value.trim(), t: t.value.trim() } : c))
  editing.value = null
  sfx.play('pop')
  haptic.press()
  patch({ cards: next, lang: lang.value })
  void say(next[i]!.w)
  if (next.filter(c => c.w && c.t).length >= GOAL && !done.value)
    markDone({ cards: next, lang: lang.value })
}

async function say(text: string) {
  await SpeechSynthesis.speak({ text, language: lang.value, rate: 0.85, queueStrategy: 'Flush' }).catch(() => {})
}

function setLang(v: string) {
  haptic.select()
  patch({ lang: v })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <select class="ink-input t-label w-auto" :value="lang" :disabled="!editable" @change="setLang(($event.target as HTMLSelectElement).value)">
        <option v-for="[code, fr, en] in LANGS" :key="code" :value="code">
          {{ L(fr, en) }}
        </option>
      </select>
      <p class="t-display text-2xl tabular-nums">
        {{ count }}<span class="text-pencil text-base">/{{ GOAL }}</span>
      </p>
    </div>
    <p class="t-label text-graphite mt-2">
      {{ L('Aujourd\'hui', 'Today') }} · {{ GOAL }} {{ L('mots', 'words') }}
    </p>

    <div class="grid grid-cols-2 gap-2.5 mt-3">
      <div v-for="(c, i) in cards" :key="i" class="scene" :class="{ wide: (cards.length % 2 === 1 && i === cards.length - 1) || editing === i, open: editing === i }">
        <div v-if="editing === i" class="face front edit">
          <input v-model="w" class="ink-input text-center" :placeholder="L('Mot', 'Word')" autofocus>
          <input v-model="t" class="ink-input text-center text-sm" :placeholder="L('Traduction', 'Translation')" @keyup.enter="save">
          <div class="flex gap-2 mt-1">
            <button class="btn btn-ink px-3 py-1 text-xs" :disabled="!w.trim() || !t.trim()" @click="save">
              OK
            </button>
            <button class="btn px-3 py-1 text-xs" @click="editing = null">
              ✕
            </button>
          </div>
        </div>
        <button v-else class="card" :class="{ flip: flipped.includes(i), blank: !c.w }" @click="tapCard(i)">
          <span class="face front">
            <template v-if="c.w">
              <span class="t-display text-lg leading-tight break-words">{{ c.w }}</span>
              <span class="speak" role="button" :aria-label="L('Prononcer', 'Pronounce')" @click.stop="say(c.w)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>
              </span>
            </template>
            <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-pencil)" stroke-width="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span class="face back">
            <span class="t-body text-base">{{ c.t }}</span>
          </span>
        </button>
      </div>
    </div>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ done ? L(`${GOAL} mots de plus dans la poche.`, `${GOAL} more words in your pocket.`) : L('Touchez une carte pour la retourner', 'Tap a card to flip it') }}
    </p>
  </div>
</template>

<style scoped>
.scene {
  perspective: 600px;
  height: 92px;
}

.scene.open {
  height: auto;
}

.scene.wide {
  grid-column: span 2;
}

.card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 520ms var(--ease-spring);
}

.card.flip {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  backface-visibility: hidden;
}

.card.blank .front {
  border-style: dashed;
  border-color: var(--color-pencil);
}

.back {
  transform: rotateY(180deg);
  background: var(--color-ink);
  color: var(--color-paper);
}

.edit {
  position: relative;
  padding: 10px;
}

.speak {
  position: absolute;
  right: 6px;
  bottom: 6px;
  color: var(--color-graphite);
}
</style>
