<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { to: '', words: '' })
const to = ref(data.value.to)
const words = ref(data.value.words)
const landing = ref(false)

// Zig-zag rosette edge, 24 points.
function rosette(cx: number, cy: number, r1: number, r2: number) {
  const pts = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2
    const r = i % 2 ? r2 : r1
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  })
  return `M${pts.join('L')}Z`
}
const big = rosette(60, 50, 40, 33)
const small = rosette(20, 16, 13, 10.5)

const ready = computed(() => to.value.trim().length > 0 && words.value.trim().length > 2)

const week = computed(() => props.run.days.map((d, i) => ({
  i,
  on: d.done,
  initial: String(d.data?.to ?? '').trim().charAt(0).toUpperCase(),
  today: i === props.idx,
})))

function pin() {
  if (!props.editable || !ready.value || done.value)
    return
  landing.value = true
  haptic.press()
  setTimeout(() => {
    sfx.play('stamp')
    haptic.thud()
    markDone({ to: to.value.trim(), words: words.value.trim() })
  }, 320)
  setTimeout(() => (landing.value = false), 900)
}

function save() {
  patch({ to: to.value, words: words.value })
}
</script>

<template>
  <div>
    <div class="flex items-start gap-3">
      <svg viewBox="0 0 120 130" class="w-24 shrink-0 medal" :class="{ on: done, landing }">
        <path d="M44 78 L30 124 L44 114 L52 126 L60 84" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" />
        <path d="M76 78 L90 124 L76 114 L68 126 L60 84" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" />
        <path :d="big" :fill="done ? 'var(--color-sun)' : 'var(--color-paper)'" stroke="var(--color-ink)" stroke-width="2.5" stroke-linejoin="miter" class="petals" />
        <circle cx="60" cy="50" r="22" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="2.5" />
        <text x="60" y="58" text-anchor="middle" class="t-display" font-size="22" fill="var(--color-ink)">{{ done ? (data.to.trim().charAt(0).toUpperCase() || '★') : '?' }}</text>
      </svg>
      <div class="flex-1 min-w-0 space-y-3">
        <template v-if="done || !editable">
          <p class="t-label text-graphite">
            {{ L('Pour', 'To') }} {{ data.to || '—' }}
          </p>
          <p class="t-body text-sm italic">
            {{ data.words ? L(`« ${data.words} »`, `“${data.words}”`) : L('Aucun compliment noté.', 'No compliment written.') }}
          </p>
        </template>
        <template v-else>
          <input v-model="to" class="ink-input" :placeholder="L('À qui ? (Léa, le boulanger…)', 'To whom? (Lea, the baker…)')" @change="save">
          <textarea v-model="words" rows="2" class="ink-input resize-none" :placeholder="L('Ta présentation était limpide.', 'Your talk was crystal clear.')" @change="save" />
        </template>
      </div>
    </div>
    <button v-if="!done" class="btn btn-ink w-full mt-4" :disabled="!editable || !ready" @click="pin">
      {{ L('Épingler la cocarde', 'Pin the ribbon') }}
    </button>
    <div class="flex justify-between mt-5 border-t-2 border-rule pt-3">
      <svg v-for="d in week" :key="d.i" viewBox="0 0 40 44" class="w-9" :class="{ 'opacity-30': !d.on && !d.today }">
        <path d="M14 26 L9 42 L15 38 L18 43 L20 30 M26 26 L31 42 L25 38 L22 43 L20 30" fill="none" :stroke="d.on ? 'var(--color-ink)' : 'var(--color-pencil)'" stroke-width="1.5" />
        <path :d="small" :fill="d.on ? 'var(--color-ink)' : 'none'" :stroke="d.on ? 'var(--color-ink)' : 'var(--color-pencil)'" stroke-width="1.5" />
        <text x="20" y="20" text-anchor="middle" font-size="10" font-weight="800" :fill="d.on ? 'var(--color-paper)' : 'var(--color-pencil)'">{{ d.on ? (d.initial || '★') : d.i + 1 }}</text>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.medal {
  transform-origin: 60px 50px;
  transition: transform 300ms var(--ease-spring);
}

.medal.landing {
  animation: pin 620ms cubic-bezier(0.5, 0, 0.75, 0) both;
}

.medal.on .petals {
  animation: glow 900ms var(--ease-out-quint) both;
}

@keyframes pin {
  0% {
    transform: translateY(-30px) rotate(-18deg) scale(1.6);
    opacity: 0.4;
  }
  50% {
    transform: translateY(0) rotate(4deg) scale(0.92);
    opacity: 1;
  }
  100% {
    transform: rotate(-3deg) scale(1);
  }
}

@keyframes glow {
  from {
    transform: rotate(-30deg);
  }
}

.petals {
  transform-origin: 60px 50px;
}
</style>
