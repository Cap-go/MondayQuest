import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { NavigationBar } from '@capgo/capacitor-navigation-bar'
import { PrivacyScreen } from '@capgo/capacitor-privacy-screen'
import { initTransitions, setDirection } from '@capgo/capacitor-transitions/vue'
import { createPinia } from 'pinia'
import { createApp, watch } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import { router } from './router'
import { setHapticsEnabled } from './services/haptics'
import { renderTabbar, setupNativeNavigation } from './services/navigation'
import { clearBadge, initNotifications, onNotificationOpen, rescheduleAll } from './services/notifications'
import { setSoundEnabled, sfx } from './services/sound'
import { notifyReady } from './services/updater'
import { consumeWidgetEvents, syncTodayWidget } from './services/widgets'
import { useQuest } from './stores/quest'
import '@capgo/capacitor-transitions'
import '@capgo/capacitor-sheets'
import './styles/main.css'

// Capgo live updates: confirm the bundle boots before anything else can fail.
notifyReady()

initTransitions({ platform: 'auto', duration: 420 })

async function boot() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia).use(i18n).use(router)

  const quest = useQuest()
  await quest.load()
  i18n.global.locale.value = quest.locale
  setSoundEnabled(quest.settings.sound)
  setHapticsEnabled(quest.settings.haptics)

  if (!quest.settings.onboarded)
    await router.replace('/onboarding')

  // Fonts are bundled but load lazily (font-display: swap): wait for them under the
  // splash so the first screen never reflows from the system font.
  await Promise.race([
    Promise.all(['800 1em Archivo', '700 1em Archivo', '600 1em Archivo', '400 1em "Didact Gothic"'].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 1500)),
  ]).catch(() => {})

  app.mount('#app')

  const native = Capacitor.isNativePlatform()
  if (native) {
    void StatusBar.setStyle({ style: Style.Light }).catch(() => {})
    void NavigationBar.setNavigationBarColor({ color: '#f6f4ef', darkButtons: true }).catch(() => {})
    void Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {})
    if (quest.settings.privacy)
      void PrivacyScreen.enable({ ios: { blurEffect: 'light' }, android: { privacyModeOnActivityHidden: 'splash' } }).catch(() => {})
  }

  await router.isReady()
  await SplashScreen.hide({ fadeOutDuration: 350 }).catch(() => {})

  void sfx.preload()
  void setupNativeNavigation(router)
  if (native) {
    onNotificationOpen((path) => {
      setDirection('forward')
      void router.push(path)
    })
    void initNotifications()
  }

  const refresh = async () => {
    quest.tick()
    await consumeWidgetEvents()
    await syncTodayWidget()
    await rescheduleAll()
    await clearBadge()
  }
  void refresh()

  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive)
      void refresh()
  })

  // mondayquest://challenge/mq03 or mondayquest://today from widgets and Live Activities
  CapApp.addListener('appUrlOpen', ({ url }) => {
    const path = url.replace(/^mondayquest:\/\//, '/')
    setDirection('forward')
    void router.push(path === '/' ? '/today' : path)
  })

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      setDirection('back')
      router.back()
    }
    else {
      void CapApp.minimizeApp()
    }
  })

  let syncTimer: ReturnType<typeof setTimeout> | undefined
  watch(() => [quest.runs, quest.settings.reminder, quest.settings.evening, quest.locale], () => {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      void syncTodayWidget()
      void rescheduleAll()
    }, 800)
  }, { deep: true })

  watch(() => quest.settings.sound, setSoundEnabled)
  watch(() => quest.settings.haptics, setHapticsEnabled)
  watch(() => quest.locale, (l) => {
    i18n.global.locale.value = l
    void renderTabbar(!!router.currentRoute.value.meta.hideTabs)
  })
  watch(() => quest.settings.privacy, (on) => {
    if (!native)
      return
    void (on
      ? PrivacyScreen.enable({ ios: { blurEffect: 'light' }, android: { privacyModeOnActivityHidden: 'splash' } })
      : PrivacyScreen.disable()).catch(() => {})
  })
}

void boot()
