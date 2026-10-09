<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

type Pile = 'give' | 'sell' | 'recycle'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 10
const { data, done, patch, markDone, unmark } = useDay(props, { items: [] as Pile[] })

const pile = ref<Pile>('give')
const fresh = ref(-1)
const piles = computed(() => [
  { id: 'give' as Pile, label: L('Donner', 'Give') },
  { id: 'sell' as Pile, label: L('Vendre', 'Sell') },
  { id: 'recycle' as Pile, label: L('Recycler', 'Recycle') },
])
const count = computed(() => data.value.items.length)
const tally = computed(() => piles.value.map(p => ({ ...p, n: data.value.items.filter(i => i === p.id).length })))
const short = (p: Pile) => ({ give: L('DON', 'GIVE'), sell: L('VENTE', 'SELL'), recycle: L('RECYC', 'RECYC') })[p]

// items stack in rows of 5 at the bottom of the box
function slot(i: number) {
  const row = Math.floor(i / 5)
  const col = i % 5
  return { x: 46 + col * 30 + (row % 2) * 6, y: 150 - row * 20 }
}

function choose(p: Pile) {
  if (!props.editable)
    return
  pile.value = p
  haptic.select()
}

function drop() {
  if (!props.editable || count.value >= GOAL)
    return
  const items = [...data.value.items, pile.value]
  fresh.value = items.length - 1
  sfx.play('pop', 0.6)
  setTimeout(() => {
    haptic.thud()
    sfx.play('stamp', 0.4)
  }, 340)
  if (items.length >= GOAL)
    setTimeout(markDone, 700, { items })
  else
    patch({ items })
}

function undo() {
  if (!props.editable || !count.value)
    return
  const items = data.value.items.slice(0, -1)
  sfx.play('erase')
  haptic.tap()
  if (done.value)
    unmark()
  patch({ items })
}

// swipe up (or tap) on the box to throw the item in
let y0 = 0
function down(e: PointerEvent) {
  y0 = e.clientY
}
function up(e: PointerEvent) {
  if (y0 - e.clientY > 24 || Math.abs(y0 - e.clientY) < 8)
    drop()
}
</script>

<template>
  <div class="flex flex-col items-center select-none">
    <div v-if="editable && !done" class="flex gap-2 mb-4">
      <button v-for="p in piles" :key="p.id" class="btn px-3 py-1 text-sm" :class="{ 'btn-ink': pile === p.id }" @click="choose(p.id)">
        {{ p.label }}
      </button>
    </div>
    <svg viewBox="0 0 240 200" width="260" height="216" class="touch-none" :class="{ 'cursor-pointer': editable && !done }" @pointerdown="down" @pointerup="up">
      <!-- items -->
      <g v-for="(it, i) in data.items" :key="i" :transform="`translate(${slot(i).x} ${slot(i).y})`">
        <g class="item" :class="{ fresh: i === fresh }">
          <rect x="-13" y="-16" width="26" height="16" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="2" :transform="`rotate(${(i * 37) % 11 - 5})`" />
          <text x="0" y="-5" text-anchor="middle" font-size="6.5" font-weight="700" fill="var(--color-ink)" :transform="`rotate(${(i * 37) % 11 - 5})`">{{ short(it) }}</text>
        </g>
      </g>
      <!-- box body -->
      <path d="M36 80 L204 80 L204 180 L36 180 Z" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="miter" />
      <path d="M36 180 L36 80" stroke="var(--color-ink)" stroke-width="3" />
      <line x1="100" y1="128" x2="140" y2="128" stroke="var(--color-pencil)" stroke-width="2" />
      <!-- flaps -->
      <g class="flap left" :class="{ shut: done }">
        <path d="M36 80 L8 50 L96 50 L120 80" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="miter" />
      </g>
      <g class="flap right" :class="{ shut: done }">
        <path d="M204 80 L232 50 L144 50 L120 80" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" stroke-linejoin="miter" />
      </g>
      <rect v-if="done" x="104" y="74" width="32" height="12" fill="var(--color-ice)" stroke="var(--color-ink)" stroke-width="2" class="tape" />
    </svg>
    <p class="t-display text-4xl tabular-nums mt-1">
      {{ count }}<span class="text-pencil">/{{ GOAL }}</span>
    </p>
    <div class="flex gap-4 mt-2">
      <span v-for="t in tally" :key="t.id" class="t-label text-graphite">{{ t.label }} {{ t.n }}</span>
    </div>
    <p v-if="done" class="t-body text-sm text-graphite mt-3">
      {{ L('Carton fermé. Dix de moins.', 'Box closed. Ten things lighter.') }}
    </p>
    <p v-else-if="editable" class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('Glissez vers le haut ou touchez le carton pour y jeter un objet.', 'Swipe up or tap the box to throw a thing in.') }}
    </p>
    <button v-if="editable && count" class="t-label text-pencil underline mt-2" @click="undo">
      {{ L('Annuler le dernier', 'Undo last') }}
    </button>
  </div>
</template>

<style scoped>
.item.fresh {
  animation: fall 420ms cubic-bezier(0.5, 0, 0.75, 0) both;
}

@keyframes fall {
  from {
    transform: translateY(-150px) rotate(-12deg);
  }
  80% {
    transform: translateY(3px);
  }
  to {
    transform: none;
  }
}

.flap {
  transition: transform 520ms var(--ease-spring);
  transform-box: view-box;
}

.flap.left {
  transform-origin: 36px 80px;
}

.flap.right {
  transform-origin: 204px 80px;
}

.flap.left.shut {
  transform: scaleY(-0.18);
}

.flap.right.shut {
  transform: scaleY(-0.18);
  transition-delay: 160ms;
}

.tape {
  animation: tape 300ms 600ms var(--ease-out-quint) both;
}

@keyframes tape {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}
</style>
