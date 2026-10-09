<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
// Remember the book across days.
const lastBook = props.run.days.slice(0, props.idx).reverse().find(d => d.data.book)?.data.book ?? ''
const { data, done, patch, markDone } = useDay(props, { pages: 0, book: lastBook as string })
// 10 pages on day one, 2 more every day, 22 on day seven.
const GOAL = 10 + props.idx * 2
const flipping = ref(0)

function flip(n = 1) {
  if (!props.editable)
    return
  const pages = Math.max(0, data.value.pages + n)
  flipping.value++
  sfx.play('page', 0.6)
  haptic.select()
  patch({ pages })
  if (pages >= GOAL && !done.value)
    markDone({ pages })
}

let sx = 0
function down(e: PointerEvent) {
  sx = e.clientX
}
function up(e: PointerEvent) {
  const dx = e.clientX - sx
  if (dx < -30)
    flip(1)
  else if (dx > 30)
    flip(-1)
  else if (Math.abs(dx) < 6)
    flip(1)
}
</script>

<template>
  <div>
    <input :value="data.book" class="ink-input mb-4 text-center" :disabled="!editable" :placeholder="L('Titre du livre', 'Book title')" @change="patch({ book: ($event.target as HTMLInputElement).value })">
    <div class="book" @pointerdown="down" @pointerup="up">
      <div class="side left">
        <p class="t-display text-4xl tabular-nums">
          {{ data.pages }}
        </p>
        <p class="t-label text-graphite">
          {{ L('pages lues', 'pages read') }}
        </p>
        <p class="t-label text-pencil mt-1">
          {{ L('Aujourd\'hui', 'Today') }} · {{ GOAL }} pages
        </p>
      </div>
      <div class="side right">
        <div class="lines">
          <i v-for="i in 9" :key="i" :style="{ width: `${60 + ((i * 37) % 35)}%` }" />
        </div>
        <span class="t-label absolute bottom-2 right-3 text-pencil">{{ GOAL }} →</span>
      </div>
      <div :key="flipping" class="leaf" />
    </div>
    <div class="h-1.5 bg-rule mt-4">
      <div class="h-full bg-ink transition-all duration-500" :style="{ width: `${Math.min(100, data.pages / GOAL * 100)}%` }" />
    </div>
    <div class="flex gap-2 mt-4">
      <button class="btn flex-1" :disabled="!editable" @click="flip(5)">
        +5
      </button>
      <button class="btn btn-ink flex-[2]" :disabled="!editable" @click="flip(1)">
        {{ L('Tourner la page', 'Turn the page') }}
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('Balayez le livre vers la gauche à chaque page tournée.', 'Swipe the book left for every page you turn.') }}
    </p>
  </div>
</template>

<style scoped>
.book {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 150px;
  border: 2.5px solid var(--color-ink);
  perspective: 900px;
  touch-action: pan-y;
}

.side {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--color-sheet);
}

.left {
  border-right: 2px solid var(--color-ink);
}

.lines {
  width: 75%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lines i {
  height: 2px;
  background: var(--color-rule);
}

.leaf {
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 100%;
  background: var(--color-sheet);
  border-left: 2px solid var(--color-ink);
  transform-origin: left center;
  animation: leaf 600ms var(--ease-ink) forwards;
  backface-visibility: hidden;
}

@keyframes leaf {
  0% {
    transform: rotateY(0);
    box-shadow: none;
  }
  100% {
    transform: rotateY(-180deg);
    box-shadow: -20px 0 30px -20px rgb(0 0 0 / 0.4);
    opacity: 0;
  }
}
</style>
