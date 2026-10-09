<script setup lang="ts">
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { CHALLENGES } from '~/data/challenges'
import { formatDate } from '~/lib/date'
import { checkedCount, runStatus } from '~/lib/progress'
import { haptic } from '~/services/haptics'
import { useQuest } from '~/stores/quest'
import { TRACKERS } from '~/trackers'

const quest = useQuest()
const router = useRouter()
const L = useL()

const entries = computed(() => [...quest.runs]
  .filter(r => r.days.some(d => d.done || Object.keys(d.data).length))
  .sort((a, b) => b.start.localeCompare(a.start))
  .map(r => ({ run: r, c: quest.challenge(r.challengeId)! }))
  .filter(e => e.c))

function lines(e: (typeof entries.value)[number]) {
  const sum = TRACKERS[e.c.tracker].summary
  return e.run.days.map((d, i) => ({ i, done: d.done, text: sum?.(d, quest.locale) ?? '', img: d.data.photo || d.data.drawing, items: d.data.items as string[] | undefined }))
}

function open(id: string) {
  haptic.tap()
  setDirection('forward')
  void router.push(`/challenge/${id}/track`)
}
</script>

<template>
  <QuestPage>
    <h1 class="t-display text-[2.6rem]">
      {{ $t('journal.title') }}
    </h1>

    <!-- 30 challenges, 30 boxes -->
    <section class="mt-6">
      <p class="t-label mb-2">
        {{ $t('journal.stats') }}
      </p>
      <div class="grid grid-cols-10 gap-1.5">
        <button v-for="c in CHALLENGES" :key="c.id" class="cell" :class="{ on: quest.completedIds.has(c.id), live: quest.runFor(c.id) }" :aria-label="c.text[quest.locale].title" @click="open(c.id)">
          <span class="t-label text-[0.55rem]">{{ c.n }}</span>
        </button>
      </div>
    </section>

    <p v-if="!entries.length" class="t-body text-center text-pencil mt-16">
      {{ $t('journal.empty') }}
    </p>

    <article v-for="e in entries" :key="e.run.id" class="sheet entry mt-6 p-5" @click="open(e.c.id)">
      <header class="flex items-center gap-3">
        <QuestIcon :name="e.c.icon" :size="34" :stroke="3" />
        <div class="flex-1">
          <p class="t-label text-graphite">
            {{ $t('journal.week', { date: formatDate(e.run.start, L.tag(), { day: 'numeric', month: 'long' }) }) }}
          </p>
          <p class="t-display text-lg">
            {{ e.c.text[quest.locale].title }}
          </p>
        </div>
        <span class="t-label">{{ runStatus(e.run, quest.today) === 'completed' ? 'DONE' : `${checkedCount(e.run)}/7` }}</span>
      </header>
      <ul class="mt-3 space-y-1.5">
        <li v-for="l in lines(e).filter(x => x.done || x.text || x.img)" :key="l.i" class="flex gap-3 items-start">
          <span class="t-label w-14 shrink-0 text-[0.7rem] pt-0.5">{{ L('Jour', 'Day') }} {{ l.i + 1 }}</span>
          <div class="flex-1 min-w-0">
            <p v-if="l.items" class="t-body text-sm">
              {{ l.items.filter(Boolean).join(' · ') }}
            </p>
            <p v-else-if="l.text" class="t-body text-sm truncate">
              {{ l.text }}
            </p>
            <img v-if="l.img" :src="l.img" class="w-16 h-16 object-cover border border-ink mt-1" alt="">
          </div>
          <span v-if="l.done">✓</span>
        </li>
      </ul>
    </article>
  </QuestPage>
</template>

<style scoped>
.cell {
  aspect-ratio: 1;
  border: 2px solid var(--color-ink);
  display: grid;
  place-items: center;
  transition: transform 160ms var(--ease-spring);
}

.cell:active {
  transform: scale(0.85);
}

.cell.on {
  background: var(--color-ink);
  color: var(--color-paper);
}

.cell.live {
  border-style: dashed;
}

.entry {
  box-shadow: 0 1px 0 var(--color-rule), 0 18px 40px -30px rgb(0 0 0 / 0.35);
}
</style>
