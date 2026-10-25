import type { Router } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { NativeNavigation } from '@capgo/capacitor-native-navigation'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { ref, watch } from 'vue'
import { i18n } from '~/i18n'
import { tr } from '~/i18n/translate'
import { haptic } from './haptics'
import { sfx } from './sound'

export const TABS = ['today', 'levels', 'journal', 'settings'] as const
export type TabId = typeof TABS[number]

export const nativeTabs = Capacitor.isNativePlatform()
export const activeTab = ref<TabId>('today')
/** Title shown in the native navbar of pushed pages (challenge, custom, debug). */
export const navTitle = ref('')
let navbarRoute = false

const stroke = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${d}</svg>`

/** Square-box iconography to match the booklet. */
export const TAB_ICONS: Record<TabId, { svg: string, sf: string, sfOn: string }> = {
  today: { svg: stroke('<rect x="4" y="4" width="16" height="16"/><path d="M8 12.5l3 3 6-7"/>'), sf: 'checkmark.square', sfOn: 'checkmark.square.fill' },
  levels: { svg: stroke('<path d="M3 20h5v-5h5v-5h5V5h3"/>'), sf: 'stairs', sfOn: 'stairs' },
  journal: { svg: stroke('<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>'), sf: 'book.closed', sfOn: 'book.closed.fill' },
  // A real gear (8 teeth), not rays: the old circle + lines read as a sun.
  settings: { svg: stroke('<path d="M10.3 2.5h3.4l.5 2.6 1.7.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.7 2.6.5v3.4l-2.6.5-.7 1.7 1.5 2.2-2.4 2.4-2.2-1.5-1.7.7-.5 2.6h-3.4l-.5-2.6-1.7-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.7-2.6-.5v-3.4l2.6-.5.7-1.7-1.5-2.2 2.4-2.4 2.2 1.5 1.7-.7z"/><circle cx="12" cy="12" r="3.2"/>'), sf: 'gearshape', sfOn: 'gearshape.fill' },
}

function tabTitle(id: TabId) {
  return i18n.global.t(`tabs.${id}`)
}

export async function setupNativeNavigation(router: Router) {
  if (!nativeTabs)
    return
  await NativeNavigation.configure({
    enabled: true,
    contentInsetMode: 'css',
    platformStyle: 'auto',
    colors: { tint: '#141414', inactiveTint: '#8c8a85', background: '#f6f4ef', foreground: '#141414', indicator: '#e6e2d9' },
    glass: { effect: 'liquidGlass' },
  }).catch(() => {})
  await NativeNavigation.setNavbar({ hidden: true }).catch(() => {})
  const current = router.currentRoute.value
  if (current.meta.tab)
    activeTab.value = current.meta.tab as TabId
  await renderTabbar(!!current.meta.hideTabs)

  const goBack = () => {
    haptic.tap()
    setDirection('back')
    if (window.history.state?.back)
      router.back()
    else
      void router.replace(router.currentRoute.value.path.startsWith('/debug') ? '/settings' : '/today')
  }
  NativeNavigation.addListener('navbarBack', goBack)
  NativeNavigation.addListener('navbarItemTap', ({ id }) => {
    if (id === 'back')
      goBack()
  })
  watch(navTitle, () => {
    if (navbarRoute)
      void renderNavbar(true, false)
  })
  await renderNavbar(!!current.meta.navbar)

  NativeNavigation.addListener('tabSelect', ({ id }) => {
    haptic.select()
    sfx.play('tick', 0.5)
    activeTab.value = id as TabId
    setDirection('root')
    void router.push(`/${id}`)
  })

  router.afterEach((to) => {
    const tab = to.meta.tab as TabId | undefined
    if (tab)
      activeTab.value = tab
    void renderTabbar(!!to.meta.hideTabs, true)
    // Challenge pages set their own title (see ChallengeView).
    if (to.path === '/debug')
      navTitle.value = 'Debug'
    else if (to.path === '/custom/new')
      navTitle.value = tr('New challenge')
    void renderNavbar(!!to.meta.navbar)
  })
}

/**
 * setTabbar replaces the whole bar (tabs, colors, selection): a partial call
 * leaves it with zero tabs, so always send the full definition.
 */
export async function renderTabbar(hidden = false, animated = false) {
  if (!nativeTabs)
    return
  await NativeNavigation.setTabbar({
    hidden,
    animated,
    selectedId: activeTab.value,
    labels: true,
    style: { placement: Capacitor.getPlatform() === 'ios' ? 'sidebar' : 'auto' },
    tabs: TABS.map(id => ({
      id,
      title: tabTitle(id),
      icon: { svg: TAB_ICONS[id].svg, template: true, ios: { sfSymbol: TAB_ICONS[id].sf } },
      selectedIcon: { svg: TAB_ICONS[id].svg, template: true, ios: { sfSymbol: TAB_ICONS[id].sfOn } },
    })),
    colors: { tint: '#141414', inactiveTint: '#8c8a85', background: '#f6f4ef' },
    // iOS 26 Liquid Glass otherwise re-tints the selected item and it can vanish on the glass.
    experimentalBakedTintColors: true,
  }).catch(() => {})
}

/** Clear native bar; the paper fade behind it is the web status scrim (App.vue). */
const BAR_SURFACE = {
  transparent: true,
  colors: { tint: '#141414', foreground: '#141414', background: '#f6f4ef' },
}

/** Native navbar (back + title, Liquid Glass) on pushed pages; tab pages keep their booklet titles. */
export async function renderNavbar(visible: boolean, reset = true) {
  if (!nativeTabs)
    return
  navbarRoute = visible
  if (!visible) {
    await NativeNavigation.setNavbar({ hidden: true, animated: true }).catch(() => {})
    return
  }
  await NativeNavigation.setNavbar({
    hidden: false,
    animated: true,
    title: navTitle.value,
    ...BAR_SURFACE,
    // The plugin's backButton is a text button: use an icon item for a real chevron.
    leftItems: [{ id: 'back', icon: { svg: stroke('<path d="M15 5l-7 7 7 7"/>'), template: true, ios: { sfSymbol: 'chevron.backward' } } }],
    resetScrollCollapsed: reset,
  }).catch(() => {})
}

/** Tab pages: show the page title in the native navbar once the booklet heading has scrolled away. */
export function setScrolledTitle(title: string | null) {
  if (!nativeTabs || navbarRoute)
    return
  if (!title) {
    void NativeNavigation.setNavbar({ hidden: true, animated: true }).catch(() => {})
    return
  }
  void NativeNavigation.setNavbar({
    hidden: false,
    animated: true,
    title,
    ...BAR_SURFACE,
  }).catch(() => {})
}
