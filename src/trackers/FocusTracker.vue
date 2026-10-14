<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { App } from '@capacitor/app'
import { VolumeButtons } from '@capgo/capacitor-volume-buttons'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useInView } from '~/composables/useInView'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 25 * 60_000

const extra = useDay(props, { task: '', switches: 0 })
const s = useSession(props, {
  targetMs: GOAL,
  keepAwake: true,
  title: () => L('SINGLE-TASKER'),
  subtitle: () => extra.data.value.task || L('25 min, one thing'),
  short: '◉',
  doneBody: () => L('25 focused minutes. Breathe.'),
  onComplete: () => haptic.success(),
})
const { running, elapsed, progress, done } = s
const task = ref(extra.data.value.task)
const flash = ref(false)

function addSwitch() {
  if (!running.value)
    return
  extra.patch({ switches: extra.data.value.switches + 1 })
  flash.value = true
  setTimeout(() => (flash.value = false), 500)
  haptic.warning()
  sfx.play('erase', 0.5)
}

const handles: PluginListenerHandle[] = []
let unmounted = false
onMounted(async () => {
  const a = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive)
      addSwitch()
  }).catch(() => undefined)
  const v = await VolumeButtons.addListener('volumeButtonPressed', () => addSwitch()).catch(() => undefined)
  for (const h of [a, v]) {
    // Left before the plugins answered: drop the listeners instead of keeping them forever.
    if (h && unmounted)
      void h.remove().catch(() => {})
    else if (h)
      handles.push(h)
  }
})
onBeforeUnmount(() => {
  unmounted = true
  handles.forEach(h => void h.remove().catch(() => {}))
})

function go() {
  if (!props.editable || done.value)
    return
  if (!running.value) {
    if (!task.value.trim())
      return
    extra.patch({ task: task.value.trim() })
    haptic.press()
  }
  s.toggle()
}

// Tally marks, grouped by five.
const tallies = computed(() => {
  const n = extra.data.value.switches
  return Array.from({ length: Math.ceil(n / 5) }, (_, g) => Math.min(5, n - g * 5))
})
// Whole percent steps: the fill changes about every 18 s and glides there with its 1s transition.
const ripe = computed(() => `color-mix(in oklab, var(--color-sun) ${Math.round(progress.value * 85)}%, var(--color-paper))`)
const root = ref<HTMLElement>()
const visible = useInView(root)
</script>

<template>
  <div ref="root" class="flex flex-col items-center" :class="{ 'anim-off': !visible }">
    <div class="relative" :class="{ wobble: flash }">
      <svg viewBox="0 0 200 200" class="w-48 h-48">
        <circle cx="100" cy="112" r="78" fill="none" stroke="var(--color-rule)" stroke-width="3" stroke-dasharray="2 6" />
        <circle cx="100" cy="112" r="78" fill="none" stroke="var(--color-ink)" stroke-width="3" :stroke-dasharray="490" :stroke-dashoffset="490 * (1 - progress)" transform="rotate(-90 100 112)" />
        <path d="M100 48 C56 48 34 76 34 112 C34 150 64 176 100 176 C136 176 166 150 166 112 C166 76 144 48 100 48 Z" :style="{ fill: ripe }" stroke="var(--color-ink)" stroke-width="3" class="body" />
        <g class="stem" :class="{ sway: running }">
          <path d="M100 52 L84 34 M100 52 L116 34 M100 52 L72 50 M100 52 L128 50 M100 52 V22" fill="none" stroke="var(--color-ink)" stroke-width="3" stroke-linecap="square" />
        </g>
        <path d="M56 96 q-6 18 4 34" fill="none" stroke="var(--color-paper)" stroke-width="4" stroke-linecap="round" :style="{ opacity: progress }" />
      </svg>
      <div class="absolute inset-0 grid place-items-center pt-8">
        <p class="t-display text-3xl tabular-nums">
          {{ formatClock(Math.max(0, GOAL - elapsed)) }}
        </p>
      </div>
    </div>
    <input
      v-if="!done && editable && !running && !elapsed" v-model="task" class="ink-input mt-3 text-center"
      :placeholder="L('The one task of this block')"
    >
    <p v-else class="t-label mt-3 text-center">
      {{ extra.data.value.task || L('No task') }}
    </p>
    <div class="flex items-center gap-3 mt-3 h-7">
      <span class="t-label text-pencil text-[10px]">{{ L('Switches') }}</span>
      <svg v-for="(c, g) in tallies" :key="g" viewBox="0 0 34 26" class="w-8 h-6">
        <line v-for="i in Math.min(4, c)" :key="i" :x1="2 + i * 6" :x2="2 + i * 6" y1="3" y2="23" stroke="var(--color-ink)" stroke-width="2.5" />
        <line v-if="c === 5" x1="3" y1="20" x2="31" y2="6" stroke="var(--color-ink)" stroke-width="2.5" />
      </svg>
      <span v-if="!tallies.length" class="t-body text-xs text-graphite">{{ L('none') }}</span>
    </div>
    <button v-if="!done" class="btn btn-ink mt-4 w-52" :disabled="!editable || (!running && !task.trim())" @click="go">
      {{ running ? L('Pause') : elapsed ? L('Resume') : L('Start 25 min') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 text-center px-4">
      {{ done ? L('Ripe tomato. Block done.') : L('Leaving the app or touching the volume counts as a switch.') }}
    </p>
  </div>
</template>

<style scoped>
.body {
  transition: fill 1s linear;
}

.stem {
  transform-origin: 100px 52px;
}

.stem.sway {
  animation: sway 3s ease-in-out infinite;
}

.wobble {
  animation: wobble 420ms var(--ease-spring);
}

@keyframes sway {
  50% {
    transform: rotate(6deg);
  }
}

@keyframes wobble {
  25% {
    transform: translateX(-6px) rotate(-3deg);
  }
  75% {
    transform: translateX(6px) rotate(3deg);
  }
}
</style>
