<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { CapgoBrightness } from '@capgo/capacitor-brightness'
import { DatePicker } from '@capgo/capacitor-date-picker'
import { computed } from 'vue'
import { useL } from '~/composables/useL'
import { formatHM } from '~/lib/date'
import { setSystemAlarm } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const quest = useQuest()
const { data, done, markDone, patch } = useDay(props, { wake: '' as string })

const minutes = computed(() => {
  if (!data.value.wake)
    return null
  const [h, m] = data.value.wake.split(':').map(Number)
  return h! * 60 + m!
})
// Sun height: 4:00 → high in the sky, 6:00 → on the horizon, later → below.
const sunY = computed(() => {
  if (minutes.value == null)
    return 112
  const t = (minutes.value - 240) / 120 // 0 at 4:00, 1 at 6:00
  return 30 + Math.min(1.4, Math.max(0, t)) * 62
})
const beforeSix = computed(() => minutes.value != null && minutes.value < 360)

async function boost() {
  if (!Capacitor.isNativePlatform())
    return
  const prev = await CapgoBrightness.getBrightness().catch(() => null)
  await CapgoBrightness.setBrightness({ brightness: 1 }).catch(() => {})
  setTimeout(() => prev && CapgoBrightness.setBrightness({ brightness: prev.brightness }).catch(() => {}), 4000)
}

function record(hm: string) {
  patch({ wake: hm })
  const [h, m] = hm.split(':').map(Number)
  if (h! * 60 + m! < 360) {
    markDone({ wake: hm })
  }
  else {
    haptic.warning()
    sfx.play('tick')
  }
}

function awake() {
  void boost()
  record(formatHM(new Date()))
}

async function pick() {
  const res = await DatePicker.present({ mode: 'time', format: 'HH:mm', is24h: true, locale: L.tag(), title: L('Heure du réveil', 'Wake-up time'), doneText: 'OK', cancelText: L('Annuler', 'Cancel'), date: data.value.wake || '05:45' }).catch(() => null)
  if (res?.value)
    record(res.value)
}

function alarm() {
  haptic.press()
  void setSystemAlarm(quest.settings.wakeAlarm, L('Soleil levant — debout !', 'Rising sun — up you get!'))
}
</script>

<template>
  <div>
    <svg viewBox="0 0 240 130" class="w-full max-w-72 mx-auto block">
      <defs>
        <clipPath id="sky"><rect x="0" y="0" width="240" height="92" /></clipPath>
      </defs>
      <g clip-path="url(#sky)">
        <circle cx="120" :cy="sunY" r="22" fill="none" stroke="var(--color-ink)" stroke-width="3" class="sun" />
        <g v-if="beforeSix" class="rays" stroke="var(--color-ink)" stroke-width="2.5" stroke-linecap="round">
          <line v-for="i in 8" :key="i" :x1="120 + Math.cos(i * Math.PI / 4) * 30" :y1="sunY + Math.sin(i * Math.PI / 4) * 30" :x2="120 + Math.cos(i * Math.PI / 4) * 38" :y2="sunY + Math.sin(i * Math.PI / 4) * 38" />
        </g>
      </g>
      <line x1="10" y1="92" x2="230" y2="92" stroke="var(--color-ink)" stroke-width="3" />
      <line x1="30" y1="106" x2="210" y2="106" stroke="var(--color-ink)" stroke-width="3" />
      <line x1="55" y1="120" x2="185" y2="120" stroke="var(--color-ink)" stroke-width="3" />
    </svg>

    <div class="text-center mt-2">
      <p class="t-label text-graphite">
        {{ L('Heure du réveil', 'Wake-up time') }}
      </p>
      <button class="t-display text-5xl tabular-nums mt-1 underline decoration-dashed decoration-2 underline-offset-8" :disabled="!editable" @click="pick">
        {{ data.wake || '--:--' }}
      </button>
      <p v-if="data.wake" class="t-body text-sm mt-3" :class="beforeSix ? '' : 'text-graphite'">
        {{ beforeSix ? L('Avant le soleil. Bravo.', 'Before the sun. Well done.') : L('Après 6h00… demain sera le bon.', 'After 6:00… tomorrow is the day.') }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable || !isToday || done" @click="awake">
        {{ L('Je suis debout', 'I\'m up') }}
      </button>
      <button class="btn" @click="alarm">
        ⏰ {{ quest.settings.wakeAlarm }}
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('Le réveil est un vrai réveil système : il sonne même en mode silencieux.', 'The alarm is a real system alarm: it rings even in silent mode.') }}
    </p>
  </div>
</template>

<style scoped>
.sun {
  transition: cy 900ms var(--ease-out-quint);
}

.rays {
  animation: spin 18s linear infinite;
  transform-origin: 120px 60px;
  transform-box: view-box;
}

@keyframes spin {
  to {
    rotate: 45deg;
  }
}
</style>
