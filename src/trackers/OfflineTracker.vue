<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { App } from '@capacitor/app'
import { Network } from '@capacitor/network'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimerRing from '~/components/TimerRing.vue'
import { useL } from '~/composables/useL'
import { formatClock } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { useSession } from './useSession'

const props = defineProps<TrackerProps>()
const L = useL()
// 30 minutes on day one, 10 more every day, 90 on day seven.
const MIN = 30 + props.idx * 10
const GOAL = MIN * 60_000
const label = MIN % 60 ? `${MIN} min` : `${MIN / 60} h`

const s = useSession(props, {
  targetMs: GOAL,
  title: () => L('HORS LIGNE', 'OFFLINE'),
  subtitle: () => L(`${label} pour vous`, `${label} for yourself`),
  short: '✈',
  doneBody: () => L(`${label} hors ligne. Bon retour parmi nous.`, `${label} offline. Welcome back.`),
})
const { running, elapsed, progress, remaining, done, start, pause, patch, data } = s

const online = ref(true)
const via = ref<string>('none')
/** Started while the phone still reported a connection: trust the user, don't auto-pause. */
const honor = ref(false)
const handles: PluginListenerHandle[] = []
let poll: ReturnType<typeof setInterval> | undefined

// Events are missed while the app is in the background (airplane mode is usually toggled
// from Control Center), so re-read the status on resume and every few seconds.
async function refresh() {
  const st = await Network.getStatus().catch(() => null)
  if (!st)
    return
  online.value = st.connected
  via.value = st.connectionType
}

onMounted(async () => {
  await refresh()
  handles.push(await Network.addListener('networkStatusChange', (st) => {
    online.value = st.connected
    via.value = st.connectionType
  }))
  const resume = await App.addListener('resume', () => void refresh()).catch(() => undefined)
  if (resume)
    handles.push(resume)
  poll = setInterval(refresh, 3000)
})
onBeforeUnmount(() => {
  clearInterval(poll)
  handles.forEach(h => void h.remove())
})

function startAnyway() {
  honor.value = true
  haptic.press()
  void start()
}

// Coming back online during the session pauses it and counts a slip.
watch(online, (on) => {
  if (on && running.value && !honor.value) {
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
        {{ online ? (via === 'wifi' ? L('● Wi-Fi actif', '● Wi-Fi on') : via === 'cellular' ? L('● Données mobiles', '● Mobile data on') : L('● En ligne', '● Online')) : L('○ Déconnecté', '○ Disconnected') }}
      </p>
    </TimerRing>
    <p class="t-label text-graphite mt-4">
      {{ L('Aujourd\'hui', 'Today') }} · {{ label }}
    </p>
    <button class="btn btn-ink mt-3 w-52" :disabled="!editable || done || (!running && online)" @click="running ? pause() : start()">
      {{ done ? L('Temps libre ✓', 'Free time ✓') : running ? L('Pause', 'Pause') : online ? L('Coupez le réseau', 'Go offline first') : L('Démarrer le chrono', 'Start the timer') }}
    </button>
    <button v-if="!running && !done && online && editable" class="t-label text-graphite underline mt-3" @click="startAnyway">
      {{ L('Démarrer quand même, sur l\'honneur', 'Start anyway, on my honour') }}
    </button>
    <p class="t-body text-xs text-pencil mt-3 text-center max-w-64">
      {{ L('Mode avion ET Wi-Fi coupé (le mode avion laisse souvent le Wi-Fi allumé). Si la connexion revient, le chrono se met en pause.', 'Airplane mode AND Wi-Fi off (airplane mode often keeps Wi-Fi on). If the connection comes back, the timer pauses.') }}
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
