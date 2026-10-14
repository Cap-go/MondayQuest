<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { toast } from '@capgo/capacitor-pretty-toast'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '~/components/BrandMark.vue'
import MiniWeek from '~/components/MiniWeek.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { CATEGORY_LABEL, CHALLENGES } from '~/data/challenges'
import { t } from '~/i18n'
import { tr } from '~/i18n/translate'
import { formatDate, fromISO, isMonday } from '~/lib/date'
import { allChecked, checkedCount, runStatus } from '~/lib/progress'
import { haptic } from '~/services/haptics'
import { exportNotebook } from '~/services/pdf'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()

const dateLabel = computed(() => formatDate(quest.today, L.tag(), { weekday: 'long', day: 'numeric', month: 'long' }))
const monday = computed(() => isMonday(quest.today))

const cards = computed(() => quest.liveRuns
  .map(run => ({ run, c: quest.challenge(run.challengeId)!, status: runStatus(run, quest.today), idx: quest.todayIndex(run), full: allChecked(run) }))
  .filter(x => x.c))

/** Only finished-but-not-stamped weeks left: the next challenge must stay reachable. */
const busy = computed(() => cards.value.some(x => x.status === 'active' || x.status === 'upcoming'))

// Missed weeks the user has seen on Today, kept on this device.
const SEEN_KEY = 'mq.missedSeen'
const seen = ref<string[]>(readSeen())

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  }
  catch {
    return []
  }
}

/** Most recent missed week, until dismissed, retried, skipped or followed by any newer run. */
const missed = computed(() => {
  const run = [...quest.runs]
    .filter(r => runStatus(r, quest.today) === 'missed')
    .sort((a, b) => b.start.localeCompare(a.start))[0]
  if (!run || seen.value.includes(run.id))
    return undefined
  const c = quest.challenge(run.challengeId)
  if (!c || quest.clearedIds.has(c.id) || quest.runFor(c.id) || quest.runs.some(r => r.start > run.start))
    return undefined
  return { run, c, n: checkedCount(run), joker: quest.canUseJoker(c) }
})

const next = computed<Challenge | undefined>(() => CHALLENGES.find(c => !quest.clearedIds.has(c.id) && !quest.runFor(c.id) && c.id !== missed.value?.c.id))

/** Every booklet challenge done or skipped, nothing running. */
const yearDone = computed(() => !cards.value.length && !next.value && !missed.value && CHALLENGES.every(c => quest.clearedIds.has(c.id)))

function open(c: Challenge, page: 'read' | 'track' = 'track', query?: Record<string, string>) {
  haptic.tap()
  setDirection('forward')
  void router.push({ path: `/challenge/${c.id}/${page}`, query })
}

/** Open the read page with the start sheet already up. */
function askStart(c: Challenge) {
  open(c, 'read', { start: '1' })
}

function stamp(c: Challenge) {
  open(c, 'track', { stamp: '1' })
}

function dismissMissed(run: Run) {
  haptic.tap()
  seen.value = [...seen.value, run.id].slice(-50)
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen.value))
}

function jokerMissed(c: Challenge) {
  if (!quest.useJoker(c))
    return
  sfx.play('stamp')
  haptic.success()
  toast.success(L('Joker played'), { message: t('home.skipped', { title: tr(c.text.title) }) })
}

const exporting = ref(false)

async function exportPdf() {
  if (exporting.value)
    return
  exporting.value = true
  haptic.press()
  try {
    await exportNotebook({ runs: quest.runs, challenge: id => quest.challenge(id), locale: quest.locale, streak: quest.currentStreak, checks: quest.totalChecks })
    haptic.success()
  }
  catch (e) {
    toast.error(L('Export failed'), { message: String((e as Error)?.message ?? e) })
  }
  finally {
    exporting.value = false
  }
}

function daysUntil(run: Run) {
  const ms = fromISO(run.start).getTime() - fromISO(quest.today).getTime()
  return Math.round(ms / 86_400_000)
}
</script>

