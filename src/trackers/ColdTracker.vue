<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { KeepAwake } from '@capgo/capacitor-keep-awake'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import { VolumeButtons } from '@capgo/capacitor-volume-buttons'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// Hands-free: one tap before stepping in, then voice + loud cues guide the
// warm phase, the switch to cold, and the end. Nothing to touch with wet hands.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { best: 0, tries: 0 })

const WARM = 30
/** Progressive cold: 20 s on day 1, +10 s a day, 80 s on day 7. */
const COLD = computed(() => 20 + props.idx * 10)

type Phase = 'idle' | 'warm' | 'cold' | 'end'
const phase = ref<Phase>('idle')
const left = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let vol: PluginListenerHandle | undefined
let coldStart = 0

function say(text: string) {
  void SpeechSynthesis.speak({ text, language: L.tag(), rate: 1, volume: 1, queueStrategy: 'Flush' }).catch(() => {})
}

const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}`)

async function begin() {
  if (!props.editable || phase.value !== 'idle')
    return
  phase.value = 'warm'
  left.value = WARM
  sfx.play('chime')
  haptic.press()
  say(L(`Eau chaude. Trente secondes, puis ${COLD.value} secondes de froid.`, `Warm water. Thirty seconds, then ${COLD.value} seconds of cold.`))
  await KeepAwake.keepAwake().catch(() => {})
  vol = await VolumeButtons.addListener('volumeButtonPressed', () => stop()).catch(() => undefined)
  timer = setInterval(tick, 1000)
}

function tick() {
  left.value--
  if (phase.value === 'warm') {
    if (left.value === 10) {
      say(L('Froid dans dix secondes', 'Cold in ten seconds'))
    }
    else if (left.value <= 3 && left.value > 0) {
      say(String(left.value))
      sfx.play('tick')
      haptic.tap()
    }
    else if (left.value <= 0) {
      toCold()
    }
    return
  }
  if (phase.value === 'cold') {
    if (left.value > 5 && left.value % 10 === 0) {
      say(L(`${left.value} secondes`, `${left.value} seconds`))
      haptic.shiver(4)
    }
    else if (left.value <= 5 && left.value > 0) {
      say(String(left.value))
      sfx.play('tick')
      haptic.press()
    }
    else if (left.value <= 0) {
      finish()
    }
  }
}

function toCold() {
  phase.value = 'cold'
  left.value = COLD.value
  coldStart = Date.now()
  sfx.play('wake')
  sfx.play('freeze')
  haptic.shiver(12)
  say(L(`Froid ! Tenez ${COLD.value} secondes.`, `Cold! Hold ${COLD.value} seconds.`))
}

function finish() {
  clear()
  phase.value = 'end'
  const held = COLD.value
  sfx.play('done')
  haptic.success()
  say(L('Terminé. Bravo, agent secret.', 'Done. Well done, double-oh-seven.'))
  markDone({ best: Math.max(data.value.best ?? 0, held * 1000), tries: (data.value.tries ?? 0) + 1 })
  setTimeout(() => {
    if (phase.value === 'end')
      phase.value = 'idle'
  }, 3500)
}

/** Stopped early: keep the cold seconds held as today's best. */
function stop() {
  if (phase.value === 'idle' || phase.value === 'end')
    return
  const held = phase.value === 'cold' ? Math.floor((Date.now() - coldStart) / 1000) : 0
  clear()
  phase.value = 'idle'
  haptic.warning()
  sfx.play('erase')
  patch({ best: Math.max(data.value.best ?? 0, held * 1000), tries: (data.value.tries ?? 0) + 1 })
}

function clear() {
  clearInterval(timer)
  void vol?.remove()
  vol = undefined
  void KeepAwake.allowSleep().catch(() => {})
}

onBeforeUnmount(clear)

const total = computed(() => (phase.value === 'warm' ? WARM : COLD.value))
const progress = computed(() => (phase.value === 'warm' || phase.value === 'cold' ? 1 - left.value / total.value : 0))
const C = 2 * Math.PI * 120
const bestCold = computed(() => Math.floor((data.value.best ?? 0) / 1000))
</script>

<template>
  <div class="text-center py-2">
    <p class="t-label text-graphite">
      {{ L('Aujourd\'hui', 'Today') }} · 30 s {{ L('chaud', 'warm') }} → {{ COLD }} s {{ L('froid', 'cold') }}
    </p>
    <svg viewBox="0 0 200 110" class="w-full max-w-60 mx-auto mt-2">
      <path d="M60 10h40a8 8 0 0 1 8 8v8" fill="none" stroke="var(--color-ink)" stroke-width="3" />
      <path d="M86 26h44a6 6 0 0 1 0 12H86a6 6 0 0 1 0-12z" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" />
      <g stroke="var(--color-ink)" stroke-width="2.4" stroke-linecap="round" :class="{ drops: done }">
        <path v-for="x in [92, 102, 112, 122]" :key="x" :d="`M${x} 46v10M${x - 4} 64v10M${x + 3} 82v10`" />
      </g>
      <path d="M40 104h120" stroke="var(--color-rule)" stroke-width="2" />
    </svg>
    <button class="btn btn-ink mt-4 w-60" :disabled="!editable" @click="begin">
      {{ done ? L('Encore une', 'Once more') : L('J\'entre sous la douche', 'I\'m stepping in') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 px-4">
      {{ L('Posez le téléphone près de la douche, son fort. La voix vous dit quand passer au froid et quand c\'est fini. Bouton de volume pour arrêter.', 'Leave the phone near the shower, volume up. A voice tells you when to switch to cold and when you are done. Any volume button stops it.') }}
    </p>
    <p v-if="bestCold" class="t-label mt-3">
      {{ L('Froid tenu', 'Cold held') }} : {{ bestCold }} s {{ done ? '✓' : '' }}
    </p>

    <Teleport to="body">
      <div v-if="phase !== 'idle'" class="shower" :class="phase" @pointerdown="stop">
        <p class="t-label label">
          {{ phase === 'warm' ? L('Eau chaude', 'Warm water') : phase === 'cold' ? L('Eau froide !', 'Cold water!') : L('Terminé', 'Done') }}
        </p>
        <div class="dial">
          <svg viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="10" />
            <circle
              cx="130" cy="130" r="120" fill="none" stroke="currentColor" stroke-width="10"
              :stroke-dasharray="C" :stroke-dashoffset="C * (1 - progress)" transform="rotate(-90 130 130)"
            />
          </svg>
          <p class="t-display tabular-nums num" :class="{ shiver: phase === 'cold' }">
            {{ phase === 'end' ? '✓' : fmt(Math.max(0, left)) }}
          </p>
        </div>
        <p class="t-label hint">
          {{ phase === 'end' ? L('Bravo, agent secret', 'Well done, 007') : L('Touchez ou bouton volume pour arrêter', 'Tap or volume button to stop') }}
        </p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shower {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  touch-action: none;
  transition: background 600ms, color 600ms;
}

.shower.warm {
  background: var(--color-sun);
  color: var(--color-ink);
}

.shower.cold {
  background: var(--color-ice);
  color: var(--color-ink);
}

.shower.end {
  background: var(--color-ink);
  color: var(--color-paper);
}

.label {
  font-size: 1rem;
  letter-spacing: 0.2em;
}

.dial {
  position: relative;
  width: min(78vw, 360px);
  display: grid;
  place-items: center;
}

.dial svg {
  width: 100%;
}

.dial circle {
  transition: stroke-dashoffset 1s linear;
}

.num {
  position: absolute;
  font-size: min(26vw, 120px);
  line-height: 1;
}

.hint {
  position: absolute;
  bottom: calc(var(--safe-bottom) + 40px);
  opacity: 0.7;
}

.shiver {
  animation: shiver 120ms linear infinite;
}

@keyframes shiver {
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

.drops {
  animation: fall 1.2s linear infinite;
}

@keyframes fall {
  to {
    transform: translateY(6px);
    opacity: 0.6;
  }
}
</style>
