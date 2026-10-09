<script setup lang="ts">
import type { Settings } from '~/stores/quest'
import { Capacitor } from '@capacitor/core'
import { DatePicker } from '@capgo/capacitor-date-picker'
import { CapgoInAppReview } from '@capgo/capacitor-in-app-review'
import { InAppBrowser } from '@capgo/capacitor-inappbrowser'
import { toast } from '@capgo/capacitor-pretty-toast'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '~/components/BrandMark.vue'
import QuestPage from '~/components/QuestPage.vue'
import ToggleRow from '~/components/ToggleRow.vue'
import { useL } from '~/composables/useL'
import { COMMUNITY_URL, openExternal } from '~/config'
import { openSystemAlarms } from '~/services/alarm'
import { buildEnv, isTestBuild } from '~/services/env'
import { haptic } from '~/services/haptics'
import { notificationsAllowed, requestNotifications, rescheduleAll } from '~/services/notifications'
import { locate, wakeHM } from '~/services/sun'
import { bundleVersion, currentChannel, nativeVersion } from '~/services/updater'
import { syncTodayWidget } from '~/services/widgets'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()
const notif = ref(false)
const channel = ref<string>()
const native = Capacitor.isNativePlatform()

onMounted(async () => {
  notif.value = await notificationsAllowed()
  channel.value = await currentChannel()
})

async function enableNotif() {
  notif.value = await requestNotifications()
  if (notif.value) {
    toast.success(L('Rappels activés', 'Reminders on'))
    void rescheduleAll()
  }
}

async function pickTime(key: 'reminder' | 'evening' | 'wakeAlarm', title: string) {
  haptic.tap()
  const res = await DatePicker.present({ mode: 'time', format: 'HH:mm', is24h: true, date: quest.settings[key], title, locale: L.tag(), doneText: 'OK', cancelText: L('Annuler', 'Cancel') }).catch(() => null)
  if (res?.value)
    quest.settings[key] = res.value
}

const autoWake = ref(wakeHM(new Date(Date.now() + 86_400_000)))
onMounted(async () => {
  const c = await locate(false)
  autoWake.value = wakeHM(new Date(Date.now() + 86_400_000), c)
})

/** Picking a time switches the Rising sun alarm from automatic (sunrise) to fixed. */
async function pickWake() {
  haptic.tap()
  const res = await DatePicker.present({ mode: 'time', format: 'HH:mm', is24h: true, date: quest.settings.wakeAuto ? autoWake.value : quest.settings.wakeAlarm, title: L('Réveil fixe', 'Fixed alarm'), locale: L.tag(), doneText: 'OK', cancelText: L('Annuler', 'Cancel') }).catch(() => null)
  if (res?.value) {
    quest.settings.wakeAlarm = res.value
    quest.settings.wakeAuto = false
  }
}

async function followSunrise() {
  haptic.select()
  quest.settings.wakeAuto = true
  autoWake.value = wakeHM(new Date(Date.now() + 86_400_000), await locate(true))
}

function setLocale(l: Settings['locale']) {
  haptic.select()
  quest.settings.locale = l
}

function reset() {
  // eslint-disable-next-line no-alert
  if (window.confirm(L('Effacer toute votre progression ?', 'Erase all your progress?'))) {
    haptic.error()
    quest.resetAll()
    toast.info(L('Carnet vierge', 'Blank notebook'))
  }
}

async function refreshWidget() {
  await syncTodayWidget()
  toast.success(L('Widget mis à jour', 'Widget refreshed'))
}

function link(url: string) {
  haptic.tap()
  if (url.includes('t.me/'))
    return openExternal(url)
  if (native)
    void InAppBrowser.open({ url }).catch(() => window.open(url, '_blank'))
  else
    window.open(url, '_blank')
}

const LINKS = [
  ...(COMMUNITY_URL ? [{ label: () => L('Le groupe Monday Quest', 'Monday Quest group'), hint: 'Telegram', url: COMMUNITY_URL }] : []),
  { label: () => L('Créé par Martin Donadieu', 'Made by Martin Donadieu'), hint: '@martindonadieu', url: 'https://x.com/martindonadieu' },
  { label: () => L('Mises à jour en direct par Capgo', 'Live updates by Capgo'), hint: 'capgo.app', url: 'https://capgo.app/?utm_source=mondayquest&utm_medium=app' },
  { label: () => L('Site web', 'Website'), hint: 'mondayquest.com', url: 'https://mondayquest.com' },
  { label: () => L('Confidentialité', 'Privacy'), hint: '', url: 'https://mondayquest.com/privacy' },
]

let taps = 0
let tapTimer: ReturnType<typeof setTimeout> | undefined
function versionTap() {
  taps++
  clearTimeout(tapTimer)
  tapTimer = setTimeout(() => (taps = 0), 1500)
  if (taps >= 7 && !quest.settings.debug) {
    quest.settings.debug = true
    haptic.success()
    toast.success('Debug menu unlocked')
  }
}

function openDebug() {
  haptic.tap()
  setDirection('forward')
  void router.push('/debug')
}

function custom() {
  setDirection('forward')
  void router.push('/custom/new')
}
</script>

