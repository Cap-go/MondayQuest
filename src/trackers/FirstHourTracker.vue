<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { App } from '@capacitor/app'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatClock, formatHM } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'
import { useSession } from './useSession'

// Wake up, tap once, put the phone down. The sky fills as the hour goes by.
const props = defineProps<TrackerProps>()
const L = useL()
const HOUR = 60 * 60_000

const extra = useDay(props, { wakeAt: 0, peeks: 0 })
const s = useSession(props, {
  targetMs: HOUR,
  title: () => L('THE BLANK HOUR'),
  subtitle: () => L('Put the phone down'),
  short: '☼',
  doneBody: () => L('One hour all yours. Good morning!'),
})
const { running, elapsed, progress, remaining, done, start, pause } = s

const peeked = ref(false)
let handle: PluginListenerHandle | undefined

onMounted(async () => {
  handle = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive || !running.value || done.value || !props.editable)
      return
    extra.patch({ peeks: extra.data.value.peeks + 1 })
    peeked.value = true
    haptic.warning()
    sfx.play('erase', 0.6)
    setTimeout(() => (peeked.value = false), 2400)
  }).catch(() => undefined)
})
onBeforeUnmount(() => void handle?.remove())

function wake() {
  if (!props.editable || running.value || done.value)
    return
  if (!extra.data.value.wakeAt)
    extra.patch({ wakeAt: Date.now() })
  sfx.play('wake')
  haptic.press()
  void start()
}

function stop() {
  haptic.thud()
  void pause()
}

const wakeLabel = computed(() => (extra.data.value.wakeAt ? formatHM(new Date(extra.data.value.wakeAt)) : '--:--'))
const p = computed(() => (done.value ? 1 : progress.value))
// Sun rises from below the horizon to high in the sky.
const sunY = computed(() => 150 - p.value * 100)
const rays = computed(() => Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="sky relative w-full max-w-[320px]" :class="{ peek: peeked }">
      <svg viewBox="0 0 300 170" class="w-full block">
        <defs>
          <clipPath id="fh-sky"><rect x="0" y="0" width="300" height="140" /></clipPath>
        </defs>
        <rect x="0" y="0" width="300" height="170" fill="var(--color-sheet)" />
        <rect x="0" :y="140 - p * 140" width="300" :height="p * 140" fill="var(--color-ice)" opacity="0.35" class="fill" clip-path="url(#fh-sky)" />
        <g clip-path="url(#fh-sky)" class="sun" :style="{ transform: `translateY(${sunY}px)` }">
          <circle cx="150" cy="0" r="22" :fill="p > 0 ? 'var(--color-sun)' : 'none'" stroke="var(--color-ink)" stroke-width="3" />
          <line
            v-for="a in rays" :key="a" :x1="150 + Math.cos(a) * 30" :y1="Math.sin(a) * 30" :x2="150 + Math.cos(a) * (38 + p * 6)" :y2="Math.sin(a) * (38 + p * 6)"
            stroke="var(--color-ink)" stroke-width="2.5" :opacity="p"
          />
        </g>
        <line x1="0" y1="140" x2="300" y2="140" stroke="var(--color-ink)" stroke-width="3" />
        <line v-for="i in 5" :key="i" :x1="i * 50 - 20" y1="152" :x2="i * 50 + 10" y2="152" stroke="var(--color-rule)" stroke-width="2" />
        <rect x="1.5" y="1.5" width="297" height="167" fill="none" stroke="var(--color-ink)" stroke-width="3" />
      </svg>
      <Transition name="mark">
        <div v-if="peeked" class="absolute inset-0 grid place-items-center">
          <p class="early t-display text-2xl">
            {{ L('Too early!') }}
          </p>
        </div>
      </Transition>
    </div>

    <p class="t-display text-5xl tabular-nums mt-4">
      {{ done ? '60:00' : formatClock(running || elapsed ? remaining : HOUR) }}
    </p>
    <p class="t-label text-graphite">
      {{ done ? L('Blank hour kept') : running ? L('Put the phone down') : L('Screen-free after waking') }}
    </p>

    <button v-if="!done" class="btn mt-4 w-52" :class="running ? '' : 'btn-ink'" :disabled="!editable" @click="running ? stop() : wake()">
      {{ running ? L('Pause') : elapsed ? L('Resume') : L('I\'m up') }}
    </button>

    <div class="flex gap-6 mt-4 t-label text-graphite">
      <span>{{ L('Woke') }} {{ wakeLabel }}</span>
      <span>{{ L('Peeks') }} {{ extra.data.value.peeks }}</span>
    </div>
  </div>
</template>

<style scoped>
.fill {
  transition: all 1s linear;
}

.sun {
  transition: transform 1s linear;
}

.sky.peek {
  animation: nudge 400ms ease;
}

@keyframes nudge {
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

.early {
  padding: 4px 14px;
  border: 3px solid var(--color-ink);
  background: var(--color-paper);
  transform: rotate(-6deg);
}

.mark-enter-active {
  transition: all 300ms var(--ease-spring);
}

.mark-leave-active {
  transition: opacity 500ms ease;
}

.mark-enter-from {
  opacity: 0;
  transform: scale(1.6);
}

.mark-leave-to {
  opacity: 0;
}
</style>
