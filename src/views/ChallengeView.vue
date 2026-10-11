<script setup lang="ts">
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JokerSheet from '~/components/JokerSheet.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import TrackerShell from '~/components/TrackerShell.vue'
import { useL } from '~/composables/useL'
import { CATEGORY_LABEL, challengesOfLevel } from '~/data/challenges'
import { ct } from '~/i18n/content'
import { tr } from '~/i18n/translate'
import { formatDate, isMonday, nextMonday } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { nativeTabs, navTitle } from '~/services/navigation'
import { ensureReminders } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const route = useRoute()
const router = useRouter()
const quest = useQuest()
const L = useL()

const id = computed(() => String(route.params.id))
const c = computed(() => quest.challenge(id.value))
const text = computed(() => (c.value ? ct(c.value) : undefined))
const run = computed(() => quest.runFor(id.value))
const last = computed(() => quest.lastRun(id.value))
const completed = computed(() => last.value?.completedAt)
// Keep showing a run right after DONE so the celebration isn't unmounted.
const shown = computed(() => run.value ?? (last.value?.completedAt ? last.value : undefined))

const pager = ref<HTMLElement | null>(null)
const page = ref(route.params.page === 'track' ? 1 : 0)
const scrollP = ref(page.value)
const sheet = ref<any>(null)
const jokerSheet = ref<InstanceType<typeof JokerSheet> | null>(null)
const skipped = computed(() => quest.skippedIds.has(id.value))

// Native navbar title (the back button is native on device).
watch([() => route.path, () => text.value?.title], () => {
  if (route.path.startsWith('/challenge/') && text.value)
    navTitle.value = text.value.title
}, { immediate: true })

onMounted(async () => {
  await nextTick()
  if (pager.value && page.value === 1)
    pager.value.scrollLeft = pager.value.clientWidth
})

function onScroll() {
  const el = pager.value!
  scrollP.value = el.scrollLeft / el.clientWidth
  const p = Math.round(scrollP.value)
  if (p !== page.value) {
    page.value = p
    sfx.play('page', 0.5)
    haptic.select()
    void router.replace(`/challenge/${id.value}/${p ? 'track' : 'read'}`)
  }
}

function goPage(p: number) {
  pager.value?.scrollTo({ left: p * pager.value.clientWidth, behavior: 'smooth' })
}

function back() {
  haptic.tap()
  setDirection('back')
  if (window.history.state?.back)
    router.back()
  else
    void router.replace('/today')
}

const locked = computed(() => !!c.value && quest.isLocked(c.value))

function askStart() {
  if (locked.value) {
    haptic.error()
    return
  }
  haptic.press()
  sheet.value?.present?.()
}

function start(when: 'monday' | 'now' | 'hardcore') {
  const date = when === 'now' || isMonday(quest.today) ? quest.today : nextMonday(quest.today)
  if (when === 'hardcore' && c.value) {
    for (const ch of challengesOfLevel(c.value.level)) {
      if (!quest.completedIds.has(ch.id))
        quest.start(ch.id, date)
    }
  }
  else {
    quest.start(id.value, date)
  }
  sheet.value?.dismiss?.()
  void ensureReminders()
  sfx.play('chime')
  haptic.success()
  setTimeout(goPage, 350, 1)
}

