<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// A tear-off calendar: pick a year, write the memory, rip the page off.
const props = defineProps<TrackerProps>()
const L = useL()
const NOW = new Date().getFullYear()
const MIN = NOW - 80
const { data, done, patch, markDone } = useDay(props, { year: NOW - 10, text: '' })

const year = computed(() => data.value.year)
const ready = computed(() => data.value.text.trim().length > 2)

// Drag the big year sideways to scroll through time.
let yx = 0
let y0 = 0
function yearDown(e: PointerEvent) {
  if (!props.editable || done.value)
    return
  yx = e.clientX
  y0 = year.value;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function yearMove(e: PointerEvent) {
  if (!yx)
    return
  const next = Math.max(MIN, Math.min(NOW, Math.round(y0 - (e.clientX - yx) / 14)))
  if (next !== year.value) {
    haptic.select()
    patch({ year: next })
  }
}
function yearUp() {
  yx = 0
}
function step(d: number) {
  const next = Math.max(MIN, Math.min(NOW, year.value + d))
  haptic.select()
  sfx.play('tick', 0.4)
  patch({ year: next })
}

// Swipe the page down to tear it off.
const pull = ref(0)
const tearing = ref(false)
let py = 0
function pageDown(e: PointerEvent) {
  if (!props.editable || done.value || !ready.value)
    return
  py = e.clientY;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function pageMove(e: PointerEvent) {
  if (!py)
    return
  const d = Math.max(0, e.clientY - py)
  if (Math.floor(d / 30) > Math.floor(pull.value / 30))
    haptic.tap()
  pull.value = d
  if (d > 110)
    tear()
}
function pageUp() {
  py = 0
  if (!tearing.value)
    pull.value = 0
}
function tear() {
  py = 0
  tearing.value = true
  sfx.play('page')
  haptic.thud()
  setTimeout(() => {
    markDone({ year: year.value, text: data.value.text.trim() })
    tearing.value = false
    pull.value = 0
  }, 520)
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="pad">
      <!-- binding -->
      <div class="binding">
        <span v-for="i in 6" :key="i" class="ring" />
      </div>
      <div v-if="!done" class="page" :class="{ tearing }" :style="{ transform: tearing ? undefined : `translateY(${pull * 0.35}px) rotate(${pull * 0.04}deg)` }" @pointerdown="pageDown" @pointermove="pageMove" @pointerup="pageUp" @pointercancel="pageUp">
        <div class="perf" />
        <div class="flex items-center justify-between px-3 pt-3">
          <button class="nudge" :disabled="!editable" :aria-label="L('Année précédente', 'Previous year')" @pointerdown.stop @click="step(-1)">
            ‹
          </button>
          <p class="t-display text-5xl tabular-nums select-none touch-none cursor-ew-resize" @pointerdown.stop="yearDown" @pointermove="yearMove" @pointerup="yearUp" @pointercancel="yearUp">
            {{ year }}
          </p>
          <button class="nudge" :disabled="!editable || year >= NOW" :aria-label="L('Année suivante', 'Next year')" @pointerdown.stop @click="step(1)">
            ›
          </button>
        </div>
        <p class="t-label text-pencil text-center">
          {{ NOW - year ? L(`il y a ${NOW - year} ans`, `${NOW - year} years ago`) : L('cette année', 'this year') }}
        </p>
        <textarea class="memo t-body" rows="4" :value="data.text" :disabled="!editable" :placeholder="L('Ce jour-là, sur la plage avec papa…', 'That day at the beach with dad…')" @pointerdown.stop @input="patch({ text: ($event.target as HTMLTextAreaElement).value })" />
        <div class="pull" :class="{ on: ready }">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v15M6 13l6 6 6-6" /></svg>
          <span class="t-label">{{ ready ? L('Tirez pour arracher', 'Pull down to tear') : L('Écrivez un souvenir', 'Write a memory') }}</span>
        </div>
      </div>
      <!-- the stub left on the pad once torn -->
      <div v-else class="page kept">
        <p class="t-display text-4xl tabular-nums text-center pt-3">
          {{ data.year }}
        </p>
        <p class="t-body text-sm italic text-graphite px-4 pb-4 pt-2 whitespace-pre-wrap text-center">
          {{ data.text }}
        </p>
      </div>
    </div>
    <p v-if="!editable && !done" class="t-body text-xs text-pencil mt-3">
      {{ L('Aucun souvenir ce jour-là.', 'No memory that day.') }}
    </p>
  </div>
</template>

<style scoped>
.pad {
  position: relative;
  width: 100%;
  max-width: 300px;
}

.binding {
  display: flex;
  justify-content: space-around;
  height: 18px;
  background: var(--color-ink);
  padding: 0 12px;
  position: relative;
  z-index: 2;
}

.ring {
  width: 6px;
  height: 22px;
  margin-top: -8px;
  border: 2px solid var(--color-ink);
  background: var(--color-paper);
}

.page {
  position: relative;
  background: var(--color-sheet);
  border: 2.5px solid var(--color-ink);
  border-top: none;
  transform-origin: 85% 0;
  touch-action: none;
  transition: transform 260ms var(--ease-spring);
}

.page.tearing {
  animation: tear 520ms var(--ease-ink) forwards;
}

.page.kept {
  animation: settle 500ms var(--ease-out-quint);
}

.perf {
  height: 6px;
  background-image: radial-gradient(circle, var(--color-ink) 1.2px, transparent 1.6px);
  background-size: 8px 6px;
}

.nudge {
  width: 36px;
  height: 36px;
  font-size: 26px;
  line-height: 1;
}

.memo {
  display: block;
  width: calc(100% - 24px);
  margin: 10px 12px 0;
  padding: 6px 2px;
  background: repeating-linear-gradient(transparent 0 23px, var(--color-rule) 23px 24px);
  line-height: 24px;
  resize: none;
  outline: none;
}

.pull {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 12px;
  color: var(--color-pencil);
}

.pull.on {
  color: var(--color-ink);
}

.pull.on svg {
  animation: nudge 1.4s ease-in-out infinite;
}

@keyframes nudge {
  50% {
    transform: translateY(4px);
  }
}

@keyframes tear {
  0% {
    transform: translateY(38px) rotate(4deg);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
  30% {
    transform: translateY(46px) rotate(-3deg);
  }
  100% {
    transform: translateY(420px) rotate(-18deg);
    opacity: 0;
    clip-path: polygon(0 4%, 12% 0, 26% 5%, 40% 1%, 55% 6%, 70% 0, 85% 5%, 100% 1%, 100% 100%, 0 100%);
  }
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