<template>
  <QuestPage :title="$t('tabs.today')">
    <header class="flex items-start justify-between stagger">
      <div>
        <p class="t-label text-graphite capitalize">
          {{ dateLabel }}
        </p>
        <h1 class="t-display text-[2.6rem] mt-1">
          {{ monday ? $t('home.mondayHello') : $t('tabs.today') }}
        </h1>
      </div>
      <BrandMark :size="44" class="mt-1" />
    </header>

    <!-- stats in booklet boxes (once there is something to count) -->
    <section v-if="quest.totalChecks > 0" class="grid grid-cols-3 mt-6 frame-plain stagger">
      <div class="stat">
        <p class="t-display text-3xl tabular-nums">
          {{ quest.currentStreak }}
        </p>
        <p class="t-label text-[0.6rem] text-graphite leading-tight">
          {{ $t('home.streak', quest.currentStreak) }}
        </p>
      </div>
      <div class="stat border-x-[2.5px] border-ink">
        <p class="t-display text-3xl tabular-nums">
          {{ quest.totalChecks }}
        </p>
        <p class="t-label text-[0.6rem] text-graphite leading-tight">
          {{ $t('home.checks') }}
        </p>
      </div>
      <div class="stat">
        <p class="t-display text-3xl tabular-nums">
          {{ quest.completedIds.size }}<span class="text-pencil text-lg">/{{ CHALLENGES.length }}</span>
        </p>
        <p class="t-label text-[0.6rem] text-graphite leading-tight">
          {{ $t('home.completed') }}
        </p>
      </div>
    </section>

    <!-- live challenges -->
    <section class="mt-8 space-y-5 stagger">
      <article
        v-for="{ run, c, status, idx, full } in cards"
        :key="run.id"
        class="frame card"
        role="button"
        tabindex="0"
        @click="open(c)"
        @keydown.enter.self="open(c)"
        @keydown.space.self.prevent="open(c)"
      >
        <div class="frame-inner p-5" :class="{ ready: status === 'finishing' && full }">
          <div class="flex items-start gap-4">
            <QuestIcon :name="c.icon" :size="56" />
            <div class="flex-1 min-w-0">
              <p class="t-label" :class="status === 'finishing' ? 'text-ink' : 'text-graphite'">
                <template v-if="status === 'upcoming'">
                  {{ daysUntil(run) === 1 ? L('Tomorrow, Monday') : $t('home.inDays', { n: daysUntil(run) }) }}
                </template>
                <template v-else-if="status === 'finishing'">
                  {{ full ? $t('home.finishing') : $t('home.catchUp', { n: checkedCount(run) }) }}
                </template>
                <template v-else>
                  {{ $t('home.dayOf', { n: idx + 1 }) }}
                </template>
              </p>
              <h2 class="t-display text-2xl mt-0.5">
                {{ tr(c.text.title) }}
              </h2>
              <p class="t-body text-sm text-graphite mt-1 line-clamp-2">
                {{ tr(c.text.short) }}
              </p>
            </div>
          </div>
          <div class="flex items-center justify-between mt-5">
            <MiniWeek :run="run" :today="idx" />
            <span class="go">→</span>
          </div>
          <button v-if="status === 'finishing' && full" class="btn btn-ink w-full mt-5" @click.stop="stamp(c)">
            {{ $t('home.stampDone') }}
          </button>
        </div>
      </article>

      <!-- the last week ran out: say so instead of offering it again as new -->
      <article v-if="missed" class="frame">
        <div class="frame-inner p-5">
          <div class="flex items-start gap-4">
            <QuestIcon :name="missed.c.icon" :size="56" />
            <div class="flex-1 min-w-0">
              <p class="t-label text-graphite">
                {{ $t('home.weekOver', { n: missed.n }) }}
              </p>
              <h2 class="t-display text-2xl mt-0.5">
                {{ tr(missed.c.text.title) }}
              </h2>
              <p class="t-body text-sm text-graphite mt-1">
                {{ $t('home.missedText') }}
              </p>
            </div>
            <button class="dismiss" :aria-label="$t('home.dismiss')" @click="dismissMissed(missed.run)">
              ×
            </button>
          </div>
          <div class="flex gap-3 mt-5">
            <button class="btn btn-ink flex-1" @click="askStart(missed.c)">
              {{ $t('home.retry') }}
            </button>
            <button v-if="missed.joker" class="btn flex-1 flex items-center justify-center gap-1.5" @click="jokerMissed(missed.c)">
              <QuestIcon name="joker" :size="18" :stroke="3" /> {{ $t('home.useJoker') }}
            </button>
          </div>
        </div>
      </article>

      <!-- nothing waiting to be ticked: next challenge from the booklet order -->
      <article
        v-if="!busy && next"
        class="frame card"
        role="button"
        tabindex="0"
        @click="open(next, 'read')"
        @keydown.enter.self="open(next, 'read')"
        @keydown.space.self.prevent="open(next, 'read')"
      >
        <div class="frame-inner p-6 text-center">
          <p class="t-label text-graphite">
            {{ $t('home.nextUp') }} · {{ $t('common.level', { n: next.level }) }}
          </p>
          <QuestIcon :name="next.icon" :size="84" draw class="mx-auto my-4" />
          <h2 class="t-display text-3xl">
            {{ tr(next.text.title) }}
          </h2>
          <p class="t-body text-graphite mt-2">
            {{ tr(next.text.short) }}
          </p>
          <p class="t-body italic text-sm mt-3">
            - {{ tr(CATEGORY_LABEL[next.category]) }}
          </p>
          <button class="btn btn-ink mt-6 w-full" @click.stop="askStart(next)">
            {{ $t('common.start') }}
          </button>
        </div>
      </article>

      <!-- 52 cleared: the year is done -->
      <article v-if="yearDone" class="frame">
        <div class="frame-inner p-6 text-center">
          <BrandMark :size="72" class="mx-auto" />
          <h2 class="t-display text-3xl mt-4">
            {{ $t('home.yearTitle') }}
          </h2>
          <p class="t-body text-graphite mt-2">
            {{ $t('home.yearText') }}
          </p>
          <button class="btn btn-ink mt-6 w-full" :disabled="exporting" @click="exportPdf">
            {{ exporting ? '…' : $t('home.exportPdf') }}
          </button>
          <button class="btn mt-3 w-full" @click="askStart(CHALLENGES[0]!)">
            {{ $t('home.redo') }}
          </button>
        </div>
      </article>
    </section>

    <p v-if="!busy && next && !missed" class="t-body text-center text-sm text-pencil mt-6 px-6">
      {{ $t('home.pickOne') }}
    </p>
  </QuestPage>
</template>

<style scoped>
.stat {
  padding: 14px 10px 12px;
  text-align: center;
}

.card {
  transition: transform 220ms var(--ease-spring);
}

.card:active {
  transform: scale(0.975);
}

.card:focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 4px;
}

.go {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  transition: transform 220ms var(--ease-spring);
}

.card:active .go {
  transform: translateX(6px);
}

.ready {
  box-shadow: inset 0 0 0 2.5px var(--color-ink);
}

.dismiss {
  width: 32px;
  height: 32px;
  margin: -6px -6px 0 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--color-graphite);
}
</style>