const mondayLabel = computed(() => capitalize(formatDate(isMonday(quest.today) ? quest.today : nextMonday(quest.today), L.tag(), { weekday: 'long', day: 'numeric', month: 'long' })))

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<template>
  <QuestPage flush>
    <div v-if="c && text" class="cv">
      <!-- top bar -->
      <div class="topbar" :class="{ native: nativeTabs }">
        <button v-if="!nativeTabs" class="icon-btn" :aria-label="$t('common.back')" @click="back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div class="tabs">
          <button :class="{ on: page === 0 }" @click="goPage(0)">
            {{ $t('detail.read') }}
          </button>
          <button :class="{ on: page === 1 }" @click="goPage(1)">
            {{ $t('detail.track') }}
          </button>
          <span class="ink" :style="{ transform: `translateX(${scrollP * 100}%)` }" />
        </div>
        <span v-if="!nativeTabs" class="w-10" />
      </div>

      <div ref="pager" class="pager no-scrollbar" @scroll.passive="onScroll">
        <!-- PAGE 1 — the booklet's challenge page -->
        <section class="leaf" :style="{ transform: `perspective(1200px) rotateY(${-scrollP * 18}deg)`, opacity: 1 - scrollP * 0.5, visibility: scrollP > 0.99 ? 'hidden' : 'visible' }">
          <div class="sheet page">
            <div class="text-center stagger">
              <QuestIcon :name="c.icon" :size="104" :stroke="2.4" draw class="mx-auto" />
              <h1 class="t-display text-[2rem] mt-5">
                {{ text.title }}
              </h1>
              <p class="t-body text-lg leading-snug mt-2 px-2">
                {{ text.short }}
              </p>
              <p class="t-body text-sm mt-4">
                - {{ tr(CATEGORY_LABEL[c.category]) }}
              </p>
            </div>
            <div class="mt-7 space-y-4 stagger">
              <p v-for="(p, i) in text.body" :key="i" class="t-body text-[1.04rem]">
                {{ p }}
              </p>
              <p class="t-body italic text-[1.04rem]">
                {{ $t('common.tips') }} : {{ text.tip }}
              </p>
            </div>
            <div class="mt-8">
              <button v-if="run" class="btn btn-ink w-full" @click="goPage(1)">
                {{ $t('common.continue') }} →
              </button>
              <button v-else-if="locked" class="btn w-full locked" disabled>
                <QuestIcon name="lock" :size="18" :stroke="3" class="inline -mt-1 mr-1" /> {{ L('Locked') }}
              </button>
              <button v-else class="btn btn-ink w-full" @click="askStart">
                {{ completed ? $t('common.restart') : $t('common.start') }}
              </button>
              <p v-if="completed" class="t-label text-center mt-3">
                ✓ {{ $t('detail.completedOn', { date: formatDate(new Date(completed).toISOString().slice(0, 10), L.tag(), { day: 'numeric', month: 'long' }) }) }}
              </p>
              <p v-if="skipped && !run && !completed" class="t-label text-center mt-3 flex items-center justify-center gap-1">
                <QuestIcon name="joker" :size="16" :stroke="3" /> {{ L('Skipped with a joker') }}
              </p>
              <button v-else-if="!run && !completed && !locked && c.source !== 'custom'" class="t-label text-graphite underline w-full text-center mt-4" @click="jokerSheet?.present()">
                {{ quest.jokerBalance ? `${L('Not for me: use a joker')} (${quest.jokerBalance})` : L('Not for me? Earn a joker to skip it') }}
              </button>
              <p v-if="locked" class="t-body text-xs text-pencil text-center mt-3">
                {{ $t('detail.locked') }}
              </p>
            </div>
          </div>
        </section>

        <!-- PAGE 2 — the tracking page -->
        <section class="leaf" :style="{ transform: `perspective(1200px) rotateY(${(1 - scrollP) * 18}deg)`, opacity: 0.5 + scrollP * 0.5, visibility: scrollP < 0.01 ? 'hidden' : 'visible' }">
          <div class="sheet page">
            <TrackerShell v-if="shown" :key="shown.id" :run="shown" :challenge="c" />
            <div v-else class="text-center py-10">
              <p class="t-label">
                {{ $t('common.startDate') }} :
              </p>
              <p class="t-body mt-1">
                {{ $t('common.monday') }} __/__/20__
              </p>
              <div class="grid grid-cols-2 gap-6 mt-10 opacity-30 pointer-events-none">
                <div v-for="i in 8" :key="i" class="flex flex-col items-center gap-1">
                  <span class="t-label">{{ i < 8 ? $t('common.day', { n: i }) : 'DONE' }}</span>
                  <span class="w-14 h-14 border-[2.5px] border-ink" />
                </div>
              </div>
              <p v-if="locked" class="t-body text-sm text-graphite mt-10">
                {{ $t('detail.locked') }}
              </p>
              <button v-else class="btn btn-ink w-full mt-10" @click="askStart">
                {{ $t('common.start') }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <JokerSheet ref="jokerSheet" :challenge="c" @used="back" />

      <!-- start sheet (@capgo/capacitor-sheets) -->
      <cap-sheet ref="sheet" detents="26em" content-placement="bottom" swipe-dismissal="true">
        <cap-sheet-portal>
          <cap-sheet-view>
            <cap-sheet-backdrop />
            <cap-sheet-content class="start-sheet">
              <cap-sheet-handle />
              <h3 class="t-display text-2xl mt-2">
                {{ $t('start.title') }}
              </h3>
              <button class="choice" @click="start('monday')">
                <span class="t-display text-lg">{{ $t('start.nextMonday') }}</span>
                <span class="t-body text-sm text-graphite">{{ mondayLabel }} · {{ $t('start.mondayHint') }}</span>
              </button>
              <button class="choice" @click="start('now')">
                <span class="t-display text-lg">{{ $t('start.now') }}</span>
                <span class="t-body text-sm text-graphite">{{ $t('start.nowHint') }}</span>
              </button>
              <button v-if="quest.settings.hardcore && c.source !== 'custom'" class="choice inverted" @click="start('hardcore')">
                <span class="t-display text-lg">Hardcore</span>
                <span class="t-body text-sm">{{ $t('start.hardcore') }}</span>
              </button>
            </cap-sheet-content>
          </cap-sheet-view>
        </cap-sheet-portal>
      </cap-sheet>
    </div>
  </QuestPage>
</template>

<style scoped>
.cv {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.topbar {
  width: 100%;
  max-width: 628px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 8px) 14px 8px;
}

/* On device the native navbar holds back + title: the READ / TRACK switch sits centered under it. */
.topbar.native {
  justify-content: center;
  padding-top: calc(var(--cap-native-navigation-top, var(--safe-top)) + 6px);
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  transition: transform 160ms var(--ease-spring);
}

.icon-btn:active {
  transform: scale(0.9);
}

.tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 2.5px solid var(--color-ink);
}

