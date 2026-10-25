import type { NativeNavigationTabbarOptions } from '@capgo/capacitor-native-navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderTabbar, TABS } from '../src/services/navigation'

const { setTabbar, platform } = vi.hoisted(() => ({
  setTabbar: vi.fn<(options: NativeNavigationTabbarOptions) => Promise<unknown>>(async () => ({})),
  platform: vi.fn(() => 'ios'),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: platform } }))
vi.mock('@capgo/capacitor-native-navigation', () => ({ NativeNavigation: { setTabbar } }))
vi.mock('@capgo/capacitor-transitions/vue', () => ({ setDirection: vi.fn() }))
vi.mock('~/i18n', () => ({ i18n: { global: { t: (key: string) => key } } }))
vi.mock('~/i18n/translate', () => ({ tr: (text: string) => text }))
vi.mock('~/services/haptics', () => ({ haptic: {} }))
vi.mock('~/services/sound', () => ({ sfx: {} }))

describe('native sidebar navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.mockReturnValue('ios')
  })

  it('requests the system sidebar with every app tab on iOS', async () => {
    await renderTabbar()
    expect(setTabbar).toHaveBeenCalledWith(expect.objectContaining({ style: { placement: 'sidebar' }, selectedId: 'today', hidden: false }))
    expect(setTabbar.mock.calls[0]?.[0].tabs?.map(tab => tab.id)).toEqual([...TABS])
  })

  it('keeps automatic placement on Android rather than forcing a phone rail', async () => {
    platform.mockReturnValue('android')
    await renderTabbar()
    expect(setTabbar).toHaveBeenCalledWith(expect.objectContaining({ style: { placement: 'auto' } }))
  })

  it('preserves the complete rail definition when a tracker hides it', async () => {
    await renderTabbar(true, true)
    expect(setTabbar).toHaveBeenCalledWith(expect.objectContaining({ hidden: true, animated: true, style: { placement: 'sidebar' } }))
    expect(setTabbar.mock.calls[0]?.[0].tabs).toHaveLength(4)
  })
})
