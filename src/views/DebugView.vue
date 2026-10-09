<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { toast } from '@capgo/capacitor-pretty-toast'
import { RichNotifications } from '@capgo/capacitor-rich-notifications'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BackButton from '~/components/BackButton.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import ToggleRow from '~/components/ToggleRow.vue'
import { CHALLENGES, LEVELS } from '~/data/challenges'
import { addDays } from '~/lib/date'
import { setSystemAlarm } from '~/services/alarm'
import { buildEnv } from '~/services/env'
import { haptic } from '~/services/haptics'
import { rescheduleAll } from '~/services/notifications'
import { bundleVersion, nativeVersion } from '~/services/updater'
import { startSessionActivity, syncTodayWidget } from '~/services/widgets'
import { useQuest } from '~/stores/quest'

// Test-build only (TestFlight / dev / unlocked): jump into any challenge's UI without waiting weeks.
const quest = useQuest()
const router = useRouter()
const filter = ref(0)
const list = computed(() => CHALLENGES.filter(c => !filter.value || c.level === filter.value))

function go(path: string) {
  setDirection('forward')
  void router.push(path)
}

function clearRuns(c: Challenge) {
  quest.runs = quest.runs.filter(r => r.challengeId !== c.id)
}

/** Start a run 3 days ago so today is day 4 and earlier days can be ticked too. */
function tryToday(c: Challenge) {
  haptic.tap()
  quest.settings.unlockAll = true
  clearRuns(c)
  quest.start(c.id, addDays(quest.today, -3))
  go(`/challenge/${c.id}/track`)
}

/** A full week already ticked: lands on the DONE stamp. */
function tryDone(c: Challenge) {
  haptic.tap()
  quest.settings.unlockAll = true
  clearRuns(c)
  const run = quest.start(c.id, addDays(quest.today, -6))
  for (let i = 0; i < 7; i++)
    quest.toggleDay(quest.runs.find(r => r.id === run.id)!, i, true)
  go(`/challenge/${c.id}/track`)
}

function completeLevel(n: number) {
  for (const c of CHALLENGES.filter(c => c.level === n)) {
    clearRuns(c)
    const run = quest.start(c.id, addDays(quest.today, -7))
    quest.complete(run)
  }
  haptic.success()
  toast.success(`Level ${n} completed`)
}

async function testNotification() {
  await RichNotifications.requestPermission().catch(() => {})
  await RichNotifications.schedule({
    notification: { id: `mq-debug-${Date.now()}`, title: 'Monday Quest', body: 'Test notification. Today\'s challenge is waiting.', channelId: 'quest', categoryId: 'daily' },
    trigger: { type: 'timestamp', timestamp: Date.now() + 5000 },
  }).catch(e => toast.error(String(e)))
  toast.info('Notification in 5 s. Lock the phone.')
}

async function testAlarm() {
  const d = new Date(Date.now() + 2 * 60_000)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  await setSystemAlarm(hm, 'Monday Quest test alarm')
}

async function testLiveActivity() {
  await startSessionActivity({ title: 'TEST SESSION', subtitle: 'Live Activity preview', short: '•', icon: 'clock', durationMs: 60_000, startedAt: Date.now() })
  toast.info('Live Activity for 1 min')
}

async function refreshAll() {
  await syncTodayWidget()
  await rescheduleAll()
  toast.success('Widget + reminders refreshed')
}

function replayOnboarding() {
  quest.settings.onboarded = false
  setDirection('root')
  void router.replace('/onboarding')
}

function hideDebug() {
  quest.settings.debug = false
  quest.settings.unlockAll = false
  setDirection('back')
  void router.replace('/settings')
}
</script>

<template>
  <QuestPage>
    <div class="flex items-center gap-3">
      <BackButton fallback="/settings" />
      <h1 class="t-display text-[2.2rem]">
        Debug
      </h1>
    </div>
    <p class="t-label text-pencil mt-1">
      {{ buildEnv }} · app {{ nativeVersion || 'web' }} · bundle {{ bundleVersion }}
    </p>

    <section class="mt-6">
      <ToggleRow v-model="quest.settings.unlockAll" label="Unlock every level" />
    </section>

    <section class="mt-6 grid grid-cols-2 gap-2">
      <button class="btn" @click="testNotification">
        Notification
      </button>
      <button class="btn" @click="testAlarm">
        Alarm +2 min
      </button>
      <button class="btn" @click="testLiveActivity">
        Live Activity
      </button>
      <button class="btn" @click="refreshAll">
        Widget + reminders
      </button>
      <button class="btn" @click="replayOnboarding">
        Onboarding
      </button>
      <button class="btn" @click="hideDebug">
        Hide debug
      </button>
    </section>

    <section class="mt-8">
      <p class="t-label">
        Complete a level
      </p>
      <div class="flex flex-wrap gap-1.5 mt-2">
        <button v-for="l in LEVELS" :key="l.n" class="chip" @click="completeLevel(l.n)">
          {{ l.roman }}
        </button>
      </div>
    </section>

    <section class="mt-8">
      <p class="t-label">
        All {{ CHALLENGES.length }} challenges
      </p>
      <div class="flex flex-wrap gap-1.5 mt-2">
        <button class="chip" :class="{ on: !filter }" @click="filter = 0">
          All
        </button>
        <button v-for="l in LEVELS" :key="l.n" class="chip" :class="{ on: filter === l.n }" @click="filter = l.n">
          {{ l.roman }}
        </button>
      </div>
      <ul class="mt-3">
        <li v-for="c in list" :key="c.id" class="row">
          <QuestIcon :name="c.icon" :size="26" :stroke="3" class="shrink-0" />
          <button class="flex-1 min-w-0 text-left" @click="go(`/challenge/${c.id}/read`)">
            <p class="t-display text-[0.85rem] truncate">
              {{ c.n }}. {{ c.text[quest.locale].title }}
            </p>
            <p class="t-label text-[0.55rem] text-pencil">
              {{ c.tracker }} · L{{ c.level }}
            </p>
          </button>
          <button class="chip" @click="tryToday(c)">
            Try
          </button>
          <button class="chip" @click="tryDone(c)">
            Done
          </button>
        </li>
      </ul>
    </section>
  </QuestPage>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1.5px dashed var(--color-rule);
}

.chip {
  padding: 6px 10px;
  border: 2px solid var(--color-ink);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.chip.on {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>
