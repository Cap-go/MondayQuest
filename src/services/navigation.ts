import type { Router } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { NativeNavigation } from '@capgo/capacitor-native-navigation'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { ref } from 'vue'
import { i18n } from '~/i18n'
import { haptic } from './haptics'
import { sfx } from './sound'

export const TABS = ['today', 'levels', 'journal', 'settings'] as const
export type TabId = typeof TABS[number]

export const nativeTabs = Capacitor.isNativePlatform()
export const activeTab = ref<TabId>('today')

const stroke = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${d}</svg>`

/** Square-box iconography to match the booklet. */
export const TAB_ICONS: Record<TabId, { svg: string, sf: string, sfOn: string }> = {
  today: { svg: stroke('<rect x="4" y="4" width="16" height="16"/><path d="M8 12.5l3 3 6-7"/>'), sf: 'checkmark.square', sfOn: 'checkmark.square.fill' },
  levels: { svg: stroke('<path d="M3 20h5v-5h5v-5h5V5h3"/>'), sf: 'stairs', sfOn: 'stairs' },
  journal: { svg: stroke('<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>'), sf: 'book.closed', sfOn: 'book.closed.fill' },
  settings: { svg: stroke('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'), sf: 'gearshape', sfOn: 'gearshape.fill' },
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
