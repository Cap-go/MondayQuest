<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { Capacitor } from '@capacitor/core'
import { setDirection, setNavigation } from '@capgo/capacitor-transitions/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '~/components/BrandMark.vue'
import InkCheck from '~/components/InkCheck.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { CHALLENGES } from '~/data/challenges'
import { tr } from '~/i18n/translate'
import { isMonday, nextMonday } from '~/lib/date'
import { haptic } from '~/services/haptics'
import { ensureReminders, notificationsAllowed, requestNotifications } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const step = ref(0)
const demo = ref(false)
const STEPS = 5
const native = Capacitor.isNativePlatform()
const notifOk = ref(false)
// The wake-up alarm permission is asked by the sunrise challenge itself, when it is needed.

const first = computed<Challenge>(() => CHALLENGES.find(c => !quest.clearedIds.has(c.id)) ?? CHALLENGES[0]!)
const firstTitle = computed(() => tr(first.value.text.title))
const monday = computed(() => isMonday(quest.today))

onMounted(async () => {
  if (native)
    notifOk.value = await notificationsAllowed()
})

async function allowNotifications() {
  haptic.tap()
  notifOk.value = await requestNotifications()
  if (notifOk.value)
    haptic.success()
}

function next() {
  haptic.tap()
  sfx.play('page', 0.6)
  step.value = Math.min(STEPS - 1, step.value + 1)
}

/** Last page: start the first challenge today or on Monday, or just look around. */
function finish(choice: 'today' | 'monday' | 'browse') {
  quest.settings.onboarded = true
  if (choice !== 'browse') {
    quest.start(first.value.id, choice === 'today' || monday.value ? quest.today : nextMonday(quest.today))
    void ensureReminders()
    sfx.play('chime')
  }
  haptic.success()
  setNavigation('root', 'forward')
  void router.replace(choice === 'browse' ? '/levels' : '/today').then(() => {
    if (choice === 'today') {
      setDirection('forward')
      void router.push(`/challenge/${first.value.id}/track`)
    }
  })
}
</script>

<template>
  <QuestPage>
    <div class="min-h-[calc(100dvh-120px)] flex flex-col">
      <div class="flex gap-1.5 justify-center mt-2">
        <span v-for="i in STEPS" :key="i" class="h-1 w-8" :class="i - 1 <= step ? 'bg-ink' : 'bg-rule'" />
      </div>

      <Transition name="page-fade" mode="out-in">
        <!-- cover -->
        <section v-if="step === 0" key="0" class="cover flex-1 flex flex-col items-center justify-center text-center">
          <div class="cover-card">
            <BrandMark :size="84" class="text-paper" />
            <p class="t-display text-paper text-xl mt-6 tracking-widest">
              MONDAY QUEST
            </p>
          </div>
          <p class="t-body text-graphite mt-8 px-6">
            {{ $t('onboarding.cover') }}
          </p>
        </section>

        <!-- preface, with the health notice -->
        <section v-else-if="step === 1" key="1" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ $t('onboarding.preface') }}
          </h1>
          <p class="t-body text-lg mt-4">
            {{ $t('onboarding.p1') }}
          </p>
          <p class="t-body text-lg mt-4">
            {{ $t('onboarding.p2') }}
          </p>
          <div class="health mt-8">
            <p class="t-label">
              {{ $t('settings.health') }}
            </p>
            <p class="t-body text-sm text-graphite mt-1">
              {{ $t('settings.healthText') }}
            </p>
          </div>
        </section>

        <!-- how it works, with a real check to try -->
        <section v-else-if="step === 2" key="2" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ $t('onboarding.how') }}
          </h1>
          <p class="t-body text-lg mt-4">
            {{ $t('onboarding.h1') }}
          </p>
          <p class="t-body text-lg mt-3">
            {{ $t('onboarding.h2') }}
          </p>
          <div class="flex justify-center mt-8">
            <InkCheck v-model="demo" :label="$t('common.day', { n: 1 })" :size="96" />
          </div>
          <p class="t-body text-lg mt-8">
            {{ $t('onboarding.h3') }}
          </p>
        </section>

        <!-- reminders: notifications (native only) -->
        <section v-else-if="step === 3" key="3" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ $t('onboarding.reminders') }}
          </h1>
          <p class="t-body text-lg mt-4">
            {{ $t('onboarding.remindersText') }}
          </p>
          <div v-if="native" class="mt-8 flex flex-col gap-3">
            <button class="perm" :class="{ ok: notifOk }" :disabled="notifOk" @click="allowNotifications">
              <span class="flex-1 text-left">{{ $t('onboarding.notifications') }}</span>
              <span>{{ notifOk ? '✓' : $t('onboarding.allowShort') }}</span>
            </button>
          </div>
          <p v-else class="t-body text-graphite mt-6">
            {{ $t('onboarding.remindersWeb') }}
          </p>
        </section>

        <!-- first challenge -->
        <section v-else key="4" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ $t('onboarding.first') }}
          </h1>
          <div class="flex items-start gap-4 mt-6">
            <QuestIcon :name="first.icon" :size="64" draw />
            <div class="flex-1 min-w-0">
              <h2 class="t-display text-2xl">
                {{ firstTitle }}
              </h2>
              <p class="t-body text-graphite mt-1">
                {{ tr(first.text.short) }}
              </p>
            </div>
          </div>
          <div class="mt-8 flex flex-col gap-3">
            <button class="choice inverted" @click="finish('today')">
              <span class="t-display text-lg">{{ $t('onboarding.startToday', { title: firstTitle }) }}</span>
              <span class="t-body text-sm">{{ $t('start.nowHint') }}</span>
            </button>
            <button v-if="!monday" class="choice" @click="finish('monday')">
              <span class="t-display text-lg">{{ $t('onboarding.startMonday', { title: firstTitle }) }}</span>
              <span class="t-body text-sm text-graphite">{{ $t('start.mondayHint') }}</span>
            </button>
            <button class="choice" @click="finish('browse')">
              <span class="t-display text-lg">{{ $t('onboarding.browse') }}</span>
              <span class="t-body text-sm text-graphite">{{ $t('onboarding.browseHint') }}</span>
            </button>
          </div>
        </section>
      </Transition>

      <button v-if="step < STEPS - 1" class="btn btn-ink w-full mt-8" @click="next">
        {{ $t('common.next') }} →
      </button>
    </div>
  </QuestPage>
</template>

<style scoped>
.perm {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 2.5px solid var(--color-ink);
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  transition: background 200ms, color 200ms;
}

.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
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

.health {
  padding-top: 14px;
  border-top: 1.5px dashed var(--color-rule);
}

.perm.ok {
  background: var(--color-ink);
  color: var(--color-paper);
}

.cover-card {
  width: 220px;
  height: 330px;
  background: var(--color-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 34px), calc(100% - 34px) 100%, 0 100%);
  box-shadow: 0 30px 50px -30px rgb(0 0 0 / 0.6);
  animation: cover 900ms var(--ease-out-quint) both;
}

@keyframes cover {
  from {
    transform: translateY(40px) rotate(-4deg);
    opacity: 0;
  }
}
</style>