.tabs button {
  position: relative;
  z-index: 1;
  padding: 7px 18px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 200ms;
}

.tabs button.on {
  color: var(--color-paper);
}

.tabs .ink {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50%;
  background: var(--color-ink);
}

.pager {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
}

.leaf {
  flex: 0 0 100%;
  scroll-snap-align: start;
  overflow-y: auto;
  padding: 8px 14px calc(var(--safe-bottom) + 28px);
  transform-origin: center left;
  will-change: transform;
}

.leaf:nth-child(2) {
  transform-origin: center right;
}

.page {
  min-height: 100%;
  /* Wide screens (iPhone Duo inner display, iPad): a centered booklet page, not a stretched sheet. */
  max-width: 600px;
  margin-inline: auto;
  padding: 30px 22px 26px;
  box-shadow: 0 1px 0 var(--color-rule), 0 20px 40px -28px rgb(0 0 0 / 0.4);
}

.start-sheet {
  background: var(--color-sheet);
  padding: 10px calc(var(--safe-right) + 20px) calc(var(--safe-bottom) + 24px) calc(var(--safe-left) + 20px);
  border-top: 2.5px solid var(--color-ink);
}

.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
  margin-top: 12px;
  padding: 14px 16px;
  border: 2.5px solid var(--color-ink);
  transition: transform 160ms var(--ease-spring);
}

.choice:active {
  transform: scale(0.97);
}

.choice.inverted {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>
