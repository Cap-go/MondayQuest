<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { LightSensor } from '@capgo/capacitor-light-sensor'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useL } from '~/composables/useL'
import { formatHM } from '~/lib/date'
import { setSystemAlarm } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
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

function toBed() {
  const bed = formatHM(new Date())
  patch({ bed })
  const [h, m] = bed.split(':').map(Number)
  const mins = (h! < 12 ? h! + 24 : h!) * 60 + m!
  if (mins <= LIMIT)
    markDone({ bed })
  else
    haptic.warning()
}

function reminder() {
  haptic.press()
  void setSystemAlarm('22:15', L('Couvre-feu dans 15 minutes. Écrans off.', 'Curfew in 15 minutes. Screens off.'))
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
      {{ L('Heure du coucher', 'Bedtime') }}
    </p>
    <p class="t-display text-5xl tabular-nums">
      {{ data.bed || '--:--' }}
    </p>
    <p v-if="data.bed" class="t-body text-sm mt-1">
      {{ onTime ? L('Avant 22h30. Bonne nuit.', 'Before 10:30 p.m. Good night.') : L('Trop tard ce soir.', 'Too late tonight.') }}
    </p>
    <p v-if="lux != null" class="t-label text-xs mt-2" :class="dark ? '' : 'text-pencil'">
      {{ dark ? L('☾ Chambre dans le noir', '☾ Room is dark') : L(`Lumière : ${Math.round(lux)} lux — éteignez`, `Light: ${Math.round(lux)} lux — switch off`) }}
    </p>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable || !isToday || done" @click="toBed">
        {{ done ? L('Couché ✓', 'In bed ✓') : L('Je me couche', 'Going to bed') }}
      </button>
      <button class="btn" @click="reminder">
        ⏰ 22:15
      </button>
    </div>
    <p class="t-body text-xs text-pencil mt-3">
      {{ L('Posez ensuite le téléphone hors de la chambre.', 'Then leave the phone outside the bedroom.') }}
    </p>
  </div>
</template>

<style scoped>
.shadow {
  transition: cx 800ms var(--ease-out-quint);
}
</style>
