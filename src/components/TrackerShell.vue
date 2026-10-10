<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { Capacitor } from '@capacitor/core'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, ref, watch } from 'vue'
import DoneStamp from '~/components/DoneStamp.vue'
import InkCheck from '~/components/InkCheck.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { formatDate } from '~/lib/date'
import { allChecked, canEditDay, dateOfDay, runStatus, WEEK } from '~/lib/progress'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'
import { TRACKERS } from '~/trackers'

const props = defineProps<{ run: Run, challenge: Challenge }>()

const quest = useQuest()
const L = useL()

const todayIdx = computed(() => quest.todayIndex(props.run))
const selected = ref(Math.min(WEEK - 1, Math.max(0, todayIdx.value)))
watch(todayIdx, v => (selected.value = Math.min(WEEK - 1, Math.max(0, v))))

const status = computed(() => runStatus(props.run, quest.today))
const tracker = computed(() => TRACKERS[props.challenge.tracker])
const editable = computed(() => canEditDay(props.run, selected.value, quest.today))
const complete = computed(() => allChecked(props.run))
const celebrating = ref(false)

const startLabel = computed(() => formatDate(props.run.start, L.tag(), { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }))

function summary(i: number) {
  return tracker.value.summary?.(props.run.days[i]!, quest.locale) ?? ''
}

function select(i: number) {
  if (i > todayIdx.value) {
    haptic.warning()
    return
  }
  if (selected.value !== i) {
    haptic.select()
    sfx.play('page', 0.35)
  }
  selected.value = i
}

/** Timed challenges whose session shows as a Live Activity (walk has its own line). */
const LOCKABLE = ['meditate', 'stretch', 'offline', 'nature', 'still', 'focus', 'firsthour', 'listen', 'fast']
const lockable = computed(() => Capacitor.isNativePlatform() && LOCKABLE.includes(props.challenge.tracker))

const panel = ref<HTMLElement | null>(null)
const nudge = ref(false)

/** Boxes are ticked by doing the challenge: point to the day's panel instead. */
function needsAction(i: number) {
  select(i)
  panel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  nudge.value = false
  requestAnimationFrame(() => (nudge.value = true))
  setTimeout(() => (nudge.value = false), 700)
  toast.info(L('Do the challenge above to tick the day'))
}

function toggle(i: number, v: boolean) {
  quest.toggleDay(props.run, i, v)
  selected.value = i
}

function stampDone() {
  if (!complete.value || props.run.completedAt)
    return
  celebrating.value = true
}

function onCelebrated() {
  quest.complete(props.run)
}

function dayLabel(i: number) {
  return L(`DAY ${i + 1}`)
}

function dayDate(i: number) {
  return formatDate(dateOfDay(props.run, i), L.tag(), { weekday: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="tracker-shell" :class="{ archived: !!run.completedAt }">
    <header class="text-center mb-5">
      <p class="t-label">
        {{ $t('common.startDate') }} :
      </p>
      <p class="t-body mt-0.5 capitalize">
        {{ startLabel }}
      </p>
    </header>

    <!-- status banners -->
    <p v-if="status === 'upcoming'" class="t-body text-center text-graphite mb-6">
      {{ $t('home.startsIn') }} — {{ L('your notebook awaits.') }}
    </p>
    <p v-else-if="status === 'missed'" class="t-body text-center text-graphite mb-6">
      {{ $t('home.missed') }}
    </p>

    <!-- interactive panel for the selected day -->
    <section v-if="status !== 'upcoming' && !run.completedAt" ref="panel" class="panel frame mb-7" :class="{ nudge }">
      <div class="frame-inner px-4 pt-4 pb-5">
        <div class="flex items-baseline justify-between mb-3">
          <span class="t-display text-lg">{{ dayLabel(selected) }}</span>
          <span class="t-label text-pencil">{{ dayDate(selected) }}</span>
        </div>
        <Transition name="panel" mode="out-in">
          <component
            :is="tracker.component"
            :key="`${run.id}-${selected}`"
            :run="run"
            :challenge="challenge"
            :idx="selected"
            :editable="editable"
            :is-today="selected === todayIdx"
          />
        </Transition>
        <p v-if="lockable && editable && selected === todayIdx" class="lock-line t-body">
          <QuestIcon name="lock" :size="14" :stroke="3" class="inline -mt-0.5" />
          {{ L('Once started, you can lock the phone: the timer stays on your lock screen.') }}
        </p>
      </div>
    </section>

    <!-- the booklet grid: JOUR 1 … JOUR 7 + DONE -->
    <section class="grid grid-cols-2 gap-x-6 gap-y-6 stagger">
      <div v-for="i in WEEK" :key="i" class="day-cell" :class="{ selected: selected === i - 1 && status !== 'upcoming', future: i - 1 > todayIdx }" @click="select(i - 1)">
        <div class="flex items-center justify-between mb-1.5">
          <span class="t-label">{{ dayLabel(i - 1) }}</span>
          <span v-if="i - 1 === todayIdx" class="today-dot" />
        </div>
        <div class="flex items-center gap-3">
          <InkCheck
            :model-value="run.days[i - 1]!.done"
            :size="58"
            :disabled="!canEditDay(run, i - 1, quest.today)"
            :manual="challenge.tracker === 'custom'"
            @update:model-value="v => toggle(i - 1, v)"
            @needs-action="needsAction(i - 1)"
          />
          <p class="summary t-body text-[0.8rem] leading-tight text-graphite line-clamp-3">
            {{ summary(i - 1) }}
          </p>
        </div>
      </div>
      <div class="day-cell flex flex-col items-center justify-end">
        <InkCheck
          :model-value="!!run.completedAt"
          label="DONE"
          variant="done"
          :size="70"
          :disabled="!complete || !!run.completedAt"
          @update:model-value="stampDone"
        />
      </div>
    </section>

    <DoneStamp v-if="celebrating" :challenge="challenge" @stamped="onCelebrated" @close="celebrating = false" />
  </div>
</template>

<style scoped>
.archived :deep(.is-disabled) {
  opacity: 1;
}

.day-cell {
  padding: 6px 4px;
  transition:
    transform 200ms var(--ease-spring),
    opacity 200ms;
}

.day-cell.future {
  opacity: 0.45;
}

.day-cell.selected .t-label {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
}

.today-dot {
  width: 7px;
  height: 7px;
  background: var(--color-ink);
  border-radius: 50%;
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    transform: scale(1.6);
    opacity: 0.5;
  }
}

.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms var(--ease-out-quint);
}

.panel-enter-from {
  opacity: 0;
  transform: translateX(18px);
}

.panel-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}

.panel.nudge {
  animation: nudge 600ms var(--ease-spring);
}

@keyframes nudge {
  25% {
    transform: translateX(-6px);
  }
  50% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
}

.lock-line {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1.5px dashed var(--color-rule);
  font-size: 0.75rem;
  color: var(--color-graphite);
  text-align: center;
}
</style>
