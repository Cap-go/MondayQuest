<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { LightSensor } from '@capgo/capacitor-light-sensor'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatHM } from '~/lib/date'
import { setSystemAlarm } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { pickTime } from '~/services/timePicker'
import { useQuest } from '~/stores/quest'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const quest = useQuest()
const { data, done, patch, markDone } = useDay(props, { bed: '' })
const LIMIT = 22 * 60 + 30

const lux = ref<number | null>(null)
let handle: PluginListenerHandle | undefined
onMounted(async () => {
  const { available } = await LightSensor.isAvailable().catch(() => ({ available: false }))
  if (!available)
    return
  await LightSensor.start({ updateInterval: 800 }).catch(() => {})
  handle = await LightSensor.addListener('lightSensorChange', d => (lux.value = d.illuminance))
})
onBeforeUnmount(() => {
  void LightSensor.stop().catch(() => {})
  void handle?.remove()
})

const minutes = computed(() => {
  if (!data.value.bed)
    return null
  const [h, m] = data.value.bed.split(':').map(Number)
  return (h! < 12 ? h! + 24 : h!) * 60 + m!
})
const onTime = computed(() => minutes.value != null && minutes.value <= LIMIT)
const dark = computed(() => lux.value != null && lux.value < 10)

/** Minutes since the evening's midnight: 00:30 is 24:30, the same night. */
function nightMin(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  return (h! < 12 ? h! + 24 : h!) * 60 + m!
}

/** Log a bedtime for this tracker's evening (today, or a forgotten past night). */
function record(bed: string) {
  patch({ bed })
  if (nightMin(bed) <= LIMIT) {
    markDone({ bed })
  }
  else {
    haptic.warning()
    sfx.play('tick')
  }
}

function toBed() {
  const now = new Date()
  const bed = formatHM(now)
  // After midnight, it's still last night: log it on the previous evening's day.
  // (Past midnight is always past 10:30 p.m., so that night stays unticked.)
  if (now.getHours() < 12 && props.idx > 0) {
    const prev = props.idx - 1
    if (!props.editable || props.run.days[prev]?.done)
      return
    quest.patchDay(props.run, prev, { bed })
    haptic.warning()
    toast.info(L('Logged for last night'), { message: bed })
    return
  }
  record(bed)
}

async function pick() {
  const value = await pickTime(L('Bedtime'), data.value.bed || '22:30')
  if (value)
    record(value)
}

function reminder() {
  haptic.press()
  void setSystemAlarm('22:15', L('Curfew in 15 minutes. Screens off.'), 'curfew')
}

// moon phase grows through the week
const moonX = computed(() => 30 - (props.idx / 6) * 26)
</script>

<template>
  <div class="text-center">
    <svg viewBox="0 0 60 60" class="w-20 mx-auto">
      <circle cx="30" cy="30" r="22" fill="var(--color-ink)" />
      <circle :cx="moonX + 14" cy="26" r="20" fill="var(--color-sheet)" class="shadow" />
    </svg>
    <p class="t-label text-graphite mt-2">
      {{ L('Bedtime') }}
    </p>
    <button class="t-display text-5xl tabular-nums underline decoration-dashed decoration-2 underline-offset-8" :disabled="!editable" @click="pick">
      {{ data.bed || '--:--' }}
    </button>
    <p v-if="data.bed" class="t-body text-sm mt-1">
      {{ onTime ? L('Before 10:30 p.m. Good night.') : L('Too late tonight.') }}
    </p>
    <p v-if="lux != null" class="t-label text-xs mt-2" :class="dark ? '' : 'text-pencil'">
      {{ dark ? L('☾ Room is dark') : L(`Light: ${Math.round(lux)} lux — switch off`) }}
    </p>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable || !isToday || done" @click="toBed">
        {{ done ? L('In bed ✓') : L('Going to bed') }}
      </button>
      <button class="btn" @click="reminder">
        ⏰ 22:15
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Then leave the phone outside the bedroom.') }}
    </p>
  </div>
</template>

<style scoped>
.shadow {
  transition: cx 800ms var(--ease-out-quint);
}
</style>
