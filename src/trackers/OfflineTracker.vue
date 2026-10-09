<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Network } from '@capacitor/network'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimerRing from '~/components/TimerRing.vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
const GOAL = 60 * 60_000

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('HORS LIGNE', 'OFFLINE'),
  subtitle: () => L('Une heure pour vous', 'An hour for yourself'),
  short: '✈',
  doneBody: () => L('Une heure hors ligne. Bon retour parmi nous.', 'One hour offline. Welcome back.'),
})
const { running, elapsed, progress, remaining, done, start, pause, patch, data } = s

const online = ref(true)
let handle: PluginListenerHandle | undefined

onMounted(async () => {
  online.value = (await Network.getStatus()).connected
  handle = await Network.addListener('networkStatusChange', (st) => {
    online.value = st.connected
  })
})
onBeforeUnmount(() => void handle?.remove())

// Coming back online during the session pauses it and counts a slip.
watch(online, (on) => {
  if (on && running.value) {
    haptic.warning()
    void pause()
    patch({ slips: ((data.value as any).slips ?? 0) + 1 } as any)
  }
})
</script>

<template>
  <div class="flex flex-col items-center">
    <TimerRing :progress="progress" :size="220" :ticks="12">
      <svg viewBox="0 0 48 48" class="w-10 h-10 mx-auto mb-1 plane" :class="{ flying: running }"><path d="M6 23l36-15-9 34-9-12z M24 30l18-22 M24 30v9l5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" /></svg>
      <p class="t-display text-4xl tabular-nums">
        {{ formatClock(running || elapsed ? remaining : GOAL) }}
      </p>
      <p class="t-label mt-1" :class="online ? 'text-graphite' : ''">
        {{ online ? L('● En ligne', '● Online') : L('○ Déconnecté', '○ Disconnected') }}
      </p>
    </TimerRing>
    <button class="btn btn-ink mt-5 w-52" :disabled="!editable || done || (!running && online)" @click="running ? pause() : start()">
      {{ done ? L('Heure libre ✓', 'Free hour ✓') : running ? L('Pause', 'Pause') : online ? L('Activez le mode avion', 'Turn on airplane mode') : L('Démarrer l\'heure', 'Start the hour') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 text-center max-w-64">
      {{ L('Le chrono ne tourne que hors connexion. Si internet revient, il se met en pause.', 'The timer only runs offline. If the internet comes back, it pauses.') }}
    </p>
  </div>
</template>

<style scoped>
.plane.flying {
  animation: fly 3s ease-in-out infinite;
}

@keyframes fly {
  50% {
    transform: translate(4px, -4px) rotate(-6deg);
  }
}
</style>