<template>
  <QuestPage>
    <h1 class="t-display text-[2.6rem]">
      {{ $t('settings.title') }}
    </h1>

    <section class="mt-6">
      <p class="t-label">
        {{ $t('settings.language') }}
      </p>
      <div class="seg mt-2">
        <button v-for="l in (['auto', 'fr', 'en'] as const)" :key="l" :class="{ on: quest.settings.locale === l }" @click="setLocale(l)">
          {{ l === 'auto' ? $t('settings.auto') : l === 'fr' ? 'Français' : 'English' }}
        </button>
      </div>
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ $t('settings.notifications') }}
      </p>
      <button v-if="!notif" class="btn btn-ink w-full mt-3" @click="enableNotif">
        {{ $t('settings.enableNotifications') }}
      </button>
      <button class="row" @click="pickTime('reminder', $t('settings.reminder'))">
        <span class="t-body flex-1 text-left">{{ $t('settings.reminder') }}</span><span class="t-display tabular-nums">{{ quest.settings.reminder }}</span>
      </button>
      <button class="row" @click="pickTime('evening', $t('settings.evening'))">
        <span class="t-body flex-1 text-left">{{ $t('settings.evening') }}</span><span class="t-display tabular-nums">{{ quest.settings.evening }}</span>
      </button>
      <button class="row" @click="pickWake">
        <span class="t-body flex-1 text-left">{{ $t('settings.wakeAlarm') }}</span>
        <span v-if="quest.settings.wakeAuto" class="t-label text-pencil mr-2">{{ L('lever du soleil', 'sunrise') }}</span>
        <span class="t-display tabular-nums">{{ quest.settings.wakeAuto ? autoWake : quest.settings.wakeAlarm }}</span>
      </button>
      <button v-if="!quest.settings.wakeAuto" class="t-label text-graphite underline mt-1" @click="followSunrise">
        {{ L('Revenir au lever du soleil', 'Follow the sunrise again') }}
      </button>
      <button v-if="native" class="row" @click="openSystemAlarms">
        <span class="t-body flex-1 text-left">{{ L('Ouvrir l\'app Horloge', 'Open the Clock app') }}</span><span>↗</span>
      </button>
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ L('Expérience', 'Experience') }}
      </p>
      <ToggleRow v-model="quest.settings.sound" :label="$t('settings.sound')" />
      <ToggleRow v-model="quest.settings.haptics" :label="$t('settings.haptics')" />
      <ToggleRow v-model="quest.settings.hardcore" :label="$t('settings.hardcore')" :hint="$t('settings.hardcoreHint')" />
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ $t('settings.widget') }}
      </p>
      <p class="t-body text-sm text-graphite mt-2">
        {{ $t('settings.widgetHint') }}
      </p>
      <button v-if="native" class="btn w-full mt-3" @click="refreshWidget">
        {{ L('Rafraîchir le widget', 'Refresh widget') }}
      </button>
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ $t('settings.custom') }}
      </p>
      <button class="btn w-full mt-3" @click="custom">
        + {{ $t('settings.createCustom') }}
      </button>
    </section>

    <section class="mt-8 sheet p-5">
      <p class="t-label">
        {{ $t('settings.health') }}
      </p>
      <p class="t-body text-sm mt-2">
        {{ $t('settings.healthText') }}
      </p>
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ L('À propos', 'About') }}
      </p>
      <button v-for="l in LINKS" :key="l.url" class="row" @click="link(l.url)">
        <span class="t-body flex-1 text-left">{{ l.label() }}</span>
        <span class="t-body text-sm text-pencil">{{ l.hint }}</span><span class="ml-2">↗</span>
      </button>
      <div class="version mt-4" @click="versionTap">
        <div>
          <p class="t-label text-[0.6rem] text-pencil">
            App
          </p>
          <p class="t-display tabular-nums">
            {{ nativeVersion || 'web' }}
          </p>
        </div>
        <div>
          <p class="t-label text-[0.6rem] text-pencil">
            Bundle
          </p>
          <p class="t-display tabular-nums">
            {{ bundleVersion }}
          </p>
        </div>
        <div>
          <p class="t-label text-[0.6rem] text-pencil">
            {{ L('Canal', 'Channel') }}
          </p>
          <p class="t-display text-sm normal-case truncate">
            {{ channel || '—' }}
          </p>
        </div>
      </div>
    </section>

    <section v-if="isTestBuild || quest.settings.debug" class="mt-8">
      <button class="btn w-full" @click="openDebug">
        Debug · {{ buildEnv }}
      </button>
    </section>

    <section class="mt-8 text-center">
      <BrandMark :size="40" class="mx-auto" />
      <p class="t-display mt-2">
        Monday Quest
      </p>
      <p class="t-body text-xs text-pencil mt-2 px-4">
        {{ $t('settings.aboutText') }}
      </p>
      <div class="flex justify-center gap-3 mt-5">
        <button v-if="native" class="btn" @click="CapgoInAppReview.requestReview()">
          {{ $t('settings.review') }}
        </button>
        <button class="btn" @click="reset">
          {{ $t('settings.reset') }}
        </button>
      </div>
    </section>
  </QuestPage>
</template>

<style scoped>
.version {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2.5px solid var(--color-ink);
}

.version > div {
  padding: 10px 12px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.version > div + div {
  border-left: 2.5px solid var(--color-ink);
}

.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2.5px solid var(--color-ink);
}

.seg button {
  padding: 10px 4px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  transition: all 200ms;
}

.seg button + button {
  border-left: 2.5px solid var(--color-ink);
}

.seg button.on {
  background: var(--color-ink);
  color: var(--color-paper);
}

.row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 0;
  border-bottom: 1px dashed var(--color-rule);
}
</style>
