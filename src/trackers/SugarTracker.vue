<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { temptations: 0 })
const dissolving = ref(0)

// Every resisted temptation: a sugar cube dissolves into nothing.
function resist() {
  if (!props.editable)
    return
  dissolving.value++
  haptic.press()
  sfx.play('water', 0.5)
  patch({ temptations: data.value.temptations + 1 })
}

const grains = Array.from({ length: 16 }, () => ({ x: (Math.random() - 0.5) * 80, y: 30 + Math.random() * 40, d: Math.random() * 200 }))
</script>

<template>
  <div class="text-center">
    <div class="relative h-32 grid place-items-center">
      <svg :key="dissolving" viewBox="0 0 60 60" class="cube" :class="{ melt: dissolving }">
        <path d="M30 6l22 12v24L30 54 8 42V18z M8 18l22 12 22-12 M30 30v24" fill="none" stroke="var(--color-ink)" stroke-width="2.6" stroke-linejoin="round" />
      </svg>
      <div v-if="dissolving" :key="`g${dissolving}`" class="absolute inset-0 grid place-items-center pointer-events-none">
        <i v-for="(g, i) in grains" :key="i" class="grain" :style="{ '--x': `${g.x}px`, '--y': `${g.y}px`, 'animationDelay': `${g.d}ms` }" />
      </div>
    </div>
    <p class="t-label text-graphite">
      {{ data.temptations }} {{ L('temptation(s) melted') }}
    </p>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn" :disabled="!editable" @click="resist">
        {{ L('I resisted') }}
      </button>
      <button class="btn btn-ink" :disabled="!editable || done" @click="markDone()">
        {{ done ? L('Sugar-free ✓') : L('Sugar-free day') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.cube {
  width: 72px;
}

.cube.melt {
  animation: melt 1.2s var(--ease-ink) forwards;
}

@keyframes melt {
  0% {
    transform: none;
  }
  20% {
    transform: rotate(-6deg) scale(1.05);
  }
  100% {
    transform: translateY(26px) scaleY(0.1) scaleX(1.4);
    opacity: 0;
  }
}

.grain {
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--color-ink);
  animation: grain 900ms ease-in forwards;
  opacity: 0;
}

@keyframes grain {
  0% {
    opacity: 1;
    transform: translate(0, 0);
  }
  100% {
    opacity: 0;
    transform: translate(var(--x), var(--y));
  }
}
</style>
