<script setup lang="ts">
import type { Settings } from '~/stores/quest'
import { Capacitor } from '@capacitor/core'
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
import { deviceTag, languageOf } from '~/i18n/translate'
import { buildEnv, isTestBuild } from '~/services/env'
import { haptic } from '~/services/haptics'
import { notificationsAllowed, requestNotifications, rescheduleAll } from '~/services/notifications'
import { locate, wakeHM } from '~/services/sun'
import { pickTime as pickTimeNative } from '~/services/timePicker'
import { bundleVersion, nativeVersion } from '~/services/updater'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()
const notif = ref(false)
const native = Capacitor.isNativePlatform()

onMounted(async () => {
  notif.value = await notificationsAllowed()
})

async function enableNotif() {
  notif.value = await requestNotifications()
  if (notif.value) {
    toast.success(L('Reminders on'))
    void rescheduleAll()
  }
}

async function pickTime(key: 'reminder' | 'evening' | 'wakeAlarm', title: string) {
  haptic.tap()
  const value = await pickTimeNative(title, quest.settings[key])
  if (value)
    quest.settings[key] = value
}

const autoWake = ref(wakeHM(new Date(Date.now() + 86_400_000)))
onMounted(async () => {
  const c = await locate(false)
  autoWake.value = wakeHM(new Date(Date.now() + 86_400_000), c)
})

/** Picking a time switches the Rising sun alarm from automatic (sunrise) to fixed. */
async function pickWake() {
  haptic.tap()
  const value = await pickTimeNative(L('Fixed alarm'), quest.settings.wakeAuto ? autoWake.value : quest.settings.wakeAlarm)
  if (value) {
    quest.settings.wakeAlarm = value
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

/** Offered explicitly; "Automatic" covers every other phone language too. */
const LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'pt-BR', 'nl', 'pl', 'sv', 'da', 'nb', 'fi', 'et', 'cs', 'ro', 'hu', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'id', 'vi', 'th', 'ja', 'ko', 'zh-Hans', 'zh-Hant']
const deviceLanguage = languageOf(deviceTag())
function nativeName(code: string): string {
  try {
    const n = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
    return n.charAt(0).toLocaleUpperCase(code) + n.slice(1)
  }
  catch {
    return code
  }
}

function reset() {
  // eslint-disable-next-line no-alert
  if (window.confirm(L('Erase all your progress?'))) {
    haptic.error()
    quest.resetAll()
    toast.info(L('Blank notebook'))
  }
}

function link(url: string) {
  haptic.tap()
  // Telegram, X and Capgo open in the real browser / their app, not inside Monday Quest.
  if (/t\.me\/|x\.com\/|capgo\.app/.test(url))
    return openExternal(url)
  if (native)
    void InAppBrowser.open({ url }).catch(() => window.open(url, '_blank'))
  else
    window.open(url, '_blank')
}

const CAPGO_URL = 'https://capgo.app/?utm_source=mondayquest&utm_medium=app'

const LINKS = [
  ...(COMMUNITY_URL ? [{ label: () => L('Monday Quest group'), hint: 'Telegram', url: COMMUNITY_URL }] : []),
  { label: () => L('Made by Martin Donadieu'), hint: '@martindonadieu', url: 'https://x.com/martindonadieu' },
  { label: () => L('Website'), hint: 'mondayquest.com', url: 'https://mondayquest.com' },
  { label: () => L('Privacy'), hint: '', url: 'https://mondayquest.com/privacy' },
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
  <QuestPage :title="$t('tabs.settings')">
    <h1 class="t-display text-[2.6rem]">
      {{ $t('settings.title') }}
    </h1>

    <section class="mt-6">
      <p class="t-label">
        {{ $t('settings.language') }}
      </p>
      <select class="lang-select mt-2" :value="quest.settings.locale" @change="setLocale(($event.target as HTMLSelectElement).value)">
        <option value="auto">
          {{ $t('settings.auto') }} · {{ nativeName(deviceLanguage) }}
        </option>
        <option v-for="code in LANGUAGES" :key="code" :value="code">
          {{ nativeName(code) }}
        </option>
      </select>
      <p class="t-body text-xs text-pencil mt-2">
        {{ L('Written in English, translated automatically into your language.') }}
      </p>
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
        <span v-if="quest.settings.wakeAuto" class="t-label text-pencil mr-2">{{ L('sunrise') }}</span>
        <span class="t-display tabular-nums">{{ quest.settings.wakeAuto ? autoWake : quest.settings.wakeAlarm }}</span>
      </button>
      <button v-if="!quest.settings.wakeAuto" class="t-label text-graphite underline mt-1" @click="followSunrise">
        {{ L('Follow the sunrise again') }}
      </button>
    </section>

    <section class="mt-8">
      <p class="t-label">
        {{ L('Experience') }}
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
        {{ L('About') }}
      </p>
      <button v-for="l in LINKS" :key="l.url" class="row" @click="link(l.url)">
        <span class="t-body flex-1 text-left">{{ l.label() }}</span>
        <span class="t-body text-sm text-pencil">{{ l.hint }}</span><span class="ml-2">↗</span>
      </button>
      <p class="version-line t-label" @click="versionTap">
        {{ L('Version') }} {{ nativeVersion || 'web' }}{{ bundleVersion && bundleVersion !== 'builtin' ? ` · ${bundleVersion}` : '' }}
      </p>
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
      <button class="capgo-pill mt-5" @click="link(CAPGO_URL)">
        <svg viewBox="0 0 1024 1024" class="capgo-logo" aria-hidden="true">
          <circle cx="512" cy="512" r="512" fill="#001827" />
          <path fill="#fff" fill-rule="evenodd" transform="translate(512 512) rotate(-45) scale(0.62)" d="M-190-340H190A150 150 0 0 1 340-190V190A150 150 0 0 1 190 340H-190A150 150 0 0 1-340 190V-190A150 150 0 0 1-190-340ZM-160-145A45 45 0 0 1-70-145V145A45 45 0 0 1-160 145V50H-195A45 45 0 0 1-240 5V-5A45 45 0 0 1-195-50H-160ZM160-145A45 45 0 0 0 70-145V145A45 45 0 0 0 160 145V50H195A45 45 0 0 0 240 5V-5A45 45 0 0 0 195-50H160Z" />
        </svg>
        <span>{{ L('Made with Capgo') }}</span>
      </button>
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
.lang-select {
  width: 100%;
  padding: 12px 14px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-sheet);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--color-ink) 50%), linear-gradient(135deg, var(--color-ink) 50%, transparent 50%);
  background-position: calc(100% - 20px) 50%, calc(100% - 14px) 50%;
  background-size: 6px 6px;
  background-repeat: no-repeat;
}

.capgo-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 7px 22px 7px 7px;
  border: 2.5px solid var(--color-ink);
  border-radius: 999px;
  background: var(--color-sheet);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  transition: transform 160ms var(--ease-spring);
}

.capgo-pill:active {
  transform: scale(0.97);
}

.capgo-logo {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

.version-line {
  margin-top: 14px;
  text-align: center;
  font-size: 0.62rem;
  color: var(--color-pencil);
  user-select: none;
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
