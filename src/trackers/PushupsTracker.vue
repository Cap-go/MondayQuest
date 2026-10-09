<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { count: 0 })
// Progressive week: 10, 15, 20 … 40 push-ups.
const GOAL = computed(() => 10 + props.idx * 5)
const floor = ref(false)
const pulse = ref(0)
let lastTap = 0

async function enterFloor() {
  floor.value = true
  haptic.press()
  await KeepAwake.keepAwake().catch(() => {})
}

async function exitFloor() {
  floor.value = false
  await KeepAwake.allowSleep().catch(() => {})
}

// Nose tap: debounce so one rep = one tap even with a clumsy nose.
function rep() {
  const t = performance.now()
  if (t - lastTap < 450 || !props.editable)
    return
  lastTap = t
  const count = data.value.count + 1
  pulse.value++
  patch({ count })
  if (count % 10 === 0) {
    haptic.success()
    sfx.play('chime', 0.8)
  }
  else {
    haptic.thud()
    sfx.play('tick')
  }
  if (count >= GOAL.value && !done.value) {
    markDone({ count })
    setTimeout(exitFloor, 1200)
  }
}

/** Did them without counting on screen: trust the user. */
function didIt() {
  if (!props.editable)
    return
  patch({ count: GOAL.value })
  markDone({ count: GOAL.value })
}

onBeforeUnmount(() => void KeepAwake.allowSleep().catch(() => {}))
</script>

<template>
  <div class="text-center">
    <p class="t-display text-6xl tabular-nums">
      {{ data.count }}<span class="text-pencil text-2xl">/{{ GOAL }}</span>
    </p>
    <div class="grid grid-cols-10 gap-1 mt-4">
      <span v-for="i in GOAL" :key="i" class="aspect-square border border-ink" :class="i <= data.count ? 'bg-ink' : ''" />
    </div>
    <p v-if="!done" class="t-body text-sm text-graphite mt-5 px-2">
      {{ L('Posez le téléphone au sol sous votre visage : votre nez touche l\'écran en bas de chaque pompe, et il compte pour vous.', 'Place the phone on the floor under your face: your nose touches the screen at the bottom of each push-up, and it counts for you.') }}
    </p>
    <button v-if="done" class="btn btn-ink w-full mt-5" disabled>
      {{ L(`${GOAL} pompes ✓`, `${GOAL} push-ups ✓`) }}
    </button>
    <div v-else class="grid grid-cols-2 gap-3 mt-4">
      <button class="btn" :disabled="!editable" @click="enterFloor">
        {{ L('Compter au nez', 'Count with my nose') }}
      </button>
      <button class="btn btn-ink" :disabled="!editable" @click="didIt">
        {{ L('C\'est fait', 'I did them') }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="floor" class="floor" @pointerdown="rep">
        <div :key="pulse" class="ring" />
        <p class="t-display text-[38vw] leading-none tabular-nums text-paper">
          {{ data.count }}
        </p>
        <p class="t-label text-paper/60 mt-4">
          {{ L('le nez ici', 'nose here') }} ↓
        </p>
        <button class="t-label text-paper/70 absolute top-[calc(var(--safe-top)+18px)] right-5 p-3" @pointerdown.stop @click="exitFloor">
          {{ L('Terminer', 'Finish') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.floor {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--color-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.ring {
  position: absolute;
  width: 60vw;
  height: 60vw;
  border: 3px solid var(--color-paper);
  border-radius: 50%;
  animation: ring 600ms ease-out forwards;
}

@keyframes ring {
  from {
    transform: scale(0.4);
    opacity: 0.8;
  }
  to {
    transform: scale(1.6);
    opacity: 0;
  }
}
</style>
