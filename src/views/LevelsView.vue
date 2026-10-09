<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import JokerSheet from '~/components/JokerSheet.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { challengesOfLevel, LEVELS } from '~/data/challenges'
import { tr } from '~/i18n/translate'
import { haptic } from '~/services/haptics'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()
const jokerSheet = ref<InstanceType<typeof JokerSheet> | null>(null)

const levels = computed(() => LEVELS.map(l => ({ ...l, items: challengesOfLevel(l.n), done: quest.levelDone(l.n) })))

function open(c: Challenge) {
  haptic.tap()
  setDirection('forward')
  void router.push(`/challenge/${c.id}/read`)
}

function state(c: Challenge) {
  if (quest.completedIds.has(c.id))
    return 'done'
  if (quest.runFor(c.id))
    return 'live'
  if (quest.skippedIds.has(c.id))
    return 'joker'
  if (quest.isLocked(c))
    return 'locked'
  return 'todo'
}

function newCustom() {
  haptic.tap()
  setDirection('forward')
  void router.push('/custom/new')
}
</script>

<template>
  <QuestPage>
    <h1 class="t-display text-[2.6rem]">
      {{ $t('tabs.levels') }}
    </h1>
    <button class="joker-chip mt-3" @click="jokerSheet?.present()">
      <QuestIcon name="joker" :size="18" :stroke="3" /> {{ quest.jokerBalance }} joker{{ quest.jokerBalance === 1 ? '' : 's' }}
    </button>
    <JokerSheet ref="jokerSheet" />
    <p class="t-body text-graphite mt-1">
      {{ L('52 challenges, one a week for a year. Finish a level to unlock the next.') }}
    </p>

    <section v-for="lvl in levels" :key="lvl.n" class="sheet level mt-8 px-5 pt-6 pb-3" :class="{ 'current': lvl.n === quest.currentLevel, 'level-locked': lvl.n > quest.currentLevel }">
      <div class="flex items-end justify-between">
        <div>
          <p class="t-label">
            {{ L('Level') }} {{ lvl.roman }}
          </p>
          <h2 class="t-display text-[1.65rem] leading-none mt-1">
            {{ tr(lvl.text) }}
          </h2>
        </div>
        <QuestIcon v-if="lvl.n > quest.currentLevel" name="lock" :size="26" :stroke="3" class="mb-0.5" />
        <div v-else class="flex gap-1 pb-1">
          <span v-for="i in lvl.items.length" :key="i" class="pip" :class="{ on: i <= lvl.done }" />
        </div>
      </div>

      <ul class="mt-4">
        <li v-for="c in lvl.items" :key="c.id" class="row" :class="{ 'is-locked': state(c) === 'locked' }" @click="open(c)">
          <QuestIcon :name="c.icon" :size="30" :stroke="3" class="shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="t-display text-[0.95rem]">
              {{ tr(c.text.title) }}
            </p>
            <p class="t-body text-[0.82rem] text-graphite leading-snug">
              {{ tr(c.text.short) }}
            </p>
          </div>
          <QuestIcon v-if="state(c) === 'joker'" name="joker" :size="26" :stroke="3" class="shrink-0 mr-0.5" />
          <QuestIcon v-else-if="state(c) === 'locked'" name="lock" :size="22" :stroke="3" class="shrink-0 text-pencil mr-1" />
          <span v-else class="box" :class="state(c)">
            <svg v-if="state(c) === 'done'" viewBox="0 0 100 100" class="overflow-visible"><path d="M20 50 C27 55 33 63 40 77 C53 52 72 25 104 2" fill="none" stroke="var(--color-ink)" stroke-width="11" stroke-linecap="round" /></svg>
            <span v-else-if="state(c) === 'live'" class="live-dot" />
          </span>
        </li>
      </ul>
    </section>

    <!-- bonus level: blank pages at the end of the booklet -->
    <section class="sheet level mt-8 px-5 pt-6 pb-5">
      <p class="t-label">
        {{ L('Bonus levels') }}
      </p>
      <h2 class="t-display text-[1.65rem] leading-none mt-1">
        {{ $t('settings.custom') }}
      </h2>
      <ul v-if="quest.custom.length" class="mt-4">
        <li v-for="c in quest.custom" :key="c.id" class="row" @click="open(c)">
          <QuestIcon :name="c.icon" :size="30" :stroke="3" class="shrink-0" />
          <div class="flex-1">
            <p class="t-display text-[0.95rem]">
              {{ tr(c.text.title) }}
            </p>
            <p class="t-body text-[0.82rem] text-graphite">
              {{ tr(c.text.short) }}
            </p>
          </div>
          <span class="box" :class="state(c)" />
        </li>
      </ul>
      <button class="btn w-full mt-4 border-dashed" @click="newCustom">
        + {{ $t('settings.createCustom') }}
      </button>
    </section>
  </QuestPage>
</template>

<style scoped>
.joker-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 2px solid var(--color-ink);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.level.level-locked {
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--color-rule);
}

.is-locked p {
  opacity: 0.55;
}

.level {
  border: 0;
  box-shadow: 0 1px 0 var(--color-rule), 0 18px 40px -30px rgb(0 0 0 / 0.35);
}

.level.current {
  outline: 2.5px solid var(--color-ink);
  outline-offset: -2.5px;
}

/* Outlines and inset shadows ignore the clipped corner: draw its diagonal edge by hand.
   A bar starting where the cut begins, rotated 45°, its thickness falling inside the page. */
.level.current::after,
.level-locked::after {
  content: '';
  position: absolute;
  top: 0;
  left: calc(100% - var(--cut));
  width: calc(var(--cut) * 1.4142);
  height: var(--edge-w);
  background: var(--edge);
  transform: rotate(45deg);
  transform-origin: 0 0;
  pointer-events: none;
}

.level.current {
  --edge: var(--color-ink);
  --edge-w: 2.5px;
}

.level-locked {
  --edge: var(--color-rule);
  --edge-w: 2px;
}

.row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 0;
  border-top: 1px dashed var(--color-rule);
  transition: transform 200ms var(--ease-spring);
}

.row:active {
  transform: translateX(4px);
}

.box {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 2.5px solid var(--color-ink);
  display: grid;
  place-items: center;
}

.box svg {
  width: 100%;
  height: 100%;
}

.box.done svg path {
  stroke-dasharray: 160;
  animation: draw 700ms var(--ease-ink) both;
}

@keyframes draw {
  from {
    stroke-dashoffset: 160;
  }
}

.live-dot {
  width: 10px;
  height: 10px;
  background: var(--color-ink);
  animation: live 1.4s ease-in-out infinite;
}

@keyframes live {
  50% {
    transform: scale(0.5);
  }
}

.pip {
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-ink);
}

.pip.on {
  background: var(--color-ink);
}
</style>
