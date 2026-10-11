<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '~/components/BrandMark.vue'
import MiniWeek from '~/components/MiniWeek.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { CATEGORY_LABEL, CHALLENGES } from '~/data/challenges'
import { tr } from '~/i18n/translate'
import { formatDate, fromISO, isMonday } from '~/lib/date'
import { runStatus } from '~/lib/progress'
import { haptic } from '~/services/haptics'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()

const dateLabel = computed(() => formatDate(quest.today, L.tag(), { weekday: 'long', day: 'numeric', month: 'long' }))
const monday = computed(() => isMonday(quest.today))

const cards = computed(() => quest.liveRuns
  .map(run => ({ run, c: quest.challenge(run.challengeId)!, status: runStatus(run, quest.today), idx: quest.todayIndex(run) }))
  .filter(x => x.c))

const next = computed<Challenge | undefined>(() => CHALLENGES.find(c => !quest.clearedIds.has(c.id) && !quest.runFor(c.id)))

function open(c: Challenge, page: 'read' | 'track' = 'track') {
  haptic.tap()
  setDirection('forward')
  void router.push(`/challenge/${c.id}/${page}`)
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

    <!-- stats in booklet boxes -->
    <section class="grid grid-cols-3 mt-6 frame-plain stagger">
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
      <article v-for="{ run, c, status, idx } in cards" :key="run.id" class="frame card" @click="open(c)">
        <div class="frame-inner p-5">
          <div class="flex items-start gap-4">
            <QuestIcon :name="c.icon" :size="56" />
            <div class="flex-1 min-w-0">
              <p class="t-label text-graphite">
                <template v-if="status === 'upcoming'">
                  {{ daysUntil(run) === 1 ? L('Tomorrow, Monday') : L(`Monday · in ${daysUntil(run)} d`) }}
                </template>
                <template v-else-if="status === 'finishing'">
                  {{ $t('home.finishing') }}
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
        </div>
      </article>

      <!-- nothing running: next challenge from the booklet order -->
      <article v-if="!cards.length && next" class="frame card" @click="open(next, 'read')">
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
          <button class="btn btn-ink mt-6 w-full" @click.stop="open(next, 'read')">
            {{ $t('common.start') }}
          </button>
        </div>
      </article>
    </section>

    <p v-if="!cards.length" class="t-body text-center text-sm text-pencil mt-6 px-6">
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

.go {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  transition: transform 220ms var(--ease-spring);
}

.card:active .go {
  transform: translateX(6px);
}
</style>
