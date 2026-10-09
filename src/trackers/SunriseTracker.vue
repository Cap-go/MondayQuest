<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { CapgoBrightness } from '@capgo/capacitor-brightness'
import { DatePicker } from '@capgo/capacitor-date-picker'
import { computed, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { addDays, formatHM, fromISO } from '~/lib/date'
import { dateOfDay } from '~/lib/progress'
import { setSystemAlarm } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { locate, sunriseHM, wakeHM } from '~/services/sun'
import { useQuest } from '~/stores/quest'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const quest = useQuest()
const { data, done, markDone, patch } = useDay(props, { wake: '' as string })

// The goal is the real sunrise of that day at your location, not a fixed 6:00.
const coords = ref<Awaited<ReturnType<typeof locate>> | null>(null)
onMounted(async () => {
  coords.value = await locate(props.isToday && props.editable)
})
const day = computed(() => fromISO(dateOfDay(props.run, props.idx)))
function toMin(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  return h! * 60 + m!
}
const sunrise = computed(() => sunriseHM(day.value, coords.value ?? undefined))
const sunriseMin = computed(() => toMin(sunrise.value))
/** Tonight's alarm: tomorrow's sunrise minus a few minutes (or the fixed time if set manually). */
const alarmHM = computed(() => quest.settings.wakeAuto ? wakeHM(fromISO(addDays(dateOfDay(props.run, props.idx), 1)), coords.value ?? undefined) : quest.settings.wakeAlarm)

const minutes = computed(() => {
  if (!data.value.wake)
    return null
  const [h, m] = data.value.wake.split(':').map(Number)
  return h! * 60 + m!
})
// Sun height: two hours before sunrise → high, at sunrise → on the horizon, later → below.
const sunY = computed(() => {
  if (minutes.value == null)
    return 112
  const t = (minutes.value - (sunriseMin.value - 120)) / 120
  return 30 + Math.min(1.4, Math.max(0, t)) * 62
})
const beforeSix = computed(() => minutes.value != null && minutes.value < sunriseMin.value)

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
  if (h! * 60 + m! < sunriseMin.value) {
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
  const res = await DatePicker.present({ mode: 'time', format: 'HH:mm', is24h: true, locale: L.tag(), title: L('Wake-up time'), doneText: 'OK', cancelText: L('Cancel'), date: data.value.wake || alarmHM.value }).catch(() => null)
  if (res?.value)
    record(res.value)
}

function alarm() {
  haptic.press()
  void setSystemAlarm(alarmHM.value, L(`Sunrise at ${sunrise.value} — up you get!`))
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
        {{ L('Sunrise') }} {{ sunrise }}{{ coords?.approx ? ' ~' : '' }} · {{ L('Wake-up time') }}
      </p>
      <button class="t-display text-5xl tabular-nums mt-1 underline decoration-dashed decoration-2 underline-offset-8" :disabled="!editable" @click="pick">
        {{ data.wake || '--:--' }}
      </button>
      <p v-if="data.wake" class="t-body text-sm mt-3" :class="beforeSix ? '' : 'text-graphite'">
        {{ beforeSix ? L('Before the sun. Well done.') : L(`After sunrise (${sunrise})… tomorrow is the day.`) }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable || !isToday || done" @click="awake">
        {{ L('I\'m up') }}
      </button>
      <button class="btn" @click="alarm">
        ⏰ {{ alarmHM }}
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ quest.settings.wakeAuto
        ? L('Alarm 15 min before tomorrow\'s sunrise, computed right here from your location (never sent anywhere). A real system alarm, even in silent mode.')
        : L('Fixed time set in Settings. A real system alarm, even in silent mode.') }}
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
