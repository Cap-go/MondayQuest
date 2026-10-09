<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { setNavigation } from '@capgo/capacitor-transitions/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '~/components/BrandMark.vue'
import InkCheck from '~/components/InkCheck.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { alarmSupport, requestAlarmPermission } from '~/services/alarm'
import { haptic } from '~/services/haptics'
import { notificationsAllowed, requestNotifications } from '~/services/notifications'
import { sfx } from '~/services/sound'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()
const step = ref(0)
const demo = ref(false)
const STEPS = 5
const native = Capacitor.isNativePlatform()
const notifOk = ref(false)
const alarmOk = ref(false)
const alarmNative = ref(false)

onMounted(async () => {
  notifOk.value = await notificationsAllowed()
  alarmNative.value = (await alarmSupport()).native
})

async function allowNotifications() {
  haptic.tap()
  notifOk.value = await requestNotifications()
  if (notifOk.value)
    haptic.success()
}

async function allowAlarm() {
  haptic.tap()
  alarmOk.value = await requestAlarmPermission()
  if (alarmOk.value)
    haptic.success()
}

function next() {
  haptic.tap()
  sfx.play('page', 0.6)
  step.value = Math.min(STEPS - 1, step.value + 1)
}

function finish() {
  quest.settings.onboarded = true
  haptic.success()
  setNavigation('root', 'forward')
  void router.replace('/today')
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
            52 challenges. 52 {{ $t('common.monday') }}s.
          </p>
        </section>

        <!-- preface -->
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

        <!-- reminders: notifications + real alarms -->
        <section v-else-if="step === 3" key="3" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ L('Reminders') }}
          </h1>
          <p class="t-body text-lg mt-4">
            {{ L('A note every morning for today\'s challenge, another in the evening to tick it. And a real alarm for the before-sunrise mornings.') }}
          </p>
          <div class="mt-8 flex flex-col gap-3">
            <button class="perm" :class="{ ok: notifOk }" :disabled="notifOk" @click="allowNotifications">
              <span class="flex-1 text-left">{{ L('Notifications') }}</span>
              <span>{{ notifOk ? '✓' : L('Allow') }}</span>
            </button>
            <button v-if="native && alarmNative" class="perm" :class="{ ok: alarmOk }" :disabled="alarmOk" @click="allowAlarm">
              <span class="flex-1 text-left">{{ L('Alarms') }}</span>
              <span>{{ alarmOk ? '✓' : L('Allow') }}</span>
            </button>
          </div>
        </section>

        <!-- health -->
        <section v-else key="4" class="flex-1 pt-10 stagger">
          <h1 class="t-display text-3xl">
            {{ $t('settings.health') }}
          </h1>
          <p class="t-body text-lg mt-4">
            {{ $t('settings.healthText') }}
          </p>
        </section>
      </Transition>

      <button v-if="step < STEPS - 1" class="btn btn-ink w-full mt-8" @click="next">
        {{ $t('common.next') }} →
      </button>
      <button v-else class="btn btn-ink w-full mt-8" @click="finish">
        {{ $t('onboarding.begin') }}
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
