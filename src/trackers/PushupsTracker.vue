<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { count: 0 })
const GOAL = 50
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
  if (count >= GOAL && !done.value) {
    markDone({ count })
    setTimeout(exitFloor, 1200)
  }
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
    <button class="btn btn-ink w-full mt-5" :disabled="!editable || done" @click="enterFloor">
      {{ done ? L('50 pompes ✓', '50 push-ups ✓') : L('Poser le téléphone au sol', 'Put the phone on the floor') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Touchez l\'écran avec le nez à chaque descente.', 'Touch the screen with your nose on every rep.') }}
    </p>

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
