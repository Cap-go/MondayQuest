<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { cancelHourlyAlarms, scheduleHourlyAlarms } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// One cell per working hour: get up, tap the hour, the little figure stands with you.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { hours: [] as number[], alarms: [] as string[], alarmKind: 'none' as 'alarm' | 'notification' | 'none' })
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i)
const GOAL = 8

const nowHour = ref(new Date().getHours())
const clock = setInterval(() => (nowHour.value = new Date().getHours()), 30_000)
onBeforeUnmount(() => clearInterval(clock))

const standing = ref(false)
let sitBack: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(sitBack))

const count = computed(() => data.value.hours.length)
const has = (h: number) => data.value.hours.includes(h)
// Today: only the current or past hours can be ticked. Past days: free.
const open = (h: number) => props.editable && (!props.isToday || h <= nowHour.value)

const ringing = computed(() => data.value.alarms.length > 0)
const busy = ref(false)

/** Real alarms at the top of every remaining work hour, so you don't have to remember. */
async function ringHourly() {
  if (busy.value || !props.isToday || !props.editable)
    return
  busy.value = true
  haptic.press()
  const upcoming = HOURS.filter(h => h > nowHour.value)
  const res = await scheduleHourlyAlarms(upcoming, L('Stand up! 2 minutes'), L('Get up, move for 2 minutes, then tick the hour.'))
  busy.value = false
  if (res.kind === 'none') {
    toast.info(L('No hours left to ring today'))
    return
  }
  patch({ alarms: res.ids, alarmKind: res.kind })
  sfx.play('chime')
  haptic.success()
  toast.success(res.kind === 'alarm' ? L(`${res.ids.length} alarms set`) : L(`${res.ids.length} reminders set`), { message: `${upcoming[0]}h → 18h` })
}

async function stopRinging() {
  haptic.tap()
  await cancelHourlyAlarms(data.value.alarms, data.value.alarmKind)
  patch({ alarms: [], alarmKind: 'none' })
  toast.info(L('Alarms removed'))
}

function tap(h: number) {
  if (!open(h))
    return
  if (has(h)) {
    haptic.select()
    sfx.play('erase', 0.5)
    patch({ hours: data.value.hours.filter(x => x !== h) })
    return
  }
  const hours = [...data.value.hours, h].sort((a, b) => a - b)
  standing.value = true
  clearTimeout(sitBack)
  sitBack = setTimeout(() => (standing.value = false), 1600)
  haptic.press()
  setTimeout(() => haptic.tap(), 180)
  sfx.play('pop')
  patch({ hours })
  if (hours.length >= GOAL && !done.value)
    markDone({ hours })
}
</script>

<template>
  <div>
    <div class="flex items-end gap-4">
      <svg viewBox="0 0 100 120" class="w-24 shrink-0 figure" :class="{ up: standing || done }">
        <!-- chair -->
        <path d="M22 70 h34 M56 70 v40 M22 70 v40 M22 70 v-44" stroke="var(--color-pencil)" stroke-width="3" fill="none" />
        <line x1="4" y1="111" x2="96" y2="111" stroke="var(--color-rule)" stroke-width="2" />
        <!-- person: sitting group / standing group -->
        <g class="sit" stroke="var(--color-ink)" stroke-width="3" fill="none" stroke-linecap="round">
          <circle cx="34" cy="30" r="8" fill="var(--color-paper)" />
          <path d="M34 38 v28 h22 v44 M34 48 l16 10" />
        </g>
        <g class="stand" stroke="var(--color-ink)" stroke-width="3" fill="none" stroke-linecap="round">
          <circle cx="76" cy="18" r="8" fill="var(--color-paper)" />
          <path d="M76 26 v40 l-10 44 M76 66 l10 44 M76 36 l-14 -14 M76 36 l14 -14" />
        </g>
      </svg>
      <div class="flex-1">
        <p class="t-display text-5xl tabular-nums">
          {{ count }}<span class="text-pencil text-2xl">/{{ GOAL }}</span>
        </p>
        <p class="t-label text-graphite">
          {{ done ? L('A well-moved day') : L('hours on your feet') }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-5 gap-1.5 mt-4">
      <button
        v-for="h in HOURS" :key="h" class="cell" :class="{ on: has(h), now: isToday && h === nowHour, locked: !open(h) }"
        :disabled="!open(h)" @click="tap(h)"
      >
        <span class="t-label">{{ h }}h</span>
        <svg v-if="has(h)" viewBox="0 0 24 24" class="tick"><path d="M4 13 l5 5 L20 6" fill="none" stroke="currentColor" stroke-width="3" /></svg>
      </button>
    </div>
    <template v-if="isToday && editable && !done">
      <button v-if="!ringing" class="btn btn-ink w-full mt-4" :disabled="busy || nowHour >= 18" @click="ringHourly">
        {{ L('Ring me every hour') }}
      </button>
      <button v-else class="btn w-full mt-4" @click="stopRinging">
        {{ data.alarmKind === 'alarm' ? L(`${data.alarms.length} alarms set · remove`) : L(`${data.alarms.length} reminders set · remove`) }}
      </button>
    </template>
    <p class="t-body text-xs text-pencil mt-3 text-center">
      {{ L('An alarm at the top of every hour until 6 p.m. 2 minutes on your feet, then tap the hour.') }}
    </p>
  </div>
</template>

<style scoped>
.figure .sit,
.figure .stand {
  transition:
    opacity 260ms ease,
    transform 420ms var(--ease-spring);
  transform-box: view-box;
}

.figure .stand {
  opacity: 0;
  transform: translateY(14px);
}

.figure.up .sit {
  opacity: 0;
  transform: translateX(10px);
}

.figure.up .stand {
  opacity: 1;
  transform: translateY(0);
}

.cell {
  position: relative;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  transition:
    transform 200ms var(--ease-spring),
    background 200ms;
}

.cell:active:not(:disabled) {
  transform: scale(0.92);
}

.cell.now {
  outline: 2.5px solid var(--color-sun);
  outline-offset: 2px;
}

.cell.locked {
  border-color: var(--color-rule);
  color: var(--color-pencil);
}

.cell.on {
  background: var(--color-ink);
  color: var(--color-paper);
}

.tick {
  width: 18px;
  height: 18px;
  stroke-dasharray: 30;
  animation: draw 300ms ease-out forwards;
}

@keyframes draw {
  from {
    stroke-dashoffset: 30;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
