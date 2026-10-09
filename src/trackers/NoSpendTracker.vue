<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { coins: [] as number[] })
const CHIPS = [2, 5, 10, 20]
const custom = ref('')
const fresh = ref('')

const fmt = (n: number) => new Intl.NumberFormat(L.tag(), { maximumFractionDigits: 2 }).format(n)

// every coin of the week, day by day, so the jar shows the whole run
const all = computed(() => props.run.days.flatMap((d, day) =>
  ((day === props.idx ? data.value.coins : d.data?.coins) as number[] | undefined ?? []).map((v, k) => ({ v, day, k })),
))
const total = computed(() => all.value.reduce((s, c) => s + c.v, 0))
const daysClean = computed(() => props.run.days.filter(d => d.done).length)

function pos(i: number) {
  const row = Math.floor(i / 6)
  const col = i % 6
  return { x: 58 + col * 17 + (row % 2) * 8, y: 196 - row * 8, r: ((i * 53) % 21) - 10 }
}

function add(v: number) {
  if (!props.editable || !(v > 0))
    return
  const coins = [...data.value.coins, Math.round(v * 100) / 100].slice(-40)
  fresh.value = `${props.idx}-${coins.length - 1}`
  patch({ coins })
  sfx.play('pop', 0.7)
  haptic.tap()
  setTimeout(() => haptic.press(), 260)
}

function addCustom() {
  add(Number.parseFloat(custom.value.replace(',', '.')))
  custom.value = ''
}

function removeLast() {
  if (!props.editable || !data.value.coins.length)
    return
  patch({ coins: data.value.coins.slice(0, -1) })
  sfx.play('erase')
  haptic.select()
}

function confirm() {
  if (!props.editable)
    return
  if (done.value)
    return unmark()
  sfx.play('chime', 0.6)
  haptic.success()
  markDone()
}
</script>

<template>
  <div class="flex flex-col items-center select-none">
    <svg viewBox="0 0 240 230" width="230" height="220">
      <!-- slot lid -->
      <rect x="62" y="22" width="116" height="20" fill="var(--color-sheet)" stroke="var(--color-ink)" stroke-width="3" />
      <line x1="100" y1="32" x2="140" y2="32" stroke="var(--color-ink)" stroke-width="4" />
      <!-- coins -->
      <g v-for="(c, i) in all.slice(0, 66)" :key="`${c.day}-${c.k}`" :transform="`translate(${pos(i).x} ${pos(i).y}) rotate(${pos(i).r})`">
        <g :class="{ drop: `${c.day}-${c.k}` === fresh }">
          <ellipse cx="0" cy="0" rx="9" ry="4" :fill="c.day === idx ? 'var(--color-sun)' : 'var(--color-sheet)'" stroke="var(--color-ink)" stroke-width="2" />
        </g>
      </g>
      <!-- jar -->
      <path d="M70 42 L70 56 Q38 66 38 100 L38 200 Q38 212 50 212 L190 212 Q202 212 202 200 L202 100 Q202 66 170 56 L170 42" fill="none" stroke="var(--color-ink)" stroke-width="3" />
      <path d="M54 110 L54 170" stroke="var(--color-rule)" stroke-width="3" />
      <!-- label -->
      <rect x="78" y="96" width="84" height="40" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" />
      <text x="120" y="122" text-anchor="middle" font-size="18" font-weight="800" fill="var(--color-ink)" class="t-display">{{ fmt(total) }}</text>
    </svg>
    <p class="t-label text-graphite">
      {{ L('Économisé cette semaine', 'Saved this week') }} · {{ daysClean }}/7 {{ L('jours', 'days') }}
    </p>

    <template v-if="editable && !done">
      <p class="t-body text-sm text-graphite mt-4 text-center">
        {{ L('Une envie résistée ? Glissez son prix dans le bocal.', 'Resisted something? Drop its price in the jar.') }}
      </p>
      <div class="flex gap-2 mt-3">
        <button v-for="c in CHIPS" :key="c" class="btn px-3 py-1 tabular-nums" @click="add(c)">
          +{{ c }}
        </button>
      </div>
      <div class="flex items-end gap-2 mt-3 w-56">
        <input v-model="custom" class="ink-input text-center" inputmode="decimal" :placeholder="L('Autre montant', 'Other amount')" @keyup.enter="addCustom">
        <button class="btn px-3 py-1" :disabled="!custom" @click="addCustom">
          +
        </button>
      </div>
      <button v-if="data.coins.length" class="t-label text-pencil underline mt-2" @click="removeLast">
        {{ L('Retirer la dernière pièce', 'Take the last coin back') }}
      </button>
    </template>

    <button class="btn mt-5 w-64" :class="{ 'btn-ink': !done }" :disabled="!editable" @click="confirm">
      {{ done ? L('Rien dépensé aujourd\'hui ✓', 'Nothing spent today ✓') : L('Je n\'ai rien acheté de superflu', 'I bought nothing non-essential') }}
    </button>
    <p v-if="editable && !done" class="t-body text-xs text-pencil mt-2 text-center max-w-64">
      {{ L('À confirmer le soir, une fois la journée finie.', 'Confirm in the evening, once the day is over.') }}
    </p>
  </div>
</template>

<style scoped>
.drop {
  animation: coin-drop 520ms cubic-bezier(0.5, 0, 0.75, 0) both;
}

@keyframes coin-drop {
  from {
    transform: translateY(-170px) scaleX(0.3);
  }
  70% {
    transform: translateY(4px) scaleX(1);
  }
  85% {
    transform: translateY(-5px);
  }
  to {
    transform: none;
  }
}
</style>
